// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.8.4;

import "./CErc20.sol";

/**
 * @title tropykus CErc20Delegate Contract
 * @notice CTokens which wrap an EIP-20 underlying and are delegated to
 * @author tropykus
 */
contract CErc20Delegate is CErc20, CDelegateInterface {
    /**
     * @notice Construct an empty delegate
     */
    constructor() {
        // solium-disable-previous-line no-empty-blocks
    }

    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes memory data) public override {
        // Shh -- currently unused
        data;

        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(
            msg.sender == admin,
            "only the admin may call _becomeImplementation"
        );
    }

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() public override {
        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(
            msg.sender == admin,
            "only the admin may call _resignImplementation"
        );
    }
}
