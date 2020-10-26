pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./PriceOracleAdapter.sol";

contract PriceOracleDispatcher is PriceOracle {
    /// @notice Address of the guardian, which may set the SAI price once
    address public guardian;
    /// @notice Mapping of the cTokenAddress => adapterAddress
    mapping(address => address) public tokenAdapter;

    struct CtokenDetail {
        address cToken;
        string cTokenName;
    }

    CtokenDetail[] public cTokensArray;

    /// @notice Frozen SAI price (or 0 if not set yet)
    uint256 public saiPrice;

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
        //get adapter
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
            "PriceOracleDispatcher: only guardian may set the address"
        );
        require(
            addressToken != address(0),
            "PriceOracleDispatcher: address token can not be 0"
        );
        require(
            addressAdapter != address(0),
            "PriceOracleDispatcher: address adapter can not be 0"
        );
        //validate and set new cToken in CtokenDetail
        if (tokenAdapter[addressToken] == address(0)) {
            CtokenDetail memory _cTokenD = CtokenDetail({
                cToken: addressToken,
                //TODO cToken.symbol()
                cTokenName: "symbol"
            });

            cTokensArray.push(_cTokenD);
        }
        //set token => adapter
        tokenAdapter[addressToken] = addressAdapter;
    }

    /**
     * @notice Set the price of SAI, permanently
     * @param price The price for SAI
     */
    function setSaiPrice(uint256 price) public {
        require(msg.sender == guardian, "only guardian may set the SAI price");
        require(saiPrice == 0, "SAI price may only be set once");
        require(price < 0.1e18, "SAI price must be < 0.1 ETH");
        saiPrice = price;
    }
}
