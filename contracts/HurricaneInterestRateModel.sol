pragma solidity ^0.5.16;

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
    bool public constant isTropykusInterestRateModel = true;

    constructor(
        uint256 _baseBorrowRate,
        uint256 _promisedBaseReturnRate,
        uint256 _optimalUtilizationRate,
        uint256 _borrowRateSlope,
        uint256 _supplyRateSlope
    ) public {
        blocksPerYear = 1051200;
        admin = msg.sender;
        baseBorrowRatePerBlock = _baseBorrowRate.div(blocksPerYear);
        promisedBaseReturnRatePerBlock = _promisedBaseReturnRate.div(
            blocksPerYear
        );
        borrowRateSlopePerBlock = _borrowRateSlope.div(blocksPerYear);
        supplyRateSlopePerBlock = _supplyRateSlope.div(blocksPerYear);
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

    function getSupplyRate(
        uint256 cash,
        uint256 borrows,
        uint256 reserves,
        uint256 reserveFactorMantissa
    ) public view returns (uint256) {
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
    ) public view returns (uint256 borrowRate) {
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
    ) public view returns (bool) {
        uint256 utilizationRate = utilizationRate(cash, borrows, reserves);
        return utilizationRate > optimalUtilizationRate;
    }

    function setBlocksPerYear(uint256 blocksPerYear_) public onlyAdmin {
        baseBorrowRatePerBlock = baseBorrowRatePerBlock.mul(blocksPerYear);
        promisedBaseReturnRatePerBlock = promisedBaseReturnRatePerBlock.mul(blocksPerYear);
        borrowRateSlopePerBlock = borrowRateSlopePerBlock.mul(blocksPerYear);
        supplyRateSlopePerBlock = supplyRateSlopePerBlock.mul(blocksPerYear);
        super.setBlocksPerYear(blocksPerYear_);
        baseBorrowRatePerBlock = baseBorrowRatePerBlock.div(blocksPerYear);
        promisedBaseReturnRatePerBlock = promisedBaseReturnRatePerBlock.div(blocksPerYear);
        borrowRateSlopePerBlock = borrowRateSlopePerBlock.div(blocksPerYear);
        supplyRateSlopePerBlock = supplyRateSlopePerBlock.div(blocksPerYear);
    }
}
