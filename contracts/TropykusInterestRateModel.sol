pragma solidity ^0.5.16;

import "./InterestRateModel.sol";

contract TropykusInterestRateModel is InterestRateModel {
    using SafeMath for uint256;

    address public owner;
    int256[] public coefficients;
    uint256 public baseBorrowRate;

    uint256 constant FACTOR = 1e18;

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
    ) public view override returns (uint256) {
        (MathError mError, uint256 exchangeRate) =
            getExchangeRate(
                _totalCash,
                _totalBorrows,
                _totalReserves,
                _totalSupply,
                _reserveFactorMantissa
            );
        return exchangeRate;
    }

    function getExchangeRate(
        uint256 _totalCash,
        uint256 _totalBorrows,
        uint256 _totalReserves,
        uint256 _totalSupply,
        uint256 _reserveFactorMantissa
    ) public pure returns (MathError, uint256) {
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
        pure
        returns (MathError mError, uint256 uPolynomial)
    {
        int256 polynomial;
        for (uint256 i = 0; i < coefficients.length; i++) {
            polynomial =
                polynomial +
                (coefficients[i] * _utilizationRate**i) /
                FACTOR**i;
        }
        if (polynomial < 0) return (MathError.INTEGER_UNDERFLOW, 0);
        return (MathError.NO_ERROR, uint256(polynomial));
    }
}
