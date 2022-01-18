pragma solidity 0.5.16;

import "./BaseJumpRateModelV2.sol";
import "./LegacyInterestRateModel.sol";


/**
  * @title tropykus JumpRateModel Contract V2 for legacy cTokens
  * @author tropykus
  * @notice Supports only legacy cTokens
  */
contract LegacyJumpRateModelV2 is LegacyInterestRateModel, BaseJumpRateModelV2  {
    constructor(uint baseRatePerYear, uint multiplierPerYear, uint jumpMultiplierPerYear, uint kink_, address owner_)
    	BaseJumpRateModelV2(baseRatePerYear,multiplierPerYear,jumpMultiplierPerYear,kink_,owner_) public {}
}
