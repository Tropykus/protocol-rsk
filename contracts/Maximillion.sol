// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "./CRBTC.sol";

/**
 * @title tropykus Maximillion Contract
 * @author tropykus
 */
contract Maximillion {
    /**
     * @notice The default cRBTC market to repay in
     */
    CRBTC public cRBTC;

    /**
     * @notice Construct a Maximillion to repay max in a CRBTC market
     */
    constructor(CRBTC cRBTC_) {
        cRBTC = cRBTC_;
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in the cRBTC market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, cRBTC);
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a cRBTC market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param cRBTC_ The address of the cRBTC contract to repay in
     */
    function repayBehalfExplicit(address borrower, CRBTC cRBTC_)
        public
        payable
    {
        uint256 received = msg.value;
        uint256 borrows = cRBTC_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            address payable sender = payable(msg.sender);
            cRBTC_.repayBorrowBehalf{value: borrows}(borrower);
            sender.transfer(received - borrows);
        } else {
            cRBTC_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
