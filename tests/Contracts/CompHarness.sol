// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.8.4;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/TROP.sol";

contract CompScenario is TROP {
    constructor(address account) TROP(account) {}

    function transferScenario(address[] calldata destinations, uint256 amount)
        external
        returns (bool)
    {
        for (uint256 i = 0; i < destinations.length; i++) {
            address dst = destinations[i];
            _transferTokens(msg.sender, dst, uint96(amount));
        }
        return true;
    }

    function transferFromScenario(address[] calldata froms, uint256 amount)
        external
        returns (bool)
    {
        for (uint256 i = 0; i < froms.length; i++) {
            address from = froms[i];
            _transferTokens(from, msg.sender, uint96(amount));
        }
        return true;
    }

    function generateCheckpoints(uint256 count, uint256 offset) external {
        for (uint256 i = 1 + offset; i <= count + offset; i++) {
            checkpoints[msg.sender][numCheckpoints[msg.sender]++] = Checkpoint(
                uint32(i),
                uint96(i)
            );
        }
    }
}
