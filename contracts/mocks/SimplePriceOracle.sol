// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4;

import "../PriceOracle.sol";
import "../CErc20.sol";

/**
 * @title Simplified Oracle for testing purposes.
 * @author tropykus
 * @notice This contract is meant for testing only.
 */
contract SimplePriceOracle is PriceOracle {
    mapping(address => uint256) prices;
    event PricePosted(
        address asset,
        uint256 previousPriceMantissa,
        uint256 requestedPriceMantissa,
        uint256 newPriceMantissa
    );

    function getUnderlyingPrice(CToken cToken)
        public
        view
        override
        returns (uint256)
    {
        if (compareStrings(cToken.symbol(), "cRBTC")) {
            return prices[(address(cToken))];
        } else {
            return prices[address(CErc20(address(cToken)).underlying())];
        }
    }

    function setUnderlyingPrice(CToken cToken, uint256 underlyingPriceMantissa)
        public
    {
        address asset = address(CErc20(address(cToken)).underlying());
        emit PricePosted(
            asset,
            prices[asset],
            underlyingPriceMantissa,
            underlyingPriceMantissa
        );
        prices[asset] = underlyingPriceMantissa;
    }

    function setDirectPrice(address asset, uint256 price) public {
        emit PricePosted(asset, prices[asset], price, price);
        prices[asset] = price;
    }

    // v1 price oracle interface for use as backing of proxy
    function assetPrices(address asset) external view returns (uint256) {
        return prices[asset];
    }

    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }
}
