const BigNumber = require('bignumber.js');

const {
  address,
  etherMantissa
} = require('./Utils/Ethereum');

const {
  makeCToken,
} = require('./Utils/Compound');

describe('PriceOracleDispatcher', () => {
  let root, accounts;
  let backingOracleMoC, backingOracle, cRBTC, cUsdc, cUsdt, cDai, cOther;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    //set comptroller
    const comptroller = await deploy('ComptrollerHarness');
    //set PriceProviderMoC
    const priceOracleMoC = await deploy('MockPriceProviderMoC', [new BigNumber('1e+18')]);
    const priceAdapterMoc = await deploy('PriceOracleAdapterMoc');
    const priceAdapterCompound = await deploy('PriceOracleAdapterCompound');
    //set Simple PriceProvider
    const simplePriceOracle = await deploy('SimplePriceOracle');
    //set token
    cRBTC = await makeCToken({ kind: "crbtc", comptrollerOpts: Object.assign(comptroller, { priceOracleMoC }), supportMarket: true });
    cUsdc = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
    cUsdt = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
    cDai = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
    cSai = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
    cOther = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
    backingOracleMoC = priceOracleMoC;
    backingOracle = simplePriceOracle;
    adapterCompound = priceAdapterCompound;
    adapterMoc = priceAdapterMoc;
    //set Dispatcher
    oracleDispatcher = await deploy('PriceOracleDispatcher', [root]);
  });

  describe("constructor", () => {
    it("sets address of guardian", async () => {
      let configuredGuardian = await call(oracleDispatcher, "guardian");
      expect(configuredGuardian).toEqual(root);
    });

    it("sets address of oracle MoC", async () => {
      const result = await send(adapterMoc, "setPriceProvider", [backingOracleMoC._address]);
      //capture and validate event
      expect(result).toHaveLog('PriceOracleAdapterMocUpdated', {
        oldAddress: address(0),
        newAddress: backingOracleMoC._address,
      });
    });

    it("sets address of oracle Compound", async () => {
      const result = await send(adapterCompound, "setPriceProvider", [backingOracle._address]);
      //capture and validate event
      expect(result).toHaveLog('PriceOracleAdapterUpdated', {
        oldAddress: address(0),
        newAddress: backingOracle._address,
      });
    });
  });

  describe("mappingAdapterCtoken", () => {
    it("sets oracle address to cToken", async () => {
      await send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, backingOracleMoC._address]);
      let oracleAdapterAddress = await call(oracleDispatcher, "tokenAdapter", [cRBTC._address]);
      expect(oracleAdapterAddress).toEqual(backingOracleMoC._address);
    });

    it("update oracle address to cToken", async () => {
      await send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, backingOracleMoC._address]);
      otherbackingOracleMoC = address(2);
      await send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, otherbackingOracleMoC]);
      let oracleAdapterAddress = await call(oracleDispatcher, "tokenAdapter", [cRBTC._address]);
      expect(oracleAdapterAddress).toEqual(otherbackingOracleMoC);
    });

  });

  describe("getUnderlyingPrice", () => {
    let setAndVerifyBackingPrice = async (cToken, price, adapterOracle) => {
      await send(
        adapterOracle,
        "setUnderlyingPrice",
        [cToken._address, etherMantissa(price)]);

      let backingOraclePrice = await call(
        adapterOracle,
        "assetPrices",
        [cToken.underlying._address]
      );

      expect(Number(backingOraclePrice)).toEqual(price * 1e18);
    };

    let readAndVerifyOraclePrice = async (token, price, adapterOracle = null) => {
      //set adapter to token
      if (adapterOracle != null) {
        await send(oracleDispatcher, "setAdapterToToken", [token._address, adapterOracle._address]);
      }
      //get price (of oracle adapter)
      let oraclePrice = await call(oracleDispatcher, "getUnderlyingPrice", [token._address]);
      //compare price to oraclePrice
      expect(Number(oraclePrice)).toEqual(price * 1e18);;
    };

    let setMockToAdapter = async (adapter, mockAddress) => {
      const result = await send(adapter, "setPriceProvider", [mockAddress]);
    }

    it("always returns 1e18 for cRBTC", async () => {
      //set mock to adapter
      setMockToAdapter(adapterMoc, backingOracleMoC._address);
      //validate value
      await readAndVerifyOraclePrice(cRBTC, 1, adapterMoc);
    });

    it("uses address(1) for USDC and address(2) for cdai", async () => {
      //set price of USDC and USDT 
      await send(backingOracle, "setDirectPrice", [address(1), etherMantissa(5e12)]);
      //set price of dai
      await send(backingOracle, "setDirectPrice", [address(2), etherMantissa(8)]);
      //set interface provider to adapter compound
      await send(adapterCompound, "setPriceProvider", [backingOracle._address]);
      //set keyAddress = 1 for USDC and USDT
      await send(adapterCompound, "setKeyOracle", [cUsdc._address, address(1)]);
      await send(adapterCompound, "setKeyOracle", [cUsdt._address, address(1)]);
      //set keyAdress = 2 for cdai
      await send(adapterCompound, "setKeyOracle", [cDai._address, address(2)]);
      //validate values
      await readAndVerifyOraclePrice(cDai, 8, adapterCompound);
      await readAndVerifyOraclePrice(cUsdc, 5e12, adapterCompound);
      await readAndVerifyOraclePrice(cUsdt, 5e12, adapterCompound);
    });

    it("proxies for whitelisted tokens", async () => {
      //set mock adapter
      setMockToAdapter(adapterCompound, backingOracle._address);
      await setAndVerifyBackingPrice(cOther, 11, backingOracle);
      await readAndVerifyOraclePrice(cOther, 11, adapterCompound);
      // backingOracleAux = await deploy('MockSimplePriceOracle');
      await setAndVerifyBackingPrice(cOther, 37, backingOracle);
      await readAndVerifyOraclePrice(cOther, 37, adapterCompound);
    });

    it("returns 0 for token without a price", async () => {
      //set new token
      let unlistedToken = await makeCToken({ comptroller: cRBTC.comptroller });
      //verify token with out set adapter to her
      await readAndVerifyOraclePrice(unlistedToken, 0);
    });

    it("correctly handle setting SAI price", async () => {
      //set price of address = 2
      await send(backingOracle, "setDirectPrice", [address(2), etherMantissa(0.01)]);
      //set keyAddress = 2 for dai and sai
      await send(adapterCompound, "setKeyOracle", [cDai._address, address(2)]);
      await send(adapterCompound, "setKeyOracle", [cSai._address, address(2)]);
      //set interface provider to adapter compound
      await send(adapterCompound, "setPriceProvider", [backingOracle._address]);

      await readAndVerifyOraclePrice(cDai, 0.01, adapterCompound);
      await readAndVerifyOraclePrice(cSai, 0.01, adapterCompound);

      await send(oracleDispatcher, "setSaiPrice", [etherMantissa(0.05)]);

      await readAndVerifyOraclePrice(cDai, 0.01, adapterCompound);
      // TODO dispatcher no verify Sai than proxy
      // await readAndVerifyOraclePrice(cSai, 0.05, backingOracleAux);

      await expect(send(oracleDispatcher, "setSaiPrice", [1])).rejects.toRevert("revert SAI price may only be set once");
    });

    it("only guardian may set the sai price", async () => {
      await expect(send(oracleDispatcher, "setSaiPrice", [1], { from: accounts[0] })).rejects.toRevert("revert only guardian may set the SAI price");
    });

    it("sai price must be bounded", async () => {
      await expect(send(oracleDispatcher, "setSaiPrice", [etherMantissa(10)])).rejects.toRevert("revert SAI price must be < 0.1 ETH");
    });
  });
});
