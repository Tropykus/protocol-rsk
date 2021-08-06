// Root file: contracts/WhitelistInterface.sol

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

interface WhitelistInterface {
    function setStatus(bool _newStatus) external;
    function enabled() external view returns(bool);

    function addUsers(address[] memory _users) external;
    function exist(address _user) external view returns(bool);
    function getUsers() external view returns(address[] memory currentUsers);
    function removeUser(address _user) external;
}