pragma solidity ^0.5.16;

import "./TropykusInterestRateModel.sol";

contract BeachInterestRateModel is TropykusInterestRateModel {
    uint256 public slope1;
    uint256 public slope2;
    uint256 public optimalUtilizationRate;

    constructor(
        int256[] memory _coefficients,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _baseBorrowRate,
        uint256 _optimalUtilizationRate
    ) public {
        coefficients = _coefficients;
        slope1 = _slope1;
        slope2 = _slope2;
        baseBorrowRate = _baseBorrowRate;
        optimalUtilizationRate = _optimalUtilizationRate;
        owner = msg.sender;
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view override returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        if (utilizationRate <= optimalUtilizationRate)
            borrowRate = slope1.mul(utilizationRate).div(FACTOR).add(
                baseBorrowRate
            );
        else
            borrrowRate = slope2.mul(utilizationRate).add(baseBorrowRate).add(
                slope1.mul(optimalUtilizationRate)
            );
        borrowRate = borrowRate.div(blocksPerYear);
    }
}
