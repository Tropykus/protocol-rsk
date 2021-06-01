const { namedAccounts } = require('../hardhat.config');

const getChainId = (chainName) => {
  switch (chainName) {
    case 'rskmainnet':
      return 30;
    case 'rsktestnet':
      return 31;
    case 'rskregtest':
      return 33;
    case 'ganache':
      return 1337;
    case 'hardhat':
      return 1337;
    default:
      return 'Unknown';
  }
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const parseEther = ethers.utils.parseEther;
  const config = {
    initialExchangeRateMantissa: parseEther('0.02'),
    liquidationIncentiveMantissa: parseEther('0.07'),
    closeFactorMantissa: parseEther('0.5'),
    compSpeed: 0,
    markets: {
      rif: {
        reserveFactor: parseEther('0.25'),
        collateralFactor: parseEther('0.65'),
        baseBorrowRate: parseEther('0.07'),
        multiplier: parseEther('0.03'),
      },
      doc: {
        reserveFactor: parseEther('0.20'),
        collateralFactor: parseEther('0.70'),
        baseBorrowRate: parseEther('0.08'),
        multiplier: parseEther('0.018'),
        jumpMultiplier: parseEther('0.75'),
        kink: parseEther('0.85'),
      },
      usdt: {
        reserveFactor: parseEther('0.15'),
        collateralFactor: parseEther('0.75'),
        baseBorrowRate: parseEther('0.1'),
        multiplier: parseEther('0.015'),
        jumpMultiplier: parseEther('1'),
        kink: parseEther('0.80'),
      },
      rbtc: {
        reserveFactor: parseEther('0.30'),
        collateralFactor: parseEther('0.50'),
        baseBorrowRate: parseEther('0.08'),
        promisedBaseReturnRate: parseEther('0.05'),
        optimal: parseEther('0.65'),
        borrowRateSlope: parseEther('0.015'),
        supplyRateSlope: parseEther('0.018'),
      },
    },
  };

  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  console.log('Tropykus Contracts - Deploy Script');
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  const chainId = getChainId(process.env.HARDHAT_NETWORK);
  console.log(`Network: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  const multiSigWalletContract = await ethers.getContractFactory('MultiSigWallet');
  const multiSig = await multiSigWalletContract.deploy([deployer.address], 1);
  console.log(`MultiSig: ${multiSig.address}`);
  const priceOracleProxyContract = await ethers.getContractFactory('PriceOracleProxy');
  const priceOracleProxy = await priceOracleProxyContract.deploy(deployer.address);
  console.log(`PriceOracleProxy: ${priceOracleProxy.address}`);
  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ TOKENS ~~~~~~~~~~~~~~~~~~~~~~~~');

  const standardTokenContract = await ethers.getContractFactory('StandardToken');
  let rifToken = {
    address: namedAccounts.rif[chainId],
  };
  let docToken = {
    address: namedAccounts.doc[chainId],
  };
  let usdtToken = {
    address: namedAccounts.usdt[chainId],
  };
  if (chainId !== 31 || chainId !== 30) {
    rifToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test RIF Tropykus', 18, 'tRIF');
    docToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test DOC Tropykus', 18, 'tDOC');
    usdtToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test rUSDT Tropykus', 18, 'trUSDT');
  }
  console.log(`RIF: ${rifToken.address}`);
  console.log(`DOC: ${docToken.address}`);
  console.log(`USDT: ${usdtToken.address}`);
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /TOKENS ~~~~~~~~~~~~~~~~~~~~~~~~\n');

  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ ORACLES ~~~~~~~~~~~~~~~~~~~~~~~~');

  const mockPriceProviderMoC = await ethers.getContractFactory('MockPriceProviderMoC');
  let rifOracle = {
    address: namedAccounts.rifOracle[chainId],
  };
  let rbtcOracle = {
    address: namedAccounts.rbtcOracle[chainId],
  };
  if (chainId !== 31 || chainId !== 30) {
    rifOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('0.33'));
    rbtcOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('34000'));
  }
  console.log(`RIF Oracle: ${rifOracle.address}`);
  console.log(`RBTC Oracle: ${rbtcOracle.address}`);
  const docOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('1.1'));
  console.log(`DOC Oracle: ${docOracle.address}`);
  const usdtOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('1.05'));
  console.log(`USDT Oracle: ${usdtOracle.address}`);
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /ORACLES ~~~~~~~~~~~~~~~~~~~~~~~~\n');
  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ ADAPTERS ~~~~~~~~~~~~~~~~~~~~~~~~');

  const priceOracleAdapterMoc = await ethers.getContractFactory('PriceOracleAdapterMoc');
  const rbtcPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, rbtcOracle.address);
  console.log(`RBTC Adapter: ${rbtcPriceOracleAdapterMoC.address}`);
  const rifPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, rifOracle.address);
  console.log(`RIF Adapter: ${rifPriceOracleAdapterMoC.address}`);
  const docPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, docOracle.address);
  console.log(`DOC Adapter: ${docPriceOracleAdapterMoC.address}`);
  const usdtPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, usdtOracle.address);
  console.log(`USDT Adapter: ${usdtPriceOracleAdapterMoC.address}`);
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /ADAPTERS ~~~~~~~~~~~~~~~~~~~~~~~~\n');
  console.log('\n~~~~~~~~~~~~~~~~~ UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~');

  const unitrollerContract = await ethers.getContractFactory('Unitroller');
  const unitroller = await unitrollerContract.deploy();
  console.log(`Unitroller: ${unitroller.address}`);
  const comptrollerContract = await ethers.getContractFactory('Comptroller');
  const comptroller = await comptrollerContract.deploy();
  console.log(`Comptroller: ${comptroller.address}`);
  await unitroller._setPendingImplementation(comptroller.address);
  await comptroller._become(unitroller.address);
  await comptroller._setPriceOracle(priceOracleProxy.address);
  await comptroller._setCloseFactor(config.closeFactorMantissa);
  await comptroller._setLiquidationIncentive(config.liquidationIncentiveMantissa);
  console.log('~~~~~~~~~~~~~~~~~ /UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~\n');
  console.log('\n~~~~~~~~~~~~~~~~~~ INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~~');

  const whitePaperInterestRateModel = await ethers.getContractFactory('WhitePaperInterestRateModel');
  const jumpInterestRateModelV2 = await ethers.getContractFactory('JumpRateModelV2');
  const hurricaneInterestRateModel = await ethers.getContractFactory('HurricaneInterestRateModel');
  const { rif, doc, usdt, rbtc } = config.markets;
  const rifInterestRateModel = await whitePaperInterestRateModel
    .deploy(rif.baseBorrowRate, rif.multiplier);
  console.log(`RIF Interest Rate Model: ${rifInterestRateModel.address}`);
  const docInterestRateModel = await jumpInterestRateModelV2
    .deploy(doc.baseBorrowRate, doc.multiplier, doc.jumpMultiplier, doc.kink, deployer.address);
  console.log(`DOC Interest Rate Model: ${docInterestRateModel.address}`);
  const usdtInterestRateModel = await jumpInterestRateModelV2
    .deploy(usdt.baseBorrowRate, usdt.multiplier, usdt.jumpMultiplier, usdt.kink, deployer.address);
  console.log(`USDT Interest Rate Model: ${usdtInterestRateModel.address}`);
  const rbtcInterestRateModel = await hurricaneInterestRateModel
    .deploy(rbtc.baseBorrowRate, rbtc.promisedBaseReturnRate, rbtc.optimal, rbtc.borrowRateSlope, rbtc.supplyRateSlope);
  console.log(`RBTC Interest Rate Model: ${rbtcInterestRateModel.address}`);
  console.log('~~~~~~~~~~~~~~~~~~ /INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~\n');
  console.log('\n~~~~~~~~~~~~~~~~~~~~ MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~');

  const cErc20Immutable = await ethers.getContractFactory('CErc20Immutable');
  const cRBTCContract = await ethers.getContractFactory('CRBTC');
  const cRIF = await cErc20Immutable
    .deploy(rifToken.address, comptroller.address, rifInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cRIF', 'cRIF', 18, deployer.address);
  console.log(`cRIF: ${cRIF.address}`);
  const cDOC = await cErc20Immutable
    .deploy(docToken.address, comptroller.address, docInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cDOC', 'cDOC', 18, deployer.address);
  console.log(`cDOC: ${cDOC.address}`);
  const cUSDT = await cErc20Immutable
    .deploy(usdtToken.address, comptroller.address, usdtInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cUSDT', 'cUSDT', 18, deployer.address);
  console.log(`cUSDT: ${cUSDT.address}`);
  const cRBTC = await cRBTCContract
    .deploy(comptroller.address, rbtcInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cRBTC', 'cRBTC', 18, deployer.address);
  console.log(`cRBTC: ${cRBTC.address}\n`);
  await priceOracleProxy
    .setAdapterToToken(cRIF.address, rifPriceOracleAdapterMoC.address);

  console.log('cRIF adapter setted...');
  await priceOracleProxy
    .setAdapterToToken(cDOC.address, docPriceOracleAdapterMoC.address);
  console.log('cDOC adapter setted...');
  await priceOracleProxy
    .setAdapterToToken(cUSDT.address, docPriceOracleAdapterMoC.address);
  console.log('cUSDT adapter setted...');
  await priceOracleProxy
    .setAdapterToToken(cRBTC.address, docPriceOracleAdapterMoC.address);
  console.log('cRBTC adapter setted...\n');
  await comptroller._supportMarket(cRIF.address);

  console.log('cRIF market supported...');
  await comptroller._supportMarket(cDOC.address);
  console.log('cDOC market supported...');
  await comptroller._supportMarket(cUSDT.address);
  console.log('cUSDT market supported...');
  await comptroller._supportMarket(cRBTC.address);
  console.log('cRBTC market supported...\n');
  await comptroller._setCollateralFactor(cRIF.address, rif.collateralFactor);

  console.log(`cRIF collateral factor: ${Number(rif.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cDOC.address, doc.collateralFactor);
  console.log(`cDOC collateral factor: ${Number(doc.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cUSDT.address, usdt.collateralFactor);
  console.log(`cUSDT collateral factor: ${Number(usdt.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cRBTC.address, rbtc.collateralFactor);
  console.log(`cRBTC collateral factor: ${Number(rbtc.collateralFactor) / 1e18}\n`);
  await comptroller._setCompSpeed(cRIF.address, config.compSpeed);

  console.log(`cRIF Comp Speed: ${config.compSpeed}`);
  await comptroller._setCompSpeed(cDOC.address, config.compSpeed);
  console.log(`cDOC Comp Speed: ${config.compSpeed}`);
  await comptroller._setCompSpeed(cUSDT.address, config.compSpeed);
  console.log(`cUSDT Comp Speed: ${config.compSpeed}`);
  await comptroller._setCompSpeed(cRBTC.address, config.compSpeed);
  console.log(`cRBTC Comp Speed: ${config.compSpeed}\n`);
  await cRIF._setReserveFactor(rif.reserveFactor);

  console.log(`cRIF reserveFactor: ${Number(rif.reserveFactor) / 1e18}`);
  await cDOC._setReserveFactor(doc.reserveFactor);
  console.log(`cDOC reserveFactor: ${Number(doc.reserveFactor) / 1e18}`);
  await cUSDT._setReserveFactor(usdt.reserveFactor);
  console.log(`cUSDT reserveFactor: ${Number(usdt.reserveFactor) / 1e18}`);
  await cRBTC._setReserveFactor(rbtc.reserveFactor);
  console.log(`cRBTC reserveFactor: ${Number(rbtc.reserveFactor) / 1e18}`);
  console.log('~~~~~~~~~~~~~~~~~~~~ /MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~~\n');

  const maximillionContract = await ethers.getContractFactory('Maximillion');
  const maximillion = await maximillionContract.deploy(cRBTC.address);
  console.log(`Maximillion: ${maximillion.address}`);
  const tropykusLensContract = await ethers.getContractFactory('TropykusLens');
  const tropykusLens = await tropykusLensContract.deploy();
  console.log(`TropykusLens: ${tropykusLens.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
