const admins = ['ADDRESS'].map(a => a.toLowerCase());

const { parseEther } = ethers.utils;

const config = {
  multisigRequieredVotes: 0,
  initialExchangeRateMantissa: parseEther('#.##'),
  liquidationIncentiveMantissa: parseEther('#.##'),
  closeFactorMantissa: parseEther('#.##'),
  compSpeed: 0,
  markets: {
    token: { // sat rbtc doc
      oracle: {
        address: '0x000',
        price: parseEther('###.##'),
      },
      adapterAddress: '0x000',
      interestRate: {
        address: '0x000',
        model: 'HURRICANE', // 'WHITE' 'CTOKEN' JUMP'
        baseBorrowRate: parseEther('#.##'),
        promisedBaseReturnRate: parseEther('#.##'),
        optimal: parseEther('#.##'),
        borrowRateSlope: parseEther('#.##'),
        supplyRateSlope: parseEther('#.##'),
      },
      kToken: {
        address: '0x000',
        type: 'CRBTC', // 'CDOC' 'CTOKEN' 'CRBTC'
      },
      collateralFactor: parseEther('#.##'),
      reserveFactor: parseEther('#.##'),
      initialSubsidy: parseEther('#.##'),
      threshold: parseEther('#.##'),
    },
  },
};

module.exports = {
  admins,
  config,
};
