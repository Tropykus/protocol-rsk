const BigNumber = require('bignumber.js');
const {
    etherMantissa,
} = require('../../tests/Utils/Ethereum');

//enviroment
const [verb] = args;
//config
const config = {
    initialExchangeRateMantissa: new BigNumber(2e18),
    liquidationIncentiveMantisa: new BigNumber(1.08e18),
    closeFactorMantisa: etherMantissa(.051),
    maxAssets: 20,
    compRate: new BigNumber("0"), //0 to not drip
    compMarkets: [],
    collateralFactor: 0.5,
    testnet: {
        OraculoRif: "0x9d4b2c05818a0086e641437fcb64ab6098c7bbec",
        OraculoRbtc: "0x2d39cc54dc44ff27ad23a91a9b5fd750dae4b218",
        Dai: "0x0d86fca9be034a363cf12c9834af08d54a10451c",
        Rif: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
    },
    mainnet: {
        OraculoRif: "0x",
        OraculoRBTC: "0x",
        Dai: "0x",
        Rif: "0x",
        Rbtc: "0x"
    }
};
const logPath = __dirname + '/contractAddressesDeploy.json';
let unitroller, newUnitroller, oracleProxy, comptroller, interestRate, underlyingDai, underlyingRif, cDai, cRif, cRBTC,
    interestRateWhitePaper, priceOracleMocRif, priceOracleMocDai, priceOracleMocRBTC, priceOracleAdapterRif, priceOracleAdapterDai,
    priceOracleAdapterRbtc, multiSig, RLEN, rlendingLens,
    addressOraculoRbtc, addressOraculoRif, addressOraculoDai, addressRif;
[root, ...accounts] = saddle.accounts;
//set already deployed contracts
let unitrollerAddress = '';
let multiSigAddress = '';
let priceOracleProxyAddress = '';
let MockPriceProviderMocDaiAddress = '';
let priceOracleAdapterRifAddress = '';
let priceOracleAdapterDaiAddress = '';
let priceOracleAdapterRbtcAddress = '';
let comptrollerAddress = '';
let jumpRateModelV2Address = '';
let whitePaperInterestRateModelAddress = '';
let cDaiAddress = '';
let cRifAddress = '';
let cRBTCAddress = '';
let RLenAddress = '';
let maximillionAddress = '';
let rlendingLensAddress = '';

//set array to write to file
let arrayToFile = new Array();
//set verbose default
let eVerb = false;
//set network
let network = 5777; // default ganache

//validate enviroment
async function validateEnvironment() {
    network = await saddle.web3.eth.getChainId();
    if (verb == 'v')
        eVerb = true;
}
//validate enviroment
function writeLog(log, isVerbose) {
    (eVerb) ? console.log(`  ${log}`) : ((!isVerbose) ? (console.log(`  ${log}`)) : null);
}
//generate log contract to write
function generateLogAddress(nameContract, addresContract) {
    console.log(`🔹Deployed ${nameContract}`);
    console.log(`   ${addresContract}\n`);
    let objToFile = new Object();
    objToFile.contract = nameContract;
    objToFile.address = addresContract;
    arrayToFile.push(objToFile);
    let jsonString = JSON.stringify(arrayToFile);
    writeFileLog(jsonString);
}
//write log
function writeFileLog(data) {
    var fs = require("fs");
    fs.writeFile(logPath, data, function (err) {
        if (err) {
            console.log("Error to write file");
            return console.error(err);
        }
    });
}

//deploy MultiSigWallet
async function multiSigWallet() {
    if (multiSigAddress) {
        multiSig = await saddle.getContractAt('MultiSigWallet', multiSigAddress);
    } else {
        multiSig = await saddle.deploy('MultiSigWallet', [[root], 1]);
    }
    generateLogAddress('MultiSigWallet', multiSig._address);
};

//deploy Unitroller
async function unitrollerDeploy() {
    if (unitrollerAddress) {
        unitroller = await saddle.getContractAt('Unitroller', unitrollerAddress);
    } else {
        unitroller = await saddle.deploy('Unitroller');
    }
    generateLogAddress('UnitrollerImp', unitroller._address);
};

//deploy RlendingLens
async function rlendingLensDeploy() {
    if (rlendingLensAddress) {
        rlendingLens = await saddle.getContractAt('RlendingLens', rlendingLensAddress);
    } else {
        rlendingLens = await saddle.deploy('RlendingLens');
    }
    generateLogAddress('RlendingLens', rlendingLens._address);
};

//deploy Comptroller
async function comptrollerDeploy() {
    //deploy comptroller
    if (comptrollerAddress) {
        comptroller = await saddle.getContractAt('Comptroller', comptrollerAddress);
        generateLogAddress('Comptroller', comptroller._address);
        newUnitroller = await saddle.getContractAt("Comptroller", unitroller._address);
        generateLogAddress('Unitroller', newUnitroller._address);
    } else {
        comptroller = await saddle.deploy('Comptroller');
        generateLogAddress('Comptroller', comptroller._address);
        //set new comptroller implementation and become
        await send(unitroller, "_setPendingImplementation", [comptroller._address]);
        await send(comptroller, '_become', [unitroller._address]);
        //get unitroller then implementate Comptroller
        newUnitroller = await saddle.getContractAt("Comptroller", unitroller._address);
        generateLogAddress('Unitroller', newUnitroller._address);
        //set price oracle
        await send(newUnitroller, "_setPriceOracle", [oracleProxy._address]);
        writeLog(`setPriceOracle ${oracleProxy._address}`, true);
        //set max assets
        await send(newUnitroller, "_setMaxAssets", [config.maxAssets]);
        writeLog(`setMaxAssets ${config.maxAssets}`, true);
        //set max close factor
        await send(newUnitroller, "_setCloseFactor", [config.closeFactorMantisa]);
        writeLog(`setCloseFactor ${config.closeFactorMantisa}`, true);
        //set max liquidation incentive
        await send(newUnitroller, "_setLiquidationIncentive", [config.liquidationIncentiveMantisa]);
        writeLog(`setLiquidationIncentive ${config.liquidationIncentiveMantisa}`, true);
        //set comp rate
        await send(newUnitroller, "_setCompRate", [config.compRate]);
        writeLog(`setCompRate ${config.compRate}`, true);
        //add Comp Markets
        await send(newUnitroller, "_addCompMarkets", [config.compMarkets]);
        writeLog(`addCompMarkets ${config.compMarkets}\n`, true);
    }
};

//deploy Price Oracle and Proxy
async function priceOracleProxy() {
    if (priceOracleProxyAddress) {
        oracleProxy = await saddle.getContractAt('PriceOracleProxy', priceOracleProxyAddress);
    } else {
        oracleProxy = await saddle.deploy('PriceOracleProxy', [root]);
    }
    generateLogAddress('PriceOracleProxy', oracleProxy._address);
    //set prices oracles addresses
    await setPriceProvider();
    const oracleAdapterName = (network == 31) ? 'TestnetPriceOracleAdapterMoc' : 'PriceOracleAdapterMoc';
    //deploy adapter [Money on Chain]
    //set priceOracle Rif
    if (priceOracleAdapterRifAddress) {
        priceOracleAdapterRif = await saddle.getContractAt(oracleAdapterName, priceOracleAdapterRifAddress);
    } else {
        priceOracleAdapterRif = await saddle.deploy(oracleAdapterName, [root, addressOraculoRif]);
    }
    generateLogAddress(`${oracleAdapterName} Rif`, priceOracleAdapterRif._address);
    //set priceOracle DAI
    if (priceOracleAdapterDaiAddress) {
        priceOracleAdapterDai = await saddle.getContractAt(oracleAdapterName, priceOracleAdapterDaiAddress);
    } else {
        priceOracleAdapterDai = await saddle.deploy(oracleAdapterName, [root, addressOraculoDai]);
    }
    generateLogAddress(`${oracleAdapterName} Dai`, priceOracleAdapterDai._address);
    //set priceOracle RBTC
    if (priceOracleAdapterRbtcAddress) {
        priceOracleAdapterRbtc = await saddle.getContractAt(oracleAdapterName, priceOracleAdapterRbtcAddress);
    } else {
        priceOracleAdapterRbtc = await saddle.deploy(oracleAdapterName, [root, addressOraculoRbtc]);
    }
    generateLogAddress(`${oracleAdapterName} Rbtc`, priceOracleAdapterRbtc._address);

};

//set price provider addres in oracleAdapterMoC
async function setPriceProvider() {
    switch (network) {
        case 31:
            addressOraculoRif = config.testnet.OraculoRif;
            addressOraculoRbtc = config.testnet.OraculoRbtc;
            //deploy Dai mock
            if (MockPriceProviderMocDaiAddress) {
                priceOracleMocDai = await saddle.getContractAt('MockPriceProviderMoC', MockPriceProviderMocDaiAddress);
            } else {
                priceOracleMocDai = await saddle.deploy('MockPriceProviderMoC', [root, new BigNumber('1.08e+18')]);
            }
            generateLogAddress('🔸MockPriceProviderMoC Dai', priceOracleMocDai._address);
            addressOraculoDai = priceOracleMocDai._address;
            break;
        case 30:
            addressOraculoRif = config.mainnet.OraculoRif;
            addressOraculoRbtc = config.mainnet.OraculoRbtc;
            break;
        default:
            //deploy Rif mock
            priceOracleMocRif = await saddle.deploy('MockPriceProviderMoC', [root, new BigNumber('9e+18')]);
            generateLogAddress('🔸MockPriceProviderMoC Rif', priceOracleMocRif._address);
            addressOraculoRif = priceOracleMocRif._address;
            //deploy rBTC mock
            priceOracleMocRBTC = await saddle.deploy('MockPriceProviderMoC', [root, new BigNumber('115000e+18')]);
            generateLogAddress('🔸MockPriceProviderMoC rBTC', priceOracleMocRBTC._address);
            addressOraculoRbtc = priceOracleMocRBTC._address;
            //deploy Dai mock
            priceOracleMocDai = await saddle.deploy('MockPriceProviderMoC', [root, new BigNumber('1.08e+18')]);
            generateLogAddress('🔸MockPriceProviderMoC Dai', priceOracleMocDai._address);
            addressOraculoDai = priceOracleMocDai._address;
            break;
    }
}

//deploy InterestRateModel
async function interestRateModel() {
    // 0.05 0.2 2 0.90
    if (jumpRateModelV2Address) {
        interestRate = await saddle.getContractAt('JumpRateModelV2', jumpRateModelV2Address);
    } else {
        interestRate = await saddle.deploy('JumpRateModelV2', [etherMantissa(0.05), etherMantissa(0.2), etherMantissa(2), etherMantissa(0.90), root]);
    }
    generateLogAddress('JumpRateModelV2', interestRate._address);
    //deploy WhitePaperInterestRateModel [interestRate]
    if (whitePaperInterestRateModelAddress) {
        interestRateWhitePaper = await saddle.getContractAt('WhitePaperInterestRateModel', whitePaperInterestRateModelAddress);
    } else {
        interestRateWhitePaper = await saddle.deploy('WhitePaperInterestRateModel', [etherMantissa(0.05), etherMantissa(0.2)]);
    }
    generateLogAddress('WhitePaperInterestRateModel', interestRateWhitePaper._address);
};

//set underlying token
async function setUnderlying() {
    switch (network) {
        case 31:
            addressDai = config.testnet.Dai;
            addressRif = config.testnet.Rif;
            break;
        case 30:
            addressDai = config.mainnet.Dai;
            addressRif = config.mainnet.Rif;
            break;
        default:
            //deploy underlying Day
            underlyingDai = await saddle.deploy('StandardToken', [new BigNumber(2000000e18), "dai token", 18, "rDai"]);
            generateLogAddress('underlyingDai', underlyingDai._address);
            addressDai = underlyingDai._address;
            //deploy underlying Rif
            underlyingRif = await saddle.deploy('StandardToken', [new BigNumber(2000000e18), "rif token", 18, "RIF"]);
            generateLogAddress('underlyingRif', underlyingRif._address);
            addressRif = underlyingRif._address;
            break;
    }
    writeLog(`underlyingDai ${addressDai} `, true);
    writeLog(`underlyingRif ${addressRif} \n`, true);
}

async function deployCDai() {
    //cDai
    if (cDaiAddress) {
        cDai = await saddle.getContractAt('CErc20Immutable', cDaiAddress);
        generateLogAddress('cDai', cDai._address);
    } else {
        cDai = await saddle.deploy('CErc20Immutable', [addressDai, newUnitroller._address, interestRate._address, config.initialExchangeRateMantissa, "rLending Dai", "crDAI", 8, root]);
        generateLogAddress('cDai', cDai._address);
        //set cDai to adapterMoC
        await send(oracleProxy, "setAdapterToToken", [cDai._address, priceOracleAdapterDai._address]);
        writeLog(`set adapter oracle to cDai. adapter=${priceOracleAdapterDai._address}`, true);
        //set cDai to market
        await send(newUnitroller, "_supportMarket", [cDai._address]);
        writeLog(`supportMarket => cDai ${cDai._address} `, true);
        //set collateral
        await send(newUnitroller, "_setCollateralFactor", [cDai._address, etherMantissa(config.collateralFactor)]);
        writeLog(`setCollateralFactor to cDai value=${etherMantissa(config.collateralFactor).toString()}\n`, true);
    }
}

async function deployCRif() {
    //cRif
    if (cRifAddress) {
        cRif = await saddle.getContractAt('CErc20Immutable', cRifAddress);
        generateLogAddress('cRif', cRif._address);
        //set cRif to market
        await send(newUnitroller, "_supportMarket", [cRif._address]);
        writeLog(`supportMarket => cRif ${cRif._address} `, true);
        //set collateral
        await send(newUnitroller, "_setCollateralFactor", [cRif._address, etherMantissa(config.collateralFactor)]);
        writeLog(`setCollateralFactor to cRif value=${etherMantissa(config.collateralFactor).toString()}\n`, true);
    } else {
        cRif = await saddle.deploy('CErc20Immutable', [addressRif, newUnitroller._address, interestRateWhitePaper._address, config.initialExchangeRateMantissa, "rLending Rif", "cRIF", 8, root]);
        generateLogAddress('cRif', cRif._address);
        //set cRif to adapterMoC
        await send(oracleProxy, "setAdapterToToken", [cRif._address, priceOracleAdapterRif._address]);
        writeLog(`set adapter oracle to cRif. adapter=${priceOracleAdapterRif._address}`, true);
        //set cRif to market
        await send(newUnitroller, "_supportMarket", [cRif._address]);
        writeLog(`supportMarket => cRif ${cRif._address} `, true);
        //set collateral
        await send(newUnitroller, "_setCollateralFactor", [cRif._address, etherMantissa(config.collateralFactor)]);
        writeLog(`setCollateralFactor to cRif value=${etherMantissa(config.collateralFactor).toString()}\n`, true);
    }
}

async function deployCRbtc() {
    //cRBTC
    if (cRBTCAddress) {
        cRBTC = await saddle.getContractAt('CErc20Immutable', cRBTCAddress);
        generateLogAddress('cRBTC', cRBTC._address);
    } else {
        cRBTC = await saddle.deploy('CRBTC', [newUnitroller._address, interestRateWhitePaper._address, config.initialExchangeRateMantissa, "RSK Smart Bitcoin", "cRBTC", 8, root]);
        generateLogAddress('cRBTC', cRBTC._address);
        //set cRif to adapterMoC
        await send(oracleProxy, "setAdapterToToken", [cRBTC._address, priceOracleAdapterRbtc._address]);
        writeLog(`set adapter oracle to cRBTC. adapter=${priceOracleAdapterRbtc._address}`, true);
        //set cRBTC to market
        await send(newUnitroller, "_supportMarket", [cRBTC._address]);
        writeLog(`supportMarket => cRBTC ${cRBTC._address} `, true);
        //set collateral
        await send(newUnitroller, "_setCollateralFactor", [cRBTC._address, etherMantissa(config.collateralFactor)]);
        writeLog(`setCollateralFactor to cRBTC value=${etherMantissa(config.collateralFactor).toString()}\n`, true);
    }
}

async function deployRLEN() {
    if (RLenAddress) {
        RLEN = await saddle.getContractAt('RLEN', RLenAddress);
    } else {
        RLEN = await saddle.deploy('RLEN', [multiSig._address]);
    }
    generateLogAddress('RLEN', RLEN._address);
    //set collateral
    await send(newUnitroller, "setCompAddress", [RLEN._address]);
    writeLog(`setCompAddress to RLEN value=${RLEN._address}\n`, true);
}

//deploy cTokens
async function cTokens() {
    //set underlying
    await setUnderlying();
    //cDai
    await deployCDai();

    //cRif
    await deployCRif();

    //cRBTC
    await deployCRbtc();

    //RLEN
    await deployRLEN();
};

//deploy Maximillion
async function maximillion() {
    if (maximillionAddress) {
        max = await saddle.getContractAt('Maximillion', maximillionAddress);
    } else {
        max = await saddle.deploy('Maximillion', [cRBTC._address]);
    }
    generateLogAddress('Maximillion', max._address);
};

async function setMultiSignOwnerAlpha() {
    let arrayToMultisigOwner = [cDai, cRif, cRBTC, oracleProxy, unitroller];
    for (let index = 0; index < arrayToMultisigOwner.length; index++) {
        //set pending admin
        await send(arrayToMultisigOwner[index], "_setPendingAdmin", [multiSig._address]);
        //generate data method accept admin
        const data = arrayToMultisigOwner[index].methods._acceptAdmin().encodeABI();
        //submit transacion multisig, when accept the admin of contract
        await send(multiSig, "submitTransaction", [arrayToMultisigOwner[index]._address, 0, data]);
        writeLog(`multiSig owner of ${arrayToMultisigOwner[index]._address}`, true);
    }
}

function printConfigAccount() {
    if (eVerb) {
        console.log(saddle.web3._provider.host);
        console.log("\n♢ saddle.accounts =>", saddle.accounts);
        console.log("♢ saddle network =>", saddle.network_config.network);
        console.log("♢ saddle config provider =>", saddle.web3._provider.host);
        let configSaddle = saddle.network_config.defaultOptions;
        delete configSaddle.data;
        console.log("♢ saddle config =>", configSaddle, "\n");
    }
}

//deploy all contracts
async function maint() {
    //validate args
    await validateEnvironment();
    printConfigAccount();
    //deploy contracts
    await rlendingLensDeploy();
    await multiSigWallet();
    await unitrollerDeploy();
    await priceOracleProxy();
    await comptrollerDeploy();
    await interestRateModel();
    await cTokens();
    await maximillion();
    await setMultiSignOwnerAlpha();
    console.log('\n \x1b[32m%s\x1b[0m', "All contracts are deployed..", "🌱\n");
}
maint();