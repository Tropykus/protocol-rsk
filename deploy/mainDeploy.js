const fs = require('fs');
const { admins, config } = require('./config');
const { parseEther } = ethers.utils;

async function main() {
  const initialDate = new Date();
  const [deployer] = await ethers.getSigners();
  let data = '';
  console.log('deployer', deployer.address);
  const multiSigWalletContract = await ethers.getContractFactory('MultiSigWallet');
  console.log(`Multisig. requieredVotes: ${config.multisigRequieredVotes}\nadmins: ${admins}`);
  const multiSig = await multiSigWalletContract.deploy(admins, config.multisigRequieredVotes);
  console.log(`Multisig tx: ${multiSig.deployTransaction.hash}`);
  await multiSig.deployTransaction.wait();
  console.log(`MultiSig = '${multiSig.address.toLowerCase()}'`);
  data += `MultiSig = '${multiSig.address.toLowerCase()}';\n`
  fs.writeFileSync('result', data);

  const priceOracleProxyContract = await ethers.getContractFactory('PriceOracleProxy');
  const priceOracleProxyDeploy = await priceOracleProxyContract.deploy(deployer.address);
  console.log(`PriceOracleProxy tx: ${priceOracleProxyDeploy.deployTransaction.hash}`);
  await priceOracleProxyDeploy.deployTransaction.wait();
  console.log(`PriceOracleProxy = '${priceOracleProxyDeploy.address.toLowerCase()}';`);
  data += `PriceOracleProxy = '${priceOracleProxyDeploy.address.toLowerCase()}';\n`
  fs.writeFileSync('result', data);

  const unitrollerContract = await ethers.getContractFactory('Unitroller');
  const unitrollerDeployed = await unitrollerContract.deploy();
  console.log(`Unitroller tx: ${unitrollerDeployed.deployTransaction.hash}`);
  await unitrollerDeployed.deployTransaction.wait();
  console.log(`Unitroller = '${unitrollerDeployed.address.toLowerCase()}';`);
  data += `Unitroller = '${unitrollerDeployed.address.toLowerCase()}';\n`
  fs.writeFileSync('result', data);

  const comptrollerContract = await ethers.getContractFactory('ComptrollerG6');
  const comptrollerDeployed = await comptrollerContract.deploy();
  console.log(`Comptroller tx: ${comptrollerDeployed.deployTransaction.hash}`);
  await comptrollerDeployed.deployTransaction.wait();
  console.log(`Comptroller = '${comptrollerDeployed.address.toLowerCase()}';`);
  data += `Comptroller = '${comptrollerDeployed.address.toLowerCase()}';\n`
  fs.writeFileSync('result', data);

  // SETUPS
  const priceOracleProxy = await ethers.getContractAt('PriceOracleProxy', priceOracleProxyDeploy.address, deployer);
  const unitroller = await ethers.getContractAt('Unitroller', unitrollerDeployed.address, deployer);
  const comptroller = await ethers.getContractAt('ComptrollerG6', comptrollerDeployed.address, deployer);

  await unitroller._setPendingImplementation(comptroller.address.toLowerCase())
    .then((tx) => {
      console.log(`Unitroller set pending implementation tx: ${tx.hash}`);
      return tx.wait();
    });
  console.log(`Unitroller set pending implementation`);
  await comptroller._become(unitroller.address.toLowerCase()).then((tx) => {
    console.log(`Comptroller become tx: ${tx.hash}`);
    return tx.wait();
  });
  console.log(`Comptroller become`);
  await comptroller._setPriceOracle(priceOracleProxyDeploy.address.toLowerCase()).then((tx) => {
    console.log(`Comptroller set price oracle tx: ${tx.hash}`);
    return tx.wait();
  });
  console.log(`Comptroller set price oracle: ${priceOracleProxyDeploy.address.toLowerCase()}`);
  await comptroller._setCloseFactor(config.closeFactorMantissa).then((tx) => {
    console.log(`Comptroller close factor tx: ${tx.hash}`);
    return tx.wait();
  });
  console.log(`Comptroller close factor: ${config.closeFactorMantissa / 1e18}`);
  await comptroller._setLiquidationIncentive(config.liquidationIncentiveMantissa).then((tx) => {
    console.log(`Comptroller liquidation incentive tx: ${tx.hash}`);
    return tx.wait();
  });
  console.log(`Comptroller liquidation incentive: ${config.liquidationIncentiveMantissa / 1e18}`);
  await comptroller._setCompRate(config.compSpeed).then((tx) => {
    console.log(`Comptroller comp rate tx: ${tx.hash}`);
    return tx.wait();
  });
  console.log(`Comptroller comp rate: ${config.compSpeed}`);

  for (const [key, market] of Object.entries(config.markets)) {
    console.log(`\n======== Processing market ${key}`);
    const underlyingSymbol = key.toUpperCase();
    let token;
    let oracle;
    let adapter;
    let model;
    let kToken;
    let satCompanion;

    // TOKENS
    if (market.kToken.type !== 'CRBTC') {
      if (market.underlyingAddress) {
        token = {
          address: market.underlyingAddress.toLowerCase(),
        };
      } else {
        const standardTokenContract = await ethers.getContractFactory('StandardToken');
        console.log(`>>> Deploying ${underlyingSymbol}token`);
        token = await standardTokenContract
          .deploy(parseEther('900000000000'), `Test ${underlyingSymbol} Tropykus`, 18, `t${underlyingSymbol}`);
        console.log(`${underlyingSymbol} tx: ${token.deployTransaction.hash}`);
        await token.deployTransaction.wait();
      }
      console.log(`${underlyingSymbol} = '${token.address.toLowerCase()}';`);
      data += `${underlyingSymbol} = '${token.address.toLowerCase()}';\n`;
      fs.writeFileSync('result', data);
    }

    // ORACLES
    if (market.oracle.address) {
      oracle = {
        address: market.oracle.address.toLowerCase(),
      }
    } else if (market.oracle.price) {
      const mockPriceProviderMoC = await ethers.getContractFactory('MockPriceProviderMoC');
      console.log(`>>> Deploying ${underlyingSymbol}oracle price: $ ${market.oracle.price / 1e18}`);
      oracle = await mockPriceProviderMoC.deploy(deployer.address, market.oracle.price);
      console.log(`${underlyingSymbol}oracle tx: ${oracle.deployTransaction.hash}`);
      await oracle.deployTransaction.wait();
    } else {
      throw new Error(`couldn't deploy ${underlyingSymbol}oracle with no price.`);
    }
    console.log(`${underlyingSymbol}oracle = '${oracle.address.toLowerCase()}';`);
    data += `${underlyingSymbol}oracle = '${oracle.address.toLowerCase()}';\n`
    fs.writeFileSync('result', data);

    // ADAPTERS
    if (market.oracle.address) {
      adapter = {
        address: market.adapterAddress.toLowerCase(),
      };
    } else {
      const priceOracleAdapterMoc = await ethers.getContractFactory('PriceOracleAdapterMoc');
      console.log(`>>> Deploying ${underlyingSymbol}adapter`);
      adapter = await priceOracleAdapterMoc.deploy(deployer.address, oracle.address);
      console.log(`${underlyingSymbol}adapter tx: ${adapter.deployTransaction.hash}`);
      await adapter.deployTransaction.wait();
    }
    console.log(`${underlyingSymbol}adapter = '${adapter.address.toLowerCase()}';`);
    data += `${underlyingSymbol}adapter = '${adapter.address.toLowerCase()}';\n`
    fs.writeFileSync('result', data);

    // INTEREST RATE MODELS
    if (market.interestRate.address) {
      model = {
        address: market.interestRate.address.toLowerCase(),
      };
    } else {
      let interestRateModel;
      console.log(`>>> Deploying ${underlyingSymbol}model as ${market.interestRate.model} interest rate model`);
      switch (market.interestRate.model) {
        case 'WHITE':
          interestRateModel = await ethers.getContractFactory('WhitePaperInterestRateModel');
          model = await interestRateModel.deploy(
            market.interestRate.baseBorrowRate,
            market.interestRate.multiplier
          );
          break;
        case 'HURRICANE':
          interestRateModel = await ethers.getContractFactory('HurricaneInterestRateModel');
          model = await interestRateModel.deploy(
            market.interestRate.baseBorrowRate,
            market.interestRate.promisedBaseReturnRate,
            market.interestRate.optimal,
            market.interestRate.borrowRateSlope,
            market.interestRate.supplyRateSlope
          );
          break;
        default:
          // JUMP
          interestRateModel = await ethers.getContractFactory('JumpRateModelV2');
          model = await interestRateModel.deploy(
            market.interestRate.baseBorrowRate,
            market.interestRate.multiplier,
            market.interestRate.jumpMultiplier,
            market.interestRate.kink,
            deployer.address);
          break;
      }
      console.log(`${underlyingSymbol}model tx: ${model.deployTransaction.hash}`);
      await model.deployTransaction.wait();
    }
    console.log(`${underlyingSymbol}model = '${model.address.toLowerCase()}';`);
    data += `${underlyingSymbol}model = '${model.address.toLowerCase()}';\n`
    fs.writeFileSync('result', data);

    // kTOKENS
    if (market.kToken.address) {
      kToken = {
        address: market.kToken.address.toLowerCase(),
      };
    } else {
      let kTokenContract;
      switch (market.kToken.type) {
        case 'CRBTC':
          kTokenContract = await ethers.getContractFactory('CRBTC');
          kToken = await kTokenContract.deploy(
            comptroller.address,
            model.address,
            config.initialExchangeRateMantissa,
            `Tropykus k${underlyingSymbol}`,
            `k${underlyingSymbol}`,
            18,
            deployer.address,
          );
          if (underlyingSymbol === 'SAT') {
            const cRBTCCompanionContract = await ethers.getContractFactory('CRBTCCompanion');
            satCompanion = await cRBTCCompanionContract.deploy(
              comptroller.address,
              kToken.address,
              priceOracleProxyDeploy.address,
            );
            console.log(`${underlyingSymbol}companion tx: ${satCompanion.deployTransaction.hash}`);
            await satCompanion.deployTransaction.wait();
            satCompanion = await ethers.getContractAt('CRBTCCompanion', satCompanion.address, deployer);
            console.log(`${underlyingSymbol}companion = '${satCompanion.address.toLowerCase()}';`);
            data += `${underlyingSymbol}companion = '${satCompanion.address.toLowerCase()}';\n`
            fs.writeFileSync('result', data);
          }
          console.log(`k${underlyingSymbol} tx: ${kToken.deployTransaction.hash}`);
          await kToken.deployTransaction.wait();
          kToken = await ethers.getContractAt('CRBTC', kToken.address, deployer);
          break;
        case 'CDOC':
          kTokenContract = await ethers.getContractFactory('CRDOC');
          kToken = await kTokenContract.deploy(
            token.address,
            comptroller.address,
            model.address,
            config.initialExchangeRateMantissa,
            `Tropykus k${underlyingSymbol}`,
            `k${underlyingSymbol}`,
            18,
            deployer.address,
          );
          console.log(`k${underlyingSymbol} tx: ${kToken.deployTransaction.hash}`);
          await kToken.deployTransaction.wait();
          kToken = await ethers.getContractAt('CRDOC', kToken.address, deployer);
          break;
        default:
          // CTOKEN
          kTokenContract = await ethers.getContractFactory('CErc20Immutable');
          kToken = await kTokenContract.deploy(
            token.address,
            comptroller.address,
            model.address,
            config.initialExchangeRateMantissa,
            `Tropykus k${underlyingSymbol}`,
            `k${underlyingSymbol}`,
            18,
            deployer.address,
          );
          console.log(`k${underlyingSymbol} tx: ${kToken.deployTransaction.hash}`);
          await kToken.deployTransaction.wait();
          kToken = await ethers.getContractAt('CErc20Immutable', kToken.address, deployer);
          break;
      }
    }
    console.log(`k${underlyingSymbol} = '${kToken.address.toLowerCase()}';`);
    data += `k${underlyingSymbol} = '${kToken.address.toLowerCase()}';\n`
    fs.writeFileSync('result', data);

    await priceOracleProxy.setAdapterToToken(kToken.address, adapter.address).then((tx) => {
      console.log(`${underlyingSymbol}Adapter to token tx: ${tx.hash}`);
      return tx.wait();
    });
    console.log(`${underlyingSymbol}Adapter to token set ${kToken.address} ${adapter.address}`);

    await comptroller._supportMarket(kToken.address).then((tx) => {
      console.log(`${underlyingSymbol} supported tx: ${tx.hash}`);
      return tx.wait();
    });
    console.log(`${underlyingSymbol} supported`);

    await comptroller._setCollateralFactor(kToken.address, market.collateralFactor).then((tx) => {
      console.log(`${underlyingSymbol} collateral factor tx: ${tx.hash}`);
      return tx.wait();
    });
    console.log(`${underlyingSymbol} collateral factor: ${market.collateralFactor / 1e18}`);

    await kToken._setReserveFactor(market.reserveFactor).then((tx) => {
      console.log(`${underlyingSymbol} reserve factor tx: ${tx.hash}`);
      return tx.wait();
    });
    console.log(`${underlyingSymbol} reserve factor: ${market.reserveFactor / 1e18}`);

    if (underlyingSymbol === 'SAT') {
      await kToken.addSubsidy({ value: market.initialSubsidy }).then((tx) => {
        console.log(`${underlyingSymbol} subsidy tx: ${tx.hash}`);
        return tx.wait();
      });
      console.log(`${underlyingSymbol} subsidy: ${market.initialSubsidy / 1e18}`);

      await kToken.setCompanion(satCompanion.address).then((tx) => {
        console.log(`${underlyingSymbol} companion tx: ${tx.hash}`);
        return tx.wait();
      });
      console.log(`${underlyingSymbol} companion set: ${satCompanion.address}`);

      await satCompanion.setMarketCapThreshold(market.threshold).then((tx) => {
        console.log(`${underlyingSymbol} threshold tx: ${tx.hash}`);
        return tx.wait();
      });
      console.log(`${underlyingSymbol} threshold: ${market.threshold / 1e18}`);
    }
  }

  // TROPYKUS LENS
  const tropykusLensContract = await ethers.getContractFactory('TropykusLens');
  const tropykusLens = await tropykusLensContract.deploy();
  console.log(`tropykusLens tx: ${tropykusLens.deployTransaction.hash}`);
  await tropykusLens.deployTransaction.wait();
  console.log(`\nTropykusLens = '${tropykusLens.address.toLowerCase()}';`);
  data += `TropykusLens = '${tropykusLens.address.toLowerCase()}';\n`
  fs.writeFileSync('result', data);

  console.log('// Finished');
  console.log(`${new Date() - initialDate} ms`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
