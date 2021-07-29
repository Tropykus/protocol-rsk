// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorAlpha.sol";

contract GovernorAlphaHarness is GovernorAlpha {
    constructor(
        address timelock_,
        address comp_,
        address guardian_
    ) GovernorAlpha(timelock_, comp_, guardian_) {}

    function votingPeriod() public pure override returns (uint256) {
        return 240;
    }
}
