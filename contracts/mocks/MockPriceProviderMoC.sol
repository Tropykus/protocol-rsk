pragma solidity ^0.5.16;

import "../CErc20.sol";

/**
 * @title A mock price provider of Money on Chain (MoC)
 * @notice You can use this contract for only simulation
 */
contract MockPriceProviderMoC {
    bytes32 rbtcPrice;
    bool has;

    constructor(uint256 price) public {
        rbtcPrice = bytes32(price);
        has = true;
    }

    function peek() public view returns (bytes32, bool) {
        return (rbtcPrice, has);
    }

}
