// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.8.4;

import "./BaseJumpRateModelV2.sol";
import "./LegacyInterestRateModel.sol";

/**
 * @title tropykus JumpRateModel Contract V2 for legacy cTokens
 * @author tropykus
 * @notice Supports only legacy cTokens
 */
contract LegacyJumpRateModelV2 is BaseJumpRateModelV2 {
    constructor(
        uint256 baseRatePerYear,
        uint256 multiplierPerYear,
        uint256 jumpMultiplierPerYear,
        uint256 kink_,
        address owner_
    )
        BaseJumpRateModelV2(
            baseRatePerYear,
            multiplierPerYear,
            jumpMultiplierPerYear,
            kink_,
            owner_
        )
    {
        isTropykusInterestRateModel = false;
    }
}
