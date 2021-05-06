pragma solidity ^0.5.16;

import "./InterestRateModel.sol";

contract HurricaneInterestRateModel is InterestRateModel {
    using SafeMath for uint256;

    address public owner;
    uint256 public baseBorrowRate;
    uint256 public promisedBaseReturnRate;
    uint256 public optimalUtilizationRate;
    uint256 public borrowRateSlope;
    uint256 public supplyRateSlope;

    uint256 constant FACTOR = 1e18;

    constructor(
        uint256 _baseBorrowRate,
        uint256 _promisedBaseReturnRate,
        uint256 _optimalUtilizationRate,
        uint256 _borrowRateSlope,
        uint256 _supplyRateSlope
    ) public {
        baseBorrowRate = _baseBorrowRate;
        promisedBaseReturnRate = _promisedBaseReturnRate;
        optimalUtilizationRate = _optimalUtilizationRate;
        borrowRateSlope = _borrowRateSlope;
        supplyRateSlope = _supplyRateSlope;
        owner = msg.sender;
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
    ) public view returns (uint256) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        return
            utilizationRate.mul(supplyRateSlope).div(FACTOR).add(
                promisedBaseReturnRate
            );
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        borrowRate = utilizationRate.mul(borrowRateSlope).div(FACTOR).add(
            baseBorrowRate
        );
    }
}
