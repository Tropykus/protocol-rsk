pragma solidity ^0.5.16;

import "./PriceOracleAdapter.sol";
import "./SafeMath.sol";

interface PriceProviderMoC {
    function peek() external view returns (bytes32, bool);
}

contract PriceOracleAdapterMoc is PriceOracleAdapter {
    using SafeMath for uint;
    /// @notice Address of the guardian
    address public guardian;
    /// @notice The MoC price oracle, which will continue to serve prices
    PriceProviderMoC public priceProviderMoC;
    /// @notice The MoC price oracle, which will continue to serve RBTC prices
    PriceProviderMoC public rBTCPriceProviderMoC;

    /**
     * @notice Construct a PriceOracleAdapter for a MoC oracle
     * @param guardian_ address of guardian that is allowed to manage this contract
     * @param priceProvider address of asset's MoC price provider
     * @param rbtcPriceProvider address of the RBTC MoC price provider
     */
    constructor(address guardian_,address priceProvider, address rbtcPriceProvider) public {
        guardian = guardian_;
        priceProviderMoC = PriceProviderMoC(priceProvider);
        rBTCPriceProviderMoC = PriceProviderMoC(rbtcPriceProvider);
    }

    /**
     * @notice Get the price from MoC and divide it by the rBTC price
     * @return The price
     */
    function assetPrices(address) public view returns (uint256) {
        (bytes32 price, bool has) = priceProviderMoC.peek();
        (bytes32 priceRBTC, bool hasRBTC) = rBTCPriceProviderMoC.peek();
        require(has, "PriceOracleAdapterMoc: Oracle have no Price");
        require(hasRBTC, "PriceOracleAdapterMoc: Oracle have no RBTC Price");
        return uint256(price).mul(1e18).div(uint256(priceRBTC));
    }

    /**
     * @notice Set the address of price provider
     * @param priceProviderAddress address of price provider
     */
    function setPriceProvider(address priceProviderAddress) public {
        require(
            msg.sender == guardian,
            "PriceOracleAdapterMoc: only guardian may set the address"
        );
        require(
            priceProviderAddress != address(0),
            "PriceOracleAdapterMoc: address could not be 0"
        );
        //set old address
        address oldPriceProviderAddress = address(priceProviderMoC);
        //update interface address
        priceProviderMoC = PriceProviderMoC(priceProviderAddress);
        //emit event
        emit PriceOracleAdapterUpdated(
            oldPriceProviderAddress,
           priceProviderAddress
        );
    }
    /**
     * @notice Set the address of RBTC price provider
     * @param rBTCPriceProviderAddress address of RBTC price provider
     */
    function setRBTCPriceProvider(address rBTCPriceProviderAddress) public {
        require(
            msg.sender == guardian,
            "PriceOracleAdapterMoc: only guardian may set the address"
        );
        require(
            rBTCPriceProviderAddress != address(0),
            "PriceOracleAdapterMoc: address could not be 0"
        );
        //set old address
        address oldRBTCPriceProviderAddress = address(rBTCPriceProviderMoC);
        //update interface address
        rBTCPriceProviderMoC = PriceProviderMoC(rBTCPriceProviderAddress);
        //emit event
        emit PriceOracleAdapterUpdated(
            oldRBTCPriceProviderAddress,
           rBTCPriceProviderAddress
        );
    }
}
