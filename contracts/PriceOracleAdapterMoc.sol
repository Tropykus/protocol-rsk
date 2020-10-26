pragma solidity ^0.5.16;

import "./PriceOracleAdapter.sol";

interface PriceProviderMoC {
    function peek() external view returns (bytes32, bool);
}

contract PriceOracleAdapterMoc is PriceOracleAdapter {
    event PriceOracleAdapterMocUpdated(address oldAddress, address newAddress);
    /// @notice The price oracle, which will continue to serve prices for MoC
    PriceProviderMoC internal priceProviderMoC;

    /**
     * @notice Construct empty
     */
    constructor() public {
        // priceProviderMoC = PriceProviderMoC(address(0));
    }

    /**
     * @notice Get the price of MoC
     * @return The price
     */
    function assetPrices(address cTokenAddress) public view returns (uint256) {
        //TODO
        cTokenAddress;
        (bytes32 price, bool has) = priceProviderMoC.peek();
        require(has, "PriceOracleAdapterMoc: Oracle have no Price");
        return uint256(price);
    }

    function setPriceProvider(address priceProviderAddress) public {
        //TODO and guardian is gone(?)
        // require(
        //     msg.sender == guardian,
        //     "PriceOracleDispatcher: only guardian may set the address"
        // );
        require(
            priceProviderAddress != address(0),
            "PriceOracleAdapterMoc: address could not be 0"
        );
        //set old address
        address oldPriceProviderAddress = address(priceProviderMoC);
        //update interface address
        priceProviderMoC = PriceProviderMoC(priceProviderAddress);
        //emit event
        emit PriceOracleAdapterMocUpdated(
            oldPriceProviderAddress,
            address(priceProviderAddress)
        );
    }
}
