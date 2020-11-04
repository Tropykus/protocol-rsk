pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./PriceOracleAdapter.sol";

contract PriceOracleProxy is PriceOracle {
    /// @notice Address of the guardian
    address public guardian;
    /// @notice Address of the guardian
    address public cRBTCAddress;
    /// @notice Mapping of the cTokenAddress => adapterAddress
    mapping(address => address) public tokenAdapter;

    /// @notice Struct of the cTokensDetail
    struct CtokenDetail {
        address cToken;
        string cTokenName;
    }

    /// @notice Array of cTokensDetail
    CtokenDetail[] public cTokensArray;

    /**
     * @notice Get the length of cTokensArray
     * @return The length of cTokensArray
     */
    function cTokenArrayCount() public view returns (uint256) {
        return cTokensArray.length;
    }

    /// @param guardian_ The address of the guardian, which may set the
    constructor(address guardian_) public {
        guardian = guardian_;
    }

    /**
     * @notice Get the underlying price of a listed cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18)
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint256) {
        //validate crtbc address
        if (address(cToken) == cRBTCAddress) {
            return 1e18;
        }
        address oracleAdapter = tokenAdapter[address(cToken)];
        //validate mapping
        if (oracleAdapter == address(0)) {
            return 0;
        }
        return PriceOracleAdapter(oracleAdapter).assetPrices(address(cToken));
    }

    /**
     * @notice Set the underlying price of a listed cToken asset
     * @param addressToken Address of the cToken
     * @param addressAdapter Address of the OracleAdapter
     */
    function setAdapterToToken(address addressToken, address addressAdapter)
        public
    {
        //validate only guardian can set
        require(
            msg.sender == guardian,
            "PriceOracleProxy: only guardian may set the address"
        );
        require(
            addressToken != address(0),
            "PriceOracleProxy: address token can not be 0"
        );
        require(
            addressAdapter != address(0),
            "PriceOracleProxy: address adapter can not be 0"
        );
        //validate and set new cToken in CtokenDetail
        if (tokenAdapter[addressToken] == address(0)) {
            CtokenDetail memory _cTokenD = CtokenDetail({
                cToken: addressToken,
                cTokenName: CToken(addressToken).symbol()
            });

            cTokensArray.push(_cTokenD);
        }
        //set token => adapter
        tokenAdapter[addressToken] = addressAdapter;
    }

    /**
     * @notice Set the underlying price of a listed cToken asset
     * @param addressCRBTC Address of CRBTC
     */
    function setCRBTCAddress(address addressCRBTC) public {
        //validate only guardian can set
        require(
            msg.sender == guardian,
            "PriceOracleProxy: only guardian may set the address"
        );
        cRBTCAddress = addressCRBTC;
     }
}
