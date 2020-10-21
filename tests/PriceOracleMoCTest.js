const BigNumber = require('bignumber.js');

const {
  address,
} = require('./Utils/Ethereum');

const {
  makeCToken,
} = require('./Utils/Compound');

describe('PriceOracleDispatcher', () => {
  let root, accounts;
  let oracle, backingOracle, cRBTC;
  let daiOracleKey = address(2);

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    //set comptroller
    const comptroller = await deploy('ComptrollerHarness');
    //set Mock ProceProviderMoC
    const priceOracle = await deploy('MockPriceProviderMoC');
    //set price to Mock address
    await send(comptroller, '_setPriceOracle', [priceOracle._address]);
    //set token
    cRBTC = await makeCToken({ kind: "crbtc", comptrollerOpts: Object.assign(comptroller, { priceOracle }), supportMarket: true });
    backingOracle = priceOracle;
    //set Dispatcher
    oracleDispatcher = await deploy('PriceOracleDispatcher', [root]);
  });

  describe("constructor", () => {
    it("sets address of guardian", async () => {
      let configuredGuardian = await call(oracleDispatcher, "guardian");
      expect(configuredGuardian).toEqual(root);
    });
  });

  describe("mappingAdapterCtoken", () => {
    it("sets oracle address to cToken", async () => {
      await send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, backingOracle._address]);
      let oracleAdapterAddress = await call(oracleDispatcher, "tokenAdapter", [cRBTC._address]);
      expect(oracleAdapterAddress).toEqual(backingOracle._address);
    });
  });

  describe("getUnderlyingPrice", () => {
    let readAndVerifyOraclePrice = async (token, price, setAdapter = true) => {
      //set adapter to token
      if (setAdapter) {
        await send(oracleDispatcher, "setAdapterToToken", [token._address, backingOracle._address]);
      }
      //get price (of oracle adapter)
      let oraclePrice = await call(oracleDispatcher, "getUnderlyingPrice", [token._address]);
      //compare price to oraclePrice
      expect(Number(oraclePrice)).toEqual(price * 1e18);;
    };

    it("always returns 1e18 for cRBTC", async () => {
      await readAndVerifyOraclePrice(cRBTC, 1);
    });

    it("returns 0 for token without a price", async () => {
      //set new token
      let unlistedToken = await makeCToken({ comptroller: cRBTC.comptroller });
      //verify token with out set adapter to her
      await readAndVerifyOraclePrice(unlistedToken, 0, false);
    });
  });
});
