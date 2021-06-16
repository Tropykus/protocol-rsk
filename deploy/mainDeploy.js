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
        baseBorrowRate: parseEther('0.08'),
        multiplier: parseEther('0.03'),
      },
      doc: {
        reserveFactor: parseEther('0.30'),
        collateralFactor: parseEther('0.70'),
        baseBorrowRate: parseEther('0.08'),
        multiplier: parseEther('0.018'),
        jumpMultiplier: parseEther('0.80'),
        kink: parseEther('0.85'),
      },
      usdt: {
        reserveFactor: parseEther('0.30'),
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
        optimal: parseEther('0.5962912017836259'),
        borrowRateSlope: parseEther('0.04'),
        supplyRateSlope: parseEther('0.02'),
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
  const priceOracleProxyDeploy = await priceOracleProxyContract.deploy(deployer.address);
  console.log(`PriceOracleProxy: ${priceOracleProxyDeploy.address}`);
  const unitrollerContract = await ethers.getContractFactory('Unitroller');
  const unitrollerDeployed = await unitrollerContract.deploy();
  console.log(`Unitroller: ${unitrollerDeployed.address}`);
  const comptrollerContract = await ethers.getContractFactory('ComptrollerG6');
  const comptrollerDeployed = await comptrollerContract.deploy();
  console.log(`Comptroller: ${comptrollerDeployed.address}`);

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
  if (chainId !== 31 && chainId !== 30) {
    rifToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test RIF Tropykus', 18, 'tRIF');
  }
  docToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test DOC Tropykus', 18, 'tDOC');
  usdtToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test rUSDT Tropykus', 18, 'trUSDT');
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
  if (chainId !== 31 && chainId !== 30) {
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

  console.log('\n~~~~~~~~~~~~~~~~~~ INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~~');
  const whitePaperInterestRateModel = await ethers.getContractFactory('WhitePaperInterestRateModel');
  const jumpInterestRateModelV2 = await ethers.getContractFactory('JumpRateModelV2');
  const hurricaneInterestRateModel = await ethers.getContractFactory('HurricaneInterestRateModel');
  const { rif, doc, usdt, rbtc } = config.markets;
  const rifInterestRateModel = await whitePaperInterestRateModel.deploy(rif.baseBorrowRate, rif.multiplier);
  console.log(`RIF Interest Rate Model: ${rifInterestRateModel.address}`);
  const docInterestRateModel = await jumpInterestRateModelV2.deploy(doc.baseBorrowRate, doc.multiplier, doc.jumpMultiplier, doc.kink, deployer.address);
  console.log(`DOC Interest Rate Model: ${docInterestRateModel.address}`);
  const usdtInterestRateModel = await jumpInterestRateModelV2.deploy(usdt.baseBorrowRate, usdt.multiplier, usdt.jumpMultiplier, usdt.kink, deployer.address);
  console.log(`USDT Interest Rate Model: ${usdtInterestRateModel.address}`);
  const rbtcInterestRateModel = await hurricaneInterestRateModel.deploy(rbtc.baseBorrowRate, rbtc.promisedBaseReturnRate, rbtc.optimal, rbtc.borrowRateSlope, rbtc.supplyRateSlope);
  console.log(`RBTC Interest Rate Model: ${rbtcInterestRateModel.address}`);
  console.log('~~~~~~~~~~~~~~~~~~ /INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~\n');

  console.log('\n~~~~~~~~~~~~~~~~~~~~ MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~');
  const cErc20Immutable = await ethers.getContractFactory('CErc20Immutable');
  const cRBTCContract = await ethers.getContractFactory('CRBTC');
  const cRIFdeployed = await cErc20Immutable.deploy(rifToken.address, comptrollerDeployed.address, rifInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cRIF', 'cRIF', 18, deployer.address);
  console.log(`cRIF: ${cRIFdeployed.address}`);
  const cDOCdeployed = await cErc20Immutable.deploy(docToken.address, comptrollerDeployed.address, docInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cDOC', 'cDOC', 18, deployer.address);
  console.log(`cDOC: ${cDOCdeployed.address}`);
  const cUSDTdeployed = await cErc20Immutable.deploy(usdtToken.address, comptrollerDeployed.address, usdtInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cUSDT', 'cUSDT', 18, deployer.address);
  console.log(`cUSDT: ${cUSDTdeployed.address}`);
  const cRBTCdeployed = await cRBTCContract.deploy(comptrollerDeployed.address, rbtcInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus cRBTC', 'cRBTC', 18, deployer.address);
  console.log(`cRBTC: ${cRBTCdeployed.address}`);
  console.log('~~~~~~~~~~~~~~~~~~~~ /MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~~\n');

  const maximillionContract = await ethers.getContractFactory('Maximillion');
  const maximillion = await maximillionContract.deploy(cRBTCdeployed.address);
  console.log(`Maximillion: ${maximillion.address}`);
  const tropykusLensContract = await ethers.getContractFactory('TropykusLens');
  const tropykusLens = await tropykusLensContract.deploy();
  console.log(`TropykusLens: ${tropykusLens.address}`);

  console.log('\n~~~~~~~~~~~~~~~~~ UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~');
  const unitroller = await ethers.getContractAt('Unitroller', unitrollerDeployed.address, deployer);
  console.log(`Unitroller: ${unitroller.address}`);
  const comptroller = await ethers.getContractAt('ComptrollerG6', comptrollerDeployed.address, deployer);
  console.log(`Comptroller: ${comptroller.address}`);
  await unitroller._setPendingImplementation(comptroller.address);
  console.log('Unitroller _setPendingImplementation done...');
  await comptroller._become(unitroller.address);
  console.log('Comptroller _become done...');
  await comptroller._setPriceOracle(priceOracleProxyDeploy.address);
  console.log('Comptroller _setPriceOracle done...');
  await comptroller._setCloseFactor(config.closeFactorMantissa);
  console.log('Comptroller _setCloseFactor done...');
  await comptroller._setLiquidationIncentive(config.liquidationIncentiveMantissa);
  console.log('Comptroller _setLiquidationIncentive done...');
  console.log('~~~~~~~~~~~~~~~~~ /UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~\n');

  const priceOracleProxy = await ethers.getContractAt('PriceOracleProxy', priceOracleProxyDeploy.address, deployer);
  await priceOracleProxy.setAdapterToToken(cRIFdeployed.address, rifPriceOracleAdapterMoC.address);
  console.log('cRIF adapter setted...');
  await priceOracleProxy.setAdapterToToken(cDOCdeployed.address, docPriceOracleAdapterMoC.address);
  console.log('cDOC adapter setted...');
  await priceOracleProxy.setAdapterToToken(cUSDTdeployed.address, usdtPriceOracleAdapterMoC.address);
  console.log('cUSDT adapter setted...');
  await priceOracleProxy.setAdapterToToken(cRBTCdeployed.address, rbtcPriceOracleAdapterMoC.address);
  console.log('cRBTC adapter setted...\n');

  await comptroller._supportMarket(cRIFdeployed.address);
  console.log('cRIF market supported...');
  await comptroller._supportMarket(cDOCdeployed.address);
  console.log('cDOC market supported...');
  await comptroller._supportMarket(cUSDTdeployed.address);
  console.log('cUSDT market supported...');
  await comptroller._supportMarket(cRBTCdeployed.address);
  console.log('cRBTC market supported...\n');

  await comptroller._setCollateralFactor(cRIFdeployed.address, rif.collateralFactor);
  console.log(`cRIF collateral factor: ${Number(rif.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cDOCdeployed.address, doc.collateralFactor);
  console.log(`cDOC collateral factor: ${Number(doc.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cUSDTdeployed.address, usdt.collateralFactor);
  console.log(`cUSDT collateral factor: ${Number(usdt.collateralFactor) / 1e18}`);
  await comptroller._setCollateralFactor(cRBTCdeployed.address, rbtc.collateralFactor);
  console.log(`cRBTC collateral factor: ${Number(rbtc.collateralFactor) / 1e18}\n`);

  await comptroller._setCompRate(config.compSpeed);
  console.log(`Comp Rate: ${config.compSpeed}`);

  const cRIF = await ethers.getContractAt('CErc20Immutable', cRIFdeployed.address, deployer);
  const cDOC = await ethers.getContractAt('CErc20Immutable', cDOCdeployed.address, deployer);
  const cUSDT = await ethers.getContractAt('CErc20Immutable', cUSDTdeployed.address, deployer);
  const cRBTC = await ethers.getContractAt('CRBTC', cRBTCdeployed.address, deployer);
  await cRIF._setReserveFactor(rif.reserveFactor);
  console.log(`cRIF reserveFactor: ${Number(rif.reserveFactor) / 1e18}`);
  await cDOC._setReserveFactor(doc.reserveFactor);
  console.log(`cDOC reserveFactor: ${Number(doc.reserveFactor) / 1e18}`);
  await cUSDT._setReserveFactor(usdt.reserveFactor);
  console.log(`cUSDT reserveFactor: ${Number(usdt.reserveFactor) / 1e18}`);
  await cRBTC._setReserveFactor(rbtc.reserveFactor);
  console.log(`cRBTC reserveFactor: ${Number(rbtc.reserveFactor) / 1e18}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
