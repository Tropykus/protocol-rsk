pragma solidity ^0.5.16;

interface IOracle {
    function peek() external view returns (uint256, bool);

    function getLastPublicationBlock() external view returns (uint256);
}

interface IRoCState {
    function getReserveTokenPrice() external view returns (uint256);

    function getPriceProvider() external view returns (address);
}

contract Discover {
    address IRoCState_addr;

    constructor() public {
        IRoCState_addr = 0x9d4b2c05818A0086e641437fcb64ab6098c7BbEc;
    }

    function getOracle() public view returns (address oracle) {
        oracle = IRoCState(IRoCState_addr).getPriceProvider();
    }
}
