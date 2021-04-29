pragma solidity ^0.5.16;

import "./InterestRateModel.sol";

contract HurricaneInterestRateModel is InterestRateModel {
    using SafeMath for uint256;

    address public owner;
    int256[] public coefficients;
    uint256 public baseBorrowRate;
    uint256 public slope;

    uint256 constant FACTOR = 1e18;

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
        uint256 reserves,
        uint256 reserveFactorMantissa
    ) public view returns (uint256) {
        (MathError mError, uint256 exchangeRate) =
            getExchangeRate(cash, borrows, reserves, 0, reserveFactorMantissa);
        return exchangeRate;
    }

    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view returns (uint256 borrowRate) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        borrowRate = slope
            .mul(utilizationRate)
            .div(FACTOR)
            .add(baseBorrowRate)
            .div(blocksPerYear);
    }

    function getExchangeRate(
        uint256 _totalCash,
        uint256 _totalBorrows,
        uint256 _totalReserves,
        uint256 _totalSupply,
        uint256 _reserveFactorMantissa
    ) public view returns (MathError, uint256) {
        uint256 utilizationRate =
            utilizationRate(_totalCash, _totalBorrows, _totalReserves);
        uint256 borrowRatePerBlock =
            getBorrowRate(_totalCash, _totalBorrows, _totalReserves);
        (MathError mError, uint256 polynomial) = getPolynomial(utilizationRate);
        if (mError != MathError.NO_ERROR) return (mError, 0);
        uint256 exchangeRate =
            polynomial
                .mul(borrowRatePerBlock)
                .div(FACTOR)
                .mul(uint256(1e18).sub(_reserveFactorMantissa))
                .div(FACTOR);
        return (MathError.NO_ERROR, exchangeRate);
    }

    function getPolynomial(uint256 _utilizationRate)
        internal
        view
        returns (MathError mError, uint256 polynomial)
    {
        uint256 positive;
        uint256 negative;
        for (uint256 i = 0; i < coefficients.length; i++) {
            if (coefficients[i] >= 0) {
                positive = positive.add(
                    uint256(coefficients[i]).mul(_utilizationRate**i).div(
                        FACTOR**i
                    )
                );
            } else {
                uint256 value = 2**256 - 1 - uint256(coefficients[i]) + 1;
                negative = negative.add(
                    value.mul(_utilizationRate**i).div(FACTOR**i)
                );
            }
        }
        require(positive >= negative, "Regression value is not positive");
        polynomial = positive.sub(negative);
    }
}
