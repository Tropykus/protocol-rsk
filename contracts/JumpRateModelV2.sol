pragma solidity ^0.5.16;

import "./BaseJumpRateModelV2.sol";

/**
 * @title tropykus JumpRateModel Contract V2 for V2 cTokens
 * @author tropykus
 * @notice Supports only for V2 cTokens
 */
contract JumpRateModelV2 is BaseJumpRateModelV2 {
    constructor(
        uint256 baseRatePerYear,
        uint256 multiplierPerYear,
        uint256 jumpMultiplierPerYear,
        uint256 kink_,
        address owner_
    )
        public
        BaseJumpRateModelV2(
            baseRatePerYear,
            multiplierPerYear,
            jumpMultiplierPerYear,
            kink_,
            owner_
        )
    {}
}
