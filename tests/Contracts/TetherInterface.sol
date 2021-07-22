// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "../../contracts/EIP20Interface.sol";

abstract contract TetherInterface is EIP20Interface {
    function setParams(uint256 newBasisPoints, uint256 newMaxFee)
        external
        virtual;
}
