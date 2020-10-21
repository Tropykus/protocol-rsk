pragma solidity ^0.5.16;

import "./PriceOracleAdapter.sol";

interface PriceProviderMoC {
    function peek() external view returns (bytes32, bool);
}

contract PriceOracleAdapterMoc is PriceOracleAdapter {
    /// @notice The price oracle, which will continue to serve prices for MoC
    PriceProviderMoC internal priceProviderMoC;

    /**
     * @notice Construct empty
     */
    constructor() public {}

    /**
     * @notice Get the price of MoC
     * @return The price
     */
    function getPrice() public view returns (uint256) {
        (bytes32 price, bool has) = priceProviderMoC.peek();
        require(has, "Oracle have no Price");
        return uint256(price);
    }
}
