pragma solidity ^0.5.16;

import "./CToken.sol";

interface CRBTCCompanionInterface {
    function verifySupplyPerAccountLimit(
        uint256 underlyingAmount,
        uint256 mintAmount
    ) external;

    function getTotalBorrowsInOtherMarkets()
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );
}
