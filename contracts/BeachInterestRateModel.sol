pragma solidity ^0.5.16;

import "./InterestRateModel.sol";

contract BeachInterestRateModel is InterestRateModel {
    using SafeMath for uint256;

    address public owner;
    int256[] public coefficients;
    uint256 public baseBorrowRate;
    uint256 public slope1;
    uint256 public slope2;
    uint256 public optimalUtilizationRate;

    uint256 constant FACTOR = 1e18;
    bool public constant isTropykusInterestRateModel = true;

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

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "You are not allowed to perform this action"
        );
        _;
    }

    function setCoefficients(int256[] memory _coefficients) public onlyOwner {
        coefficients = _coefficients;
    }

    function getSupplyRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view returns (uint256) {
        (MathError mError, uint256 exchangeRate) =
            getExchangeRate(cash, borrows, reserves, 0);
        return exchangeRate;
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        if (utilizationRate <= optimalUtilizationRate)
            borrowRate = slope1.mul(utilizationRate).div(FACTOR).add(
                baseBorrowRate
            );
        else
            borrowRate = baseBorrowRate
                .add(slope1.mul(optimalUtilizationRate).div(FACTOR))
                .add(
                    slope2.mul(utilizationRate.sub(optimalUtilizationRate)).div(
                        FACTOR
                    )
                );
        borrowRate = borrowRate.div(blocksPerYear);
    }
}
