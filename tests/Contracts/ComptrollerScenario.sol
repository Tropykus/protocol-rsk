// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "../../contracts/Comptroller.sol";

contract ComptrollerScenario is Comptroller {
    uint256 public blockNumber;
    address public compAddress;

    constructor() Comptroller() {}

    function fastForward(uint256 blocks) public returns (uint256) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setCompAddress(address compAddress_) public override {
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

    /**
     * @notice Recalculate and update COMP speeds for all COMP markets
     */
    function refreshCompSpeeds() public {
        CToken[] memory allMarkets_ = allMarkets;

        for (uint256 i = 0; i < allMarkets_.length; i++) {
            CToken cToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: cToken.borrowIndex()});
            updateCompSupplyIndex(address(cToken));
            updateCompBorrowIndex(address(cToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint256 i = 0; i < allMarkets_.length; i++) {
            CToken cToken = allMarkets_[i];
            if (compSpeeds[address(cToken)] > 0) {
                Exp memory assetPrice = Exp({
                    mantissa: oracle.getUnderlyingPrice(cToken)
                });
                Exp memory utility = mul_(assetPrice, cToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint256 i = 0; i < allMarkets_.length; i++) {
            CToken cToken = allMarkets[i];
            uint256 newSpeed = totalUtility.mantissa > 0
                ? mul_(compRate, div_(utilities[i], totalUtility))
                : 0;
            setCompSpeedInternal(cToken, newSpeed);
        }
    }
}
