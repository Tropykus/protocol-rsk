pragma solidity ^0.5.16;

import "./CRBTCCompanionInterface.sol";
import "./Exponential.sol";
import "./ComptrollerInterface.sol";

contract CRBTCCompanion is CRBTCCompanionInterface, Exponential {
    address public owner;
    uint256 public marketCapThresholdMantissa;
    address public crbtcAddress;
    address public comptroller;

    constructor(address _comptroller, address _crbtcAddress) public {
        owner = msg.sender;
        comptroller = _comptroller;
        crbtcAddress = _crbtcAddress;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "You are not allowed to perform this action"
        );
        _;
    }

    function setMarketCapThreshold(uint256 _marketCapThresholdMantissa)
        external
        onlyOwner
    {
        marketCapThresholdMantissa = _marketCapThresholdMantissa;
    }

    function verifySupplyPerAccountLimit(
        uint256 underlyingAmount,
        uint256 mintAmount
    ) external {
        (, uint256 newSupply) = addUInt(underlyingAmount, mintAmount);
        require(newSupply <= 0.025e18, "R8");
    }
}
