const networks = {
  buidlerevm: {
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: true,
    chainId: 31337
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
    url: 'https://public-node.testnet.rsk.co',
    blockGasLimit: 68000000,
    allowUnlimitedContractSize: false,
    chainId: 31,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.rskmainnet = {
    url: 'https://public-node.rsk.co',
    blockGasLimit: 68000000,
    allowUnlimitedContractSize: false,
    chainId: 30,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
} else {
  console.warn('No hdwallet available for testnets')
}

module.exports = networks