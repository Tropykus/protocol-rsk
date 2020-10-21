pragma solidity ^0.5.16;

contract PriceOracleAdapter {
    /**
     * @notice Get the price
     * @return The underlying asset price mantissa (scaled by 1e18).
     *  Zero means the price is unavailable.
     */
    function getPrice() external view returns (uint256);
}
