pragma solidity ^0.5.16;

import "./TropykusInterestRateModel.sol";

contract HurricaneInterestRateModel is TropykusInterestRateModel {
    uint256 public slope;

    constructor(
        int256[] memory _coefficients,
        uint256 _slope,
        uint256 _baseBorrowRate
    ) public {
        coefficients = _coefficients;
        slope = _slope;
        baseBorrowRate = _baseBorrowRate;
        owner = msg.sender;
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view override returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        borrowRate = slope.mul(utilizationRate).div(FACTOR).add(baseBorrowRate);
    }

}
