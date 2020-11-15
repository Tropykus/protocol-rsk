const BigNumber = require('bignumber.js');

const {
  mineBlock
} = require('../Utils/Ethereum');

const {
} = require('../Utils/Compound');
//TODO path
const fileContractsAddresses = __dirname + '//../../script/deploy/contractAddressesDeploy.json';
let underlyingDai, cDai, unitroller;

function getAddressContractDeploy() {
  var fs = require("fs");
  //TODO try or asyn (callback err)?
  return fs.readFileSync(fileContractsAddresses).toString();
}

async function setContractFromAddress(adresses) {
  // adresses.findIndex(findContract);
  let cDaiAddress, underlyingDaiAddress, unitrollerAddress;
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
      default:
        continue;
    }
  }
  cDai = await saddle.getContractAt("CErc20Immutable", cDaiAddress);
  underlyingDai = await saddle.getContractAt("StandardToken", underlyingDaiAddress);
  unitroller = await saddle.getContractAt("Comptroller", unitrollerAddress);
}

describe('deployTest', () => {
  [root, a2, ...accounts] = saddle.accounts;
  let contracts = getAddressContractDeploy();
  describe("Supplying Dai", () => {
    it("Supplying DAI to rLending.", async () => {
      //set contracts at address to vars
      await setContractFromAddress(JSON.parse(contracts));
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
      //aprove mint
      await send(underlyingDai, "approve", [cDai._address, new BigNumber(10000e18)]);
      //mint cDai
      await send(cDai, "mint", [new BigNumber(10000e18)]);
      //set market to account
      let cTokens = [];
      cTokens[0] = cDai._address;
      await send(unitroller, "enterMarkets", [cTokens]);
      let mark = await call(unitroller, "getAccountLiquidity", [root]);
      //valdiate mark  get empty array
      let filtered = Object.values(mark).filter(function (i) {
        return i != 0;
      });
      expect(filtered).toEqual(Array());
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
