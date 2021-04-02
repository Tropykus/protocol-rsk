require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");

const networks = require('./hardhat.networks')

const config = {
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.5.17",
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
    artifacts: "./build"
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
    rbtcOracle: {
      30: '0x7b19bb8e6c5188ec483b784d6fb5d807a77b21bf',
      31: '0x26a00af444928d689ddec7b4d17c0e4a8c9d407d',
      1337: '0x26a00af444928d689ddec7b4d17c0e4a8c9d407d'
    },
    usdt: {
      30: "0xef213441a85df4d7acbdae0cf78004e1e486bb96",
      31: "0x4cfe225ce54c6609a525768b13f7d87432358c57",
      1337: "0x4cfe225ce54c6609a525768b13f7d87432358c57"
    },
    rif: {
      30: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
      31: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe",
      1337: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
    },
    doc: {
      30: "0xe700691da7b9851f2f35f8b8182c69c53ccad9db",
      31: "0xb2d705097D9f80D47289EFB2a25bc78FEe9D3e80"
    },
    admin1: {
      31: "0x8f63de841e7bccce39faa828128da25f8a93411f",
      1337: "0x8f63de841e7bccce39faa828128da25f8a93411f"
    },
    admin2: {
      31: "0x170346689cc312d8e19959bc68c3ad03e72c9850",
      1337: "0x170346689cc312d8e19959bc68c3ad03e72c9850"
    },
    multiSig: {
      30: "0x2992181d390c5f35a70c8012a8a6a4a6b7603a37",
      31: "0x9760d4a155058f6bec8d9fd8d50222073e57083e",
      1337: "0x9760d4a155058f6bec8d9fd8d50222073e57083e"
    }
  }
};

module.exports = config
