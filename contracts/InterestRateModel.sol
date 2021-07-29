// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "./Exponential.sol";
import "./SafeMath.sol";

/**
 * @title tropykus InterestRateModel Interface
 * @author tropykus
 */
abstract contract InterestRateModel is Exponential {
    using SafeMath for uint256;

    /// @notice Indicator that this is an InterestRateModel contract (for inspection)
    bool public constant isInterestRateModel = true;
    bool public isTropykusInterestRateModel;

    /**
     * @notice The approximate number of blocks per year that is assumed by the interest rate model
     */
    uint256 public constant blocksPerYear = 1051200;

    /**
     * @notice Calculates the utilization rate of the market: `borrows / (cash + borrows - reserves)`
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market (currently unused)
     * @return The utilization rate as a mantissa between [0, 1e18]
     */
    function utilizationRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public pure virtual returns (uint256) {
        // Utilization rate is 0 when there are no borrows
        if (borrows == 0) {
            return 0;
        }

        return borrows.mul(1e18).div(cash.add(borrows).sub(reserves));
    }

    /**
     * @notice Calculates the current borrow interest rate per block
     * @param cash The total amount of cash the market has
     * @param borrows The total amount of borrows the market has outstanding
     * @param reserves The total amnount of reserves the market has
     * @return The borrow rate per block (as a percentage, and scaled by 1e18)
     */
    function getBorrowRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) external view virtual returns (uint256);

    /**
     * @notice Calculates the current supply interest rate per block
     * @param cash The total amount of cash the market has
     * @param borrows The total amount of borrows the market has outstanding
     * @param reserves The total amnount of reserves the market has
     * @param reserveFactorMantissa The current reserve factor the market has
     * @return The supply rate per block (as a percentage, and scaled by 1e18)
     */
    function getSupplyRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves,
        uint256 reserveFactorMantissa
    ) external view virtual returns (uint256);

    function getExchangeRate(
        uint256 _totalCash,
        uint256 _totalBorrows,
        uint256 _totalReserves,
        uint256 _totalSupply
    ) public pure returns (MathError, uint256) {
        /*
         * exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
         */
        Exp memory exchangeRate;
        MathError mathErr;
        uint256 cashPlusBorrowsMinusReserves;
        (mathErr, cashPlusBorrowsMinusReserves) = addThenSubUInt(
            _totalCash,
            _totalBorrows,
            _totalReserves
        );
        if (mathErr != MathError.NO_ERROR) {
            return (mathErr, 0);
        }
        (mathErr, exchangeRate) = getExp(
            cashPlusBorrowsMinusReserves,
            _totalSupply
        );
        if (mathErr != MathError.NO_ERROR) {
            return (mathErr, 0);
        }

        return (MathError.NO_ERROR, exchangeRate.mantissa);
    }

    function isAboveOptimal(
        uint256 cash,
        uint256 borrows,
        uint256 reserves
    ) public view virtual returns (bool) {
        cash;
        borrows;
        reserves;
        return false;
    }
}
