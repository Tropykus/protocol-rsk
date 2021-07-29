// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "../../contracts/ComptrollerG2.sol";

contract ComptrollerScenarioG2 is ComptrollerG2 {
    uint256 public blockNumber;
    address public compAddress;

    constructor() ComptrollerG2() {}

    function fastForward(uint256 blocks) public returns (uint256) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint256 number) public {
        blockNumber = number;
    }
}
