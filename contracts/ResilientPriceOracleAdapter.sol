// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title ResilientPriceOracleAdapter
/// @author Tropykus Finance
/// @notice Stateless multi-source price oracle adapter with 2-of-3 cross-validation
///         and fail-closed behavior. Designed for Compound V2 fork on Rootstock.
/// @dev Implements the same external interface as PriceOracleAdapter (assetPrices(address))
///      so it can be used behind PriceOracleProxy without changes.
///
///      Architecture (stateless 2-of-3 majority validation):
///        - Per-asset config: main feed, pivot feed, fallback feed
///        - A price is served ONLY when two live sources agree within the configured
///          bounds. On-chain the sources are guaranteed to be DISTINCT CONTRACTS
///          (_validateDistinctFeeds); their DATA independence (operator, methodology,
///          upstream market) cannot be proven on-chain and is an explicit operational
///          requirement of feed selection — see _validateDistinctFeeds.
///          Validation pairs are tried in priority order:
///            1. main  vs pivot     -> serve main
///            2. fallback vs pivot  -> serve fallback
///            3. main  vs fallback  -> serve main (covers pivot outage AND pivot-as-outlier)
///        - No price cache, no lastGoodPrice, no keeper, no external maintenance.
///          The oracle holds zero price state; every read is validated fresh.
///        - Staleness per feed (AggregatorV3 via updatedAt; MoC via cross-validation,
///          see MoC design note below)
///        - Circuit breaker: per-asset and global pause. While paused, price queries
///          REVERT (no cached price exists to serve). Pause = full market freeze.
///        - Fixed price escape hatch: admin can set a FIXED_PRICE main feed which is
///          served directly WITHOUT cross-validation (explicit, timelocked override
///          for emergencies and wind-down exits). FIXED_PRICE is only allowed on the
///          main role; pivot and fallback must always be live market sources.
///        - Fail-closed: if no validation pair agrees, assetPrices reverts.
///
///      MoC design note: Money on Chain's peek() does not expose timestamps. A frozen
///      MoC feed (still answering has==true with its last value) is detected because
///      MoC prices are NEVER served alone: they must agree with at least one
///      timestamped aggregator feed (pivot or fallback). If the market moves while
///      MoC is frozen, the live aggregator diverges, no pair agrees, and the oracle
///      fails closed. This is BOUNDED staleness detection, not per-read freshness:
///      while the market stays within the configured band of the frozen value, the
///      stale MoC price keeps being served (and, by pair priority, wins over a fresh
///      pivot/fallback agreement). The maximum error a frozen MoC feed can introduce
///      is therefore the band width — configure narrow per-asset bounds to keep that
///      window small, and monitor MoC liveness off-chain. Consequently, if ALL
///      aggregator feeds are down, MoC alone is not served — this is an intentional
///      conservative trade-off.
///
///      Roles:
///        - admin: Timelock controller (24h). Configures assets, feeds, bounds,
///          fixed-price overrides, and is the ONLY role that can unpause.
///          Admin transfer is two-step (pending/accept) to prevent bricking.
///        - pauseGuardian: fast-response pause multisig. Can ONLY pause
///          (per asset or global). Cannot unpause, cannot touch prices or config.

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

/// @notice Minimal CErc20 interface to discover a cToken's underlying token.
///         Native-asset cTokens (cRBTC) do not implement it.
interface CErc20Like {
    function underlying() external view returns (address);
}

/// @notice Minimal EIP-20 interface to read the underlying token's decimals.
interface EIP20Like {
    function decimals() external view returns (uint8);
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

    /// @notice Maximum allowed upper bound ratio (125% = 1.25x).
    /// @dev Guardrail on configuration, not an operating band: no asset can be
    ///      configured to treat feeds differing by more than 25% as "agreeing".
    ///      Immutable by design (protects against admin fat-finger/compromise);
    ///      changing it requires deploying a new adapter behind the proxy.
    uint256 public constant MAX_UPPER_BOUND = 1.25e18;

    /// @notice Minimum allowed lower bound ratio (80% = 0.8x). Same guardrail semantics.
    uint256 public constant MIN_LOWER_BOUND = 8e17;

    /// @notice Maximum sane price after scaling (1e30 = 1 trillion at 18 decimals)
    /// @dev Any price above this after scaling to 18 decimals is rejected as invalid.
    ///      This prevents overflow in multiplication operations downstream.
    uint256 public constant MAX_SANE_PRICE = 1e30;

    /// @notice Upper guardrail for per-feed maxStaleness (7 days).
    /// @dev The whole freshness model (including "MoC never served alone") rests on
    ///      maxStaleness. Without a ceiling, an admin could configure an effectively
    ///      infinite staleness, letting a frozen aggregator validate against a frozen
    ///      MoC feed. This caps the parameter the security model depends on. Immutable,
    ///      same rationale as the bound guardrails. Operating values are far lower
    ///      (minutes); 7 days is a generous outer limit, not a recommended setting.
    uint256 public constant MAX_STALENESS = 7 days;

    // =========================================================================
    // Enums
    // =========================================================================

    /// @notice Type of oracle feed
    enum FeedType {
        AGGREGATOR_V3,  // RedStone, APRO, Chainlink-compatible
        MOC,            // Money on Chain
        FIXED_PRICE     // Emergency fixed price (main role only)
    }

    /// @notice Which validation path produced the price (diagnostics)
    enum PricePath {
        NONE,           // No valid price (assetPrices would revert)
        FIXED_OVERRIDE, // main is FIXED_PRICE, served directly
        MAIN_PIVOT,     // main cross-validated against pivot
        FALLBACK_PIVOT, // fallback cross-validated against pivot
        MAIN_FALLBACK   // main cross-validated against fallback (pivot down/outlier)
    }

    // =========================================================================
    // Structs
    // =========================================================================

    /// @notice Configuration for a single oracle feed source
    /// @dev For AGGREGATOR_V3: feedDecimals is verified on-chain against the feed's
    ///      decimals() at configuration time, then stored (not queried live on reads).
    ///      For MOC: feedDecimals ignored (MoC returns 18 decimals natively).
    ///      For MOC: maxStaleness ignored (MoC has no timestamp; validated via cross-check).
    ///      For FIXED_PRICE: feedAddress, feedDecimals and maxStaleness ignored.
    struct FeedConfig {
        address feedAddress;     // Address of the oracle contract (or unused for FIXED)
        FeedType feedType;       // Type of the feed
        uint256 maxStaleness;    // Max seconds before price is considered stale (AggregatorV3 only)
        uint256 fixedPrice;      // Only used when feedType == FIXED_PRICE
        uint8 feedDecimals;      // Decimals of the feed (AggregatorV3 only, verified at config time)
        bool enabled;            // Whether this feed is active
    }

    /// @notice Per-asset oracle configuration
    struct AssetConfig {
        FeedConfig main;              // Primary price source
        FeedConfig pivot;             // Validation/cross-check source (live feed only)
        FeedConfig fallback_;         // Backup source (live feed only)
        uint256 upperBoundRatio;      // Max allowed ratio between paired feeds (e.g., 1.10e18)
        uint256 lowerBoundRatio;      // Min allowed ratio between paired feeds (e.g., 0.90e18)
        bool paused;                  // Per-asset circuit breaker
        bool configured;              // Whether this asset has been configured
    }

    // =========================================================================
    // State
    // =========================================================================

    /// @notice Admin address (Timelock controller)
    address public admin;

    /// @notice Pending admin for two-step transfer
    address public pendingAdmin;

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

    /// @notice Emitted when admin sets a fixed-price override on the main feed.
    ///         Distinct event for monitoring: this bypasses all cross-validation.
    event FixedPriceOverrideSet(address indexed cToken, uint256 price);

    event NewPendingAdmin(address indexed oldPendingAdmin, address indexed newPendingAdmin);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event PauseGuardianUpdated(address indexed oldGuardian, address indexed newGuardian);

    // =========================================================================
    // Errors
    // =========================================================================

    error OnlyAdmin();
    error OnlyPendingAdmin();
    error OnlyAdminOrGuardian();
    error AssetNotConfigured(address cToken);
    error AssetAlreadyConfigured(address cToken);
    error InvalidAddress();
    error InvalidBounds();
    error InvalidStaleness();
    error FeedNotEnabled();
    error InvalidFixedPrice();
    error InvalidDecimals();
    error InvalidUnderlyingDecimals();
    error InvalidFeedRole();
    error FeedTypeNotAllowedForRole();
    error DuplicateFeedAddress();
    error PriceUnavailable(address cToken);
    error OraclePaused(address cToken);

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
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
    /// @dev Reverts if the asset is not configured, is paused, or no validation
    ///      pair agrees (fail-closed). This function is stateless: it never reads
    ///      or writes any cached price.
    function assetPrices(address cToken) external view returns (uint256) {
        AssetConfig storage config = assetConfigs[cToken];

        if (!config.configured) revert AssetNotConfigured(cToken);

        if (globalPaused || config.paused) revert OraclePaused(cToken);

        (uint256 price, ) = _getValidatedPrice(config);
        if (price == 0) revert PriceUnavailable(cToken);
        return price;
    }

    // =========================================================================
    // Internal — Price Resolution Logic (stateless 2-of-3)
    // =========================================================================

    /// @dev Core price resolution. A price is accepted only if two live sources
    ///      agree within bounds, except for the explicit FIXED_PRICE admin override.
    ///
    ///      Resolution order:
    ///        0. main is FIXED_PRICE  -> serve fixedPrice (admin override, no validation)
    ///        1. main  agrees with pivot     -> serve main
    ///        2. fallback agrees with pivot  -> serve fallback
    ///        3. main  agrees with fallback  -> serve main
    ///           (covers pivot outage; also covers pivot reporting an outlier price,
    ///            since main+fallback then form the 2-of-3 majority)
    ///        4. no pair agrees -> (0, NONE) -> caller reverts (fail-closed)
    ///
    /// @return price The validated price (0 if unavailable)
    /// @return path Which validation pair produced the price (diagnostics)
    function _getValidatedPrice(
        AssetConfig storage config
    ) internal view returns (uint256, PricePath) {

        // Step 0: explicit admin override — FIXED_PRICE on main bypasses validation.
        // This is the timelocked escape hatch for emergencies and wind-down exits.
        if (config.main.enabled && config.main.feedType == FeedType.FIXED_PRICE) {
            uint256 fixed_ = config.main.fixedPrice;
            if (fixed_ > 0 && fixed_ <= MAX_SANE_PRICE) {
                return (fixed_, PricePath.FIXED_OVERRIDE);
            }
            return (0, PricePath.NONE);
        }

        (uint256 mainPrice, bool mainValid) = _readFeed(config.main);
        (uint256 pivotPrice, bool pivotValid) = _readFeed(config.pivot);

        // Pair 1: main vs pivot (normal path — fallback not read)
        if (mainValid && pivotValid &&
            _safeValidateBounds(mainPrice, pivotPrice, config.upperBoundRatio, config.lowerBoundRatio)
        ) {
            return (mainPrice, PricePath.MAIN_PIVOT);
        }

        // Primary pair did not validate: now (and only now) consult the fallback.
        (uint256 fallbackPrice, bool fallbackValid) = _readFeed(config.fallback_);

        // Pair 2: fallback vs pivot
        if (fallbackValid && pivotValid &&
            _safeValidateBounds(fallbackPrice, pivotPrice, config.upperBoundRatio, config.lowerBoundRatio)
        ) {
            return (fallbackPrice, PricePath.FALLBACK_PIVOT);
        }

        // Pair 3: main vs fallback (pivot down, or pivot is the 2-of-3 outlier)
        if (mainValid && fallbackValid &&
            _safeValidateBounds(mainPrice, fallbackPrice, config.upperBoundRatio, config.lowerBoundRatio)
        ) {
            return (mainPrice, PricePath.MAIN_FALLBACK);
        }

        // No agreeing pair: fail closed.
        return (0, PricePath.NONE);
    }

    // =========================================================================
    // Internal — Feed Readers
    // =========================================================================

    /// @dev Read a price from a feed based on its type.
    ///      Note: FIXED_PRICE is handled in Step 0 of _getValidatedPrice for the main
    ///      role and is rejected at configuration time for pivot/fallback roles, so
    ///      it is never read through this path.
    function _readFeed(FeedConfig storage feed) internal view returns (uint256 price, bool valid) {
        if (!feed.enabled) {
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

        // Validation: decimals must still match what was verified at configuration time.
        if (AggregatorV3Interface(feedAddress).decimals() != feedDecimals) return (0, false);

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
    ///      MoC does not expose timestamps. Staleness is enforced structurally:
    ///      MoC prices are never served alone — they must agree with a timestamped
    ///      aggregator feed (pivot or fallback) to be accepted. A frozen MoC feed
    ///      is rejected once the market moves outside the validation band of the
    ///      live aggregators; within the band a stale value can still be served,
    ///      so the band width bounds the maximum staleness error (see the MoC
    ///      design note in the contract header).
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
        uint256 priceA,
        uint256 priceB,
        uint256 upperBound,
        uint256 lowerBound
    ) internal pure returns (bool) {
        if (priceB == 0) return false;

        // Check for overflow: priceA * RATIO_PRECISION
        if (priceA > type(uint256).max / RATIO_PRECISION) return false;

        uint256 ratio = (priceA * RATIO_PRECISION) / priceB;
        return ratio >= lowerBound && ratio <= upperBound;
    }

    // =========================================================================
    // Admin — Asset Configuration
    // =========================================================================

    /// @notice Configure a new asset with all three feed sources
    /// @dev Role-type rules (enforce invariant "MoC never served alone"):
    ///        - main: MOC or AGGREGATOR_V3. FIXED_PRICE cannot be configured here;
    ///          the only way to set a fixed-price override is setFixedPrice (single,
    ///          monitored path).
    ///        - pivot, fallback: AGGREGATOR_V3 only (must carry timestamps). This
    ///          guarantees every servable pair contains at least one feed with
    ///          staleness validation, so a frozen MoC feed can never validate
    ///          against another frozen source.
    ///      Enabled feeds must also have distinct addresses across roles, so the
    ///      2-of-3 majority is never two reads of the same source.
    ///      The cToken's underlying must have 18 decimals (see
    ///      _validateUnderlyingDecimals): this adapter always answers in 1e18 and the
    ///      downstream Comptroller math is only correct for 18-decimal underlyings.
    function configureAsset(
        address cToken,
        FeedConfig calldata main,
        FeedConfig calldata pivot,
        FeedConfig calldata fallback_,
        uint256 upperBoundRatio,
        uint256 lowerBoundRatio
    ) external onlyAdmin {
        if (cToken == address(0)) revert InvalidAddress();
        if (assetConfigs[cToken].configured) revert AssetAlreadyConfigured(cToken);
        _validateUnderlyingDecimals(cToken);

        _validateBoundParams(upperBoundRatio, lowerBoundRatio);
        if (main.feedType == FeedType.FIXED_PRICE) revert FeedTypeNotAllowedForRole();
        if (pivot.feedType != FeedType.AGGREGATOR_V3) revert FeedTypeNotAllowedForRole();
        if (fallback_.feedType != FeedType.AGGREGATOR_V3) revert FeedTypeNotAllowedForRole();
        _validateFeedConfig(main);
        _validateFeedConfig(pivot);
        _validateFeedConfig(fallback_);

        AssetConfig storage config = assetConfigs[cToken];
        config.main = main;
        config.pivot = pivot;
        config.fallback_ = fallback_;
        config.upperBoundRatio = upperBoundRatio;
        config.lowerBoundRatio = lowerBoundRatio;
        config.configured = true;
        _validateDistinctFeeds(config);
        // At least two feeds must be enabled so a validation pair can form. We do NOT
        // require all three: some Rootstock assets only have two viable sources, so an
        // asset must remain configurable (and a compromised feed removable) down to a
        // 2-of-2 set. See _requireTwoEnabled.
        _requireTwoEnabled(config);

        configuredAssets.push(cToken);

        emit AssetConfigured(cToken, main.feedAddress, pivot.feedAddress, fallback_.feedAddress);
        emit BoundsUpdated(cToken, upperBoundRatio, lowerBoundRatio);
    }

    /// @notice Update a specific feed for an asset
    /// @dev Same role-type rules as configureAsset. FIXED_PRICE is rejected for ALL
    ///      roles here: the only path to a fixed-price override is setFixedPrice,
    ///      so monitoring a single event (FixedPriceOverrideSet) has no blind spots.
    ///      Restoring live pricing after an override is done with this function.
    function updateFeed(
        address cToken,
        string calldata feedRole,
        FeedConfig calldata newFeed
    ) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        if (newFeed.feedType == FeedType.FIXED_PRICE) revert FeedTypeNotAllowedForRole();
        _validateFeedConfig(newFeed);

        bytes32 role = keccak256(bytes(feedRole));
        if (role == keccak256("main")) {
            config.main = newFeed;
        } else if (role == keccak256("pivot")) {
            if (newFeed.feedType != FeedType.AGGREGATOR_V3) revert FeedTypeNotAllowedForRole();
            config.pivot = newFeed;
        } else if (role == keccak256("fallback")) {
            if (newFeed.feedType != FeedType.AGGREGATOR_V3) revert FeedTypeNotAllowedForRole();
            config.fallback_ = newFeed;
        } else {
            revert InvalidFeedRole();
        }
        _validateDistinctFeeds(config);
        // Must keep >= 2 enabled feeds (see _requireTwoEnabled): allows rotating or
        // disabling a compromised feed (2-of-3 -> 2-of-2) but never bricking the asset
        // by dropping below a quotable pair.
        _requireTwoEnabled(config);

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

    /// @notice Emergency: set a fixed-price override on the asset's MAIN feed.
    /// @dev This is the ONLY path that can install a FIXED_PRICE feed (configureAsset
    ///      and updateFeed reject the type), so monitoring FixedPriceOverrideSet
    ///      covers every override with no blind spots. The override is served
    ///      directly, bypassing all cross-validation, and does NOT expire on-chain:
    ///      off-chain monitoring should alert on long-lived FIXED_OVERRIDE paths.
    ///      To restore live pricing, call updateFeed("main", <live feed config>).
    function setFixedPrice(address cToken, uint256 price) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        if (price == 0 || price > MAX_SANE_PRICE) revert InvalidFixedPrice();

        config.main = FeedConfig({
            feedAddress: address(0),
            feedType: FeedType.FIXED_PRICE,
            maxStaleness: 0,
            fixedPrice: price,
            feedDecimals: 18,
            enabled: true
        });

        emit FixedPriceOverrideSet(cToken, price);
    }

    // =========================================================================
    // Pause — Circuit Breaker
    // =========================================================================
    // Guardian (or admin) can pause; ONLY admin (timelock) can unpause.
    // While paused, assetPrices reverts: the market is frozen until the admin
    // reviews the incident and either unpauses or reconfigures feeds.
    //
    // DELIBERATE DESIGN DECISION: because unpausing goes through the 24h timelock,
    // ANY pause freezes price-dependent operations (borrow, redeem, liquidate,
    // transfer) for a minimum of ~24h. This is accepted: the oracle already fails
    // closed automatically on feed divergence, so a manual pause is reserved for
    // rare, severe scenarios (e.g. feeds agreeing on a known-bad price) where a
    // deliberate, timelocked review period is appropriate. Operators must treat
    // pausing as a costly action and prefer per-asset over global pause.

    function pauseAsset(address cToken) external onlyAdminOrGuardian {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        config.paused = true;
        emit AssetPaused(cToken);
    }

    function unpauseAsset(address cToken) external onlyAdmin {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);
        config.paused = false;
        emit AssetUnpaused(cToken);
    }

    function pauseGlobal() external onlyAdminOrGuardian {
        globalPaused = true;
        emit GlobalPaused();
    }

    function unpauseGlobal() external onlyAdmin {
        globalPaused = false;
        emit GlobalUnpaused();
    }

    // =========================================================================
    // Admin — Role Management (two-step admin transfer)
    // =========================================================================

    /// @notice Begin admin transfer. New admin must call acceptAdmin().
    function setPendingAdmin(address newPendingAdmin) external onlyAdmin {
        if (newPendingAdmin == address(0)) revert InvalidAddress();
        address oldPendingAdmin = pendingAdmin;
        pendingAdmin = newPendingAdmin;
        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
    }

    /// @notice Complete admin transfer. Callable only by the pending admin.
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert OnlyPendingAdmin();
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(oldAdmin, admin);
    }

    /// @notice Update the pause guardian. Single-step: a misconfigured guardian is
    ///         recoverable by the admin, unlike a misconfigured admin.
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
        uint256 lowerBoundRatio
    ) {
        AssetConfig storage config = assetConfigs[cToken];
        return (
            config.configured,
            config.paused,
            config.upperBoundRatio,
            config.lowerBoundRatio
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
        else revert InvalidFeedRole();
    }

    /// @notice Full diagnostic read: all three feeds plus the resolved price and path.
    /// @dev Does not check pause state — useful for monitoring while paused.
    function diagnosePrice(address cToken) external view returns (
        uint256 price,
        PricePath path,
        uint256 mainPrice,
        bool mainValid,
        uint256 pivotPrice,
        bool pivotValid,
        uint256 fallbackPrice,
        bool fallbackValid
    ) {
        AssetConfig storage config = assetConfigs[cToken];
        if (!config.configured) revert AssetNotConfigured(cToken);

        (mainPrice, mainValid) = _readFeed(config.main);
        (pivotPrice, pivotValid) = _readFeed(config.pivot);
        (fallbackPrice, fallbackValid) = _readFeed(config.fallback_);
        (price, path) = _getValidatedPrice(config);
    }

    // =========================================================================
    // Internal — Validation Helpers
    // =========================================================================

    function _validateBoundParams(uint256 upper, uint256 lower) internal pure {
        if (upper > MAX_UPPER_BOUND || upper < RATIO_PRECISION) revert InvalidBounds();
        if (lower < MIN_LOWER_BOUND || lower > RATIO_PRECISION) revert InvalidBounds();
        if (lower >= upper) revert InvalidBounds();
    }

    /// @dev Enabled feeds must point to distinct contracts across roles, so an
    ///      "agreeing pair" is always two reads of two different contracts. FIXED_PRICE
    ///      main (feedAddress == 0) is exempt: it never participates in pairs.
    ///
    ///      SCOPE: address inequality is the strongest property enforceable on-chain.
    ///      It does NOT guarantee independent data — two distinct feed contracts fed
    ///      by the same upstream oracle, operator set, or market fail together and
    ///      outvote the honest source, defeating the 2-of-3 majority. Verifying true
    ///      source independence (different operator, methodology and data origin for
    ///      main/pivot/fallback) is a deliberate OFF-CHAIN requirement of the security
    ///      model, owned by governance at feed-selection time.
    function _validateDistinctFeeds(AssetConfig storage config) internal view {
        address a = config.main.enabled ? config.main.feedAddress : address(0);
        address b = config.pivot.enabled ? config.pivot.feedAddress : address(0);
        address c = config.fallback_.enabled ? config.fallback_.feedAddress : address(0);

        if (a != address(0) && (a == b || a == c)) revert DuplicateFeedAddress();
        if (b != address(0) && b == c) revert DuplicateFeedAddress();
    }

    /// @dev A configured asset must always keep at least two enabled feeds so that one
    ///      of the three validation pairs ({main,pivot}, {fallback,pivot}, {main,fallback})
    ///      can form. This is the minimum for a quotable 2-of-N set.
    ///
    ///      We intentionally do NOT require all three enabled: on Rootstock some assets
    ///      only have two viable sources, and an operator must be able to disable a
    ///      compromised feed (degrading 2-of-3 -> 2-of-2) without bricking the asset.
    ///      At 2-of-2 byzantine fault tolerance is lost (a single feed dispute -> no
    ///      agreeing pair -> fail-closed), which is an accepted, documented trade-off.
    ///
    ///      "MoC never served alone" still holds at 2-of-2: pivot and fallback are
    ///      always AGGREGATOR_V3, so any surviving pair that includes MoC-main
    ///      cross-checks it against a timestamped aggregator.
    function _requireTwoEnabled(AssetConfig storage config) internal view {
        uint256 enabledFeeds =
            (config.main.enabled ? 1 : 0) +
            (config.pivot.enabled ? 1 : 0) +
            (config.fallback_.enabled ? 1 : 0);
        if (enabledFeeds < 2) revert FeedNotEnabled();
    }

    /// @dev Enforce the 18-decimal-underlying invariant at configuration time.
    ///
    ///      This adapter always returns prices scaled to 1e18 and PriceOracleProxy
    ///      forwards them to the Comptroller unchanged, while Compound's liquidity /
    ///      liquidation math assumes getUnderlyingPrice is scaled by
    ///      1e(36 - underlyingDecimals). Both conventions agree ONLY when the
    ///      underlying has exactly 18 decimals; listing any other market through this
    ///      adapter would mis-scale borrowing power and collateral value by orders of
    ///      magnitude. Rather than trusting governance to remember that constraint,
    ///      it is checked here on-chain.
    ///
    ///      cToken kinds:
    ///        - CErc20-style: underlying() returns the token; its decimals() must be 18.
    ///          decimals() reverting bubbles up — a token without decimals() cannot
    ///          prove the invariant and must not be listed through this adapter.
    ///        - Native-asset cToken (cRBTC): does not implement underlying(), so the
    ///          probe call reverts. Native RBTC has 18 decimals; accepted.
    function _validateUnderlyingDecimals(address cToken) internal view {
        // A cToken must be a contract. Without this check, a typoed EOA address would
        // make the underlying() probe "succeed" with empty returndata and be
        // misclassified as a native-asset cToken.
        if (cToken.code.length == 0) revert InvalidAddress();

        (bool ok, bytes memory data) = cToken.staticcall(
            abi.encodeCall(CErc20Like.underlying, ())
        );
        if (!ok) {
            // No underlying() -> native-asset cToken (cRBTC). RBTC is 18 decimals.
            return;
        }
        if (data.length != 32) revert InvalidAddress();

        address underlying = abi.decode(data, (address));
        if (underlying == address(0) || underlying.code.length == 0) revert InvalidAddress();
        if (EIP20Like(underlying).decimals() != 18) revert InvalidUnderlyingDecimals();
    }

    /// @dev Validates a feed config. For AGGREGATOR_V3 feeds, verifies the provided
    ///      feedDecimals against the feed's on-chain decimals() to catch typos that
    ///      would mis-scale prices by orders of magnitude.
    ///      FIXED_PRICE never reaches this function: configureAsset and updateFeed
    ///      reject the type before validation, and setFixedPrice builds its feed
    ///      inline after validating the price range.
    function _validateFeedConfig(FeedConfig calldata feed) internal view {
        if (feed.feedType == FeedType.AGGREGATOR_V3) {
            if (feed.enabled) {
                if (feed.feedAddress == address(0)) revert InvalidAddress();
                if (feed.maxStaleness == 0 || feed.maxStaleness > MAX_STALENESS) revert InvalidStaleness();
                if (feed.feedDecimals == 0 || feed.feedDecimals > 24) revert InvalidDecimals();

                // On-chain verification: stored decimals must match the feed's actual
                // decimals(). Reverts (bubbles up) if the feed doesn't implement it —
                // a feed without decimals() should not be configured as AGGREGATOR_V3.
                uint8 actualDecimals = AggregatorV3Interface(feed.feedAddress).decimals();
                if (actualDecimals != feed.feedDecimals) revert InvalidDecimals();
            }
        } else if (feed.feedType == FeedType.MOC) {
            if (feed.enabled) {
                if (feed.feedAddress == address(0)) revert InvalidAddress();
            }
        }
    }
}
