const networks = {
  hardhat: {
    blockGasLimit: 200000000,
    gas: 6800000,
    allowUnlimitedContractSize: true,
    chainId: 1337
  },
  ganache: {
    url: 'http://127.0.0.1:8545',
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: false,
    chainId: 1337
  },
  rskregtest: {
    url: 'http://127.0.0.1:4444',
    blockGasLimit: 68000000,
    allowUnlimitedContractSize: false,
    chainId: 33
  }
}

if (process.env.HDWALLET_MNEMONIC) {
  networks.rsktestnet = {
    url: 'https://rsktestnet.tropykus.finance/rsk',
    blockGasLimit: 6800000,
    gas: 6800000,
    allowUnlimitedContractSize: false,
    chainId: 31,
    timeout: 300000,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.rskmainnet = {
    url: 'https://rsknode-1.tropykus.finance/rsk',
    blockGasLimit: 6800000,
    gas: 6800000,
    allowUnlimitedContractSize: false,
    chainId: 30,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
} else {
  console.warn('No hdwallet available for testnet and mainnet')
}

module.exports = networks