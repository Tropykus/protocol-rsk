// Dependency file: contracts/ComptrollerInterface.sol

// SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.6;

abstract contract ComptrollerInterface {
    /// @notice Indicator that this is a Comptroller contract (for inspection)
    bool public constant isComptroller = true;

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata cTokens)
        external
        virtual
        returns (uint256[] memory);

    function exitMarket(address cToken) external virtual returns (uint256);

    /*** Policy Hooks ***/

    function mintAllowed(
        address cToken,
        address minter,
        uint256 mintAmount
    ) external virtual returns (uint256);

    function mintVerify(
        address cToken,
        address minter,
        uint256 mintAmount,
        uint256 mintTokens
    ) external virtual;

    function redeemAllowed(
        address cToken,
        address redeemer,
        uint256 redeemTokens
    ) external virtual returns (uint256);

    function redeemVerify(
        address cToken,
        address redeemer,
        uint256 redeemAmount,
        uint256 redeemTokens
    ) external virtual;

    function borrowAllowed(
        address cToken,
        address borrower,
        uint256 borrowAmount
    ) external virtual returns (uint256);

    function borrowVerify(
        address cToken,
        address borrower,
        uint256 borrowAmount
    ) external virtual;

    function repayBorrowAllowed(
        address cToken,
        address payer,
        address borrower,
        uint256 repayAmount
    ) external virtual returns (uint256);

    function repayBorrowVerify(
        address cToken,
        address payer,
        address borrower,
        uint256 repayAmount,
        uint256 borrowerIndex
    ) external virtual;

    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint256 repayAmount
    ) external virtual returns (uint256);

    function liquidateBorrowVerify(
        address cTokenBorrowed,
        address cTokenCollateral,
        address liquidator,
        address borrower,
        uint256 repayAmount,
        uint256 seizeTokens
    ) external virtual;

    function seizeAllowed(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external virtual returns (uint256);

    function seizeVerify(
        address cTokenCollateral,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external virtual;

    function transferAllowed(
        address cToken,
        address src,
        address dst,
        uint256 transferTokens
    ) external virtual returns (uint256);

    function transferVerify(
        address cToken,
        address src,
        address dst,
        uint256 transferTokens
    ) external virtual;

    /*** Liquidity/Liquidation Calculations ***/

    function liquidateCalculateSeizeTokens(
        address cTokenBorrowed,
        address cTokenCollateral,
        uint256 repayAmount
    ) external view virtual returns (uint256, uint256);
}


// Dependency file: contracts/CarefulMath.sol

// pragma solidity 0.8.6;

/**
  * @title Careful Math
  * @author tropykus
  * @notice Derived from OpenZeppelin's SafeMath library
  *         https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/math/SafeMath.sol
  */
contract CarefulMath {

    /**
     * @dev Possible error codes that we can return
     */
    enum MathError {
        NO_ERROR,
        DIVISION_BY_ZERO,
        INTEGER_OVERFLOW,
        INTEGER_UNDERFLOW
    }

    /**
    * @dev Multiplies two numbers, returns an error on overflow.
    */
    function mulUInt(uint a, uint b) internal pure returns (MathError, uint) {
        if (a == 0) {
            return (MathError.NO_ERROR, 0);
        }

        uint c = a * b;

        if (c / a != b) {
            return (MathError.INTEGER_OVERFLOW, 0);
        } else {
            return (MathError.NO_ERROR, c);
        }
    }

    /**
    * @dev Integer division of two numbers, truncating the quotient.
    */
    function divUInt(uint a, uint b) internal pure returns (MathError, uint) {
        if (b == 0) {
            return (MathError.DIVISION_BY_ZERO, 0);
        }

        return (MathError.NO_ERROR, a / b);
    }

    /**
    * @dev Subtracts two numbers, returns an error on overflow (i.e. if subtrahend is greater than minuend).
    */
    function subUInt(uint a, uint b) internal pure returns (MathError, uint) {
        if (b <= a) {
            return (MathError.NO_ERROR, a - b);
        } else {
            return (MathError.INTEGER_UNDERFLOW, 0);
        }
    }

    /**
    * @dev Adds two numbers, returns an error on overflow.
    */
    function addUInt(uint a, uint b) internal pure returns (MathError, uint) {
        uint c = a + b;

        if (c >= a) {
            return (MathError.NO_ERROR, c);
        } else {
            return (MathError.INTEGER_OVERFLOW, 0);
        }
    }

    /**
    * @dev add a and b and then subtract c
    */
    function addThenSubUInt(uint a, uint b, uint c) internal pure returns (MathError, uint) {
        (MathError err0, uint sum) = addUInt(a, b);

        if (err0 != MathError.NO_ERROR) {
            return (err0, 0);
        }

        return subUInt(sum, c);
    }
}


// Dependency file: contracts/ExponentialNoError.sol

// pragma solidity 0.8.6;

/**
 * @title Exponential module for storing fixed-precision decimals
 * @author tropykus
 * @notice Exp is a struct which stores decimals with a fixed precision of 18 decimal places.
 *         Thus, if we wanted to store the 5.1, mantissa would store 5.1e18. That is:
 *         `Exp({mantissa: 5100000000000000000})`.
 */
contract ExponentialNoError {
    uint constant expScale = 1e18;
    uint constant doubleScale = 1e36;
    uint constant halfExpScale = expScale/2;
    uint constant mantissaOne = expScale;

    struct Exp {
        uint mantissa;
    }

    struct Double {
        uint mantissa;
    }

    /**
     * @dev Truncates the given exp to a whole number value.
     *      For example, truncate(Exp{mantissa: 15 * expScale}) = 15
     */
    function truncate(Exp memory exp) pure internal returns (uint) {
        // Note: We are not using careful math here as we're performing a division that cannot fail
        return exp.mantissa / expScale;
    }

    /**
     * @dev Multiply an Exp by a scalar, then truncate to return an unsigned integer.
     */
    function mul_ScalarTruncate(Exp memory a, uint scalar) pure internal returns (uint) {
        Exp memory product = mul_(a, scalar);
        return truncate(product);
    }

    /**
     * @dev Multiply an Exp by a scalar, truncate, then add an to an unsigned integer, returning an unsigned integer.
     */
    function mul_ScalarTruncateAddUInt(Exp memory a, uint scalar, uint addend) pure internal returns (uint) {
        Exp memory product = mul_(a, scalar);
        return add_(truncate(product), addend);
    }

    /**
     * @dev Checks if first Exp is less than second Exp.
     */
    function lessThanExp(Exp memory left, Exp memory right) pure internal returns (bool) {
        return left.mantissa < right.mantissa;
    }

    /**
     * @dev Checks if left Exp <= right Exp.
     */
    function lessThanOrEqualExp(Exp memory left, Exp memory right) pure internal returns (bool) {
        return left.mantissa <= right.mantissa;
    }

    /**
     * @dev Checks if left Exp > right Exp.
     */
    function greaterThanExp(Exp memory left, Exp memory right) pure internal returns (bool) {
        return left.mantissa > right.mantissa;
    }

    /**
     * @dev returns true if Exp is exactly zero
     */
    function isZeroExp(Exp memory value) pure internal returns (bool) {
        return value.mantissa == 0;
    }

    function safe224(uint n, string memory errorMessage) pure internal returns (uint224) {
        require(n < 2**224, errorMessage);
        return uint224(n);
    }

    function safe32(uint n, string memory errorMessage) pure internal returns (uint32) {
        require(n < 2**32, errorMessage);
        return uint32(n);
    }

    function add_(Exp memory a, Exp memory b) pure internal returns (Exp memory) {
        return Exp({mantissa: add_(a.mantissa, b.mantissa)});
    }

    function add_(Double memory a, Double memory b) pure internal returns (Double memory) {
        return Double({mantissa: add_(a.mantissa, b.mantissa)});
    }

    function add_(uint a, uint b) pure internal returns (uint) {
        return add_(a, b, "addition overflow");
    }

    function add_(uint a, uint b, string memory errorMessage) pure internal returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub_(Exp memory a, Exp memory b) pure internal returns (Exp memory) {
        return Exp({mantissa: sub_(a.mantissa, b.mantissa)});
    }

    function sub_(Double memory a, Double memory b) pure internal returns (Double memory) {
        return Double({mantissa: sub_(a.mantissa, b.mantissa)});
    }

    function sub_(uint a, uint b) pure internal returns (uint) {
        return sub_(a, b, "subtraction underflow");
    }

    function sub_(uint a, uint b, string memory errorMessage) pure internal returns (uint) {
        require(b <= a, errorMessage);
        return a - b;
    }

    function mul_(Exp memory a, Exp memory b) pure internal returns (Exp memory) {
        return Exp({mantissa: mul_(a.mantissa, b.mantissa) / expScale});
    }

    function mul_(Exp memory a, uint b) pure internal returns (Exp memory) {
        return Exp({mantissa: mul_(a.mantissa, b)});
    }

    function mul_(uint a, Exp memory b) pure internal returns (uint) {
        return mul_(a, b.mantissa) / expScale;
    }

    function mul_(Double memory a, Double memory b) pure internal returns (Double memory) {
        return Double({mantissa: mul_(a.mantissa, b.mantissa) / doubleScale});
    }

    function mul_(Double memory a, uint b) pure internal returns (Double memory) {
        return Double({mantissa: mul_(a.mantissa, b)});
    }

    function mul_(uint a, Double memory b) pure internal returns (uint) {
        return mul_(a, b.mantissa) / doubleScale;
    }

    function mul_(uint a, uint b) pure internal returns (uint) {
        return mul_(a, b, "multiplication overflow");
    }

    function mul_(uint a, uint b, string memory errorMessage) pure internal returns (uint) {
        if (a == 0 || b == 0) {
            return 0;
        }
        uint c = a * b;
        require(c / a == b, errorMessage);
        return c;
    }

    function div_(Exp memory a, Exp memory b) pure internal returns (Exp memory) {
        return Exp({mantissa: div_(mul_(a.mantissa, expScale), b.mantissa)});
    }

    function div_(Exp memory a, uint b) pure internal returns (Exp memory) {
        return Exp({mantissa: div_(a.mantissa, b)});
    }

    function div_(uint a, Exp memory b) pure internal returns (uint) {
        return div_(mul_(a, expScale), b.mantissa);
    }

    function div_(Double memory a, Double memory b) pure internal returns (Double memory) {
        return Double({mantissa: div_(mul_(a.mantissa, doubleScale), b.mantissa)});
    }

    function div_(Double memory a, uint b) pure internal returns (Double memory) {
        return Double({mantissa: div_(a.mantissa, b)});
    }

    function div_(uint a, Double memory b) pure internal returns (uint) {
        return div_(mul_(a, doubleScale), b.mantissa);
    }

    function div_(uint a, uint b) pure internal returns (uint) {
        return div_(a, b, "divide by zero");
    }

    function div_(uint a, uint b, string memory errorMessage) pure internal returns (uint) {
        require(b > 0, errorMessage);
        return a / b;
    }

    function fraction(uint a, uint b) pure internal returns (Double memory) {
        return Double({mantissa: div_(mul_(a, doubleScale), b)});
    }
}


// Dependency file: contracts/Exponential.sol

// pragma solidity 0.8.6;

// import "contracts/CarefulMath.sol";
// import "contracts/ExponentialNoError.sol";

/**
 * @title Exponential module for storing fixed-precision decimals
 * @author tropykus
 * @dev Legacy contract for compatibility reasons with existing contracts that still use MathError
 * @notice Exp is a struct which stores decimals with a fixed precision of 18 decimal places.
 *         Thus, if we wanted to store the 5.1, mantissa would store 5.1e18. That is:
 *         `Exp({mantissa: 5100000000000000000})`.
 */
contract Exponential is CarefulMath, ExponentialNoError {
    /**
     * @dev Creates an exponential from numerator and denominator values.
     *      Note: Returns an error if (`num` * 10e18) > MAX_INT,
     *            or if `denom` is zero.
     */
    function getExp(uint num, uint denom) internal pure  returns (MathError, Exp memory) {
        (MathError err0, uint scaledNumerator) = mulUInt(num, expScale);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }

        (MathError err1, uint rational) = divUInt(scaledNumerator, denom);
        if (err1 != MathError.NO_ERROR) {
            return (err1, Exp({mantissa: 0}));
        }

        return (MathError.NO_ERROR, Exp({mantissa: rational}));
    }

    /**
     * @dev Adds two exponentials, returning a new exponential.
     */
    function addExp(Exp memory a, Exp memory b) internal pure returns (MathError, Exp memory) {
        (MathError error, uint result) = addUInt(a.mantissa, b.mantissa);

        return (error, Exp({mantissa: result}));
    }

    /**
     * @dev Subtracts two exponentials, returning a new exponential.
     */
    function subExp(Exp memory a, Exp memory b) internal pure returns (MathError, Exp memory) {
        (MathError error, uint result) = subUInt(a.mantissa, b.mantissa);

        return (error, Exp({mantissa: result}));
    }

    /**
     * @dev Multiply an Exp by a scalar, returning a new Exp.
     */
    function mulScalar(Exp memory a, uint scalar) internal pure returns (MathError, Exp memory) {
        (MathError err0, uint scaledMantissa) = mulUInt(a.mantissa, scalar);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }

        return (MathError.NO_ERROR, Exp({mantissa: scaledMantissa}));
    }

    /**
     * @dev Multiply an Exp by a scalar, then truncate to return an unsigned integer.
     */
    function mulScalarTruncate(Exp memory a, uint scalar) internal pure returns (MathError, uint) {
        (MathError err, Exp memory product) = mulScalar(a, scalar);
        if (err != MathError.NO_ERROR) {
            return (err, 0);
        }

        return (MathError.NO_ERROR, truncate(product));
    }

    /**
     * @dev Multiply an Exp by a scalar, truncate, then add an to an unsigned integer, returning an unsigned integer.
     */
    function mulScalarTruncateAddUInt(Exp memory a, uint scalar, uint addend) internal pure returns (MathError, uint) {
        (MathError err, Exp memory product) = mulScalar(a, scalar);
        if (err != MathError.NO_ERROR) {
            return (err, 0);
        }

        return addUInt(truncate(product), addend);
    }

    /**
     * @dev Divide an Exp by a scalar, returning a new Exp.
     */
    function divScalar(Exp memory a, uint scalar) internal pure returns (MathError, Exp memory) {
        (MathError err0, uint descaledMantissa) = divUInt(a.mantissa, scalar);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }

        return (MathError.NO_ERROR, Exp({mantissa: descaledMantissa}));
    }

    /**
     * @dev Divide a scalar by an Exp, returning a new Exp.
     */
    function divScalarByExp(uint scalar, Exp memory divisor) internal pure returns (MathError, Exp memory) {
        /*
          We are doing this as:
          getExp(mulUInt(expScale, scalar), divisor.mantissa)

          How it works:
          Exp = a / b;
          Scalar = s;
          `s / (a / b)` = `b * s / a` and since for an Exp `a = mantissa, b = expScale`
        */
        (MathError err0, uint numerator) = mulUInt(expScale, scalar);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }
        return getExp(numerator, divisor.mantissa);
    }

    /**
     * @dev Divide a scalar by an Exp, then truncate to return an unsigned integer.
     */
    function divScalarByExpTruncate(uint scalar, Exp memory divisor) internal pure returns (MathError, uint) {
        (MathError err, Exp memory fraction) = divScalarByExp(scalar, divisor);
        if (err != MathError.NO_ERROR) {
            return (err, 0);
        }

        return (MathError.NO_ERROR, truncate(fraction));
    }

    /**
     * @dev Multiplies two exponentials, returning a new exponential.
     */
    function mulExp(Exp memory a, Exp memory b) internal pure returns (MathError, Exp memory) {

        (MathError err0, uint doubleScaledProduct) = mulUInt(a.mantissa, b.mantissa);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }

        // We add half the scale before dividing so that we get rounding instead of truncation.
        //  See "Listing 6" and text above it at https://accu.org/index.php/journals/1717
        // Without this change, a result like 6.6...e-19 will be truncated to 0 instead of being rounded to 1e-18.
        (MathError err1, uint doubleScaledProductWithHalfScale) = addUInt(halfExpScale, doubleScaledProduct);
        if (err1 != MathError.NO_ERROR) {
            return (err1, Exp({mantissa: 0}));
        }

        (MathError err2, uint product) = divUInt(doubleScaledProductWithHalfScale, expScale);
        // The only error `div` can return is MathError.DIVISION_BY_ZERO but we control `expScale` and it is not zero.
        assert(err2 == MathError.NO_ERROR);

        return (MathError.NO_ERROR, Exp({mantissa: product}));
    }

    /**
     * @dev Multiplies two exponentials given their mantissas, returning a new exponential.
     */
    function mulExp(uint a, uint b) internal pure returns (MathError, Exp memory) {
        return mulExp(Exp({mantissa: a}), Exp({mantissa: b}));
    }

    /**
     * @dev Multiplies three exponentials, returning a new exponential.
     */
    function mulExp3(Exp memory a, Exp memory b, Exp memory c) internal pure returns (MathError, Exp memory) {
        (MathError err, Exp memory ab) = mulExp(a, b);
        if (err != MathError.NO_ERROR) {
            return (err, ab);
        }
        return mulExp(ab, c);
    }

    /**
     * @dev Divides two exponentials, returning a new exponential.
     *     (a/scale) / (b/scale) = (a/scale) * (scale/b) = a/b,
     *  which we can scale as an Exp by calling getExp(a.mantissa, b.mantissa)
     */
    function divExp(Exp memory a, Exp memory b) internal pure returns (MathError, Exp memory) {
        return getExp(a.mantissa, b.mantissa);
    }
}


// Dependency file: contracts/SafeMath.sol

// pragma solidity 0.8.6;

// From https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/Math.sol
// Subject to the MIT license.

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting with custom message on overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, errorMessage);

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on underflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot underflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction underflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on underflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot underflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, errorMessage);

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers.
     * Reverts on division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers.
     * Reverts with custom message on division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}


// Dependency file: contracts/InterestRateModel.sol

// pragma solidity 0.8.6;

// import "contracts/Exponential.sol";
// import "contracts/SafeMath.sol";

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


// Dependency file: contracts/EIP20NonStandardInterface.sol

// pragma solidity 0.8.6;

/**
 * @title EIP20NonStandardInterface
 * @dev Version of ERC20 with no return values for `transfer` and `transferFrom`
 *  See https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca
 */
interface EIP20NonStandardInterface {
    /**
     * @notice Get the total number of tokens in circulation
     * @return The supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Gets the balance of the specified address
     * @param owner The address from which the balance will be retrieved
     * @return balance The balance
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    ///
    /// !!!!!!!!!!!!!!
    /// !!! NOTICE !!! `transfer` does not return a value, in violation of the ERC-20 specification
    /// !!!!!!!!!!!!!!
    ///

    /**
     * @notice Transfer `amount` tokens from `msg.sender` to `dst`
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     */
    function transfer(address dst, uint256 amount) external;

    ///
    /// !!!!!!!!!!!!!!
    /// !!! NOTICE !!! `transferFrom` does not return a value, in violation of the ERC-20 specification
    /// !!!!!!!!!!!!!!
    ///

    /**
     * @notice Transfer `amount` tokens from `src` to `dst`
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     */
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external;

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     *  and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved
     * @return success Whether or not the approval succeeded
     */
    function approve(address spender, uint256 amount)
        external
        returns (bool success);

    /**
     * @notice Get the current allowance from `owner` for `spender`
     * @param owner The address of the account which owns the tokens to be spent
     * @param spender The address of the account which may transfer tokens
     * @return remaining The number of tokens allowed to be spent
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256 remaining);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
}


// Dependency file: contracts/CTokenInterfaces.sol

// pragma solidity 0.8.6;

// import "contracts/ComptrollerInterface.sol";
// import "contracts/InterestRateModel.sol";
// import "contracts/EIP20NonStandardInterface.sol";

contract CTokenStorage {
    /**
     * @dev Guard variable for re-entrancy checks
     */
    bool internal _notEntered;

    /**
     * @notice EIP-20 token name for this token
     */
    string public name;

    /**
     * @notice EIP-20 token symbol for this token
     */
    string public symbol;

    /**
     * @notice EIP-20 token decimals for this token
     */
    uint8 public decimals;

    /**
     * @notice Maximum borrow rate that can ever be applied (.0005% / block)
     */

    uint256 internal constant borrowRateMaxMantissa = 0.0005e16;

    /**
     * @notice Maximum fraction of interest that can be set aside for reserves
     */
    uint256 internal constant reserveFactorMaxMantissa = 1e18;

    /**
     * @notice Administrator for this contract
     */
    address payable public admin;

    /**
     * @notice Pending administrator for this contract
     */
    address payable public pendingAdmin;

    /**
     * @notice Contract which oversees inter-cToken operations
     */
    ComptrollerInterface public comptroller;

    /**
     * @notice Model which tells what the current interest rate should be
     */
    InterestRateModel public interestRateModel;

    /**
     * @notice Initial exchange rate used when minting the first CTokens (used when totalSupply = 0)
     */
    uint256 public initialExchangeRateMantissa;

    /**
     * @notice Fraction of interest currently set aside for reserves
     */
    uint256 public reserveFactorMantissa;

    /**
     * @notice Block number that interest was last accrued at
     */
    uint256 public accrualBlockNumber;

    /**
     * @notice Accumulator of the total earned interest rate since the opening of the market
     */
    uint256 public borrowIndex;

    /**
     * @notice Total amount of outstanding borrows of the underlying in this market
     */
    uint256 public totalBorrows;

    /**
     * @notice Total amount of reserves of the underlying held in this market
     */
    uint256 public totalReserves;

    /**
     * @notice Total number of tokens in circulation
     */
    uint256 public totalSupply;

    uint256 public subsidyFund;

    struct SupplySnapshot {
        uint256 tokens;
        uint256 underlyingAmount;
        uint256 suppliedAt;
        uint256 promisedSupplyRate;
    }

    /**
     * @notice Official record of token balances for each account
     */
    mapping(address => SupplySnapshot) internal accountTokens;

    /**
     * @notice Approved token transfer amounts on behalf of others
     */
    mapping(address => mapping(address => uint256)) internal transferAllowances;

    /**
     * @notice Container for borrow balance information
     * @member principal Total balance (with accrued interest), after applying the most recent balance-changing action
     * @member interestIndex Global borrowIndex as of the most recent balance-changing action
     */
    struct BorrowSnapshot {
        uint256 principal;
        uint256 interestIndex;
    }

    /**
     * @notice Mapping of account addresses to outstanding borrow balances
     */
    mapping(address => BorrowSnapshot) internal accountBorrows;
}

abstract contract CTokenInterface is CTokenStorage {
    /**
     * @notice Indicator that this is a CToken contract (for inspection)
     */
    bool public constant isCToken = true;

    /*** Market Events ***/

    /**
     * @notice Event emitted when interest is accrued
     */
    event AccrueInterest(
        uint256 cashPrior,
        uint256 interestAccumulated,
        uint256 borrowIndex,
        uint256 totalBorrows
    );

    /**
     * @notice Event emitted when tokens are minted
     */
    event Mint(address indexed minter, uint256 mintAmount, uint256 mintTokens);

    /**
     * @notice Event emitted when tokens are redeemed
     */
    event Redeem(
        address indexed redeemer,
        uint256 redeemAmount,
        uint256 redeemTokens
    );

    /**
     * @notice Event emitted when underlying is borrowed
     */
    event Borrow(
        address indexed borrower,
        uint256 borrowAmount,
        uint256 accountBorrows,
        uint256 totalBorrows
    );

    /**
     * @notice Event emitted when a borrow is repaid
     */
    event RepayBorrow(
        address indexed payer,
        address indexed borrower,
        uint256 repayAmount,
        uint256 accountBorrows,
        uint256 totalBorrows
    );

    /**
     * @notice Event emitted when a borrow is liquidated
     */
    event LiquidateBorrow(
        address indexed liquidator,
        address indexed borrower,
        uint256 repayAmount,
        address indexed cTokenCollateral,
        uint256 seizeTokens
    );

    /*** Admin Events ***/

    /**
     * @notice Event emitted when pendingAdmin is changed
     */
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);

    /**
     * @notice Event emitted when pendingAdmin is accepted, which means admin is updated
     */
    event NewAdmin(address oldAdmin, address newAdmin);

    /**
     * @notice Event emitted when comptroller is changed
     */
    event NewComptroller(
        ComptrollerInterface oldComptroller,
        ComptrollerInterface newComptroller
    );

    /**
     * @notice Event emitted when interestRateModel is changed
     */
    event NewMarketInterestRateModel(
        InterestRateModel oldInterestRateModel,
        InterestRateModel newInterestRateModel
    );

    /**
     * @notice Event emitted when the reserve factor is changed
     */
    event NewReserveFactor(
        uint256 oldReserveFactorMantissa,
        uint256 newReserveFactorMantissa
    );

    /**
     * @notice Event emitted when the reserves are added
     */
    event ReservesAdded(
        address benefactor,
        uint256 addAmount,
        uint256 newTotalReserves
    );

    event SubsidyAdded(
        address benefactor,
        uint256 addAmount,
        uint256 newSubsidyFund
    );

    /**
     * @notice Event emitted when the reserves are reduced
     */
    event ReservesReduced(
        address admin,
        uint256 reduceAmount,
        uint256 newTotalReserves
    );

    /**
     * @notice EIP20 Transfer event
     */
    event Transfer(address indexed from, address indexed to, uint256 amount);

    /**
     * @notice EIP20 Approval event
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );

    /**
     * @notice Failure event
     */
    event CTokenStorageFailure(uint256 error, uint256 info, uint256 detail);

    /*** User Interface ***/

    function transfer(address dst, uint256 amount)
        external
        virtual
        returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external virtual returns (bool);

    function approve(address spender, uint256 amount)
        external
        virtual
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        virtual
        returns (uint256);

    function balanceOf(address owner) external view virtual returns (uint256);

    function balanceOfUnderlying(address owner)
        external
        virtual
        returns (uint256);

    function getAccountSnapshot(address account)
        external
        view
        virtual
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        );

    function borrowRatePerBlock() external view virtual returns (uint256);

    function supplyRatePerBlock() external view virtual returns (uint256);

    function totalBorrowsCurrent() external virtual returns (uint256);

    function borrowBalanceCurrent(address account)
        external
        virtual
        returns (uint256);

    function borrowBalanceStored(address account)
        public
        view
        virtual
        returns (uint256);

    function exchangeRateCurrent() public virtual returns (uint256);

    function exchangeRateStored() public view virtual returns (uint256);

    function getCash() external view virtual returns (uint256);

    function accrueInterest() public virtual returns (uint256);

    function seize(
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external virtual returns (uint256);

    /*** Admin Functions ***/

    function _setPendingAdmin(address payable newPendingAdmin)
        external
        virtual
        returns (uint256);

    function _acceptAdmin() external virtual returns (uint256);

    function _setComptroller(ComptrollerInterface newComptroller)
        public
        virtual
        returns (uint256);

    function _setReserveFactor(uint256 newReserveFactorMantissa)
        external
        virtual
        returns (uint256);

    function _reduceReserves(uint256 reduceAmount)
        external
        virtual
        returns (uint256);

    function _setInterestRateModel(InterestRateModel newInterestRateModel)
        public
        virtual
        returns (uint256);
}

contract CErc20Storage {
    /**
     * @notice Underlying asset for this CToken
     */
    address public underlying;
}

abstract contract CErc20Interface is CErc20Storage {
    /*** User Interface ***/

    function mint(uint256 mintAmount) external virtual returns (uint256);

    function redeem(uint256 redeemAmount)
        external
        virtual
        returns (uint256);

    function borrow(uint256 borrowAmount) external virtual returns (uint256);

    function repayBorrow(uint256 repayAmount)
        external
        virtual
        returns (uint256);

    function liquidateBorrow(
        address borrower,
        uint256 repayAmount,
        CTokenInterface cTokenCollateral
    ) external virtual returns (uint256);

    function sweepToken(EIP20NonStandardInterface token) external virtual;

    /*** Admin Functions ***/

    function _addReserves(uint256 addAmount) external virtual returns (uint256);
}

contract CDelegationStorage {
    /**
     * @notice Implementation address for this contract
     */
    address public implementation;
}

abstract contract CDelegatorInterface is CDelegationStorage {
    /**
     * @notice Emitted when implementation is changed
     */
    event NewImplementation(
        address oldImplementation,
        address newImplementation
    );

    /**
     * @notice Called by the admin to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementation(
        address implementation_,
        bool allowResign,
        bytes memory becomeImplementationData
    ) public virtual;
}

abstract contract CDelegateInterface is CDelegationStorage {
    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @dev Should revert if any issues arise which make it unfit for delegation
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes memory data) public virtual;

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() public virtual;
}


// Dependency file: contracts/ErrorReporter.sol

// pragma solidity 0.8.6;

contract ComptrollerErrorReporter {
    enum Error {
        NO_ERROR,
        UNAUTHORIZED,
        COMPTROLLER_MISMATCH,
        INSUFFICIENT_SHORTFALL,
        INSUFFICIENT_LIQUIDITY,
        INVALID_CLOSE_FACTOR,
        INVALID_COLLATERAL_FACTOR,
        INVALID_LIQUIDATION_INCENTIVE,
        MARKET_NOT_ENTERED, // no longer possible
        MARKET_NOT_LISTED,
        MARKET_ALREADY_LISTED,
        MATH_ERROR,
        NONZERO_BORROW_BALANCE,
        PRICE_ERROR,
        REJECTION,
        SNAPSHOT_ERROR,
        TOO_MANY_ASSETS,
        TOO_MUCH_REPAY
    }

    enum FailureInfo {
        ACCEPT_ADMIN_PENDING_ADMIN_CHECK,
        ACCEPT_PENDING_IMPLEMENTATION_ADDRESS_CHECK,
        EXIT_MARKET_BALANCE_OWED,
        EXIT_MARKET_REJECTION,
        SET_CLOSE_FACTOR_OWNER_CHECK,
        SET_CLOSE_FACTOR_VALIDATION,
        SET_COLLATERAL_FACTOR_OWNER_CHECK,
        SET_COLLATERAL_FACTOR_NO_EXISTS,
        SET_COLLATERAL_FACTOR_VALIDATION,
        SET_COLLATERAL_FACTOR_WITHOUT_PRICE,
        SET_IMPLEMENTATION_OWNER_CHECK,
        SET_LIQUIDATION_INCENTIVE_OWNER_CHECK,
        SET_LIQUIDATION_INCENTIVE_VALIDATION,
        SET_MAX_ASSETS_OWNER_CHECK,
        SET_PENDING_ADMIN_OWNER_CHECK,
        SET_PENDING_IMPLEMENTATION_OWNER_CHECK,
        SET_PRICE_ORACLE_OWNER_CHECK,
        SUPPORT_MARKET_EXISTS,
        SUPPORT_MARKET_OWNER_CHECK,
        SET_PAUSE_GUARDIAN_OWNER_CHECK
    }

    /**
     * @dev `error` corresponds to enum Error; `info` corresponds to enum FailureInfo, and `detail` is an arbitrary
     * contract-specific code that enables us to report opaque error codes from upgradeable contracts.
     **/
    event Failure(uint256 error, uint256 info, uint256 detail);

    /**
     * @dev use this when reporting a known error from the money market or a non-upgradeable collaborator
     */
    function fail(Error err, FailureInfo info) internal returns (uint256) {
        emit Failure(uint256(err), uint256(info), 0);

        return uint256(err);
    }

    /**
     * @dev use this when reporting an opaque error from an upgradeable collaborator contract
     */
    function failOpaque(
        Error err,
        FailureInfo info,
        uint256 opaqueError
    ) internal returns (uint256) {
        emit Failure(uint256(err), uint256(info), opaqueError);

        return uint256(err);
    }
}

contract TokenErrorReporter {
    enum Error {
        NO_ERROR,
        UNAUTHORIZED,
        BAD_INPUT,
        COMPTROLLER_REJECTION,
        COMPTROLLER_CALCULATION_ERROR,
        INTEREST_RATE_MODEL_ERROR,
        INVALID_ACCOUNT_PAIR,
        INVALID_CLOSE_AMOUNT_REQUESTED,
        INVALID_COLLATERAL_FACTOR,
        MATH_ERROR,
        MARKET_NOT_FRESH,
        MARKET_NOT_LISTED,
        TOKEN_INSUFFICIENT_ALLOWANCE,
        TOKEN_INSUFFICIENT_BALANCE,
        TOKEN_INSUFFICIENT_CASH,
        TOKEN_TRANSFER_IN_FAILED,
        TOKEN_TRANSFER_OUT_FAILED
    }

    /*
     * Note: FailureInfo (but not Error) is kept in alphabetical order
     *       This is because FailureInfo grows significantly faster, and
     *       the order of Error has some meaning, while the order of FailureInfo
     *       is entirely arbitrary.
     */
    enum FailureInfo {
        ACCEPT_ADMIN_PENDING_ADMIN_CHECK,
        ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED,
        ACCRUE_INTEREST_BORROW_RATE_CALCULATION_FAILED,
        ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED,
        ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED,
        ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED,
        ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED,
        BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED,
        BORROW_ACCRUE_INTEREST_FAILED,
        BORROW_CASH_NOT_AVAILABLE,
        BORROW_FRESHNESS_CHECK,
        BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED,
        BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED,
        BORROW_MARKET_NOT_LISTED,
        BORROW_COMPTROLLER_REJECTION,
        LIQUIDATE_ACCRUE_BORROW_INTEREST_FAILED,
        LIQUIDATE_ACCRUE_COLLATERAL_INTEREST_FAILED,
        LIQUIDATE_COLLATERAL_FRESHNESS_CHECK,
        LIQUIDATE_COMPTROLLER_REJECTION,
        LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED,
        LIQUIDATE_CLOSE_AMOUNT_IS_UINT_MAX,
        LIQUIDATE_CLOSE_AMOUNT_IS_ZERO,
        LIQUIDATE_FRESHNESS_CHECK,
        LIQUIDATE_LIQUIDATOR_IS_BORROWER,
        LIQUIDATE_REPAY_BORROW_FRESH_FAILED,
        LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED,
        LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED,
        LIQUIDATE_SEIZE_COMPTROLLER_REJECTION,
        LIQUIDATE_SEIZE_LIQUIDATOR_IS_BORROWER,
        LIQUIDATE_SEIZE_TOO_MUCH,
        MINT_ACCRUE_INTEREST_FAILED,
        MINT_COMPTROLLER_REJECTION,
        MINT_EXCHANGE_CALCULATION_FAILED,
        MINT_EXCHANGE_RATE_READ_FAILED,
        MINT_FRESHNESS_CHECK,
        MINT_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED,
        MINT_NEW_TOTAL_SUPPLY_CALCULATION_FAILED,
        MINT_TRANSFER_IN_FAILED,
        MINT_TRANSFER_IN_NOT_POSSIBLE,
        REDEEM_ACCRUE_INTEREST_FAILED,
        REDEEM_COMPTROLLER_REJECTION,
        REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED,
        REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED,
        REDEEM_EXCHANGE_RATE_READ_FAILED,
        REDEEM_FRESHNESS_CHECK,
        REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED,
        REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED,
        REDEEM_TRANSFER_OUT_NOT_POSSIBLE,
        REDUCE_RESERVES_ACCRUE_INTEREST_FAILED,
        REDUCE_RESERVES_ADMIN_CHECK,
        REDUCE_RESERVES_CASH_NOT_AVAILABLE,
        REDUCE_RESERVES_FRESH_CHECK,
        REDUCE_RESERVES_VALIDATION,
        REPAY_BEHALF_ACCRUE_INTEREST_FAILED,
        REPAY_BORROW_ACCRUE_INTEREST_FAILED,
        REPAY_BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED,
        REPAY_BORROW_COMPTROLLER_REJECTION,
        REPAY_BORROW_FRESHNESS_CHECK,
        REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED,
        REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED,
        REPAY_BORROW_TRANSFER_IN_NOT_POSSIBLE,
        SET_COLLATERAL_FACTOR_OWNER_CHECK,
        SET_COLLATERAL_FACTOR_VALIDATION,
        SET_COMPTROLLER_OWNER_CHECK,
        SET_INTEREST_RATE_MODEL_ACCRUE_INTEREST_FAILED,
        SET_INTEREST_RATE_MODEL_FRESH_CHECK,
        SET_INTEREST_RATE_MODEL_OWNER_CHECK,
        SET_MAX_ASSETS_OWNER_CHECK,
        SET_ORACLE_MARKET_NOT_LISTED,
        SET_PENDING_ADMIN_OWNER_CHECK,
        SET_RESERVE_FACTOR_ACCRUE_INTEREST_FAILED,
        SET_RESERVE_FACTOR_ADMIN_CHECK,
        SET_RESERVE_FACTOR_FRESH_CHECK,
        SET_RESERVE_FACTOR_BOUNDS_CHECK,
        TRANSFER_COMPTROLLER_REJECTION,
        TRANSFER_NOT_ALLOWED,
        TRANSFER_NOT_ENOUGH,
        TRANSFER_TOO_MUCH,
        ADD_RESERVES_ACCRUE_INTEREST_FAILED,
        ADD_RESERVES_FRESH_CHECK,
        ADD_RESERVES_TRANSFER_IN_NOT_POSSIBLE,
        ADD_SUBSIDY_FUND_FAILED,
        ADD_SUBSIDY_FUND_FRESH_CHECK
    }

    /**
     * @dev `error` corresponds to enum Error; `info` corresponds to enum FailureInfo, and `detail` is an arbitrary
     * contract-specific code that enables us to report opaque error codes from upgradeable contracts.
     **/
    event TokenFailure(uint256 error, uint256 info, uint256 detail);

    /**
     * @dev use this when reporting a known error from the money market or a non-upgradeable collaborator
     */
    function fail(Error err, FailureInfo info) internal returns (uint256) {
        emit TokenFailure(uint256(err), uint256(info), 0);

        return uint256(err);
    }

    /**
     * @dev use this when reporting an opaque error from an upgradeable collaborator contract
     */
    function failOpaque(
        Error err,
        FailureInfo info,
        uint256 opaqueError
    ) internal returns (uint256) {
        emit TokenFailure(uint256(err), uint256(info), opaqueError);

        return uint256(err);
    }
}


// Dependency file: contracts/EIP20Interface.sol

// pragma solidity 0.8.6;

/**
 * @title ERC 20 Token Standard Interface
 *  https://eips.ethereum.org/EIPS/eip-20
 */
interface EIP20Interface {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    /**
     * @notice Get the total number of tokens in circulation
     * @return The supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Gets the balance of the specified address
     * @param owner The address from which the balance will be retrieved
     * @return balance The balance
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @notice Transfer `amount` tokens from `msg.sender` to `dst`
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return success Whether or not the transfer succeeded
     */
    function transfer(address dst, uint256 amount)
        external
        returns (bool success);

    /**
     * @notice Transfer `amount` tokens from `src` to `dst`
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return success Whether or not the transfer succeeded
     */
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool success);

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     *  and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (-1 means infinite)
     * @return success Whether or not the approval succeeded
     */
    function approve(address spender, uint256 amount)
        external
        returns (bool success);

    /**
     * @notice Get the current allowance from `owner` for `spender`
     * @param owner The address of the account which owns the tokens to be spent
     * @param spender The address of the account which may transfer tokens
     * @return remaining The number of tokens allowed to be spent (-1 means infinite)
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256 remaining);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
}


// Dependency file: contracts/CToken.sol

// pragma solidity 0.8.6;

// import "contracts/ComptrollerInterface.sol";
// import "contracts/CTokenInterfaces.sol";
// import "contracts/ErrorReporter.sol";
// import "contracts/Exponential.sol";
// import "contracts/EIP20Interface.sol";
// import "contracts/InterestRateModel.sol";

/**
 * @title tropykus CToken Contract
 * @notice Abstract base for CTokens
 * @author tropykus
 */
abstract contract CToken is CTokenInterface, Exponential, TokenErrorReporter {
    /**
     * @notice Initialize the money market
     * @param comptroller_ The address of the Comptroller
     * @param interestRateModel_ The address of the interest rate model
     * @param initialExchangeRateMantissa_ The initial exchange rate, scaled by 1e18
     * @param name_ EIP-20 name of this token
     * @param symbol_ EIP-20 symbol of this token
     * @param decimals_ EIP-20 decimal precision of this token
     */
    function initialize(
        ComptrollerInterface comptroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) public {
        require(msg.sender == admin, "CT01");
        require(accrualBlockNumber == 0 && borrowIndex == 0, "CT02");

        initialExchangeRateMantissa = initialExchangeRateMantissa_;
        require(initialExchangeRateMantissa > 0, "CT03");

        uint256 err = _setComptroller(comptroller_);
        require(err == uint256(Error.NO_ERROR), "CT04");

        accrualBlockNumber = getBlockNumber();
        borrowIndex = mantissaOne;

        err = _setInterestRateModelFresh(interestRateModel_);
        require(err == uint256(Error.NO_ERROR), "CT05");

        name = name_;
        symbol = symbol_;
        decimals = decimals_;

        _notEntered = true;
    }

    /**
     * @notice Transfer `tokens` tokens from `src` to `dst` by `spender`
     * @dev Called by both `transfer` and `transferFrom` internally
     * @param spender The address of the account performing the transfer
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param tokens The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferTokens(
        address spender,
        address src,
        address dst,
        uint256 tokens
    ) internal returns (uint256) {
        uint256 allowed = comptroller.transferAllowed(
            address(this),
            src,
            dst,
            tokens
        );
        if (allowed != 0) {
            return
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.TRANSFER_COMPTROLLER_REJECTION,
                    allowed
                );
        }

        if (src == dst) {
            return fail(Error.BAD_INPUT, FailureInfo.TRANSFER_NOT_ALLOWED);
        }

        uint256 startingAllowance = 0;
        if (spender == src) {
            startingAllowance = type(uint256).max;
        } else {
            startingAllowance = transferAllowances[src][spender];
        }

        MathError mathErr;
        uint256 allowanceNew;
        uint256 srcTokensNew;
        uint256 dstTokensNew;

        (mathErr, allowanceNew) = subUInt(startingAllowance, tokens);
        if (mathErr != MathError.NO_ERROR) {
            return fail(Error.MATH_ERROR, FailureInfo.TRANSFER_NOT_ALLOWED);
        }

        (mathErr, srcTokensNew) = subUInt(accountTokens[src].tokens, tokens);
        if (mathErr != MathError.NO_ERROR) {
            return fail(Error.MATH_ERROR, FailureInfo.TRANSFER_NOT_ENOUGH);
        }

        (mathErr, dstTokensNew) = addUInt(accountTokens[dst].tokens, tokens);
        if (mathErr != MathError.NO_ERROR) {
            return fail(Error.MATH_ERROR, FailureInfo.TRANSFER_TOO_MUCH);
        }

        accountTokens[src].tokens = srcTokensNew;
        accountTokens[dst].tokens = dstTokensNew;

        if (startingAllowance != type(uint256).max) {
            transferAllowances[src][spender] = allowanceNew;
        }

        emit Transfer(src, dst, tokens);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Transfer `amount` tokens from `msg.sender` to `dst`
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transfer(address dst, uint256 amount)
        external
        override
        nonReentrant
        returns (bool)
    {
        return
            transferTokens(msg.sender, msg.sender, dst, amount) ==
            uint256(Error.NO_ERROR);
    }

    /**
     * @notice Transfer `amount` tokens from `src` to `dst`
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param amount The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external override nonReentrant returns (bool) {
        return
            transferTokens(msg.sender, src, dst, amount) ==
            uint256(Error.NO_ERROR);
    }

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     *  and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (-1 means infinite)
     * @return Whether or not the approval succeeded
     */
    function approve(address spender, uint256 amount)
        external
        override
        returns (bool)
    {
        transferAllowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Get the current allowance from `owner` for `spender`
     * @param owner The address of the account which owns the tokens to be spent
     * @param spender The address of the account which may transfer tokens
     * @return The number of tokens allowed to be spent (-1 means infinite)
     */
    function allowance(address owner, address spender)
        external
        view
        override
        returns (uint256)
    {
        return transferAllowances[owner][spender];
    }

    /**
     * @notice Get the token balance of the `owner`
     * @param owner The address of the account to query
     * @return The number of tokens owned by `owner`
     */
    function balanceOf(address owner) external view override returns (uint256) {
        return accountTokens[owner].tokens;
    }

    /**
     * @notice Get the underlying balance of the `owner`
     * @dev This also accrues interest in a transaction
     * @param owner The address of the account to query
     * @return The amount of underlying owned by `owner`
     */
    function balanceOfUnderlying(address owner)
        external
        override
        returns (uint256)
    {
        (MathError mErr, uint256 balance) = mulScalarTruncate(
            Exp({mantissa: exchangeRateCurrent()}),
            accountTokens[owner].tokens
        );
        require(mErr == MathError.NO_ERROR, "CT06");
        return balance;
    }

    /**
     * @notice Get a snapshot of the account's balances, and the cached exchange rate
     * @dev This is used by comptroller to more efficiently perform liquidity checks.
     * @param account Address of the account to snapshot
     * @return (possible error, token balance, borrow balance, exchange rate mantissa)
     */
    function getAccountSnapshot(address account)
        external
        view
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 cTokenBalance = accountTokens[account].tokens;
        uint256 borrowBalance;
        uint256 exchangeRateMantissa;

        MathError mErr;

        (mErr, borrowBalance) = borrowBalanceStoredInternal(account);
        if (mErr != MathError.NO_ERROR) {
            return (uint256(Error.MATH_ERROR), 0, 0, 0);
        }

        if (interestRateModel.isTropykusInterestRateModel()) {
            (mErr, exchangeRateMantissa) = tropykusExchangeRateStoredInternal(
                account
            );
        } else {
            (mErr, exchangeRateMantissa) = exchangeRateStoredInternal();
        }
        if (mErr != MathError.NO_ERROR) {
            return (uint256(Error.MATH_ERROR), 0, 0, 0);
        }

        return (
            uint256(Error.NO_ERROR),
            cTokenBalance,
            borrowBalance,
            exchangeRateMantissa
        );
    }

    /**
     * @dev Function to simply retrieve block number
     *  This exists mainly for inheriting test contracts to stub this result.
     */
    function getBlockNumber() internal view virtual returns (uint256) {
        return block.number;
    }

    /**
     * @notice Returns the current per-block borrow interest rate for this cToken
     * @return The borrow interest rate per block, scaled by 1e18
     */
    function borrowRatePerBlock() external view override returns (uint256) {
        return
            interestRateModel.getBorrowRate(
                getCashPrior(),
                totalBorrows,
                totalReserves
            );
    }

    /**
     * @notice Returns the current per-block supply interest rate for this cToken
     * @return The supply interest rate per block, scaled by 1e18
     */
    function supplyRatePerBlock() external view override returns (uint256) {
        return
            interestRateModel.getSupplyRate(
                getCashPrior(),
                totalBorrows,
                totalReserves,
                reserveFactorMantissa
            );
    }

    /**
     * @notice Returns the current total borrows plus accrued interest
     * @return The total borrows with interest
     */
    function totalBorrowsCurrent()
        external
        override
        nonReentrant
        returns (uint256)
    {
        require(accrueInterest() == uint256(Error.NO_ERROR), "CT07");
        return totalBorrows;
    }

    /**
     * @notice Accrue interest to updated borrowIndex and then calculate account's borrow balance using the updated borrowIndex
     * @param account The address whose balance should be calculated after updating borrowIndex
     * @return The calculated balance
     */
    function borrowBalanceCurrent(address account)
        external
        override
        nonReentrant
        returns (uint256)
    {
        require(accrueInterest() == uint256(Error.NO_ERROR), "CT07");
        return borrowBalanceStored(account);
    }

    /**
     * @notice Return the borrow balance of account based on stored data
     * @param account The address whose balance should be calculated
     * @return The calculated balance
     */
    function borrowBalanceStored(address account)
        public
        view
        override
        returns (uint256)
    {
        (MathError err, uint256 result) = borrowBalanceStoredInternal(account);
        require(err == MathError.NO_ERROR, "CT08");
        return result;
    }

    /**
     * @notice Return the borrow balance of account based on stored data
     * @param account The address whose balance should be calculated
     * @return (error code, the calculated balance or 0 if error code is non-zero)
     */
    function borrowBalanceStoredInternal(address account)
        internal
        view
        returns (MathError, uint256)
    {
        MathError mathErr;
        uint256 principalTimesIndex;
        uint256 result;

        BorrowSnapshot storage borrowSnapshot = accountBorrows[account];

        if (borrowSnapshot.principal == 0) {
            return (MathError.NO_ERROR, 0);
        }

        (mathErr, principalTimesIndex) = mulUInt(
            borrowSnapshot.principal,
            borrowIndex
        );
        if (mathErr != MathError.NO_ERROR) {
            return (mathErr, 0);
        }

        (mathErr, result) = divUInt(
            principalTimesIndex,
            borrowSnapshot.interestIndex
        );
        if (mathErr != MathError.NO_ERROR) {
            return (mathErr, 0);
        }

        return (MathError.NO_ERROR, result);
    }

    function getBorrowerPrincipalStored(address account)
        public
        view
        returns (uint256 borrowed)
    {
        borrowed = accountBorrows[account].principal;
    }

    function getSupplierSnapshotStored(address account)
        public
        view
        returns (
            uint256 tokens,
            uint256 underlyingAmount,
            uint256 suppliedAt,
            uint256 promisedSupplyRate
        )
    {
        tokens = accountTokens[account].tokens;
        underlyingAmount = accountTokens[account].underlyingAmount;
        suppliedAt = accountTokens[account].suppliedAt;
        promisedSupplyRate = accountTokens[account].promisedSupplyRate;
    }

    /**
     * @notice Accrue interest then return the up-to-date exchange rate
     * @return Calculated exchange rate scaled by 1e18
     */
    function exchangeRateCurrent()
        public
        override
        nonReentrant
        returns (uint256)
    {
        require(accrueInterest() == uint256(Error.NO_ERROR), "CT07");
        return exchangeRateStored();
    }

    /**
     * @notice Calculates the exchange rate from the underlying to the CToken
     * @dev This function does not accrue interest before calculating the exchange rate
     * @return Calculated exchange rate scaled by 1e18
     */
    function exchangeRateStored() public view override returns (uint256) {
        (MathError err, uint256 result) = exchangeRateStoredInternal();
        require(err == MathError.NO_ERROR, "CT09");
        return result;
    }

    /**
     * @notice Calculates the exchange rate from the underlying to the CToken
     * @dev This function does not accrue interest before calculating the exchange rate
     * @return (error code, calculated exchange rate scaled by 1e18)
     */
    function exchangeRateStoredInternal()
        internal
        view
        virtual
        returns (MathError, uint256)
    {
        uint256 _totalSupply = totalSupply;
        if (_totalSupply == 0) {
            return (MathError.NO_ERROR, initialExchangeRateMantissa);
        } else {
            MathError error;
            uint256 exchangeRate;
            uint256 totalCash = getCashPrior();
            if (interestRateModel.isTropykusInterestRateModel()) {
                (error, exchangeRate) = tropykusExchangeRateStoredInternal(msg.sender);
                if (error == MathError.NO_ERROR) {
                    return (MathError.NO_ERROR, exchangeRate);
                } else {
                    return (MathError.NO_ERROR, initialExchangeRateMantissa);
                }
            }
            return interestRateModel.getExchangeRate(
                    totalCash,
                    totalBorrows,
                    totalReserves,
                    totalSupply
                );
        }
    }

    function tropykusExchangeRateStoredInternal(address redeemer)
        internal
        view
        returns (MathError, uint256)
    {
        if (totalSupply == 0) {
            return (MathError.NO_ERROR, initialExchangeRateMantissa);
        } else {
            SupplySnapshot storage supplySnapshot = accountTokens[redeemer];
            if (supplySnapshot.suppliedAt == 0) {
                return (MathError.DIVISION_BY_ZERO, 0);
            }
            (,uint256 interestFactorMantissa,) = tropykusInterestAccrued(redeemer);
            Exp memory interestFactor = Exp({mantissa: interestFactorMantissa});
            uint256 currentUnderlying = supplySnapshot.underlyingAmount;
            Exp memory redeemerUnderlying = Exp({mantissa: currentUnderlying});
            (, Exp memory realAmount) = mulExp(
                interestFactor,
                redeemerUnderlying
            );
            (, Exp memory exchangeRate) = getExp(
                realAmount.mantissa,
                supplySnapshot.tokens
            );
            return (MathError.NO_ERROR, exchangeRate.mantissa);
        }
    }

    function tropykusInterestAccrued(address account) internal view returns (MathError, uint256, uint256) {
        SupplySnapshot storage supplySnapshot = accountTokens[account];
        uint256 promisedSupplyRate = supplySnapshot.promisedSupplyRate;
        Exp memory expectedSupplyRatePerBlock = Exp({
            mantissa: promisedSupplyRate
        });
        (, uint256 delta) = subUInt(
            accrualBlockNumber,
            supplySnapshot.suppliedAt
        );
        (, Exp memory expectedSupplyRatePerBlockWithDelta) = mulScalar(
            expectedSupplyRatePerBlock,
            delta
        );
        (, Exp memory interestFactor) = addExp(
            Exp({mantissa: 1e18}),
            expectedSupplyRatePerBlockWithDelta
        );
        uint256 currentUnderlying = supplySnapshot.underlyingAmount;
        Exp memory redeemerUnderlying = Exp({mantissa: currentUnderlying});
        (, Exp memory realAmount) = mulExp(
            interestFactor,
            redeemerUnderlying
        );
        (, uint256 interestEarned) = subUInt(
            realAmount.mantissa,
            currentUnderlying
        );
        return (MathError.NO_ERROR, interestFactor.mantissa, interestEarned);
    }

    /**
     * @notice Get cash balance of this cToken in the underlying asset
     * @return The quantity of underlying asset owned by this contract
     */
    function getCash() external view override returns (uint256) {
        return getCashPrior();
    }

    /**
     * @notice Applies accrued interest to total borrows and reserves
     * @dev This calculates interest accrued from the last checkpointed block
     *   up to the current block and writes new checkpoint to storage.
     */
    function accrueInterest() public override returns (uint256) {
        uint256 currentBlockNumber = getBlockNumber();
        uint256 accrualBlockNumberPrior = accrualBlockNumber;

        if (accrualBlockNumberPrior == currentBlockNumber) {
            return uint256(Error.NO_ERROR);
        }

        uint256 cashPrior = getCashPrior();
        uint256 borrowsPrior = totalBorrows;
        uint256 reservesPrior = totalReserves;
        uint256 borrowIndexPrior = borrowIndex;

        uint256 borrowRateMantissa = interestRateModel.getBorrowRate(
            cashPrior,
            borrowsPrior,
            reservesPrior
        );
        require(borrowRateMantissa <= borrowRateMaxMantissa, "CT10");

        (MathError mathErr, uint256 blockDelta) = subUInt(
            currentBlockNumber,
            accrualBlockNumberPrior
        );
        require(mathErr == MathError.NO_ERROR, "CT11");

        Exp memory simpleInterestFactor;
        uint256 interestAccumulated;
        uint256 totalBorrowsNew;
        uint256 totalReservesNew;
        uint256 borrowIndexNew;

        (mathErr, simpleInterestFactor) = mulScalar(
            Exp({mantissa: borrowRateMantissa}),
            blockDelta
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED,
                    uint256(mathErr)
                );
        }

        (mathErr, interestAccumulated) = mulScalarTruncate(
            simpleInterestFactor,
            borrowsPrior
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED,
                    uint256(mathErr)
                );
        }

        (mathErr, totalBorrowsNew) = addUInt(interestAccumulated, borrowsPrior);
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED,
                    uint256(mathErr)
                );
        }

        (mathErr, totalReservesNew) = mulScalarTruncateAddUInt(
            Exp({mantissa: reserveFactorMantissa}),
            interestAccumulated,
            reservesPrior
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED,
                    uint256(mathErr)
                );
        }

        if (interestRateModel.isTropykusInterestRateModel()) {
            (mathErr, totalReservesNew) = newReserves(
                borrowRateMantissa,
                cashPrior,
                borrowsPrior,
                reservesPrior,
                interestAccumulated
            );
            if (mathErr != MathError.NO_ERROR) {
                return
                    failOpaque(
                        Error.MATH_ERROR,
                        FailureInfo
                            .ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED,
                        uint256(mathErr)
                    );
            }
        }

        (mathErr, borrowIndexNew) = mulScalarTruncateAddUInt(
            simpleInterestFactor,
            borrowIndexPrior,
            borrowIndexPrior
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED,
                    uint256(mathErr)
                );
        }

        accrualBlockNumber = currentBlockNumber;
        borrowIndex = borrowIndexNew;
        totalBorrows = totalBorrowsNew;
        totalReserves = totalReservesNew;

        emit AccrueInterest(
            cashPrior,
            interestAccumulated,
            borrowIndexNew,
            totalBorrowsNew
        );

        return uint256(Error.NO_ERROR);
    }

    function newReserves(
        uint256 borrowRateMantissa,
        uint256 cashPrior,
        uint256 borrowsPrior,
        uint256 reservesPrior,
        uint256 interestAccumulated
    ) internal view returns (MathError mathErr, uint256 totalReservesNew) {
        uint256 newReserveFactorMantissa;
        uint256 utilizationRate = interestRateModel.utilizationRate(
            cashPrior,
            borrowsPrior,
            reservesPrior
        );
        uint256 expectedSupplyRate = interestRateModel.getSupplyRate(
            cashPrior,
            borrowsPrior,
            reservesPrior,
            reserveFactorMantissa
        );
        if (
            interestRateModel.isAboveOptimal(
                cashPrior,
                borrowsPrior,
                reservesPrior
            )
        ) {
            (mathErr, newReserveFactorMantissa) = mulScalarTruncate(
                Exp({mantissa: utilizationRate}),
                borrowRateMantissa
            );
            if (mathErr != MathError.NO_ERROR) {
                return (mathErr, 0);
            }
            (mathErr, newReserveFactorMantissa) = subUInt(
                newReserveFactorMantissa,
                expectedSupplyRate
            );
            if (mathErr != MathError.NO_ERROR) {
                return (mathErr, 0);
            }
            (mathErr, totalReservesNew) = mulScalarTruncateAddUInt(
                Exp({mantissa: newReserveFactorMantissa}),
                interestAccumulated,
                reservesPrior
            );
            if (mathErr != MathError.NO_ERROR) {
                return (mathErr, 0);
            }
        } else {
            mathErr = MathError.NO_ERROR;
            totalReservesNew = reservesPrior;
        }
    }

    /**
     * @notice Sender supplies assets into the market and receives cTokens in exchange
     * @dev Accrues interest whether or not the operation succeeds, unless reverted
     * @param mintAmount The amount of the underlying asset to supply
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual mint amount.
     */
    function mintInternal(uint256 mintAmount)
        internal
        nonReentrant
        returns (uint256, uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return (
                fail(Error(error), FailureInfo.MINT_ACCRUE_INTEREST_FAILED),
                0
            );
        }
        return mintFresh(msg.sender, mintAmount);
    }

    struct MintLocalVars {
        Error err;
        MathError mathErr;
        uint256 exchangeRateMantissa;
        uint256 mintTokens;
        uint256 totalSupplyNew;
        uint256 accountTokensNew;
        uint256 actualMintAmount;
    }

    /**
     * @notice User supplies assets into the market and receives cTokens in exchange
     * @dev Assumes interest has already been accrued up to the current block
     * @param minter The address of the account which is supplying the assets
     * @param mintAmount The amount of the underlying asset to supply
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual mint amount.
     */
    function mintFresh(address minter, uint256 mintAmount)
        internal
        returns (uint256, uint256)
    {
        uint256 allowed = comptroller.mintAllowed(
            address(this),
            minter,
            mintAmount
        );
        if (allowed != 0) {
            return (
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.MINT_COMPTROLLER_REJECTION,
                    allowed
                ),
                0
            );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return (
                fail(Error.MARKET_NOT_FRESH, FailureInfo.MINT_FRESHNESS_CHECK),
                0
            );
        }

        MintLocalVars memory vars;

        (
            vars.mathErr,
            vars.exchangeRateMantissa
        ) = exchangeRateStoredInternal();
        if (vars.mathErr != MathError.NO_ERROR) {
            return (
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.MINT_EXCHANGE_RATE_READ_FAILED,
                    uint256(vars.mathErr)
                ),
                0
            );
        }

        vars.actualMintAmount = doTransferIn(minter, mintAmount);

        (vars.mathErr, vars.mintTokens) = divScalarByExpTruncate(
            vars.actualMintAmount,
            Exp({mantissa: vars.exchangeRateMantissa})
        );
        require(vars.mathErr == MathError.NO_ERROR, "CT12");

        (vars.mathErr, vars.totalSupplyNew) = addUInt(
            totalSupply,
            vars.mintTokens
        );
        require(vars.mathErr == MathError.NO_ERROR, "CT13");

        (vars.mathErr, vars.accountTokensNew) = addUInt(
            accountTokens[minter].tokens,
            vars.mintTokens
        );
        require(vars.mathErr == MathError.NO_ERROR, "CT14");

        uint256 currentSupplyRate = interestRateModel.getSupplyRate(
            getCashPrior(),
            totalBorrows,
            totalReserves,
            reserveFactorMantissa
        );

        bool isTropykusInterestRateModel = interestRateModel
        .isTropykusInterestRateModel();

        if (accountTokens[minter].tokens > 0) {
            Exp memory updatedUnderlying;
            if (isTropykusInterestRateModel) {
                (, uint256 interestFactorMantissa,) = tropykusInterestAccrued(minter);
                Exp memory interestFactor = Exp({ mantissa: interestFactorMantissa});
                uint256 currentUnderlyingAmount = accountTokens[minter]
                    .underlyingAmount;
                MathError mErrorNewAmount;
                (mErrorNewAmount, updatedUnderlying) = mulExp(
                    Exp({mantissa: currentUnderlyingAmount}),
                    interestFactor
                );
                if (mErrorNewAmount != MathError.NO_ERROR) {
                    return (
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_EXCHANGE_CALCULATION_FAILED,
                            uint256(mErrorNewAmount)
                        ),
                        0
                    );
                }
            } else {
                uint256 currentTokens = accountTokens[minter].tokens;
                MathError mErrorUpdatedUnderlying;
                (mErrorUpdatedUnderlying, updatedUnderlying) = mulExp(
                    Exp({mantissa: currentTokens}),
                    Exp({mantissa: vars.exchangeRateMantissa})
                );
                if (mErrorUpdatedUnderlying != MathError.NO_ERROR) {
                    return (
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_EXCHANGE_CALCULATION_FAILED,
                            uint256(mErrorUpdatedUnderlying)
                        ),
                        0
                    );
                }
            }
            (, mintAmount) = addUInt(updatedUnderlying.mantissa, mintAmount);
        }

        totalSupply = vars.totalSupplyNew;
        accountTokens[minter] = SupplySnapshot({
            tokens: vars.accountTokensNew,
            underlyingAmount: mintAmount,
            suppliedAt: accrualBlockNumber,
            promisedSupplyRate: currentSupplyRate
        });

        emit Mint(minter, vars.actualMintAmount, vars.mintTokens);
        emit Transfer(address(this), minter, vars.mintTokens);

        return (uint256(Error.NO_ERROR), vars.actualMintAmount);
    }

    /**
     * @notice Sender redeems cTokens in exchange for a specified amount of underlying asset
     * @dev Accrues interest whether or not the operation succeeds, unless reverted
     * @param redeemAmount The amount of underlying to receive from redeeming cTokens
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function redeemUnderlyingInternal(uint256 redeemAmount)
        internal
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(Error(error), FailureInfo.REDEEM_ACCRUE_INTEREST_FAILED);
        }
        return redeemFresh(payable(msg.sender), redeemAmount);
    }

    struct RedeemLocalVars {
        Error err;
        MathError mathErr;
        uint256 exchangeRateMantissa;
        uint256 redeemTokens;
        uint256 redeemAmount;
        uint256 totalSupplyNew;
        uint256 accountTokensNew;
        uint256 newSubsidyFund;
    }

    /**
     * @notice User redeems cTokens in exchange for the underlying asset
     * @dev Assumes interest has already been accrued up to the current block
     * @param redeemer The address of the account which is redeeming the tokens
     * @param redeemAmountIn The number of underlying tokens to receive from redeeming cTokens
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function redeemFresh(address payable redeemer, uint256 redeemAmountIn)
        internal
        returns (uint256)
    {
        require(redeemAmountIn > 0, "CT15");

        RedeemLocalVars memory vars;

        SupplySnapshot storage supplySnapshot = accountTokens[redeemer];

        (
            vars.mathErr,
            vars.exchangeRateMantissa
        ) = exchangeRateStoredInternal();
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.REDEEM_EXCHANGE_RATE_READ_FAILED,
                    uint256(vars.mathErr)
                );
        }

        uint256 interestEarned;
        uint256 subsidyFundPortion;
        uint256 currentUnderlying;

        bool isTropykusInterestRateModel = interestRateModel
        .isTropykusInterestRateModel();
        if (isTropykusInterestRateModel) {
            currentUnderlying = supplySnapshot.underlyingAmount;
            (,,interestEarned) = tropykusInterestAccrued(redeemer);
        }
        supplySnapshot.promisedSupplyRate = interestRateModel.getSupplyRate(
            getCashPrior(),
            totalBorrows,
            totalReserves,
            reserveFactorMantissa
        );

        if (
            isTropykusInterestRateModel &&
            !interestRateModel.isAboveOptimal(
                getCashPrior(),
                totalBorrows,
                totalReserves
            )
        ) {
            uint256 borrowRate = interestRateModel.getBorrowRate(
                getCashPrior(),
                totalBorrows,
                totalReserves
            );

            uint256 utilizationRate = interestRateModel.utilizationRate(
                getCashPrior(),
                totalBorrows,
                totalReserves
            );

            (, uint256 estimatedEarning) = mulScalarTruncate(
                Exp({mantissa: borrowRate}),
                utilizationRate
            );

            (, subsidyFundPortion) = subUInt(
                supplySnapshot.promisedSupplyRate,
                estimatedEarning
            );
            (, Exp memory subsidyFactor) = getExp(
                subsidyFundPortion,
                supplySnapshot.promisedSupplyRate
            );
            (, subsidyFundPortion) = mulScalarTruncate(
                subsidyFactor,
                interestEarned
            );
        }

        vars.redeemAmount = redeemAmountIn;

        if (isTropykusInterestRateModel) {
            (, Exp memory num) = mulExp(
                vars.redeemAmount,
                supplySnapshot.tokens
            );
            (, Exp memory realTokensWithdrawAmount) = getExp(
                num.mantissa,
                currentUnderlying
            );
            vars.redeemTokens = realTokensWithdrawAmount.mantissa;
        } else {
            (vars.mathErr, vars.redeemTokens) = divScalarByExpTruncate(
                redeemAmountIn,
                Exp({mantissa: vars.exchangeRateMantissa})
            );
            if (vars.mathErr != MathError.NO_ERROR) {
                return
                    failOpaque(
                        Error.MATH_ERROR,
                        FailureInfo.REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED,
                        uint256(vars.mathErr)
                    );
            }
        }
        //        }

        uint256 allowed = comptroller.redeemAllowed(
            address(this),
            redeemer,
            vars.redeemTokens
        );
        if (allowed != 0) {
            return
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.REDEEM_COMPTROLLER_REJECTION,
                    allowed
                );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.REDEEM_FRESHNESS_CHECK
                );
        }

        (vars.mathErr, vars.totalSupplyNew) = subUInt(
            totalSupply,
            vars.redeemTokens
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                );
        }

        (, vars.newSubsidyFund) = subUInt(subsidyFund, subsidyFundPortion);

        (vars.mathErr, vars.accountTokensNew) = subUInt(
            supplySnapshot.tokens,
            vars.redeemTokens
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                );
        }

        uint256 cash = getCashPrior();
        if (isTropykusInterestRateModel) {
            cash = address(this).balance;
        }

        if (cash < vars.redeemAmount) {
            return
                fail(
                    Error.TOKEN_INSUFFICIENT_CASH,
                    FailureInfo.REDEEM_TRANSFER_OUT_NOT_POSSIBLE
                );
        }

        doTransferOut(redeemer, vars.redeemAmount);

        totalSupply = vars.totalSupplyNew;
        subsidyFund = vars.newSubsidyFund;
        supplySnapshot.tokens = vars.accountTokensNew;
        supplySnapshot.suppliedAt = accrualBlockNumber;
        (, supplySnapshot.underlyingAmount) = subUInt(
            supplySnapshot.underlyingAmount,
            vars.redeemAmount
        );

        emit Transfer(redeemer, address(this), vars.redeemTokens);
        emit Redeem(redeemer, vars.redeemAmount, vars.redeemTokens);

        comptroller.redeemVerify(
            address(this),
            redeemer,
            vars.redeemAmount,
            vars.redeemTokens
        );

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Sender borrows assets from the protocol to their own address
     * @param borrowAmount The amount of the underlying asset to borrow
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function borrowInternal(uint256 borrowAmount)
        internal
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(Error(error), FailureInfo.BORROW_ACCRUE_INTEREST_FAILED);
        }
        return borrowFresh(payable(msg.sender), borrowAmount);
    }

    struct BorrowLocalVars {
        MathError mathErr;
        uint256 accountBorrows;
        uint256 accountBorrowsNew;
        uint256 totalBorrowsNew;
    }

    /**
     * @notice Users borrow assets from the protocol to their own address
     * @param borrowAmount The amount of the underlying asset to borrow
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function borrowFresh(address payable borrower, uint256 borrowAmount)
        internal
        returns (uint256)
    {
        uint256 allowed = comptroller.borrowAllowed(
            address(this),
            borrower,
            borrowAmount
        );
        if (allowed != 0) {
            return
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.BORROW_COMPTROLLER_REJECTION,
                    allowed
                );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.BORROW_FRESHNESS_CHECK
                );
        }

        if (getCashPrior() < borrowAmount) {
            return
                fail(
                    Error.TOKEN_INSUFFICIENT_CASH,
                    FailureInfo.BORROW_CASH_NOT_AVAILABLE
                );
        }

        BorrowLocalVars memory vars;

        (vars.mathErr, vars.accountBorrows) = borrowBalanceStoredInternal(
            borrower
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                );
        }

        (vars.mathErr, vars.accountBorrowsNew) = addUInt(
            vars.accountBorrows,
            borrowAmount
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                );
        }

        (vars.mathErr, vars.totalBorrowsNew) = addUInt(
            totalBorrows,
            borrowAmount
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                );
        }

        doTransferOut(borrower, borrowAmount);

        accountBorrows[borrower].principal = vars.accountBorrowsNew;
        accountBorrows[borrower].interestIndex = borrowIndex;
        totalBorrows = vars.totalBorrowsNew;

        emit Borrow(
            borrower,
            borrowAmount,
            vars.accountBorrowsNew,
            vars.totalBorrowsNew
        );

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Sender repays their own borrow
     * @param repayAmount The amount to repay
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function repayBorrowInternal(uint256 repayAmount)
        internal
        nonReentrant
        returns (uint256, uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return (
                fail(
                    Error(error),
                    FailureInfo.REPAY_BORROW_ACCRUE_INTEREST_FAILED
                ),
                0
            );
        }
        return repayBorrowFresh(msg.sender, msg.sender, repayAmount);
    }

    struct RepayBorrowLocalVars {
        Error err;
        MathError mathErr;
        uint256 repayAmount;
        uint256 borrowerIndex;
        uint256 accountBorrows;
        uint256 accountBorrowsNew;
        uint256 totalBorrowsNew;
        uint256 actualRepayAmount;
    }

    /**
     * @notice Borrows are repaid by another user (possibly the borrower).
     * @param payer the account paying off the borrow
     * @param borrower the account with the debt being payed off
     * @param repayAmount the amount of undelrying tokens being returned
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function repayBorrowFresh(
        address payer,
        address borrower,
        uint256 repayAmount
    ) internal returns (uint256, uint256) {
        uint256 allowed = comptroller.repayBorrowAllowed(
            address(this),
            payer,
            borrower,
            repayAmount
        );
        if (allowed != 0) {
            return (
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.REPAY_BORROW_COMPTROLLER_REJECTION,
                    allowed
                ),
                0
            );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return (
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.REPAY_BORROW_FRESHNESS_CHECK
                ),
                0
            );
        }

        RepayBorrowLocalVars memory vars;

        vars.borrowerIndex = accountBorrows[borrower].interestIndex;

        (vars.mathErr, vars.accountBorrows) = borrowBalanceStoredInternal(
            borrower
        );
        if (vars.mathErr != MathError.NO_ERROR) {
            return (
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo
                        .REPAY_BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED,
                    uint256(vars.mathErr)
                ),
                0
            );
        }

        if (repayAmount == type(uint256).max) {
            vars.repayAmount = vars.accountBorrows;
        } else {
            vars.repayAmount = repayAmount;
        }

        vars.actualRepayAmount = doTransferIn(payer, vars.repayAmount);

        (vars.mathErr, vars.accountBorrowsNew) = subUInt(
            vars.accountBorrows,
            vars.actualRepayAmount
        );
        require(vars.mathErr == MathError.NO_ERROR, "CT16");

        (vars.mathErr, vars.totalBorrowsNew) = subUInt(
            totalBorrows,
            vars.actualRepayAmount
        );
        require(vars.mathErr == MathError.NO_ERROR, "CT17");

        accountBorrows[borrower].principal = vars.accountBorrowsNew;
        accountBorrows[borrower].interestIndex = borrowIndex;
        totalBorrows = vars.totalBorrowsNew;

        emit RepayBorrow(
            payer,
            borrower,
            vars.actualRepayAmount,
            vars.accountBorrowsNew,
            vars.totalBorrowsNew
        );

        return (uint256(Error.NO_ERROR), vars.actualRepayAmount);
    }

    /**
     * @notice The sender liquidates the borrowers collateral.
     *  The collateral seized is transferred to the liquidator.
     * @param borrower The borrower of this cToken to be liquidated
     * @param cTokenCollateral The market in which to seize collateral from the borrower
     * @param repayAmount The amount of the underlying borrowed asset to repay
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function liquidateBorrowInternal(
        address borrower,
        uint256 repayAmount,
        CTokenInterface cTokenCollateral
    ) internal nonReentrant returns (uint256, uint256) {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return (
                fail(
                    Error(error),
                    FailureInfo.LIQUIDATE_ACCRUE_BORROW_INTEREST_FAILED
                ),
                0
            );
        }

        error = cTokenCollateral.accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return (
                fail(
                    Error(error),
                    FailureInfo.LIQUIDATE_ACCRUE_COLLATERAL_INTEREST_FAILED
                ),
                0
            );
        }

        // liquidateBorrowFresh emits borrow-specific logs on errors, so we don't need to
        return
            liquidateBorrowFresh(
                msg.sender,
                borrower,
                repayAmount,
                cTokenCollateral
            );
    }

    /**
     * @notice The liquidator liquidates the borrowers collateral.
     *  The collateral seized is transferred to the liquidator.
     * @param borrower The borrower of this cToken to be liquidated
     * @param liquidator The address repaying the borrow and seizing collateral
     * @param cTokenCollateral The market in which to seize collateral from the borrower
     * @param repayAmount The amount of the underlying borrowed asset to repay
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function liquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        CTokenInterface cTokenCollateral
    ) internal returns (uint256, uint256) {
        uint256 allowed = comptroller.liquidateBorrowAllowed(
            address(this),
            address(cTokenCollateral),
            liquidator,
            borrower,
            repayAmount
        );
        if (allowed != 0) {
            return (
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.LIQUIDATE_COMPTROLLER_REJECTION,
                    allowed
                ),
                0
            );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return (
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.LIQUIDATE_FRESHNESS_CHECK
                ),
                0
            );
        }

        if (cTokenCollateral.accrualBlockNumber() != getBlockNumber()) {
            return (
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.LIQUIDATE_COLLATERAL_FRESHNESS_CHECK
                ),
                0
            );
        }

        if (borrower == liquidator) {
            return (
                fail(
                    Error.INVALID_ACCOUNT_PAIR,
                    FailureInfo.LIQUIDATE_LIQUIDATOR_IS_BORROWER
                ),
                0
            );
        }

        if (repayAmount == 0) {
            return (
                fail(
                    Error.INVALID_CLOSE_AMOUNT_REQUESTED,
                    FailureInfo.LIQUIDATE_CLOSE_AMOUNT_IS_ZERO
                ),
                0
            );
        }

        if (repayAmount == type(uint256).max) {
            return (
                fail(
                    Error.INVALID_CLOSE_AMOUNT_REQUESTED,
                    FailureInfo.LIQUIDATE_CLOSE_AMOUNT_IS_UINT_MAX
                ),
                0
            );
        }

        (
            uint256 repayBorrowError,
            uint256 actualRepayAmount
        ) = repayBorrowFresh(liquidator, borrower, repayAmount);
        if (repayBorrowError != uint256(Error.NO_ERROR)) {
            return (
                fail(
                    Error(repayBorrowError),
                    FailureInfo.LIQUIDATE_REPAY_BORROW_FRESH_FAILED
                ),
                0
            );
        }

        (uint256 amountSeizeError, uint256 seizeTokens) = comptroller
        .liquidateCalculateSeizeTokens(
            address(this),
            address(cTokenCollateral),
            actualRepayAmount
        );
        require(amountSeizeError == uint256(Error.NO_ERROR), "CT18");

        require(cTokenCollateral.balanceOf(borrower) >= seizeTokens, "CT19");

        uint256 seizeError;
        if (address(cTokenCollateral) == address(this)) {
            seizeError = seizeInternal(
                address(this),
                liquidator,
                borrower,
                seizeTokens
            );
        } else {
            seizeError = cTokenCollateral.seize(
                liquidator,
                borrower,
                seizeTokens
            );
        }

        require(seizeError == uint256(Error.NO_ERROR), "CT20");

        emit LiquidateBorrow(
            liquidator,
            borrower,
            actualRepayAmount,
            address(cTokenCollateral),
            seizeTokens
        );

        return (uint256(Error.NO_ERROR), actualRepayAmount);
    }

    /**
     * @notice Transfers collateral tokens (this market) to the liquidator.
     * @dev Will fail unless called by another cToken during the process of liquidation.
     *  Its absolutely critical to use msg.sender as the borrowed cToken and not a parameter.
     * @param liquidator The account receiving seized collateral
     * @param borrower The account having collateral seized
     * @param seizeTokens The number of cTokens to seize
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function seize(
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external override nonReentrant returns (uint256) {
        return seizeInternal(msg.sender, liquidator, borrower, seizeTokens);
    }

    /**
     * @notice Transfers collateral tokens (this market) to the liquidator.
     * @dev Called only during an in-kind liquidation, or by liquidateBorrow during the liquidation of another CToken.
     *  Its absolutely critical to use msg.sender as the seizer cToken and not a parameter.
     * @param seizerToken The contract seizing the collateral (i.e. borrowed cToken)
     * @param liquidator The account receiving seized collateral
     * @param borrower The account having collateral seized
     * @param seizeTokens The number of cTokens to seize
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function seizeInternal(
        address seizerToken,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) internal returns (uint256) {
        uint256 allowed = comptroller.seizeAllowed(
            address(this),
            seizerToken,
            liquidator,
            borrower,
            seizeTokens
        );
        if (allowed != 0) {
            return
                failOpaque(
                    Error.COMPTROLLER_REJECTION,
                    FailureInfo.LIQUIDATE_SEIZE_COMPTROLLER_REJECTION,
                    allowed
                );
        }

        if (borrower == liquidator) {
            return
                fail(
                    Error.INVALID_ACCOUNT_PAIR,
                    FailureInfo.LIQUIDATE_SEIZE_LIQUIDATOR_IS_BORROWER
                );
        }

        MathError mathErr;
        uint256 borrowerTokensNew;
        uint256 liquidatorTokensNew;

        (mathErr, borrowerTokensNew) = subUInt(
            accountTokens[borrower].tokens,
            seizeTokens
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED,
                    uint256(mathErr)
                );
        }

        (mathErr, liquidatorTokensNew) = addUInt(
            accountTokens[liquidator].tokens,
            seizeTokens
        );
        if (mathErr != MathError.NO_ERROR) {
            return
                failOpaque(
                    Error.MATH_ERROR,
                    FailureInfo.LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED,
                    uint256(mathErr)
                );
        }

        accountTokens[borrower].tokens = borrowerTokensNew;
        accountTokens[liquidator].tokens = liquidatorTokensNew;

        emit Transfer(borrower, liquidator, seizeTokens);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Begins transfer of admin rights. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
     * @dev Admin function to begin change of admin. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
     * @param newPendingAdmin New pending admin.
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setPendingAdmin(address payable newPendingAdmin)
        external
        override
        returns (uint256)
    {
        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.SET_PENDING_ADMIN_OWNER_CHECK
                );
        }

        address oldPendingAdmin = pendingAdmin;

        pendingAdmin = newPendingAdmin;

        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Accepts transfer of admin rights. msg.sender must be pendingAdmin
     * @dev Admin function for pending admin to accept role and update admin
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _acceptAdmin() external override returns (uint256) {
        if (msg.sender != pendingAdmin || msg.sender == address(0)) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.ACCEPT_ADMIN_PENDING_ADMIN_CHECK
                );
        }

        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        admin = pendingAdmin;

        pendingAdmin = payable(address(0));

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Sets a new comptroller for the market
     * @dev Admin function to set a new comptroller
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setComptroller(ComptrollerInterface newComptroller)
        public
        override
        returns (uint256)
    {
        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.SET_COMPTROLLER_OWNER_CHECK
                );
        }

        ComptrollerInterface oldComptroller = comptroller;
        require(newComptroller.isComptroller(), "CT21");

        comptroller = newComptroller;

        emit NewComptroller(oldComptroller, newComptroller);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice accrues interest and sets a new reserve factor for the protocol using _setReserveFactorFresh
     * @dev Admin function to accrue interest and set a new reserve factor
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setReserveFactor(uint256 newReserveFactorMantissa)
        external
        override
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(
                    Error(error),
                    FailureInfo.SET_RESERVE_FACTOR_ACCRUE_INTEREST_FAILED
                );
        }
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    /**
     * @notice Sets a new reserve factor for the protocol (*requires fresh interest accrual)
     * @dev Admin function to set a new reserve factor
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setReserveFactorFresh(uint256 newReserveFactorMantissa)
        internal
        returns (uint256)
    {
        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.SET_RESERVE_FACTOR_ADMIN_CHECK
                );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.SET_RESERVE_FACTOR_FRESH_CHECK
                );
        }

        if (newReserveFactorMantissa > reserveFactorMaxMantissa) {
            return
                fail(
                    Error.BAD_INPUT,
                    FailureInfo.SET_RESERVE_FACTOR_BOUNDS_CHECK
                );
        }

        uint256 oldReserveFactorMantissa = reserveFactorMantissa;
        reserveFactorMantissa = newReserveFactorMantissa;

        emit NewReserveFactor(
            oldReserveFactorMantissa,
            newReserveFactorMantissa
        );

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Accrues interest and reduces reserves by transferring from msg.sender
     * @param addAmount Amount of addition to reserves
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _addReservesInternal(uint256 addAmount)
        internal
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(
                    Error(error),
                    FailureInfo.ADD_RESERVES_ACCRUE_INTEREST_FAILED
                );
        }

        uint256 totalReservesNew;
        uint256 actualAddAmount;

        if (accrualBlockNumber != getBlockNumber()) {
            return (
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.ADD_RESERVES_FRESH_CHECK
                )
            );
        }

        actualAddAmount = doTransferIn(msg.sender, addAmount);

        totalReservesNew = totalReserves + actualAddAmount;

        require(totalReservesNew >= totalReserves, "CT22");

        totalReserves = totalReservesNew;

        emit ReservesAdded(msg.sender, actualAddAmount, totalReservesNew);

        return (uint256(Error.NO_ERROR));
    }


    function _addSubsidyInternal(uint256 addAmount)
        internal
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            // accrueInterest emits logs on errors, but on top of that we want to log the fact that an attempted reduce reserves failed.
            return fail(Error(error), FailureInfo.ADD_SUBSIDY_FUND_FAILED);
        }

        uint256 subsidyFundNew;
        uint256 actualAddAmount;

        if (accrualBlockNumber != getBlockNumber()) {
            return (
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.ADD_SUBSIDY_FUND_FRESH_CHECK
                )
            );
        }

        actualAddAmount = doTransferIn(msg.sender, addAmount);

        subsidyFundNew = subsidyFund + actualAddAmount;

        require(subsidyFundNew >= subsidyFund, "CT22");

        subsidyFund = subsidyFundNew;

        emit SubsidyAdded(msg.sender, actualAddAmount, subsidyFundNew);

        /* Return (NO_ERROR, actualAddAmount) */
        return (uint256(Error.NO_ERROR));
    }

    /**
     * @notice Accrues interest and reduces reserves by transferring to admin
     * @param reduceAmount Amount of reduction to reserves
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _reduceReserves(uint256 reduceAmount)
        external
        override
        nonReentrant
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(
                    Error(error),
                    FailureInfo.REDUCE_RESERVES_ACCRUE_INTEREST_FAILED
                );
        }
        return _reduceReservesFresh(reduceAmount);
    }

    /**
     * @notice Reduces reserves by transferring to admin
     * @dev Requires fresh interest accrual
     * @param reduceAmount Amount of reduction to reserves
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _reduceReservesFresh(uint256 reduceAmount)
        internal
        returns (uint256)
    {
        uint256 totalReservesNew;

        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.REDUCE_RESERVES_ADMIN_CHECK
                );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.REDUCE_RESERVES_FRESH_CHECK
                );
        }

        if (getCashPrior() < reduceAmount) {
            return
                fail(
                    Error.TOKEN_INSUFFICIENT_CASH,
                    FailureInfo.REDUCE_RESERVES_CASH_NOT_AVAILABLE
                );
        }

        if (reduceAmount > totalReserves) {
            return
                fail(Error.BAD_INPUT, FailureInfo.REDUCE_RESERVES_VALIDATION);
        }

        totalReservesNew = totalReserves - reduceAmount;
        require(totalReservesNew <= totalReserves, "CT23");

        totalReserves = totalReservesNew;

        doTransferOut(admin, reduceAmount);

        emit ReservesReduced(admin, reduceAmount, totalReservesNew);

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice accrues interest and updates the interest rate model using _setInterestRateModelFresh
     * @dev Admin function to accrue interest and update the interest rate model
     * @param newInterestRateModel the new interest rate model to use
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setInterestRateModel(InterestRateModel newInterestRateModel)
        public
        override
        returns (uint256)
    {
        uint256 error = accrueInterest();
        if (error != uint256(Error.NO_ERROR)) {
            return
                fail(
                    Error(error),
                    FailureInfo.SET_INTEREST_RATE_MODEL_ACCRUE_INTEREST_FAILED
                );
        }
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    /**
     * @notice updates the interest rate model (*requires fresh interest accrual)
     * @dev Admin function to update the interest rate model
     * @param newInterestRateModel the new interest rate model to use
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setInterestRateModelFresh(InterestRateModel newInterestRateModel)
        internal
        returns (uint256)
    {
        InterestRateModel oldInterestRateModel;

        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.SET_INTEREST_RATE_MODEL_OWNER_CHECK
                );
        }

        if (accrualBlockNumber != getBlockNumber()) {
            return
                fail(
                    Error.MARKET_NOT_FRESH,
                    FailureInfo.SET_INTEREST_RATE_MODEL_FRESH_CHECK
                );
        }

        oldInterestRateModel = interestRateModel;

        require(newInterestRateModel.isInterestRateModel(), "CT21");

        interestRateModel = newInterestRateModel;

        emit NewMarketInterestRateModel(
            oldInterestRateModel,
            newInterestRateModel
        );

        return uint256(Error.NO_ERROR);
    }

    /**
     * @notice Gets balance of this contract in terms of the underlying
     * @dev This excludes the value of the current message, if any
     * @return The quantity of underlying owned by this contract
     */
    function getCashPrior() internal view virtual returns (uint256);

    /**
     * @dev Performs a transfer in, reverting upon failure. Returns the amount actually transferred to the protocol, in case of a fee.
     *  This may revert due to insufficient balance or insufficient allowance.
     */
    function doTransferIn(address from, uint256 amount)
        internal
        virtual
        returns (uint256);

    /**
     * @dev Performs a transfer out, ideally returning an explanatory error code upon failure tather than reverting.
     *  If caller has not called checked protocol's balance, may revert due to insufficient cash held in the contract.
     *  If caller has checked protocol's balance, and verified it is >= amount, this should not revert in normal conditions.
     */
    function doTransferOut(address payable to, uint256 amount) internal virtual;

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     */
    modifier nonReentrant() {
        require(_notEntered, "re-entered");
        _notEntered = false;
        _;
        _notEntered = true;
    }
}


// Dependency file: contracts/PriceOracle.sol

// pragma solidity 0.8.6;

// import "contracts/CToken.sol";

abstract contract PriceOracle {
    /// @notice Indicator that this is a PriceOracle contract (for inspection)
    bool public constant isPriceOracle = true;

    /**
     * @notice Get the underlying price of a cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18).
     *  Zero means the price is unavailable.
     */
    function getUnderlyingPrice(CToken cToken)
        external
        view
        virtual
        returns (uint256);
}


// Root file: contracts/ComptrollerStorage.sol

pragma solidity 0.8.6;

// import "contracts/CToken.sol";
// import "contracts/PriceOracle.sol";

contract UnitrollerAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of Unitroller
    */
    address public comptrollerImplementation;

    /**
    * @notice Pending brains of Unitroller
    */
    address public pendingComptrollerImplementation;
}

contract ComptrollerV1Storage is UnitrollerAdminStorage {

    /**
     * @notice Oracle which gives the price of any given asset
     */
    PriceOracle public oracle;

    /**
     * @notice Multiplier used to calculate the maximum repayAmount when liquidating a borrow
     */
    uint public closeFactorMantissa;

    /**
     * @notice Multiplier representing the discount on collateral that a liquidator receives
     */
    uint public liquidationIncentiveMantissa;

    /**
     * @notice Max number of assets a single account can participate in (borrow or use as collateral)
     */
    uint public maxAssets;

    /**
     * @notice Per-account mapping of "assets you are in", capped by maxAssets
     */
    mapping(address => CToken[]) public accountAssets;

}

contract ComptrollerV2Storage is ComptrollerV1Storage {
    struct Market {
        /// @notice Whether or not this market is listed
        bool isListed;

        /**
         * @notice Multiplier representing the most one can borrow against their collateral in this market.
         *  For instance, 0.9 to allow borrowing 90% of collateral value.
         *  Must be between 0 and 1, and stored as a mantissa.
         */
        uint collateralFactorMantissa;

        /// @notice Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;

        /// @notice Whether or not this market receives COMP
        bool isComped;
    }

    /**
     * @notice Official mapping of cTokens -> Market metadata
     * @dev Used e.g. to determine if a market is supported
     */
    mapping(address => Market) public markets;


    /**
     * @notice The Pause Guardian can pause certain actions as a safety mechanism.
     *  Actions which allow users to remove their own assets cannot be paused.
     *  Liquidation / seizing / transfer can only be paused globally, not by market.
     */
    address public pauseGuardian;
    bool public _mintGuardianPaused;
    bool public _borrowGuardianPaused;
    bool public transferGuardianPaused;
    bool public seizeGuardianPaused;
    mapping(address => bool) public mintGuardianPaused;
    mapping(address => bool) public borrowGuardianPaused;
}

contract ComptrollerV3Storage is ComptrollerV2Storage {
    struct CompMarketState {
        /// @notice The market's last updated compBorrowIndex or compSupplyIndex
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }

    /// @notice A list of all markets
    CToken[] public allMarkets;

    /// @notice The rate at which the flywheel distributes COMP, per block
    uint public compRate;

    /// @notice The portion of compRate that each market currently receives
    mapping(address => uint) public compSpeeds;

    /// @notice The COMP market supply state for each market
    mapping(address => CompMarketState) public compSupplyState;

    /// @notice The COMP market borrow state for each market
    mapping(address => CompMarketState) public compBorrowState;

    /// @notice The COMP borrow index for each market for each supplier as of the last time they accrued COMP
    mapping(address => mapping(address => uint)) public compSupplierIndex;

    /// @notice The COMP borrow index for each market for each borrower as of the last time they accrued COMP
    mapping(address => mapping(address => uint)) public compBorrowerIndex;

    /// @notice The COMP accrued but not yet transferred to each user
    mapping(address => uint) public compAccrued;
}

contract ComptrollerV4Storage is ComptrollerV3Storage {
    // @notice The borrowCapGuardian can set borrowCaps to any number for any market. Lowering the borrow cap could disable borrowing on the given market.
    address public borrowCapGuardian;

    // @notice Borrow caps enforced by borrowAllowed for each cToken address. Defaults to zero which corresponds to unlimited borrowing.
    mapping(address => uint) public borrowCaps;

    // @notice address of the TROP token
    address public tropAddress;
}

contract ComptrollerV5Storage is ComptrollerV4Storage {
    /// @notice The portion of COMP that each contributor receives per block
    mapping(address => uint) public compContributorSpeeds;

    /// @notice Last block at which a contributor's COMP rewards have been allocated
    mapping(address => uint) public lastContributorBlock;
}
