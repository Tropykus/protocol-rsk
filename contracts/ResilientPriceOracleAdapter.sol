// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title ResilientPriceOracleAdapter
/// @author Tropykus Finance
/// @notice Multi-source price oracle adapter with cross-validation, circuit breaker,
///         and lastGoodPrice fallback. Designed for Compound V2 fork on Rootstock.
/// @dev Implements the same external interface as PriceOracleAdapter (assetPrices(address))
///      so it can be used behind PriceOracleProxy without changes.
///
///      Architecture (inspired by Venus ResilientOracle + Liquity PriceFeed):
///        - Per-asset config: main feed, pivot feed, fallback feed
///        - BoundValidator: cross-validates main vs pivot with configurable bands
///        - Staleness check per feed (AggregatorV3 via updatedAt; MoC via cross-validation)
///        - Circuit breaker: per-asset pause controlled by Pause Guardian
///        - lastGoodPrice: cached last valid price with mandatory maximum age expiry
///        - Fixed price escape hatch: admin can set a fixed price for emergencies
///        - Fail-closed: reverts on deviation/bounds failure instead of serving stale data
///        - Degraded mode: when pivot is unavailable, uses lastGoodPrice (not unvalidated feeds)
///
///      MoC design note: Money on Chain's peek() does not expose timestamps. Staleness
///      for MoC feeds is enforced indirectly through cross-validation against the pivot
///      (which does have timestamps) and deviation checks against lastGoodPrice. This is
///      intentional — any on-chain staleness tracker for MoC would be artificial and
///      bypassable, providing false security.
///
///      Roles:
///        - admin: Timelock controller (24h). Configures assets, feeds, bounds.
///        - pauseGuardian: Timelock Pause. Can only pause/unpause per asset.

// =============================================================================
// Interfaces
// =============================================================================

/// @notice Chainlink-compatible AggregatorV3Interface (used by RedStone, APRO, etc.)
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

/// @notice Money on Chain price provider interface
interface PriceProviderMoC {
    function peek() external view returns (bytes32, bool);
}

// =============================================================================
// Main Contract
// =============================================================================

contract ResilientPriceOracleAdapter {

    // =========================================================================
    // Constants
    // =========================================================================

    /// @notice Precision for price ratios and bounds (1e18 = 100%)
    uint256 public constant RATIO_PRECISION = 1e18;

    /// @notice Maximum allowed bound ratio (200% = 2x)
    uint256 public constant MAX_UPPER_BOUND = 2e18;

    /// @notice Minimum allowed bound ratio (50% = 0.5x)
    uint256 public constant MIN_LOWER_BOUND = 5e17;

    /// @notice Maximum deviation threshold in basis points (5000 = 50%)
    uint256 public constant MAX_DEVIATION_BPS = 5000;

    /// @notice Minimum deviation threshold in basis points (100 = 1%)
    uint256 public constant MIN_DEVIATION_BPS = 100;

    /// @notice Basis points precision
    uint256 public constant BPS_PRECISION = 10000;

    /// @notice Minimum allowed lastGoodPrice max age (1 hour)
    uint256 public constant MIN_LAST_GOOD_PRICE_AGE = 1 hours;

    /// @notice Maximum allowed lastGoodPrice max age (7 days)
    uint256 public constant MAX_LAST_GOOD_PRICE_AGE = 7 days;

    /// @notice Maximum sane price after scaling (1e30 = 1 trillion at 18 decimals)
    /// @dev Any price above this after scaling to 18 decimals is rejected as invalid.
    ///      This prevents overflow in multiplication operations downstream.
    uint256 public constant MAX_SANE_PRICE = 1e30;

    /// @notice Minimum delay between lastGoodPrice updates (1 Rootstock block ~30s)
    /// @dev Prevents multiple cache updates in the same block to mitigate ratcheting attacks.
    uint256 public constant MIN_UPDATE_DELAY = 30;

    // =========================================================================
    // Enums
    // =========================================================================

    /// @notice Type of oracle feed
    enum FeedType {
        AGGREGATOR_V3,  // RedStone, APRO, Chainlink-compatible
        MOC,            // Money on Chain
        FIXED_PRICE     // Emergency fixed price
    }

    // =========================================================================
    // Structs
    // =========================================================================

    /// @notice Configuration for a single oracle feed source
    /// @dev For AGGREGATOR_V3: feedDecimals stored at config time, not queried live.
    ///      For MOC: feedDecimals ignored (MoC returns 18 decimals natively).
    ///      For MOC: maxStaleness ignored (MoC has no timestamp; validated via cross-check).
    ///      For FIXED_PRICE: feedDecimals and maxStaleness ignored.
    struct FeedConfig {
        address feedAddress;     // Address of the oracle contract (or unused for FIXED)
        FeedType feedType;       // Type of the feed
        uint256 maxStaleness;    // Max seconds before price is considered stale (AggregatorV3 only)
        uint256 fixedPrice;      // Only used when feedType == FIXED_PRICE
        uint8 feedDecimals;      // Decimals of the feed (AggregatorV3 only, stored at config time)
        bool enabled;            // Whether this feed is active
    }

    /// @notice Per-asset oracle configuration
    struct AssetConfig {
        FeedConfig main;              // Primary price source
        FeedConfig pivot;             // Validation/cross-check source
        FeedConfig fallback_;         // Backup source
        uint256 upperBoundRatio;      // Max allowed ratio main/pivot (e.g., 1.10e18 = 110%)
        uint256 lowerBoundRatio;      // Min allowed ratio main/pivot (e.g., 0.90e18 = 90%)
        uint256 maxDeviationBps;      // Max price change vs lastGoodPrice (mandatory, never 0)
        uint256 lastGoodPrice;        // Last validated price (safety net)
        uint256 lastUpdateTimestamp;   // Timestamp of last successful price validation
        uint256 lastGoodPriceMaxAge;  // Max seconds lastGoodPrice can be used without refresh
        bool paused;                  // Per-asset circuit breaker
        bool configured;              // Whether this asset has been configured
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Admin address (Timelock controller)
    address public admin;

    /// @notice Pause Guardian address (multisig)
    address public pauseGuardian;

    /// @notice Global pause flag
    bool public globalPaused;

    /// @notice cToken address => AssetConfig
    mapping(address => AssetConfig) public assetConfigs;

    /// @notice List of configured cToken addresses (for enumeration)
    address[] public configuredAssets;

    // =========================================================================
    // Events
    // =========================================================================

    event AssetConfigured(
        address indexed cToken,
        address mainFeed,
        address pivotFeed,
        address fallbackFeed
    );

    event BoundsUpdated(
        address indexed cToken,
        uint256 upperBoundRatio,
        uint256 lowerBoundRatio
    );

    event MaxDeviationUpdated(address indexed cToken, uint256 maxDeviationBps);

    event FeedUpdated(
        address indexed cToken,
        string feedRole,
        address feedAddress,
        FeedType feedType
    );

    event AssetPaused(address indexed cToken);
    event AssetUnpaused(address indexed cToken);
    event GlobalPaused();
    event GlobalUnpaused();

    event LastGoodPriceUpdated(address indexed cToken, uint256 price);
    event LastGoodPriceMaxAgeUpdated(address indexed cToken, uint256 maxAge);

    event FixedPriceSet(address indexed cToken, string feedRole, uint256 price);

    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event PauseGuardianUpdated(address indexed oldGuardian, address indexed newGuardian);

    // =========================================================================
    // Errors
    // =========================================================================

    error OnlyAdmin();
    error OnlyPauseGuardian();
    error OnlyAdminOrGuardian();
    error AssetNotConfigured(address cToken);
    error InvalidAddress();
    error InvalidBounds();
    error InvalidDeviation();
    error InvalidStaleness();
    error InvalidFixedPrice();
    error InvalidDecimals();
    error InvalidMaxAge();
    error PriceUnavailable(address cToken);
    error LastGoodPriceExpired(address cToken);
    error AssetAlreadyConfigured(address cToken);

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyPauseGuardian() {
        if (msg.sender != pauseGuardian) revert OnlyPauseGuardian();
        _;
    }

    modifier onlyAdminOrGuardian() {
        if (msg.sender != admin && msg.sender != pauseGuardian) revert OnlyAdminOrGuardian();
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    /// @param admin_ Address of the timelock controller (24h)
    /// @param pauseGuardian_ Address of the pause guardian multisig
    constructor(address admin_, address pauseGuardian_) {
        if (admin_ == address(0) || pauseGuardian_ == address(0)) revert InvalidAddress();
        admin = admin_;
        pauseGuardian = pauseGuardian_;
    }

    // =========================================================================
    // External — Price Query (called by PriceOracleProxy)
    // =========================================================================

    /// @notice Get the price of an asset. Compatible with PriceOracleAdapter interface.
    /// @param cToken The cToken address to get the price for
    /// @return price The underlying asset price mantissa (scaled by 1e18).
    /// @dev Reverts if no valid price is available or asset is not configured.
    function assetPrices(address cToken) external view returns (uint256) {
        AssetConfig storage config = assetConfigs[cToken];

        if (!config.configured) revert AssetNotConfigured(cToken);

        if (globalPaused || config.paused) {
            return _getLastGoodPriceOrRevert(cToken, config);
        }

        (uint256 price, ) = _getValidatedPrice(config);
        if (price == 0) revert PriceUnavailable(cToken);
        return price;
    }

    // =========================================================================
    // External — State-Changing Price Query (keeper/monitor)
    // =========================================================================

    /// @notice Get price AND update lastGoodPrice. Call from a keeper/monitor.
    /// @dev Updates lastGoodPrice/lastUpdateTimestamp ONLY when price is cross-validated
    ///      (pivot available). Degraded-mode prices are served but don't refresh the cache,
    ///      preventing attackers from ratcheting lastGoodPrice during pivot outages.
    ///      Enforces MIN_UPDATE_DELAY between cache updates to prevent same-block ratcheting.
    /// @param cToken The cToken address
    /// @return price The validated price
    function getAndUpdatePrice(address cToken) external returns (uint256) {
        AssetConfig storage config = assetConfigs[cToken];

        if (!config.configured) revert AssetNotConfigured(cToken);

        if (globalPaused || config.paused) {
            return _getLastGoodPriceOrRevert(cToken, config);
        }

        (uint256 price, bool crossValidated) = _getValidatedPrice(config);
        if (price == 0) revert PriceUnavailable(cToken);

        // Only update cache when price was cross-validated against pivot.
        // Degraded-mode prices are served to callers but don't shift the baseline,
        // preventing ratcheting attacks during pivot outages.
        if (crossValidated) {
            // Enforce minimum delay between cache updates to prevent same-block ratcheting
            if (block.timestamp - config.lastUpdateTimestamp >= MIN_UPDATE_DELAY) {
                config.lastUpdateTimestamp = block.timestamp;

                if (price != config.lastGoodPrice) {
                    config.lastGoodPrice = price;
                    emit LastGoodPriceUpdated(cToken, price);
                }
            }
        }

        return price;
    }

    // =========================================================================
    // Internal — Price Resolution Logic
    // =========================================================================

    /// @dev Core price resolution logic.
    ///
    ///      Normal mode (pivot available):
    ///        main -> validate vs pivot + deviation -> accept (crossValidated = true)
    ///        if main fails bounds -> fallback -> validate vs pivot + deviation -> accept
    ///
    ///      Degraded mode (pivot unavailable):
    ///        main -> deviation check only (no bounds) -> accept (crossValidated = false)
    ///        fallback -> deviation check only -> accept (crossValidated = false)
    ///        This keeps the protocol operational with real market data from MoC/APRO
    ///        during pivot (RedStone) outages. The mandatory deviation check (min 1%)
    ///        limits how far the price can move from the last validated value.
    ///
    ///      Fail-closed: returns 0 on deviation failure (caller reverts).
    ///      lastGoodPrice returned only when all feeds fail AND cache not expired.
    ///
    /// @return price The validated price (0 if unavailable)
    /// @return crossValidated True if the price was validated against the pivot feed
    function _getValidatedPrice(
        AssetConfig storage config
    ) internal view returns (uint256, bool) {

        // Step 1: Read main and pivot
        (uint256 mainPrice, bool mainValid) = _readFeed(config.main);
        (uint256 pivotPrice, bool pivotValid) = _readFeed(config.pivot);

        // Step 2: If main is valid, try to use it
        if (mainValid && mainPrice > 0) {

            if (pivotValid && pivotPrice > 0) {
                // Normal mode: cross-validate main against pivot
                if (_safeValidateBounds(mainPrice, pivotPrice, config.upperBoundRatio, config.lowerBoundRatio)) {
                    if (_safeCheckDeviation(mainPrice, config.lastGoodPrice, config.maxDeviationBps)) {
                        return (mainPrice, true);
                    }
                    // Deviation exceeded -> fail closed
                    return (0, false);
                }
                // Main failed bounds -> try fallback below
            } else {
                // Degraded mode: pivot unavailable, accept main with deviation check only
                if (_safeCheckDeviation(mainPrice, config.lastGoodPrice, config.maxDeviationBps)) {
                    return (mainPrice, false);
                }
                // Deviation exceeded -> fail closed
                return (0, false);
            }
        }

        // Step 3: Try fallback
        (uint256 fallbackPrice, bool fallbackValid) = _readFeed(config.fallback_);

        if (fallbackValid && fallbackPrice > 0) {
            if (pivotValid && pivotPrice > 0) {
                // Normal mode: cross-validate fallback against pivot
                if (_safeValidateBounds(fallbackPrice, pivotPrice, config.upperBoundRatio, config.lowerBoundRatio)) {
                    if (_safeCheckDeviation(fallbackPrice, config.lastGoodPrice, config.maxDeviationBps)) {
                        return (fallbackPrice, true);
                    }
                    return (0, false);
                }
            } else {
                // Degraded mode: pivot unavailable, accept fallback with deviation check only
                if (_safeCheckDeviation(fallbackPrice, config.lastGoodPrice, config.maxDeviationBps)) {
                    return (fallbackPrice, false);
                }
                return (0, false);
            }
        }

        // Step 4: All feeds failed or all prices rejected. Use lastGoodPrice if not expired.
        if (config.lastGoodPrice > 0 && _isLastGoodPriceValid(config)) {
            return (config.lastGoodPrice, false);
        }

        return (0, false);
    }

    /// @dev Read a price from a feed based on its type
    function _readFeed(FeedConfig storage feed) internal view returns (uint256 price, bool valid) {
        if (!feed.enabled) {
            return (0, false);
        }

        if (feed.feedType == FeedType.FIXED_PRICE) {
            if (feed.fixedPrice > 0 && feed.fixedPrice <= MAX_SANE_PRICE) {
                return (feed.fixedPrice, true);
            }
            return (0, false);
        }

        if (feed.feedType == FeedType.MOC) {
            return _readMoC(feed);
        }

        if (feed.feedType == FeedType.AGGREGATOR_V3) {
            return _readAggregatorV3(feed);
        }

        return (0, false);
    }

    /// @dev Read price from AggregatorV3Interface (RedStone, APRO, etc.)
    ///      Uses stored feedDecimals instead of querying decimals() live.
    ///      All arithmetic that could overflow is inside the try block so reverts
    ///      are caught and treated as feed failure, not oracle-wide failure.
    function _readAggregatorV3(FeedConfig storage feed) internal view returns (uint256, bool) {
        try this.readAggregatorV3External(feed.feedAddress, feed.maxStaleness, feed.feedDecimals)
            returns (uint256 price, bool valid)
        {
            return (price, valid);
        } catch {
            return (0, false);
        }
    }

    /// @dev External helper for _readAggregatorV3 to enable try/catch on internal arithmetic.
    ///      This function is called via this.readAggregatorV3External() so that any revert
    ///      (including overflow in scaling) is caught by the caller's try/catch.
    /// @notice DO NOT call directly. This is an internal implementation detail exposed
    ///         as external solely to enable try/catch on arithmetic operations.
    function readAggregatorV3External(
        address feedAddress,
        uint256 maxStaleness,
        uint8 feedDecimals
    ) external view returns (uint256, bool) {
        // Only callable by self
        require(msg.sender == address(this), "internal only");

        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = AggregatorV3Interface(feedAddress).latestRoundData();

        // Validation: price must be positive
        if (answer <= 0) return (0, false);

        // Validation: updatedAt must be valid
        if (updatedAt == 0 || updatedAt > block.timestamp) return (0, false);

        // Validation: staleness check
        if (block.timestamp - updatedAt > maxStaleness) return (0, false);

        // Scale to 18 decimals (can overflow for extreme values — caught by caller's try/catch)
        uint256 price = _scaleToE18(uint256(answer), feedDecimals);

        // Sanity cap
        if (price == 0 || price > MAX_SANE_PRICE) return (0, false);

        return (price, true);
    }

    /// @dev Read price from Money on Chain PriceProvider.
    ///      MoC does not expose timestamps. Staleness is enforced indirectly:
    ///      - Cross-validation against pivot (which has timestamps) catches divergence
    ///      - Deviation check against lastGoodPrice catches large stale drifts
    ///      - lastGoodPrice expiry ensures cached prices don't live forever
    function _readMoC(FeedConfig storage feed) internal view returns (uint256, bool) {
        try PriceProviderMoC(feed.feedAddress).peek() returns (bytes32 price, bool has) {
            if (!has) return (0, false);

            uint256 priceUint = uint256(price);
            if (priceUint == 0 || priceUint > MAX_SANE_PRICE) return (0, false);

            // MoC returns price already in 18 decimals
            return (priceUint, true);
        } catch {
            return (0, false);
        }
    }

    /// @dev Scale price from native decimals to 18 decimals. Pure, no external call.
    ///      Can revert on overflow for extreme values — caller must handle via try/catch.
    function _scaleToE18(uint256 price, uint8 feedDecimals) internal pure returns (uint256) {
        if (feedDecimals < 18) {
            return price * (10 ** (18 - feedDecimals));
        } else if (feedDecimals > 18) {
            return price / (10 ** (feedDecimals - 18));
        }
        return price;
    }

    // =========================================================================
    // Internal — Validation (overflow-safe wrappers)
    // =========================================================================

    /// @dev Overflow-safe bound validation. Returns false on overflow instead of reverting.
    function _safeValidateBounds(
        uint256 mainPrice,
        uint256 pivotPrice,
        uint256 upperBound,
        uint256 lowerBound
    ) internal pure returns (bool) {
        if (pivotPrice == 0) return false;

        // Check for overflow: mainPrice * RATIO_PRECISION
        // Max safe mainPrice for multiplication: type(uint256).max / RATIO_PRECISION
        if (mainPrice > type(uint256).max / RATIO_PRECISION) return false;

        uint256 ratio = (mainPrice * RATIO_PRECISION) / pivotPrice;
        return ratio >= lowerBound && ratio <= upperBound;
    }

    /// @dev Overflow-safe deviation check. Returns false on overflow instead of reverting.
    function _safeCheckDeviation(
        uint256 newPrice,
        uint256 lastPrice,
        uint256 maxDevBps
    ) internal pure returns (bool) {
        // maxDeviationBps is mandatory (never 0), but handle gracefully
        if (lastPrice == 0) return true;

        uint256 diff = newPrice > lastPrice ? newPrice - lastPrice : lastPrice - newPrice;

        // Check for overflow: diff * BPS_PRECISION
        if (diff > type(uint256).max / BPS_PRECISION) return false;

        uint256 deviationBps = (diff * BPS_PRECISION) / lastPrice;

        return deviationBps <= maxDevBps;
    }

    /// @dev Check if lastGoodPrice is still within its maximum age
    function _isLastGoodPriceValid(AssetConfig storage config) internal view returns (bool) {
        return (block.timestamp - config.lastUpdateTimestamp) <= config.lastGoodPriceMaxAge;
    }

    /// @dev Get lastGoodPrice or revert if expired/zero
    function _getLastGoodPriceOrRevert(
        address cToken,
        AssetConfig storage config
    ) internal view returns (uint256) {
        if (config.lastGoodPrice == 0) revert PriceUnavailable(cToken);
        if (!_isLastGoodPriceValid(config)) revert LastGoodPriceExpired(cToken);
        return config.lastGoodPrice;
    }

    // =========================================================================
    // Admin — Asset Configuration
    // =========================================================================

    /// @notice Configure a new asset with all three feed sources
    function configureAsset(
        address cToken,
        FeedConfig calldata main,
        FeedConfig calldata pivot,
        FeedConfig calldata fallback_,
        uint256 upperBoundRatio,
        uint256 lowerBoundRatio,
        uint256 maxDeviationBps,
        uint256 initialPrice,
        uint256 lastGoodPriceMaxAge
    ) external onlyAdmin {
        if (cToken == address(0)) revert InvalidAddress();
        if (assetConfigs[cToken].configured) revert AssetAlreadyConfigured(cToken);

        _validateBoundParams(upperBoundRatio, lowerBoundRatio);
        _validateDeviationBps(maxDeviationBps);
        if (initialPrice == 0 || initialPrice > MAX_SANE_PRICE) revert InvalidFixedPrice();
        _validateMaxAge(lastGoodPriceMaxAge);
        _validateFeedConfig(main);
        _validateFeedConfig(pivot);
        _validateFeedConfig(fallback_);

        AssetConfig storage config = assetConfigs[cToken];
        config.main = main;
        config.pivot = pivot;
        config.fallback_ = fallback_;
        config.upperBoundRatio = upperBoundRatio;
        config.lowerBoundRatio = lowerBoundRatio;
        config.maxDeviationBps = maxDeviationBps;
        config.lastGoodPrice = initialPrice;
        config.lastUpdateTimestamp = block.timestamp;
        config.lastGoodPriceMaxAge = lastGoodPriceMaxAge;
        config.configured = true;

        configuredAssets.push(cToken);

        emit AssetConfigured(cToken, main.feedAddress, pivot.feedAddress, fallback_.feedAddress);
        emit BoundsUpdated(cToken, upperBoundRatio, lowerBoundRatio);
        emit MaxDeviationUpdated(cToken, maxDeviationBps);
        emit LastGoodPriceUpdated(cToken, initialPrice);
        emit LastGoodPriceMaxAgeUpdated(cToken, lastGoodPriceMaxAge);
    }

    /// @notice Update a specific feed for an asset
    function updateFeed(
        address cToken,
        string calldata feedRole,
        FeedConfig calldata newFeed
    ) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        _validateFeedConfig(newFeed);

        bytes32 role = keccak256(bytes(feedRole));
        if (role == keccak256("main")) {
            config.main = newFeed;
        } else if (role == keccak256("pivot")) {
            config.pivot = newFeed;
        } else if (role == keccak256("fallback")) {
            config.fallback_ = newFeed;
        } else {
            revert("Invalid feed role");
        }

        emit FeedUpdated(cToken, feedRole, newFeed.feedAddress, newFeed.feedType);
    }

    /// @notice Update bound ratios for an asset
    function updateBounds(
        address cToken,
        uint256 upperBoundRatio,
        uint256 lowerBoundRatio
    ) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        _validateBoundParams(upperBoundRatio, lowerBoundRatio);

        config.upperBoundRatio = upperBoundRatio;
        config.lowerBoundRatio = lowerBoundRatio;

        emit BoundsUpdated(cToken, upperBoundRatio, lowerBoundRatio);
    }

    /// @notice Update max deviation threshold for an asset
    function updateMaxDeviation(address cToken, uint256 maxDeviationBps) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        _validateDeviationBps(maxDeviationBps);

        config.maxDeviationBps = maxDeviationBps;

        emit MaxDeviationUpdated(cToken, maxDeviationBps);
    }

    /// @notice Update lastGoodPrice maximum age for an asset
    function updateLastGoodPriceMaxAge(address cToken, uint256 maxAge) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        _validateMaxAge(maxAge);

        config.lastGoodPriceMaxAge = maxAge;

        emit LastGoodPriceMaxAgeUpdated(cToken, maxAge);
    }

    /// @notice Emergency: set a fixed price for an asset's feed
    function setFixedPrice(
        address cToken,
        string calldata feedRole,
        uint256 price
    ) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        if (price == 0 || price > MAX_SANE_PRICE) revert InvalidFixedPrice();

        FeedConfig memory fixedFeed = FeedConfig({
            feedAddress: address(0),
            feedType: FeedType.FIXED_PRICE,
            maxStaleness: 0,
            fixedPrice: price,
            feedDecimals: 18,
            enabled: true
        });

        bytes32 role = keccak256(bytes(feedRole));
        if (role == keccak256("main")) {
            config.main = fixedFeed;
        } else if (role == keccak256("pivot")) {
            config.pivot = fixedFeed;
        } else if (role == keccak256("fallback")) {
            config.fallback_ = fixedFeed;
        } else {
            revert("Invalid feed role");
        }

        emit FixedPriceSet(cToken, feedRole, price);
    }

    /// @notice Force-update the lastGoodPrice for an asset (emergency use)
    function setLastGoodPrice(address cToken, uint256 price) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        if (price == 0 || price > MAX_SANE_PRICE) revert InvalidFixedPrice();

        config.lastGoodPrice = price;
        config.lastUpdateTimestamp = block.timestamp;

        emit LastGoodPriceUpdated(cToken, price);
    }

    // =========================================================================
    // Pause Guardian — Circuit Breaker
    // =========================================================================

    function pauseAsset(address cToken) external onlyPauseGuardian {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        config.paused = true;
        emit AssetPaused(cToken);
    }

    function unpauseAsset(address cToken) external onlyAdminOrGuardian {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        config.paused = false;
        emit AssetUnpaused(cToken);
    }

    function pauseGlobal() external onlyPauseGuardian {
        globalPaused = true;
        emit GlobalPaused();
    }

    function unpauseGlobal() external onlyAdminOrGuardian {
        globalPaused = false;
        emit GlobalUnpaused();
    }

    // =========================================================================
    // Admin — Role Management
    // =========================================================================

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress();
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(oldAdmin, newAdmin);
    }

    function setPauseGuardian(address newGuardian) external onlyAdmin {
        if (newGuardian == address(0)) revert InvalidAddress();
        address oldGuardian = pauseGuardian;
        pauseGuardian = newGuardian;
        emit PauseGuardianUpdated(oldGuardian, newGuardian);
    }

    // =========================================================================
    // View — Diagnostics
    // =========================================================================

    function configuredAssetsCount() external view returns (uint256) {
        return configuredAssets.length;
    }

    function getAssetConfig(address cToken) external view returns (
        bool configured,
        bool paused,
        uint256 upperBoundRatio,
        uint256 lowerBoundRatio,
        uint256 maxDeviationBps,
        uint256 lastGoodPrice,
        uint256 lastUpdateTimestamp,
        uint256 lastGoodPriceMaxAge
    ) {
        AssetConfig storage config = assetConfigs[cToken];
        return (
            config.configured,
            config.paused,
            config.upperBoundRatio,
            config.lowerBoundRatio,
            config.maxDeviationBps,
            config.lastGoodPrice,
            config.lastUpdateTimestamp,
            config.lastGoodPriceMaxAge
        );
    }

    function readFeedDirect(address cToken, string calldata feedRole)
        external view returns (uint256 price, bool valid)
    {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);

        bytes32 role = keccak256(bytes(feedRole));
        if (role == keccak256("main")) return _readFeed(config.main);
        else if (role == keccak256("pivot")) return _readFeed(config.pivot);
        else if (role == keccak256("fallback")) return _readFeed(config.fallback_);
        else revert("Invalid feed role");
    }

    function diagnosePrice(address cToken) external view returns (
        uint256 price,
        uint256 mainPrice,
        bool mainValid,
        uint256 pivotPrice,
        bool pivotValid,
        uint256 fallbackPrice,
        bool fallbackValid,
        bool lastGoodPriceStillValid
    ) {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);

        (mainPrice, mainValid) = _readFeed(config.main);
        (pivotPrice, pivotValid) = _readFeed(config.pivot);
        (fallbackPrice, fallbackValid) = _readFeed(config.fallback_);
        lastGoodPriceStillValid = _isLastGoodPriceValid(config);
        (price, ) = _getValidatedPrice(config);
    }

    // =========================================================================
    // Internal — Validation Helpers
    // =========================================================================

    function _validateBoundParams(uint256 upper, uint256 lower) internal pure {
        if (upper > MAX_UPPER_BOUND || upper < RATIO_PRECISION) revert InvalidBounds();
        if (lower < MIN_LOWER_BOUND || lower > RATIO_PRECISION) revert InvalidBounds();
        if (lower >= upper) revert InvalidBounds();
    }

    function _validateDeviationBps(uint256 devBps) internal pure {
        if (devBps < MIN_DEVIATION_BPS || devBps > MAX_DEVIATION_BPS) revert InvalidDeviation();
    }

    function _validateMaxAge(uint256 maxAge) internal pure {
        if (maxAge < MIN_LAST_GOOD_PRICE_AGE || maxAge > MAX_LAST_GOOD_PRICE_AGE) {
            revert InvalidMaxAge();
        }
    }

    function _validateFeedConfig(FeedConfig calldata feed) internal pure {
        if (feed.feedType == FeedType.FIXED_PRICE) {
            if (feed.enabled && (feed.fixedPrice == 0 || feed.fixedPrice > MAX_SANE_PRICE)) {
                revert InvalidFixedPrice();
            }
        } else if (feed.feedType == FeedType.AGGREGATOR_V3) {
            if (feed.enabled) {
                if (feed.feedAddress == address(0)) revert InvalidAddress();
                if (feed.maxStaleness == 0) revert InvalidStaleness();
                if (feed.feedDecimals == 0 || feed.feedDecimals > 24) revert InvalidDecimals();
            }
        } else if (feed.feedType == FeedType.MOC) {
            if (feed.enabled) {
                if (feed.feedAddress == address(0)) revert InvalidAddress();
            }
        }
    }
}
