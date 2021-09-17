const { ethers } = require("hardhat");
const { namedAccounts } = require('../../hardhat.config');

describe('Repay Borrow Test', async () => {
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
          reserveFactor: parseEther('0.50'),
          collateralFactor: parseEther('0.70'),
          baseBorrowRate: parseEther('0.08'),
          multiplier: parseEther('0.02'),
          jumpMultiplier: parseEther('0.55'),
          kink: parseEther('0.90'),
        },
        usdt: {
          reserveFactor: parseEther('0.55'),
          collateralFactor: parseEther('0.75'),
          baseBorrowRate: parseEther('0.08'),
          multiplier: parseEther('0.01'),
          jumpMultiplier: parseEther('0.35'),
          kink: parseEther('0.80'),
        },
        rbtc: {
          reserveFactor: parseEther('0.20'),
          collateralFactor: parseEther('0.75'),
          baseBorrowRate: parseEther('0.02'),
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
        },
      },
    };

    // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    // console.log('Tropykus Contracts - Deploy Script');
    // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
    // const chainId = await getChainId(process.env.HARDHAT_NETWORK);
    // console.log(`Network = ${chainId}`);
    // console.log(`Deployer = ${deployer.address}`);
    const multiSigWalletContract = await ethers.getContractFactory('MultiSigWallet');
    // const multiSig = await multiSigWalletContract.deploy([deployer.address], 1);
    // console.log(`MultiSig = ${multiSig.address}`);
    // const priceOracleProxyContract = await ethers.getContractFactory('PriceOracleProxy');
    // const priceOracleProxyDeploy = await priceOracleProxyContract.deploy(deployer.address);
    // console.log(`PriceOracleProxy = '${priceOracleProxyDeploy.address}';`);
    // const unitrollerContract = await ethers.getContractFactory('Unitroller');
    // const unitrollerDeployed = await unitrollerContract.deploy();
    // // console.log(`Unitroller = ${unitrollerDeployed.address}`);
    // const comptrollerContract = await ethers.getContractFactory('ComptrollerG6');
    // const comptrollerDeployed = await comptrollerContract.deploy();
    // // console.log(`Comptroller = ${comptrollerDeployed.address}`);
  
    // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ TOKENS ~~~~~~~~~~~~~~~~~~~~~~~~');
    // const standardTokenContract = await ethers.getContractFactory('StandardToken');
    // let rifToken = {
    //   address: namedAccounts.rif[chainId],
    // };
    // let docToken = {
    //   address: namedAccounts.doc[chainId],
    // };
    // let usdtToken = {
    //   address: namedAccounts.usdt[chainId],
    // };
    // if (chainId !== 31 && chainId !== 30) {
    //   rifToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test RIF Tropykus', 18, 'tRIF');
    // }
    // docToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test DOC Tropykus', 18, 'tDOC');
    // usdtToken = await standardTokenContract.deploy(parseEther('2000000'), 'Test rUSDT Tropykus', 18, 'trUSDT');
    // console.log(`RIF = '${rifToken.address}';`);
    // console.log(`DOC = '${docToken.address}';`);
    // console.log(`USDT = '${usdtToken.address}';`);
    // // console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /TOKENS ~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
    // // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ ORACLES ~~~~~~~~~~~~~~~~~~~~~~~~');
    // const mockPriceProviderMoC = await ethers.getContractFactory('MockPriceProviderMoC');
    // let rifOracle = {
    //   address: namedAccounts.rifOracle[chainId],
    // };
    // let rbtcOracle = {
    //   address: namedAccounts.rbtcOracle[chainId],
    // };
    // if (chainId !== 31 && chainId !== 30) {
    //   rifOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('0.33'));
    //   rbtcOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('34000'));
    // }
    // const docOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('1.1'));
    // const usdtOracle = await mockPriceProviderMoC.deploy(deployer.address, parseEther('1.05'));
    // console.log(`RIFOracle = '${rifOracle.address}';`);
    // console.log(`RBTCOracle = '${rbtcOracle.address}';`);
    // console.log(`DOCOracle = '${docOracle.address}';`);
    // console.log(`USDTOracle = '${usdtOracle.address}';`);
    // // console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /ORACLES ~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
    // //console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~ ADAPTERS ~~~~~~~~~~~~~~~~~~~~~~~~');
    // const priceOracleAdapterMoc = await ethers.getContractFactory('PriceOracleAdapterMoc');
    // const rbtcPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, rbtcOracle.address);
    // const satPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, rbtcOracle.address);
    // const rifPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, rifOracle.address);
    // const docPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, docOracle.address);
    // const usdtPriceOracleAdapterMoC = await priceOracleAdapterMoc.deploy(deployer.address, usdtOracle.address);
    // console.log(`RBTCAdapter = '${rbtcPriceOracleAdapterMoC.address}';`);
    // console.log(`SATAdapter = '${satPriceOracleAdapterMoC.address}';`);
    // console.log(`RIFAdapter = '${rifPriceOracleAdapterMoC.address}';`);
    // console.log(`DOCAdapter = '${docPriceOracleAdapterMoC.address}';`);
    // console.log(`USDTAdapter = '${usdtPriceOracleAdapterMoC.address}';`);
    // // console.log('~~~~~~~~~~~~~~~~~~~~~~~~ /ADAPTERS ~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
    // // console.log('\n~~~~~~~~~~~~~~~~~~ INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~~');
    // const whitePaperInterestRateModel = await ethers.getContractFactory('WhitePaperInterestRateModel');
    // const jumpInterestRateModelV2 = await ethers.getContractFactory('JumpRateModelV2');
    // const hurricaneInterestRateModel = await ethers.getContractFactory('HurricaneInterestRateModel');
    // const { rif, doc, usdt, rbtc, sat } = config.markets;
    // const rifInterestRateModel = await whitePaperInterestRateModel.deploy(rif.baseBorrowRate, rif.multiplier);
    // const docInterestRateModel = await jumpInterestRateModelV2.deploy(doc.baseBorrowRate, doc.multiplier, doc.jumpMultiplier, doc.kink, deployer.address);
    // const usdtInterestRateModel = await jumpInterestRateModelV2.deploy(usdt.baseBorrowRate, usdt.multiplier, usdt.jumpMultiplier, usdt.kink, deployer.address);
    // const rbtcInterestRateModel = await whitePaperInterestRateModel.deploy(rbtc.baseBorrowRate, rbtc.multiplier);
    // const satInterestRateModel = await hurricaneInterestRateModel.deploy(sat.baseBorrowRate, sat.promisedBaseReturnRate, sat.optimal, sat.borrowRateSlope, sat.supplyRateSlope);
    // console.log(`RIFInterestRateModel = '${rifInterestRateModel.address}';`);
    // console.log(`DOCInterestRateModel = '${docInterestRateModel.address}';`);
    // console.log(`USDTInterestRateModel = '${usdtInterestRateModel.address}';`);
    // console.log(`RBTCInterestRateModel = '${rbtcInterestRateModel.address}';`);
    // console.log(`SATInterestRateModel = '${satInterestRateModel.address}';`);
    // // console.log('~~~~~~~~~~~~~~~~~~ /INTEREST RATE MODELS ~~~~~~~~~~~~~~~~~\n');
  
    // // console.log('\n~~~~~~~~~~~~~~~~~~~~ MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~');
    // const cErc20Immutable = await ethers.getContractFactory('CErc20Immutable');
    // const cRBTCContract = await ethers.getContractFactory('CRBTC');
    // const cRIFdeployed = await cErc20Immutable.deploy(rifToken.address, comptrollerDeployed.address, rifInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus kRIF', 'kRIF', 18, deployer.address);
    // const cDOCdeployed = await cErc20Immutable.deploy(docToken.address, comptrollerDeployed.address, docInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus kDOC', 'kDOC', 18, deployer.address);
    // const cUSDTdeployed = await cErc20Immutable.deploy(usdtToken.address, comptrollerDeployed.address, usdtInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus kUSDT', 'kUSDT', 18, deployer.address);
    // const cRBTCdeployed = await cRBTCContract.deploy(comptrollerDeployed.address, rbtcInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus kRBTC', 'kRBTC', 18, deployer.address);
    // const cSATdeployed = await cRBTCContract.deploy(comptrollerDeployed.address, satInterestRateModel.address, config.initialExchangeRateMantissa, 'Tropykus kSAT', 'kSAT', 18, deployer.address);
    // console.log(`cRIF = '${cRIFdeployed.address}';`);
    // console.log(`cDOC = '${cDOCdeployed.address}';`);
    // console.log(`cUSDT = '${cUSDTdeployed.address}';`);
    // console.log(`cRBTC = '${cRBTCdeployed.address}';`);
    // console.log(`cSAT = '${cSATdeployed.address}';`);
    
    // // console.log('~~~~~~~~~~~~~~~~~~~~ /MARKETS cTOKENS ~~~~~~~~~~~~~~~~~~~~\n');
  
    // const tropykusLensContract = await ethers.getContractFactory('TropykusLens');
    // const tropykusLens = await tropykusLensContract.deploy();
    // console.log(`TropykusLens = '${tropykusLens.address}';`);
  
    // // console.log('\n~~~~~~~~~~~~~~~~~ UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~');
    // const unitroller = await ethers.getContractAt('Unitroller', unitrollerDeployed.address, deployer);
    // console.log(`Unitroller = '${unitroller.address}';`);
    // const comptroller = await ethers.getContractAt('ComptrollerG6', comptrollerDeployed.address, deployer);
    // console.log(`Comptroller = '${comptroller.address}';`);
    // await unitroller._setPendingImplementation(comptroller.address);
    // // console.log('Unitroller _setPendingImplementation done...');
    // await comptroller._become(unitroller.address);
    // // console.log('Comptroller _become done...');
    // await comptroller._setPriceOracle(priceOracleProxyDeploy.address);
    // // console.log('Comptroller _setPriceOracle done...');
    // await comptroller._setCloseFactor(config.closeFactorMantissa);
    // // console.log('Comptroller _setCloseFactor done...');
    // await comptroller._setLiquidationIncentive(config.liquidationIncentiveMantissa);
    // // console.log('Comptroller _setLiquidationIncentive done...');
    // // console.log('~~~~~~~~~~~~~~~~~ /UNITROLLER & COMPTROLLER ~~~~~~~~~~~~~~~~\n');
  
    // const priceOracleProxy = await ethers.getContractAt('PriceOracleProxy', priceOracleProxyDeploy.address, deployer);
    // await priceOracleProxy.setAdapterToToken(cRIFdeployed.address, rifPriceOracleAdapterMoC.address);
    // // console.log('cRIF adapter setted...');
    // await priceOracleProxy.setAdapterToToken(cDOCdeployed.address, docPriceOracleAdapterMoC.address);
    // // console.log('cDOC adapter setted...');
    // await priceOracleProxy.setAdapterToToken(cUSDTdeployed.address, usdtPriceOracleAdapterMoC.address);
    // // console.log('cUSDT adapter setted...');
    // await priceOracleProxy.setAdapterToToken(cRBTCdeployed.address, rbtcPriceOracleAdapterMoC.address);
    // await priceOracleProxy.setAdapterToToken(cSATdeployed.address, satPriceOracleAdapterMoC.address);
    // // console.log('cRBTC adapter setted...\n');
  
    // await comptroller._supportMarket(cRIFdeployed.address);
    // // console.log('cRIF market supported...');
    // await comptroller._supportMarket(cDOCdeployed.address);
    // // console.log('cDOC market supported...');
    // await comptroller._supportMarket(cUSDTdeployed.address);
    // // console.log('cUSDT market supported...');
    // await comptroller._supportMarket(cRBTCdeployed.address);
    // await comptroller._supportMarket(cSATdeployed.address);
    // // console.log('cRBTC market supported...\n');
  
    // await comptroller._setCollateralFactor(cRIFdeployed.address, rif.collateralFactor);
    // // console.log(`cRIF collateral factor: ${Number(rif.collateralFactor) / 1e18}`);
    // await comptroller._setCollateralFactor(cDOCdeployed.address, doc.collateralFactor);
    // // console.log(`cDOC collateral factor: ${Number(doc.collateralFactor) / 1e18}`);
    // await comptroller._setCollateralFactor(cUSDTdeployed.address, usdt.collateralFactor);
    // // console.log(`cUSDT collateral factor: ${Number(usdt.collateralFactor) / 1e18}`);
    // await comptroller._setCollateralFactor(cRBTCdeployed.address, rbtc.collateralFactor);
    // await comptroller._setCollateralFactor(cSATdeployed.address, sat.collateralFactor);
    // // console.log(`cRBTC collateral factor: ${Number(rbtc.collateralFactor) / 1e18}\n`);
  
    // await comptroller._setCompRate(config.compSpeed);
    // // console.log(`Comp Rate: ${config.compSpeed}`);
  
    // const cRIF = await ethers.getContractAt('CErc20Immutable', cRIFdeployed.address, deployer);
    // const cDOC = await ethers.getContractAt('CErc20Immutable', cDOCdeployed.address, deployer);
    // const cUSDT = await ethers.getContractAt('CErc20Immutable', cUSDTdeployed.address, deployer);
    // const cRBTC = await ethers.getContractAt('CRBTC', cRBTCdeployed.address, deployer);
    // const cSAT = await ethers.getContractAt('CRBTC', cSATdeployed.address, deployer);
    // await cRIF._setReserveFactor(rif.reserveFactor);
    // // console.log(`cRIF reserveFactor: ${Number(rif.reserveFactor) / 1e18}`);
    // await cDOC._setReserveFactor(doc.reserveFactor);
    // // console.log(`cDOC reserveFactor: ${Number(doc.reserveFactor) / 1e18}`);
    // await cUSDT._setReserveFactor(usdt.reserveFactor);
    // // console.log(`cUSDT reserveFactor: ${Number(usdt.reserveFactor) / 1e18}`);
    // await cRBTC._setReserveFactor(rbtc.reserveFactor);
    // await cSAT._setReserveFactor(sat.reserveFactor);
    // // console.log(`cRBTC reserveFactor: ${Number(rbtc.reserveFactor) / 1e18}`);
});
