// Dependency file: contracts/WhitelistInterface.sol

// SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.6;

interface WhitelistInterface {
    function setStatus(bool _newStatus) external;
    function enabled() external view returns(bool);

    function addUsers(address[] memory _users) external;
    function exist(address _user) external view returns(bool);
    function getUsers() external view returns(address[] memory currentUsers);
    function removeUser(address _user) external;
}

// Root file: contracts/Whitelist.sol

pragma solidity 0.8.6;

// import "contracts/WhitelistInterface.sol";

contract Whitelist is WhitelistInterface {
    bool public override enabled;
    address owner;
    mapping(address => bool) public override exist;
    address[] users;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor() {
        owner = msg.sender;
        enabled = true;
    }

    function setStatus(bool _newStatus) external override onlyOwner {
        enabled = _newStatus;
    }

    function addUsers(address[] memory _users) external override onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            if (exist[_users[i]]) continue;
            users.push(_users[i]);
            exist[_users[i]] = true;
        }
    }

    function getUsers()
        external
        view
        override
        returns (address[] memory currentUsers)
    {
        currentUsers = users;
    }

    function removeUser(address _user) external override onlyOwner {
        if (exist[_user]) {
            exist[_user] = false;
            address[] memory oldUsers = users;
            users = new address[](0);
            for (uint256 i = 0; i < oldUsers.length; i++) {
                if (oldUsers[i] == _user) continue;
                users.push(oldUsers[i]);
            }
        }
    }
}
