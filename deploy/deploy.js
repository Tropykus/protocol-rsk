const chainName = (chainId) => {
    switch(chainId) {
      case 30: return 'Rsk Mainnet';
      case 31: return 'Rsk testnet';
      case 33: return 'Rsk regtest';
      case 5777: return 'Ganache';
      case 31337: return 'hardhatEVM';
      default: return 'Unknown';
    }
}
const parseEther = ethers.utils.parseEther;
const config = {
    initialExchangeRateMantissa:  parseEther('2'),
    liquidationIncentiveMantisa: parseEther('1.08'),
    closeFactorMantisa: parseEther('0.5'),
    compSpeed: parseEther('0'), //0 to not drip
};

module.exports = async (hardhat) => {
    const { getNamedAccounts, deployments, getChainId, ethers } = hardhat
    const { deploy, execute } = deployments

    let {
      deployer,
      rifOracle,
      rbtcOracle,
      usdt,
      rif,
      multiSig,
      admin1,
      admin2
    } = await getNamedAccounts()
    console.log(`deployer: ${deployer}`)
    console.log(`rifOracle: ${rifOracle}`)
    console.log(`rbtcOracle: ${rbtcOracle}`)
    console.log(`usdt: ${usdt}`)
    console.log(`rif: ${rif}`)

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

    console.log(`signer: ${JSON.stringify(signer)}`);

    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("tropykus Contracts - Deploy Script")
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

      console.log("\n  Deploying USDT...")
      const usdtResult = await deploy("USDT", {
        args: [ethers.utils.parseEther('2000000'), "USDT token", 18, "rUSDT"],
        contract: 'StandardToken',
        from: deployer,
        skipIfAlreadyDeployed: true
      })
      usdt = usdtResult.address

      console.log("\n  Deploying Rif...")
      const rifResult = await deploy("Rif", {
        args: [ethers.utils.parseEther('2000000'), "rif token", 18, "Rif"],
        contract: 'StandardToken',
        from: deployer,
        skipIfAlreadyDeployed: true
      })
      rif = rifResult.address

      // Display Contract Addresses
      console.log("\n 🔹 Local Contract Deployments;\n")
      console.log("  - Rbtc Oracle:       ", rbtcOracleResult.address)
      console.log("  - Rif Oracle:       ", rifOracleResult.address)
      console.log("  - USDT:              ", usdtResult.address)
      console.log("  - Rif:              ", rifResult.address)
    } // ----------- End if local ------------- //

    // if not set by named config
    if (!multiSig || chainId === 1337) {
        console.log("\n  Deploying MultiSigWallet...")
        const owners =  isLocal ? [deployer] : [deployer, admin1, admin2]
        console.log(owners)
        const multiSigResult = await deploy("MultiSigWallet", {
            args: [owners, 1],
            contract: "MultiSigWallet",
            from: deployer,
            skipIfAlreadyDeployed: true
        })
        multiSig = multiSigResult.address
    }
    console.log(`multiSig: ${multiSig}`)

    const multiSigContract = await ethers.getContractAt(
        "MultiSigWallet",
        multiSig,
        signer
    )

    // USDT Oracle returns always 1
    console.log("\n 🔸 Deploying USDT Oracle...")
    const usdtOracleResult = await deploy("USDTOracle", {
        args: [multiSig, ethers.utils.parseEther('1')],
        contract: 'MockPriceProviderMoC',
        from: deployer,
        skipIfAlreadyDeployed: true
    });
    usdtOracle = usdtOracleResult.address

    console.log("\n  Deploying Unitroller...")
    const unitrollerResult = await deploy("Unitroller", {
        contract: "Unitroller",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const unitrollerContract = await ethers.getContractAt(
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
    const priceOracleProxyContract = await ethers.getContractAt(
        "PriceOracleProxy",
        priceOracleProxyResult.address,
        signer
    )

    console.log("\n  Deploying RifPriceOracleAdapterMoc...")
    const rifPriceOracleAdapterResult = await deploy("RifPriceOracleAdapterMoc", {
        args: [multiSig, rifOracle],
        contract: "PriceOracleAdapterMoc",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    console.log("\n  Deploying UsdtPriceOracleAdapterMoc...")
    const usdtPriceOracleAdapterResult = await deploy("UsdtPriceOracleAdapterMoc", {
        args: [multiSig, usdtOracle],
        contract: "PriceOracleAdapterMoc",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    console.log("\n  Deploying RbtcPriceOracleAdapterMoc...")
    const rbtcPriceOracleAdapterResult = await deploy("RbtcPriceOracleAdapterMoc", {
        args: [multiSig, rbtcOracle],
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

    if (comptrollerResult.newlyDeployed) {
        console.log("\n  _setPendingImplementation Unitroller...")
        await execute("Unitroller", {from: deployer}, "_setPendingImplementation", comptrollerResult.address)
        console.log("\n  _become Comptroller...")
        await execute("Comptroller", {from: deployer}, "_become", unitrollerResult.address)
    } else {
        console.log("\n  already become Unitroller...")
    }

    const newUnitrollerContract = await ethers.getContractAt(
        "Comptroller",
        comptrollerResult.address,
        signer
    )

    if (comptrollerResult.newlyDeployed) {
        console.log("\n  _setPriceOracle new Unitroller...")
        await newUnitrollerContract._setPriceOracle(priceOracleProxyResult.address).then((tx) => tx.wait());

        console.log("\n  _setCloseFactor new Unitroller...")
        await newUnitrollerContract._setCloseFactor(config.closeFactorMantisa).then((tx) => tx.wait());

        console.log("\n  _setLiquidationIncentive new Unitroller...")
        await newUnitrollerContract._setLiquidationIncentive(config.liquidationIncentiveMantisa).then((tx) => tx.wait());

    } else {
        console.log("\n  already setted up new Unitroller...")
    }
    // ------------ End Deploying and configuring Comptroller --------- //



    // --------------------- Deploy InterestRateModel ----------------- //
    // nice explination of the arguments https://compound.finance/governance/proposals/23
    console.log("\n  USDT Deploy JumpRateModelV2...")
    const usdtJumpRateModelV2Result = await deploy("UsdtJumpRateModelV2", {
        // 0% base rate, 4% borrow rate at kink, 25% borrow rate at 100% utilization, Kink at 80% utilization
        args: [parseEther('0'), parseEther('0.04'), parseEther('1.09'), parseEther('0.8'), multiSig],
        contract: "JumpRateModelV2",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    console.log("\n  Deploy BTC WhitePaperInterestRateModel...")
    const btcWhitePaperInterestRateModelResult = await deploy("BtcWhitePaperInterestRateModel", {
        args: [parseEther('0.02'), parseEther('0.3')],
        contract: "WhitePaperInterestRateModel",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    console.log("\n  Deploy RIF WhitePaperInterestRateModel...")
    const rifWhitePaperInterestRateModelResult = await deploy("RifWhitePaperInterestRateModel", {
        args: [parseEther('0.02'), parseEther('0.3')],
        contract: "WhitePaperInterestRateModel",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    // --------------------- End Deploy InterestRateModel ----------------- //

    // -------------------------- Deploy CTokens ------------------------- //
    // ### Deploy cUSDT ### //
    console.log("\n  Deploy cUSDT...", usdt)
    const cUsdtResult = await deploy("cUSDT", {
        args: [usdt, newUnitrollerContract.address, usdtJumpRateModelV2Result.address, config.initialExchangeRateMantissa, "tropykus cUSDT", "crUSDT", 8, deployer],
        contract: "CErc20Immutable",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    console.log(`============================cUSDT Newly deployed: ${cUsdtResult.newlyDeployed}`)

    const cUsdtContract = await ethers.getContractAt(
        "CErc20Immutable",
        cUsdtResult.address,
        signer
    )
    if (cUsdtResult.newlyDeployed) {
        console.log("\n  setAdapterToToken cUSDT...")
        await priceOracleProxyContract.setAdapterToToken(cUsdtResult.address, usdtPriceOracleAdapterResult.address).then((tx) => tx.wait())

        console.log("\n  _supportMarket cUSDT...")
        await newUnitrollerContract._supportMarket(cUsdtResult.address).then((tx) => tx.wait())

        console.log("\n  _setCollateralFactor cUSDT...")
        await newUnitrollerContract._setCollateralFactor(cUsdtResult.address, parseEther('0.75')).then((tx) => tx.wait())

        console.log("\n  _setCompSpeed new Unitroller...")
        result = await newUnitrollerContract._setCompSpeed(cUsdtResult.address, config.compSpeed).then((tx) => tx.wait());

        console.log("\n  _setReserveFactor cUSDT...")
        await cUsdtContract._setReserveFactor(parseEther('0.15')).then((tx) => tx.wait())
    } else {
        console.log("\n cUSDT already deployed...")
    }

    // ### Deploy cRIF ### //
    console.log("\n  Deploy cRIF...")
    const cRifResult = await deploy("cRIF", {
        args: [rif, newUnitrollerContract.address, rifWhitePaperInterestRateModelResult.address, config.initialExchangeRateMantissa, "tropykus RIF", "cRIF", 8, deployer],
        contract: "CErc20Immutable",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const cRifContract = await ethers.getContractAt(
        "CErc20Immutable",
        cRifResult.address,
        signer
    )
    if (cRifResult.newlyDeployed) {
        console.log("\n  setAdapterToToken cRif...")
        await priceOracleProxyContract.setAdapterToToken(cRifResult.address, rifPriceOracleAdapterResult.address).then((tx) => tx.wait())

        console.log("\n  _supportMarket cRif...")
        await newUnitrollerContract._supportMarket(cRifResult.address).then((tx) => tx.wait())

        console.log("\n  _setCollateralFactor cRif...")
        await newUnitrollerContract._setCollateralFactor(cRifResult.address, parseEther('0.5')).then((tx) => tx.wait())

        console.log("\n  _setCompSpeed new Unitroller...")
        result = await newUnitrollerContract._setCompSpeed(cRifResult.address, config.compSpeed).then((tx) => tx.wait());

        console.log("\n  _setReserveFactor cRif...")
        await cRifContract._setReserveFactor(parseEther('0.15')).then((tx) => tx.wait())
    } else {
        console.log("\n cRIF already deployed...")
    }

    // ### Deploy cRBTC ### //
    console.log("\n  Deploy cRBTC...")
    const cRbtcResult = await deploy("CRBTC", {
        args: [newUnitrollerContract.address, btcWhitePaperInterestRateModelResult.address, config.initialExchangeRateMantissa, "tropykus RBTC", "cRBTC", 8, deployer],
        contract: "CRBTC",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    const cRbtcContract = await ethers.getContractAt(
        "CRBTC",
        cRbtcResult.address,
        signer
    )
    if (cRbtcResult.newlyDeployed) {
        console.log("\n  setAdapterToToken cRbtc...")
        await priceOracleProxyContract.setAdapterToToken(cRbtcResult.address, rbtcPriceOracleAdapterResult.address).then((tx) => tx.wait())

        console.log(`\n  _supportMarket cRbtc...`)
        await newUnitrollerContract._supportMarket(cRbtcResult.address).then((tx) => tx.wait())

        console.log("\n  _setCollateralFactor cRbtc...")
        await newUnitrollerContract._setCollateralFactor(cRbtcResult.address, parseEther('0.75')).then((tx) => tx.wait())

        console.log("\n  _setCompSpeed new Unitroller...")
        result = await newUnitrollerContract._setCompSpeed(cRbtcResult.address, config.compSpeed).then((tx) => tx.wait());

        console.log("\n  _setReserveFactor cRbtc...")
        await cRbtcContract._setReserveFactor(parseEther('0.2')).then((tx) => tx.wait())
    } else {
        console.log("\n cRBTC already deployed...")
    }
    // -------------------------- End Deploy CTokerns ------------------------- //

    // -------------------------- Deploy trop ------------------------- //
    console.log("\n  Deploy TROP...")
    const tropResult = await deploy("TROP", {
        args: [multiSig],
        contract: "TROP",
        from: deployer,
        skipIfAlreadyDeployed: true
    })
    if (tropResult.newlyDeployed) {
        console.log("\n  setCompAddress TROP...")
        await newUnitrollerContract.setCompAddress(tropResult.address).then((tx) => tx.wait());
    } else {
        console.log("\n TROP already deployed...")
    }
    // -------------------------- End Deploy trop ------------------------- //

    // -------------------------- Deploy Maximillion ------------------------- //
    console.log("\n  Deploy Maximillion...")
    const maximillionResult = await deploy("Maximillion", {
        args: [cRbtcResult.address],
        contract: "Maximillion",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    // -------------------------- Deploy tropykusLens ------------------------- //
    console.log("\n  Deploy TropykusLens...")
    const rLedingLensResult = await deploy("TropykusLens", {
        contract: "TropykusLens",
        from: deployer,
        skipIfAlreadyDeployed: true
    })

    // -------------------------- setMultiSignOwnerAlpha ------------------------- //
    console.log("\n  set Multisig  as Owner...")
    let arrayToMultisigOwner = [cUsdtContract] //, cRifContract, cRbtcContract, priceOracleProxyContract, unitrollerContract];
    for (let index = 0; index < arrayToMultisigOwner.length; index++) {
        //set pending admin
        console.log(`\n  _setPendingAdmin Multisig...`)
        await arrayToMultisigOwner[index]["_setPendingAdmin"](multiSig)
        //generate data method accept admin
        const data = arrayToMultisigOwner[index].interface.encodeFunctionData("_acceptAdmin",[])
        //submit transacion multisig, when accept the admin of contract
        console.log(`\n  _acceptAdmin Multisig...`)
        await multiSigContract.submitTransaction(arrayToMultisigOwner[index].address, 0, data).then((tx) => tx.wait())
        console.log(`multiSig owner of ${arrayToMultisigOwner[index].address}`)
    }
    console.log("\n  changeRequirement Multisig ...")
    let data = multiSigContract.interface.encodeFunctionData("changeRequirement",[2])
    //submit transacion multisig
    await multiSigContract.submitTransaction(multiSigContract.address, 0, data).then((tx) => tx.wait())

    // Display Contract Addresses
    console.log("\n  Contract Deployments Complete!\n")
    console.log("  - USDT Oracle:                     ", usdtOracle)
    console.log("  - MultiSigWallet:                  ", multiSig)
    console.log("  - Unitroller:                      ", unitrollerResult.address)
    console.log("  - PriceOracleProxy:                ", priceOracleProxyResult.address)
    console.log("  - RIF PriceOracleAdapter:          ", rifPriceOracleAdapterResult.address)
    console.log("  - USDT PriceOracleAdapter:         ", usdtPriceOracleAdapterResult.address)
    console.log("  - RBTC PriceOracleAdapter:         ", rbtcPriceOracleAdapterResult.address)
    console.log("  - Comptroller (Logic):             ", comptrollerResult.address)
    console.log("  - Comptroller (Tha only one):      ", newUnitrollerContract.address)
    console.log("  - USDT JumpRateModelV2:            ", usdtJumpRateModelV2Result.address)
    console.log("  - RIF WhitePaperInterestRateModel: ", rifWhitePaperInterestRateModelResult.address)
    console.log("  - BTC WhitePaperInterestRateModel: ", btcWhitePaperInterestRateModelResult.address)
    console.log("  - crUSDT:                          ", cUsdtResult.address)
    console.log("  - cRIF:                            ", cRifResult.address)
    console.log("  - cRBTC:                           ", cRbtcResult.address)
    console.log("  - TROP:                            ", tropResult.address)
    console.log("  - Maximillion:                     ", maximillionResult.address)
    console.log("  - tropykusLens:                    ", rLedingLensResult.address)
    console.log("  - Rbtc Oracle:                     ", rbtcOracle)
    console.log("  - Rif Oracle:                      ", rifOracle)
    console.log("  - rUSDT:                           ", usdt)
    console.log("  - Rif:                             ", rif)
    console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

    console.log('\n \x1b[32m%s\x1b[0m', "All contracts are deployed..", "🌱\n");

}
