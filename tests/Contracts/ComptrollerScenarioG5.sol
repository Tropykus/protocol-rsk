// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4;

import "../../contracts/ComptrollerG5.sol";

contract ComptrollerScenarioG5 is ComptrollerG5 {
    uint256 public blockNumber;
    address public compAddress;

    constructor() ComptrollerG5() {}

    function setCompAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getCompAddress() public view override returns (address) {
        return compAddress;
    }

    function membershipLength(CToken cToken) public view returns (uint256) {
        return accountAssets[address(cToken)].length;
    }

    function fastForward(uint256 blocks) public returns (uint256) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint256 number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view override returns (uint256) {
        return blockNumber;
    }

    function getCompMarkets() public view returns (address[] memory) {
        uint256 m = allMarkets.length;
        uint256 n = 0;
        for (uint256 i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isComped) {
                n++;
            }
        }

        address[] memory compMarkets = new address[](n);
        uint256 k = 0;
        for (uint256 i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isComped) {
                compMarkets[k++] = address(allMarkets[i]);
            }
        }
        return compMarkets;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
