pragma solidity ^0.5.16;

import "./PriceOracleAdapterMoc.sol";

contract TestnetPriceOracleAdapterMoc is PriceOracleAdapterMoc {

    constructor(address guardian_,address priceProvider) PriceOracleAdapterMoc(guardian_, priceProvider) public {}
    /**
     * @notice Get the price from MoC and divide it by the rBTC price
     * @return The price
     */
    function assetPrices(address) public view returns (uint256) {
        (bytes32 price, bool has) = priceProviderMoC.peek();
        return uint256(price);
    }
}