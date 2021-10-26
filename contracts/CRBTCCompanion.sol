pragma solidity ^0.5.16;

import "./CRBTCCompanionInterface.sol";
import "./Exponential.sol";
import "./ErrorReporter.sol";
import "./ComptrollerG6.sol";
import "./CToken.sol";
import "./PriceOracle.sol";

contract CRBTCCompanion is
    CRBTCCompanionInterface,
    Exponential,
    ComptrollerErrorReporter
{
    ComptrollerG6 public comptroller;
    address public owner;
    uint256 public marketCapThresholdMantissa;
    address public crbtcAddress;
    address public oracle;

    constructor(
        ComptrollerG6 _comptroller,
        address _crbtcAddress,
        address _oracle
    ) public {
        owner = msg.sender;
        comptroller = _comptroller;
        crbtcAddress = _crbtcAddress;
        oracle = _oracle;
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

    function getTotalBorrowsInOtherMarkets()
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 totalBorrows;
        uint256 oraclePriceMantissa;
        CToken[] memory assets = comptroller.getAllMarkets();
        for (uint256 i = 0; i < assets.length; i++) {
            CToken asset = assets[i];
            if (asset == CToken(crbtcAddress)) continue;
            uint256 assetTotalBorrows = asset.totalBorrows();
            oraclePriceMantissa = PriceOracle(oracle).getUnderlyingPrice(asset);
            if (oraclePriceMantissa == 0) {
                return (uint256(Error.PRICE_ERROR), 0, 0);
            }
            Exp memory oraclePrice = Exp({mantissa: oraclePriceMantissa});
            totalBorrows = mul_ScalarTruncateAddUInt(
                oraclePrice,
                assetTotalBorrows,
                totalBorrows
            );
        }
        oraclePriceMantissa = PriceOracle(oracle).getUnderlyingPrice(
            CToken(crbtcAddress)
        );
        if (oraclePriceMantissa == 0) {
            return (uint256(Error.PRICE_ERROR), 0, 0);
        }
        return (uint256(Error.NO_ERROR), totalBorrows, oraclePriceMantissa);
    }

    function verifySupplyMarketCapLimit(
        uint256 totalSupply,
        uint256 mintAmount,
        uint256 exchangeRateMantissa
    ) external {
        (
            ,
            uint256 borrowsInOtherMarkets,
            uint256 underlyingPrice
        ) = getTotalBorrowsInOtherMarkets();
        (, uint256 mintTokens) = divScalarByExpTruncate(
            mintAmount,
            Exp({mantissa: exchangeRateMantissa})
        );
        Exp memory totalSupplyInUSD = mul_(
            mul_(
                Exp({mantissa: add_(totalSupply, mintTokens)}),
                Exp({mantissa: exchangeRateMantissa})
            ),
            Exp({mantissa: underlyingPrice})
        );
        Exp memory limit = mul_(
            Exp({mantissa: borrowsInOtherMarkets}),
            Exp({mantissa: marketCapThresholdMantissa})
        );
        require(limit.mantissa > totalSupplyInUSD.mantissa, "R9");
    }
}
