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
        MoC: "0x2d39cc54dc44ff27ad23a91a9b5fd750dae4b218",
        Dai: "0x",
        Rif: "0x",
    },
    mainnet: {
        MoC: "0x",
        Dai: "0x",
        Rif: "0x",
    }
};
const logPath = __dirname + '/contractAddressesDeploy.json';
let unitroller, newUnitroller, oracleProxy, comptroller, interestRate, underlyingDai, underlyingRif, cDai, cRif, cRBTC, interestRateWhitePaper, priceOracleMoC, priceOracleAdapterMoC, multiSig, RLEN, addressMoC, addressRif;
[root, ...accounts] = saddle.accounts;
//set array to write to file
let arrayToFile = new Array();
//set verbose default
let eVerb = false;
//set network
let network = saddle.network_config.network;

//validate enviroment
function validateEnvironment() {
    //todo enviroment to set network 
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
    multiSig = await saddle.deploy('MultiSigWallet', [[root], 1]);
    generateLogAddress('MultiSigWallet', multiSig._address);
};

//deploy Unitroller 
async function unitrollerDeploy() {
    unitroller = await saddle.deploy('Unitroller');
    generateLogAddress('UnitrollerImp', unitroller._address);
};

//deploy Comptroller
async function comptrollerDeploy() {
    //deploy comptroller
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
};

//deploy Price Oracle and Proxy 
async function priceOracleProxy() {
    oracleProxy = await saddle.deploy('PriceOracleProxy', [root]);
    generateLogAddress('PriceOracleProxy', oracleProxy._address);
    //deploy adapter [Money on Chain]
    priceOracleAdapterMoC = await saddle.deploy('PriceOracleAdapterMoc', [root]);
    generateLogAddress('PriceOracleAdapterMoc ', priceOracleAdapterMoC._address);
    // set price depend on net
    await setPriceProvider();

};

//set price provider addres in oracleAdapterMoC
async function setPriceProvider() {
    switch (network) {
        case 'development':
            //deploy mock
            priceOracleMoC = await saddle.deploy('MockPriceProviderMoC', [new BigNumber('1e+18')]);
            generateLogAddress('🔸MockPriceProviderMoC ', priceOracleMoC._address);
            addressMoC = priceOracleMoC._address;
            break;
        case 'testnet':
            addressMoC = config.testnet.MoC;
            break;
        case 'mainet':
            addressMoC = config.mainnet.MoC;
            break;
    }
    //set mock to adapter [Money on Chain]
    await send(priceOracleAdapterMoC, "setPriceProvider", [addressMoC]);
    writeLog(`setPriceProvider  MoC=${addressMoC}\n`, true);
}

//deploy InterestRateModel 
async function interestRateModel() {
    // 0.05 0.2 2 0.90
    interestRate = await saddle.deploy('JumpRateModelV2', [etherMantissa(0.05), etherMantissa(0.2), etherMantissa(2), etherMantissa(0.90), root]);
    generateLogAddress('JumpRateModelV2', interestRate._address);
    //deploy WhitePaperInterestRateModel [interestRate]
    interestRateWhitePaper = await saddle.deploy('WhitePaperInterestRateModel', [etherMantissa(0.05), etherMantissa(0.2)]);
    generateLogAddress('WhitePaperInterestRateModel', interestRateWhitePaper._address);
};

//set underlying token
async function setUnderlying() {
    switch (network) {
        case 'development':
            //deploy underlying Day 
            underlyingDai = await saddle.deploy('StandardToken', [new BigNumber(2000000e18), "dai token", 18, "rDai"]);
            generateLogAddress('underlyingDai', underlyingDai._address);
            addressDai = underlyingDai._address;
            //deploy underlying Rif 
            underlyingRif = await saddle.deploy('StandardToken', [new BigNumber(2000000e18), "rif token", 18, "RIF"]);
            generateLogAddress('underlyingRif', underlyingRif._address);
            addressRif = underlyingRif._address;
            break;
        case 'testnet':
            addressDai = config.testnet.Dai;
            addressRif = config.testnet.rif;
            break;
        case 'mainet':
            addressDai = config.mainnet.Dai;
            addressRif = config.mainnet.rif;
            break;
    }
    writeLog(`underlyingDai ${addressDai} `, true);
    writeLog(`underlyingRif ${addressRif} \n`, true);
}

//deploy cTokens 
async function cTokens() {
    //set underlying
    await setUnderlying();

    //cDai
    cDai = await saddle.deploy('CErc20Immutable', [addressDai, newUnitroller._address, interestRate._address, config.initialExchangeRateMantissa, "rLending Dai", "crDAI", 8, root]);
    generateLogAddress('cDai', cDai._address);
    //set cDai to adapterMoC
    await send(oracleProxy, "setAdapterToToken", [cDai._address, priceOracleAdapterMoC._address]);
    writeLog(`set adapter oracle to cDai. adapter=${priceOracleAdapterMoC._address}`, true);
    //set cDai to market
    let a = await send(newUnitroller, "_supportMarket", [cDai._address]);
    writeLog(`supportMarket => cDai ${cDai._address} `, true);
    //set collateral
    await send(newUnitroller, "_setCollateralFactor", [cDai._address, etherMantissa(config.collateralFactor)], { from: root });
    writeLog(`setCollateralFactor to cDai value=${etherMantissa(config.collateralFactor).toString()}\n`, true);

    //cRif
    cRif = await saddle.deploy('CErc20Immutable', [addressRif, newUnitroller._address, interestRateWhitePaper._address, config.initialExchangeRateMantissa, "rLending Dai", "crDAI", 8, root]);
    generateLogAddress('cRif', cRif._address);
    //set cDai to adapterMoC
    await send(oracleProxy, "setAdapterToToken", [cRif._address, priceOracleAdapterMoC._address]);
    writeLog(`set adapter oracle to cRif. adapter=${priceOracleAdapterMoC._address}`, true);
    //set cRif to market
    await send(newUnitroller, "_supportMarket", [cRif._address]);
    writeLog(`supportMarket => cRif ${cRif._address} `, true);
    //set collateral
    await send(newUnitroller, "_setCollateralFactor", [cRif._address, etherMantissa(config.collateralFactor)], { from: root });
    writeLog(`setCollateralFactor to cRif value=${etherMantissa(config.collateralFactor).toString()}\n`, true);

    //cRBTC
    cRBTC = await saddle.deploy('CRBTC', [newUnitroller._address, interestRateWhitePaper._address, config.initialExchangeRateMantissa, "RSK Smart Bitcoin", "cRBTC", 8, root]);
    generateLogAddress('cRBTC', cRBTC._address);
    //set cRBTC to oracle proxy
    await send(oracleProxy, "setCRBTCAddress", [cRBTC._address]);
    writeLog("set CRBTC to oracle proxy", true);
    //set cRBTC to market
    await send(newUnitroller, "_supportMarket", [cRBTC._address]);
    writeLog(`supportMarket => cRif ${cRBTC._address} `, true);
    //set collateral
    await send(newUnitroller, "_setCollateralFactor", [cRBTC._address, etherMantissa(config.collateralFactor)], { from: root });
    writeLog(`setCollateralFactor to cRBTC value=${etherMantissa(config.collateralFactor).toString()}\n`, true);

    //RLEN
    RLEN = await saddle.deploy('RLEN', [multiSig._address]);
    generateLogAddress('RLEN', RLEN._address);
};

//deploy Maximillion
async function maximillion() {
    max = await saddle.deploy('Maximillion', [cRBTC._address]);
    generateLogAddress('Maximillion', max._address);
};

async function setMultiSignOwnerAlpha() {
    let arrayToMultisigOwner = [unitroller, cDai, cRif, cRBTC, oracleProxy];
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
    validateEnvironment();
    printConfigAccount();
    //deploy contracts
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