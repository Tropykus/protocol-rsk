const BigNumber = require('bignumber.js');

const {
  address,
  etherMantissa
} = require('./Utils/Ethereum');

const {
  makeCToken,
} = require('./Utils/Compound');

describe('PriceOracleProxy', () => {
  let root, accounts;
  let backingOracleMoC, backingOracle, cRBTC, cRIF, cUsdc, cUsdt, cDai, cOther;

  beforeEach(async () => {
    [root, a3, ...accounts] = saddle.accounts;
    //set comptroller
    const comptroller = await deploy('ComptrollerHarness');
    //set PriceProviderMoC
    const priceOracleMoC = await deploy('MockPriceProviderMoC', [root, new BigNumber('1e+18')]);
    //set RBTCPriceProviderMoC with price=5
    const priceAdapterMoc = await deploy('PriceOracleAdapterMoc', [root, priceOracleMoC._address]);
    const priceAdapterCompound = await deploy('PriceOracleAdapterCompound', [root]);
    //set Simple PriceProvider
    const simplePriceOracle = await deploy('SimplePriceOracle');
    //set token
    cRBTC = await makeCToken({ kind: "crbtc", comptrollerOpts: Object.assign(comptroller, { priceOracleMoC }), supportMarket: true });
    cRIF = await makeCToken({ comptroller: cRBTC.comptroller, supportMarket: true });
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
    oracleDispatcher = await deploy('PriceOracleProxy', [root]);
  });

  describe("constructor", () => {
    it("sets address of guardian", async () => {
      let configuredGuardian = await call(oracleDispatcher, "guardian");
      expect(configuredGuardian).toEqual(root);
    });

    it("sets address of oracle MoC to adapter", async () => {
      let old = backingOracleMoC._address;
      const result = await send(adapterMoc, "setPriceProvider", [backingOracleMoC._address]);
      //capture and validate event
      expect(result).toHaveLog('PriceOracleAdapterUpdated', {
        oldAddress: old,
        newAddress: backingOracleMoC._address,
      });
    });

    it("sets address of oracle Compound to adapter", async () => {
      const result = await send(adapterCompound, "setPriceProvider", [backingOracle._address]);
      //capture and validate event
      expect(result).toHaveLog('PriceOracleAdapterUpdated', {
        oldAddress: address(0),
        newAddress: backingOracle._address,
      });
    });

    it("revert when not account guardian try to set provider to adapter MoC ", async () => {
      await expect(send(adapterMoc, "setPriceProvider", [backingOracleMoC._address], { from: accounts[0] })).rejects.toRevert("revert PriceOracleAdapterMoc: only guardian may set the address");
    });

    it("revert when not account guardian try to set provider to adapter compund ", async () => {
      await expect(send(adapterCompound, "setPriceProvider", [backingOracle._address], { from: accounts[0] })).rejects.toRevert("revert PriceOracleAdapterCompound: only guardian may set the address");
    });
  });

  //test MoC mock 
  describe("set price of Money on Chain mock", () => {
    it("sets price", async () => {
      const price = new BigNumber('10e+18');
      const result = await send(backingOracleMoC, "setPrice", [price]);
      expect(result).toHaveLog('MockPriceProviderMoCUpdated', {
        oldPrice: new BigNumber('1e+18'),
        newPrice: price,
      });
    });

    it("revert when not account guardian try to set price", async () => {
      await expect(send(backingOracleMoC, "setPrice", [new BigNumber('10e+18')], { from: accounts[0] })).rejects.toRevert("revert MockPriceProviderMoC: only guardian may set the address");
    });

    it("revert when try to set invalid price", async () => {
      await expect(send(backingOracleMoC, "setPrice", [new BigNumber('0e+18')], { from: root })).rejects.toRevert("revert MockPriceProviderMoC: price could not be 0");
    });

  });

  describe("set and accept new guardian", () => {
    it("set pending admin, fail without owner", async () => {
      await expect(send(oracleDispatcher, "_setPendingAdmin", [a3], { from: a3 })).rejects.toRevert("revert PriceOracleProxy: only guardian may set the address");
    });

    it("set pending admin, fail with wrong owner", async () => {
      await expect(send(oracleDispatcher, "_setPendingAdmin", [address(0)])).rejects.toRevert("revert PriceOracleProxy: address admin can not be 0");
    });

    it("set pending admin", async () => {
      let validate = await send(oracleDispatcher, "_setPendingAdmin", [a3]);
      expect(validate).toHaveLog('NewPendingGuardian', {
        oldPendingGuardian: root,
        newPendingGuardian: a3,
      });
    });

    it("accept new admin, fail whitout set pending admin", async () => {
      //deploy multiSig
      let multiSig = await deploy('MultiSigWallet', [[root], 1]);
      //construct acceptAdmin=>encodeABI
      const data = oracleDispatcher.methods._acceptAdmin().encodeABI();
      //submit transacion multisig, when accept the admin of contract
      let result = await send(multiSig, "submitTransaction", [oracleDispatcher._address, 0, data]);
      expect(result).toHaveLog('ExecutionFailure', {
        transactionId: "0"
      });
    });

    it("set and accept new admin", async () => {
      //deploy multiSig
      let multiSig = await deploy('MultiSigWallet', [[root], 1]);
      //set pending admin
      await send(oracleDispatcher, "_setPendingAdmin", [multiSig._address]);
      //construct acceptAdmin=>encodeABI
      const data = oracleDispatcher.methods._acceptAdmin().encodeABI();
      //submit transacion multisig, when accept the admin of contract
      let result = await send(multiSig, "submitTransaction", [oracleDispatcher._address, 0, data]);
      expect(result).toHaveLog('Execution', {
        transactionId: "0"
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

    it("revert when sets oracle address(0) to cToken", async () => {
      await expect(send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, address(0)])).rejects.toRevert("revert PriceOracleProxy: address adapter can not be 0");
    });

    it("revert when sets oracle address to cToken address(0)", async () => {
      await expect(send(oracleDispatcher, "setAdapterToToken", [address(0), backingOracleMoC._address])).rejects.toRevert("revert PriceOracleProxy: address token can not be 0");
    });

    it("revert when not account guardian try to sets oracle address to cToken", async () => {
      await expect(send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, backingOracleMoC._address], { from: accounts[0] })).rejects.toRevert("revert PriceOracleProxy: only guardian may set the address");
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
      //TODO evaluate event
    }

    it("always returns 1e18 for cRBTC", async () => {
      // //set crbtc address to adapterMoC address
      await send(oracleDispatcher, "setAdapterToToken", [cRBTC._address, adapterMoc._address]);
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

    it("oracle returns proper RIF price", async () => {
      //token price (i.e. 9e+18)
      let tokenPrice = new BigNumber('9e+18');
      //set price oracle for RIF
      let priceOracleMoC = await deploy('MockPriceProviderMoC', [root, tokenPrice]);
      //deploy oracle adapter
      let priceAdapterMoc = await deploy('PriceOracleAdapterMoc', [root, priceOracleMoC._address]);
      //read and verify cRIF price
      await readAndVerifyOraclePrice(cRIF, tokenPrice / new BigNumber('1e18'), priceAdapterMoc);
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

      await send(adapterCompound, "setSaiPrice", [etherMantissa(0.05)]);

      await readAndVerifyOraclePrice(cDai, 0.01, adapterCompound);
      // TODO dispatcher no verify Sai than proxy
      // await readAndVerifyOraclePrice(cSai, 0.05, backingOracleAux);

      await expect(send(adapterCompound, "setSaiPrice", [1])).rejects.toRevert("revert SAI price may only be set once");
    });

    it("only guardian may set the sai price", async () => {
      await expect(send(adapterCompound, "setSaiPrice", [1], { from: accounts[0] })).rejects.toRevert("revert only guardian may set the SAI price");
    });

    it("sai price must be bounded", async () => {
      await expect(send(adapterCompound, "setSaiPrice", [etherMantissa(10)])).rejects.toRevert("revert SAI price must be < 0.1 ETH");
    });
  });
});
