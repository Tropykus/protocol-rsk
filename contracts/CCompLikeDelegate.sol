// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.8.4;

import "./CErc20Delegate.sol";

interface CompLike {
    function delegate(address delegatee) external;
}

/**
 * @title Compound's CCompLikeDelegate Contract
 * @notice CTokens which can 'delegate votes' of their underlying ERC-20
 * @author tropykus
 */
contract CCompLikeDelegate is CErc20Delegate {
    /**
     * @notice Construct an empty delegate
     */
    constructor() CErc20Delegate() {}

    /**
     * @notice Admin call to delegate the votes of the COMP-like underlying
     * @param compLikeDelegatee The address to delegate votes to
     */
    function _delegateCompLikeTo(address compLikeDelegatee) external {
        require(
            msg.sender == admin,
            "only the admin may set the comp-like delegate"
        );
        CompLike(underlying).delegate(compLikeDelegatee);
    }
}
