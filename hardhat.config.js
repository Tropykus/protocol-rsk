require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-deploy");

const { ethers } = require("ethers");

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

const networks = require('./hardhat.networks')

const config = {
  defaultNetwork: "hardhat",
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    }
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./build",
    tests: "./tests/repayBorrow/"
  },
  networks,
  namedAccounts: {
    deployer: {
      default: 0
    },
    rifOracle: {
      30: '0x504efcadfb020d6bbaec8a5c5bb21453719d0e00',
      31: '0x9d4b2c05818a0086e641437fcb64ab6098c7bbec',
      1337: '0x9d4b2c05818a0086e641437fcb64ab6098c7bbec'
    },
    rifOracleAdapterMoc: {
      31: '0xd85815f5B855a5FcB71EdB4C1B866a88784E006e',
    },
    rbtcOracle: {
      30: '0x7b19bb8e6c5188ec483b784d6fb5d807a77b21bf',
      31: '0x26a00af444928d689ddec7b4d17c0e4a8c9d407d',
      1337: '0x26a00af444928d689ddec7b4d17c0e4a8c9d407d'
    },
    rbtcOracleAdaptedMoc: {
      31: '0x0799F8788A42347544F886108b0Deb155B845D50',
    },
    usdtOracle: {
      31: '0xCB9549248d05AE90B06F7c330030cB3e55a656B1',
    },
    usdtOracleAdapterMoc: {
      31: '0x8A03AF6b9B4F5D7756887EF9E0FA814f55CA4f88',
    },
    docOracle: {
      31: '0x83B925446C6F8fA6A6f82e055c423E02A07D0AC1',
    },
    docOracleAdapterMoc: {
      31: '0x638e5bEBf9F36061078fefE652f542d57BFDBF69',
    },
    usdt: {
      30: "0xef213441a85df4d7acbdae0cf78004e1e486bb96",
      31: "0x5a0A6D4675f650493cF7B385A6C0c19A42dedef4",
      1337: "0x4cfe225ce54c6609a525768b13f7d87432358c57"
    },
    rif: {
      30: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
      31: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe",
      1337: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
    },
    doc: {
      30: "0xe700691da7b9851f2f35f8b8182c69c53ccad9db",
      31: "0xb6950ecAbb48668026b9aAC974caa5E8AD357665"
    },
    admin1: {
      31: "0xe317349c7279ffF242cc8ADCb575EbA0153760BA",
      1337: "0x8f63de841e7bccce39faa828128da25f8a93411f"
    },
    admin2: {
      31: "0x9c4aAE754FF8c963966B26CE8206EF0271c614aa",
      1337: "0x170346689cc312d8e19959bc68c3ad03e72c9850"
    },
    multiSig: {
      // 30: "0x2992181d390c5f35a70c8012a8a6a4a6b7603a37",
      31: "0xbaCeDdb9a3c3b5e6b9955f08D4C264B78fc5D284",
      // 1337: "0x9760d4a155058f6bec8d9fd8d50222073e57083e"
    },
    unitroller: {
      31: '0x4B1D9975ba021d7AD1a8A83DE3bd53C1178F0054'
    }
  }
};

module.exports = config
