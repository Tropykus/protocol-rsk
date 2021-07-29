// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "../../contracts/ComptrollerG6.sol";

contract ComptrollerScenarioG6 is ComptrollerG6 {
    uint256 public blockNumber;
    address public compAddress;

    constructor() ComptrollerG6() {}

    function fastForward(uint256 blocks) public returns (uint256) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setCompAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getCompAddress() public view override returns (address) {
        return compAddress;
    }

    function setBlockNumber(uint256 number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view override returns (uint256) {
        return blockNumber;
    }

    function membershipLength(CToken cToken) public view returns (uint256) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }

    function setCompSpeed(address cToken, uint256 compSpeed) public {
        compSpeeds[cToken] = compSpeed;
    }
}
