// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "./InterestRateModel.sol";

contract HurricaneInterestRateModel is InterestRateModel {
    using SafeMath for uint256;

    address public owner;
    uint256 public baseBorrowRatePerBlock;
    uint256 public promisedBaseReturnRatePerBlock;
    uint256 public optimalUtilizationRate;
    uint256 public borrowRateSlopePerBlock;
    uint256 public supplyRateSlopePerBlock;

    uint256 constant FACTOR = 1e18;

    constructor(
        uint256 _baseBorrowRate,
        uint256 _promisedBaseReturnRate,
        uint256 _optimalUtilizationRate,
        uint256 _borrowRateSlope,
        uint256 _supplyRateSlope
    ) {
        baseBorrowRatePerBlock = _baseBorrowRate.div(blocksPerYear);
        promisedBaseReturnRatePerBlock = _promisedBaseReturnRate.div(
            blocksPerYear
        );
        optimalUtilizationRate = _optimalUtilizationRate;
        borrowRateSlopePerBlock = _borrowRateSlope.div(blocksPerYear);
        supplyRateSlopePerBlock = _supplyRateSlope.div(blocksPerYear);
        owner = msg.sender;
        isTropykusInterestRateModel = true;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "You are not allowed to perform this action"
        );
        _;
    }

    function getSupplyRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves,
        uint256 reserveFactorMantissa
    ) public view override returns (uint256) {
        reserveFactorMantissa;
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        return
            utilizationRate.mul(supplyRateSlopePerBlock).div(FACTOR).add(
                promisedBaseReturnRatePerBlock
            );
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view override returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        borrowRate = utilizationRate
        .mul(borrowRateSlopePerBlock)
        .div(FACTOR)
        .add(baseBorrowRatePerBlock);
    }

    function isAboveOptimal(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view override returns (bool) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        return utilizationRate > optimalUtilizationRate;
    }
}
