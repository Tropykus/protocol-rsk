pragma solidity ^0.5.16;

import "./PriceOracleAdapter.sol";

/**
 * @title A mock price provider of Money on Chain (MoC)
 * @notice You can use this contract for only simulation
 */
contract MockPriceProviderMoC is PriceOracleAdapter {
    function getPrice() public view returns (uint256) {
        return 1e18;
    }
}
