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
      30: '0x504EfCadfB020d6Bbaec8a5C5bb21453719d0e00',
      31: '0x9d4b2c05818a0086e641437fcb64ab6098c7bbec'
    },
    rbtcOracle: {
      30: '0x7b19bb8e6c5188ec483b784d6fb5d807a77b21bf',
      31: '0x26a00af444928d689ddec7b4d17c0e4a8c9d407d'
    },
    usdt: {
      30: "0xef213441a85df4d7acbdae0cf78004e1e486bb96",
      31: "0x4cfe225ce54c6609a525768b13f7d87432358c57"
    },
    rif: {
      30: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
      31: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
    },
    admin1: {
      30: "0x8F63De841e7bccCe39FaA828128dA25f8A93411f",
      31: "0x8F63De841e7bccCe39FaA828128dA25f8A93411f"
    },
    admin2: {
      30: "0x170346689cC312D8E19959Bc68c3AD03E72C9850",
      31: "0x170346689cC312D8E19959Bc68c3AD03E72C9850"
    },
  }
};

module.exports = config
