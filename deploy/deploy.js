const BigNumber = require('bignumber.js');
const {
    etherMantissa,
} = require('../tests/Utils/Ethereum');

const chainName = (chainId) => {
    switch(chainId) {
      case 30: return 'Rsk Mainnet';
      case 31: return 'Rsk testnet';
      case 33: return 'Rsk regtest';
      case 5777: return 'Ganache';
      case 31337: return 'BuidlerEVM';
      default: return 'Unknown';
    }
}

const config = {
    initialExchangeRateMantissa: new BigNumber(2e18),
    liquidationIncentiveMantisa: new BigNumber(1.08e18),
    closeFactorMantisa: etherMantissa(.051),
    maxAssets: 20,
    compRate: new BigNumber("0"), //0 to not drip
    compMarkets: [],
};

module.exports = async (buidler) => {
    const { getNamedAccounts, deployments, getChainId, ethers } = buidler
    const { deploy } = deployments

    let {
      deployer,
      rifOracle,
      rbtcOracle,
      dai,
      rif,
      multiSig,
      admin1,
      admin2
    } = await getNamedAccounts()

    const chainId = parseInt(await getChainId(), 10)
    console.log('ChainID', chainId);
    const isLocal = [30, 31].indexOf(chainId) == -1
    // 31337 is unit testing, 1337 is for coverage, 33 is rsk regtest
    const isTestEnvironment = chainId === 31337 || chainId === 1337 || chainId === 33
    console.log('isTestEnvironment', isTestEnvironment);
    // Fix transaction format  error from etherjs getTransactionReceipt as transactionReceipt format
    // checks root to be a 32 bytes hash when on RSK its 0x01
    const format = ethers.provider.formatter.formats
    if (format) format.receipt['root'] = format.receipt['logsBloom']
    Object.assign(ethers.provider.formatter, { format: format })

    const signer = await ethers.provider.getSigner(deployer)
    Object.assign(signer.provider.formatter, { format: format })

    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("rLending Contracts - Deploy Script")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

    const locus = isLocal ? 'local' : 'remote'
    console.log(`  Deploying to Network: ${chainName(chainId)} (${locus})`)

    if (isLocal) { // ----------- Start if local ------------- //
      console.log("\n  Deploying Rif Oracle...")
      const rifOracleResult = await deploy("RifOracle", {
        args: [deployer, '150000000000000000'],
        contract: 'MockPriceProviderMoC',
        from: deployer,
        skipIfAlreadyDeployed: true
      });
      rifOracle = rifOracleResult.address

      console.log("\n  Deploying Rbtc Oracle...")
      const rbtcOracleResult = await deploy("RbtcOracle", {
        args: [deployer, '33000000000000000000000'],
        contract: 'MockPriceProviderMoC',
        from: deployer,
        skipIfAlreadyDeployed: true
      });
      rbtcOracle = rbtcOracleResult.address

      console.log("\n  Deploying Dai...")
      const daiResult = await deploy("Dai", {
        args: [(new BigNumber(2000000e18)).toFixed(), "dai token", 18, "rDai"],
        contract: 'StandardToken',
        from: deployer,
        skipIfAlreadyDeployed: true
      })
      dai = daiResult.address

      console.log("\n  Deploying Rif...")
      const rifResult = await deploy("Rif", {
        args: [(new BigNumber(2000000e18)).toFixed(), "rif token", 18, "Rif"],
        contract: 'StandardToken',
        from: deployer,
        skipIfAlreadyDeployed: true
      })
      rif = rifResult.address

      // Display Contract Addresses
      console.log("\n 🔹 Local Contract Deployments;\n")
      console.log("  - Rbtc Oracle:       ", rbtcOracleResult.address)
      console.log("  - Rif Oracle:       ", rifOracleResult.address)
      console.log("  - Dai:              ", daiResult.address)
      console.log("  - Rif:              ", rifResult.address)
    } // ----------- End if local ------------- //



    // TODO we should use the DAI Oracle as soon as its ready instead of the Mock
    console.log("\n 🔸 Deploying Dai Oracle...")
    const daiOracleResult = await deploy("DaiOracle", {
        args: [deployer, '1080000000000000000'],
        contract: 'MockPriceProviderMoC',
        from: deployer,
        skipIfAlreadyDeployed: true
    });
    daiOracle = daiOracleResult.address

    // if not set by named config
    if (!multiSig) {
        console.log("\n  Deploying MultiSigWallet...")
        const owners =  isLocal ? [deployer] : [deployer, admin1, admin2]
        const multiSigResult = await deploy("MultiSigWallet", {
            args: [owners, 1],
            contract: "MultiSigWallet",
            from: deployer,
            skipIfAlreadyDeployed: true
        })
        multiSig = multiSigResult.address
    }

    console.log("\n  Deploying Unitroller...")
    const unitrollerResult = await deploy("Unitroller", {
        contract: "Unitroller",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const unitrollerContract = await buidler.ethers.getContractAt(
        "Unitroller",
        unitrollerResult.address,
        signer
    )



    //-------------- Start deploying Oracles Adapters ------------- //
    console.log("\n  Deploying PriceOracleProxy...")
    const priceOracleProxyResult = await deploy("PriceOracleProxy", {
        args: [deployer],
        contract: "PriceOracleProxy",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const priceOracleProxyContract = await buidler.ethers.getContractAt(
        "PriceOracleProxy",
        priceOracleProxyResult.address,
        signer
    )

    console.log("\n  Deploying RifPriceOracleAdapterMoc...")
    const rifPriceOracleAdapterResult = await deploy("RifPriceOracleAdapterMoc", {
        args: [deployer, rifOracle],
        contract: "PriceOracleAdapterMoc",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    console.log("\n  Deploying DaiPriceOracleAdapterMoc...")
    const daiPriceOracleAdapterResult = await deploy("DaiPriceOracleAdapterMoc", {
        args: [deployer, daiOracle],
        contract: "PriceOracleAdapterMoc",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    console.log("\n  Deploying RbtcPriceOracleAdapterMoc...")
    const rbtcPriceOracleAdapterResult = await deploy("RbtcPriceOracleAdapterMoc", {
        args: [deployer, rbtcOracle],
        contract: "PriceOracleAdapterMoc",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    // ----------- End deploying Oracles Adapters ------------ //



    // ------------ Start Deploying and configuring Comptroller --------- //
    console.log("\n  Deploying Comptroller...")
    const comptrollerResult = await deploy("Comptroller", {
        contract: "Comptroller",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    console.log("comptrollerResult.newlyDeployed", comptrollerResult.newlyDeployed)
    const comptrollerContract = await buidler.ethers.getContractAt(
        "Comptroller",
        comptrollerResult.address,
        signer
    )
    if(comptrollerResult.newlyDeployed) {
        console.log("\n  _setPendingImplementation Unitroller...")
        await unitrollerContract._setPendingImplementation(comptrollerResult.address)
    } else {
        console.log("\n  already become Unitroller...")
    }
    console.log("\n  _become Comptroller...")
    await comptrollerContract._become(unitrollerResult.address)

    const newUnitrollerContract = await buidler.ethers.getContractAt(
        "Unitroller",
        unitrollerContract.address,
        signer
    )
    console.log("\n  _setPriceOracle new Unitroller...")
    await newUnitrollerContract._setPriceOracle(priceOracleProxyResult.address)

    console.log("\n  _setMaxAssets new Unitroller...")
    await newUnitrollerContract._setMaxAssets(config.maxAssets)

    console.log("\n  _setCloseFactor new Unitroller...")
    await newUnitrollerContract._setCloseFactor(config.closeFactorMantisa)

    console.log("\n  _setLiquidationIncentive new Unitroller...")
    await newUnitrollerContract._setLiquidationIncentive(config.liquidationIncentiveMantisa)

    console.log("\n  _setCompRate new Unitroller...")
    await newUnitrollerContract._setCompRate(config.compRate)

    if(config.compMarkets.length > 0) {
        console.log("\n  _addCompMarkets new Unitroller...")
        await newUnitrollerContract._addCompMarkets(config.compMarkets)
    }
    // ------------ End Deploying and configuring Comptroller --------- //



    // --------------------- Deploy InterestRateModel ----------------- //
    console.log("\n  Deploy JumpRateModelV2...")
    const jumpRateModelV2Result = await deploy("JumpRateModelV2", {
        args: [etherMantissa(0.05), etherMantissa(0.2), etherMantissa(2), etherMantissa(0.90), deployer],
        contract: "JumpRateModelV2",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    console.log("\n  Deploy WhitePaperInterestRateModel...")
    const whitePaperInterestRateModelResult = await deploy("WhitePaperInterestRateModel", {
        args: [etherMantissa(0.05), etherMantissa(0.2)],
        contract: "WhitePaperInterestRateModel",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    // --------------------- End Deploy InterestRateModel ----------------- //

    // -------------------------- Deploy CTokerns ------------------------- //
    // ### Deploy cDAI ### //
    console.log("\n  Deploy cDai...")
    const cDaiResult = await deploy("cDai", {
        args: [dai, newUnitrollerContract.address, jumpRateModelV2Result.address, config.initialExchangeRateMantissa, "rLending rDai", "crDAI", 8, deployer],
        contract: "CErc20Immutable",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const cDaiContract = await buidler.ethers.getContractAt(
        "CErc20Immutable",
        cDaiResult.address,
        signer
    )
    console.log("\n  setAdapterToToken cDai...")
    await priceOracleProxyContract.setAdapterToToken(cDaiResult.address, daiPriceOracleAdapterResult.address)
    console.log("\n  _supportMarket cDai...")
    await newUnitrollerContract._supportMarket(cDaiResult.address)
    console.log("\n  _setCollateralFactor cDai...")
    await newUnitrollerContract._setCollateralFactor( [cDai._address, etherMantissa(0.75)])
    console.log("\n  _setReserveFactor cDai...")
    await cDaiContract._setReserveFactor(etherMantissa(0.15));

    // ### Deploy cRIF ### //
    console.log("\n  Deploy cRIF...")
    const cRifResult = await deploy("cRIF", {
        args: [rif, newUnitrollerContract.address, whitePaperInterestRateModelResult.address, config.initialExchangeRateMantissa, "rLending RIF", "cRIF", 8, deployer],
        contract: "CErc20Immutable",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const cRifContract = await buidler.ethers.getContractAt(
        "CErc20Immutable",
        cRifResult.address,
        signer
    )
    console.log("\n  setAdapterToToken cRif...")
    await priceOracleProxyContract.setAdapterToToken(cRifResult.address, rifPriceOracleAdapterResult.address)
    console.log("\n  _supportMarket cRif...")
    await newUnitrollerContract._supportMarket(cRifResult.address)
    console.log("\n  _setCollateralFactor cRif...")
    await newUnitrollerContract._setCollateralFactor( [cRifResult._address, etherMantissa(0.5)])
    console.log("\n  _setReserveFactor cRif...")
    await cRifContract._setReserveFactor(etherMantissa(0.2));

    // ### Deploy cRIF ### //
    console.log("\n  Deploy cRBTC...")
    const cRbtcResult = await deploy("CRBTC", {
        args: [newUnitrollerContract.address, whitePaperInterestRateModelResult.address, config.initialExchangeRateMantissa, "rLending RBTC", "cRBTC", 8, deployer],
        contract: "CRBTC",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const cRbtcContract = await buidler.ethers.getContractAt(
        "CRBTC",
        cRbtcResult.address,
        signer
    )
    console.log("\n  setAdapterToToken cRbtc...")
    await priceOracleProxyContract.setAdapterToToken(cRbtcResult.address, rifPriceOracleAdapterResult.address)
    console.log("\n  _supportMarket cRbtc...")
    await newUnitrollerContract._supportMarket(cRbtcResult.address)
    console.log("\n  _setCollateralFactor cRbtc...")
    await newUnitrollerContract._setCollateralFactor( [cRbtcResult._address, etherMantissa(0.6)])
    console.log("\n  _setReserveFactor cRbtc...")
    await cRbtcContract._setReserveFactor(etherMantissa(0.2));
    // -------------------------- End Deploy CTokerns ------------------------- //

    // -------------------------- Deploy rLen ------------------------- //
    console.log("\n  Deploy RLEN...")
    const rLenResult = await deploy("RLEN", {
        args: [multiSig],
        contract: "RLEN",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    console.log("\n  setCompAddress RLEN...")
    await newUnitrollerContract.setCompAddress(rLenResult.address)
    // -------------------------- End Deploy rLen ------------------------- //

    // -------------------------- Deploy Maximillion ------------------------- //
    console.log("\n  Deploy Maximillion...")
    const maximillionResult = await deploy("Maximillion", {
        args: [cRbtcResult.address],
        contract: "Maximillion",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    // -------------------------- Deploy rLendingLens ------------------------- //
    console.log("\n  Deploy RlendingLens...")
    const rLedingLensResult = await deploy("RlendingLens", {
        args: [cRbtcResult.address],
        contract: "RlendingLens",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    // -------------------------- setMultiSignOwnerAlpha ------------------------- //
    console.log("\n  _setPendingAdmin Multisig...")
    let arrayToMultisigOwner = [cDaiContract, cRifContract, cRbtcContract, priceOracleProxyContract, unitrollerContract];
    for (let index = 0; index < arrayToMultisigOwner.length; index++) {
        //set pending admin
        await arrayToMultisigOwner[index]["_setPendingAdmin"](multiSig._address);
        //generate data method accept admin
        const data = arrayToMultisigOwner[index]["_acceptAdmin"]().encodeABI();
        //submit transacion multisig, when accept the admin of contract
        await multiSigContract.submitTransaction(arrayToMultisigOwner[index].address, 0, data);
        console.log(`multiSig owner of ${arrayToMultisigOwner[index].address}`);
    }
    console.log("\n  changeRequirement Multisig ...")
    await multiSigContract.changeRequirement(2);

    // Display Contract Addresses
    console.log("\n  Contract Deployments Complete!\n")
    console.log("  - Dai Oracle:                      ", daiOracle)
    console.log("  - MultiSigWallet:                  ", multiSig)
    console.log("  - Unitroller:                      ", unitrollerResult.address)
    console.log("  - PriceOracleProxy:                ", priceOracleProxyResult.address)
    console.log("  - RIF PriceOracleAdapter:          ", rifPriceOracleAdapterResult.address)
    console.log("  - DAI PriceOracleAdapter:          ", daiPriceOracleAdapterResult.address)
    console.log("  - RBTC PriceOracleAdapter:         ", rbtcPriceOracleAdapterResult.address)
    console.log("  - Comptroller (Logic):             ", comptrollerResult.address)
    console.log("  - JumpRateModelV2:                 ", jumpRateModelV2Result.address)
    console.log("  - WhitePaperInterestRateModel:     ", whitePaperInterestRateModelResult.address)
    console.log("  - crDAI:                           ", cDaiResult.address)
    console.log("  - cRIF:                            ", cRifResult.address)
    console.log("  - cRBTC:                           ", cRbtcResult.address)
    console.log("  - RLEN:                            ", rLenResult.address)
    console.log("  - Maximillion:                     ", maximillionResult.address)
    console.log("  - rLendingLens:                    ", rLendingLendsResult.address)
    console.log("  - Rbtc Oracle:                 ", rbtcOracle)
    console.log("  - Rif Oracle:                  ", rifOracle)
    console.log("  - Dai:                         ", dai)
    console.log("  - Rif:                         ", rif)
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

    console.log('\n \x1b[32m%s\x1b[0m', "All contracts are deployed..", "🌱\n");

}