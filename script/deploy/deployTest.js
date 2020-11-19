const BigNumber = require('bignumber.js');

const {
  mineBlock
} = require('../../tests/Utils/Ethereum');

const {
} = require('../../tests/Utils/Compound');
//TODO path
const fileContractsAddresses = __dirname + '/contractAddressesDeploy.json';
let underlyingDai, cDai, unitroller, unitrollerImp, multiSig, cRBTC, oracleProxy;

function getAddressContractDeploy() {
  var fs = require("fs");
  //validate exist file
  if (!fs.existsSync(fileContractsAddresses)) {
    console.error("File with addresses contracts not exist. You need to run script/Deploy/deploy.js before")
  }
  //TODO try or asyn (callback err)?
  return fs.readFileSync(fileContractsAddresses).toString();
}

async function setContractFromAddress(adresses) {
  // adresses.findIndex(findContract);
  let cDaiAddress, underlyingDaiAddress, unitrollerAddress, unitrollerImpAddress, multiSigWalletAddress, cRBTCAddress, oracleProxyAddress;
  for (var i = 0; i < adresses.length; i++) {
    //todo validate not null x2
    switch (adresses[i].contract) {
      case "cDai":
        cDaiAddress = adresses[i].address;
        continue;
      case "underlyingDai":
        underlyingDaiAddress = adresses[i].address;
        continue;
      case "Unitroller":
        unitrollerAddress = adresses[i].address;
        continue;
      case "UnitrollerImp":
        unitrollerImpAddress = adresses[i].address;
        continue;
      case "MultiSigWallet":
        multiSigWalletAddress = adresses[i].address;
        continue;
      case "cRBTC":
        cRBTCAddress = adresses[i].address;
        continue;
      case "PriceOracleProxy":
        oracleProxyAddress = adresses[i].address;
        continue;
      default:
        continue;
    }
  }
  cDai = await saddle.getContractAt("CErc20Immutable", cDaiAddress);
  underlyingDai = await saddle.getContractAt("StandardToken", underlyingDaiAddress);
  unitroller = await saddle.getContractAt("Comptroller", unitrollerAddress);
  unitrollerImp = await saddle.getContractAt("Unitroller", unitrollerImpAddress);
  multiSig = await saddle.getContractAt("MultiSigWallet", multiSigWalletAddress);
  cRBTC = await saddle.getContractAt("CRBTC", cRBTCAddress);
  oracleProxy = await saddle.getContractAt("PriceOracleProxy", oracleProxyAddress);
}
describe('deployTest', () => {
  [root, a3, ...accounts] = saddle.accounts;
  a3 = "0x581c42e8634805c782f7e592304fc578c48516E0";
  let contracts = getAddressContractDeploy();

  describe("OwnerAlpha", () => {

    it("Set pending admin Unitroller fail with out owner", async () => {
      //before
      await setContractFromAddress(JSON.parse(contracts));

      let validate = await call(unitrollerImp, "_setPendingAdmin", [a3]);
      expect(validate).toEqual("1");
    });

    it("Set pending admin cDai fail with out owner", async () => {
      let validate = await call(cDai, "_setPendingAdmin", [a3]);
      expect(validate).toEqual("1");
    });

    it("Set pending admin cRBTC fail with out owner", async () => {
      let validate = await call(cRBTC, "_setPendingAdmin", [a3]);
      expect(validate).toEqual("1");
    });

    it("Set pending admin oracle proxy fail with out owner", async () => {
      await expect(send(oracleProxy, "_setPendingAdmin", [a3])).rejects.toRevert("revert PriceOracleProxy: only guardian may set the address");
    });

    it("Set pending admin Unitroller with MultiSig", async () => {
      let validate = await call(unitrollerImp, "_setPendingAdmin", [a3], { from: multiSig._address });
      expect(validate).toEqual("0");
    });

    it("Set pending admin cDai with MultiSig", async () => {
      let validate = await call(cDai, "_setPendingAdmin", [a3], { from: multiSig._address });
      expect(validate).toEqual("0");
    });
    it("Set pending admin cRBTC with MultiSig", async () => {
      let validate = await call(cRBTC, "_setPendingAdmin", [a3], { from: multiSig._address });
      expect(validate).toEqual("0");
    });
    it("Set pending admin oracle proxy with MultiSig", async () => {
      let validate = await call(oracleProxy, "_setPendingAdmin", [a3], { from: multiSig._address });
      expect(validate).resolves;
    });


  });

  describe("Supplying Dai", () => {
    it("Supplying DAI to rLending.", async () => {
      //approve mint 
      await send(underlyingDai, "approve", [cDai._address, new BigNumber(10000e18)]);
      //mint cDai
      let mintCDaiCall = await call(cDai, "mint", [new BigNumber(10000e18)]);
      await send(cDai, "mint", [new BigNumber(10000e18)]);
      expect(mintCDaiCall).toEqual("0");
    });

    it("Redeem DAI.", async () => {
      let redeemDai = await call(cDai, "redeem", [new BigNumber(100e18)])
      expect(redeemDai).toEqual("0");
    });

    it("Redeem Underlying DAI.", async () => {
      let redeemUnderlyingDai = await call(cDai, "redeemUnderlying", [new BigNumber(1000e18)])
      expect(redeemUnderlyingDai).toEqual("0");
    });
  });

  describe("Borrowing Dai", () => {
    it("Account Liquidity.", async () => {
      let amount = new BigNumber(10000e18);
      //aprove mint
      await send(underlyingDai, "approve", [cDai._address, amount]);
      //mint cDai
      await send(cDai, "mint", [amount]);
      //set market to account
      let cTokens = [];
      cTokens[0] = cDai._address;
      await send(unitroller, "enterMarkets", [cTokens]);
      let error, liquidity, shortfall;
      //set array response
      ({ 0: error, 1: liquidity, 2: shortfall } = await call(unitroller, "getAccountLiquidity", [root]));
      expect(error).toEqualNumber(0);
      expect(parseInt(liquidity)).toBeGreaterThan(0);
      expect(shortfall).toEqualNumber(0);
    });

    it("Borrowing DAI from rLending.", async () => {
      //borrow
      let borrow = await call(cDai, "borrow", [new BigNumber(100e18)]);
      await send(cDai, "borrow", [new BigNumber(100e18)]);
      expect(borrow).toEqual("0");
    });

    it("Current borrow balance", async () => {
      //get current balance
      let balance = await call(cDai, "borrowBalanceCurrent", [root]);
      //mine some block
      await mineBlock();
      await mineBlock();
      await mineBlock();
      await mineBlock();
      //now get current balance again 
      let balanceThen = await call(cDai, "borrowBalanceCurrent", [root]);
      expect(parseInt(balance)).toBeLessThan(parseInt(balanceThen));
    });

  });
});
