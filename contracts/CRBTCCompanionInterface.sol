pragma solidity ^0.5.16;

interface CRBTCCompanionInterface {
    function verifySupplyPerAccountLimit(
        uint256 underlyingAmount,
        uint256 mintAmount
    ) external;
}
