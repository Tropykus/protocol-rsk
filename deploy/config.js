const [deployer] = await ethers.getSigners();

const anni = '';
const david = '0x53Ec0aF115619c536480C95Dec4a065e27E6419F';
const diego = '0x3024074Eaa70F3D4c071c0Da9D0c8eEc50232c47';
const mauro = '';
const mesi = '0x158be1Cadb19163025C485E0f7f841F212429aE1';

const admins = [anni, david, diego, mauro, mesi].map(a => a.toLowerCase());

const config = {
  multisigMinimumVote: 2,
  initialExchangeRateMantissa: parseEther('0.02'),
  liquidationIncentiveMantissa: parseEther('0.07'),
  closeFactorMantissa: parseEther('0.5'),
  compSpeed: 0,
  markets: {
    rif: {
      interestRate: {
        reserveFactor: parseEther('0.2'),
        collateralFactor: parseEther('0.5'),
        baseBorrowRate: parseEther('0.015'),
        multiplier: parseEther('0.01'),
      },
      oracleAddress: '',
      underlying: '',
    },
    doc: {
      reserveFactor: parseEther('0.05'),
      collateralFactor: parseEther('0.8'),
      baseBorrowRate: parseEther('0.0125'),
      multiplier: parseEther('0.11'),
      jumpMultiplier: parseEther('0.7'),
      kink: parseEther('0.9'),
    },
    rdoc: {
      reserveFactor: parseEther('0.50'),
      collateralFactor: parseEther('0.75'),
      baseBorrowRate: parseEther('0.001'),
      multiplier: parseEther('0.00470588235'),
      jumpMultiplier: parseEther('0.00588'),
      kink: parseEther('0.85'),
    },
    usdt: {
      reserveFactor: parseEther('0.07'),
      collateralFactor: parseEther('0.8'),
      baseBorrowRate: parseEther('0.0125'),
      multiplier: parseEther('0.05'),
      jumpMultiplier: parseEther('0.7'),
      kink: parseEther('0.8'),
    },
    rbtc: {
      reserveFactor: parseEther('0.20'),
      collateralFactor: parseEther('0.6'),
      baseBorrowRate: parseEther('0.04'),
      multiplier: parseEther('0.1'),
    },
    sat: {
      reserveFactor: parseEther('0.30'),
      collateralFactor: parseEther('0.50'),
      baseBorrowRate: parseEther('0.08'),
      promisedBaseReturnRate: parseEther('0.04'),
      optimal: parseEther('0.5'),
      borrowRateSlope: parseEther('0.04'),
      supplyRateSlope: parseEther('0.02'),
      initialSubsidy: parseEther('0.05'),
    },
  },
};

module.exports = {
  admins,
  config,
  deployer,
};