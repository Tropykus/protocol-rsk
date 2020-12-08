pragma solidity ^0.5.16;

import "../../contracts/PriceOracleProxy.sol";
import "../../contracts/PriceOracleAdapter.sol";

contract PriceOracleProxyExtends is PriceOracleProxy {
    /// @notice Address of the adapter MoC to mock
    address public adapterMockAddress;

    /// @param guardian_ The address of the guardian, which may set the of PriceOracleProxy
    constructor(address guardian_) public PriceOracleProxy(guardian_) {}

    /**
     * @notice Get the underlying price of a listed cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18)
    //  */
    function getUnderlyingPrice(CToken cToken) public view returns (uint256) {
        address oracleAdapter = tokenAdapter[address(cToken)];
        //validate mapping
        if (oracleAdapter == address(0)) {
            //rewrite and return the asset prices of adapter MoC
            return
                PriceOracleAdapter(adapterMockAddress).assetPrices(
                    address(cToken)
                );
        }
        return PriceOracleAdapter(oracleAdapter).assetPrices(address(cToken));
    }

    /**
     * @notice Set the address or adapter MoC
     * @return The underlying asset price mantissa (scaled by 1e18)
    //  */
    function setMockAdapter(address addressAdapter) public {
        //validate only guardian can set
        require(
            msg.sender == guardian,
            "PriceOracleDispatcher: only guardian may set the address"
        );
        adapterMockAddress = addressAdapter;
    }
}
