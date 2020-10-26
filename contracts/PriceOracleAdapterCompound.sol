pragma solidity ^0.5.16;

import "./PriceOracleAdapter.sol";
import "./CErc20.sol";

interface V1PriceOracleInterface {
    function assetPrices(address asset) external view returns (uint256);
}

contract PriceOracleAdapterCompound is PriceOracleAdapter {
    event PriceOracleAdapterUpdated(address oldAddress, address newAddress);
    event PriceOracleKeyUpdated(
        address oldAddress,
        address newAddress,
        address cTokenAddress
    );
    /// @notice The price oracle, which will continue to serve prices for MoC
    V1PriceOracleInterface internal priceProviderInterface;

    // mapping(addressCtoken => addressKeyOracle) public keyAddreses;
    mapping(address => address) public keyAddresses;

    constructor() public {
        priceProviderInterface = V1PriceOracleInterface(address(0));
    }

    /**
     * @notice Get the price of MoC
     * @return The price
     */
    function assetPrices(address cTokenAddress) public view returns (uint256) {
        //get keyAddress or undlerlyingAddress
        address asset = (keyAddresses[cTokenAddress] != address(0))
            ? address(keyAddresses[cTokenAddress])
            : address(CErc20(cTokenAddress).underlying());
        
        uint256 price = priceProviderInterface.assetPrices(asset);
        return price;
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
        address oldBtcPriceProviderAddress = address(priceProviderInterface);
        //update interface address
        priceProviderInterface = V1PriceOracleInterface(priceProviderAddress);
        //emit event
        emit PriceOracleAdapterUpdated(
            oldBtcPriceProviderAddress,
            address(priceProviderInterface)
        );
    }

    function setKeyOracle(address cTokenAddress, address keyOracle) public {
        //TODO and guardian is gone(?)
        // require(
        //     msg.sender == guardian,
        //     "PriceOracleDispatcher: only guardian may set the address"
        // );
        require(
            cTokenAddress != address(0),
            "PriceOracleAdapterMoc: cTokenAddress could not be 0"
        );
        require(
            keyOracle != address(0),
            "PriceOracleAdapterMoc: keyOracle could not be 0"
        );
        //set old address
        address oldBtcPriceProviderAddress = address(
            keyAddresses[cTokenAddress]
        );
        //update key address
        keyAddresses[cTokenAddress] = keyOracle;
        //emit event
        emit PriceOracleKeyUpdated(
            oldBtcPriceProviderAddress,
            address(keyAddresses[cTokenAddress]),
            cTokenAddress
        );
    }
}
