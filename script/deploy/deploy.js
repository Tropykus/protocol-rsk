const BigNumber = require('bignumber.js');
const {
    etherMantissa,
} = require('../../tests/Utils/Ethereum');
//enviroment
const [environment, verb] = args;
let eTest = false;
let eVerb = false;
//config script
const logPath = __dirname + '/contractAddressesDeploy.json';
const liquidationIncentiveMantisa = new BigNumber(1.08e18);
const closeFactorMantisa = etherMantissa(.051);
const maxAssets = 20;
const compRate = new BigNumber("0e18"); //0 to not drip
const compMarkets = [];
const otherMarkets = [];
let unitroller, newUnitroller, oracleProxy, comptroller, interestRate, underlyingDai, underlyingRif, cDai, cRif, cRBTC, priceOracleAdapterCompound, priceOracleMoC, priceOracleAdapterMoC;
[root, a2, ...accounts] = saddle.accounts;
let arrayToFile = new Array();

function validateEnvironment() {
    if (environment == 'test')
        eTest = true;
    if (verb == 'v')
        eVerb = true;
}
//validate enviroment
function writeLog(log, isVerbose) {
    (eVerb) ? console.log(log) : ((!isVerbose) ? (console.log(log)) : null);
}
//generate log contract to write
function generateLogAddress(nameContract, addresContract) {
    console.log(`🔹Deployed ${nameContract}\n`);
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
    //set new comptroller implementation
    await send(unitroller, "_setPendingImplementation", [comptroller._address]);
    // await send(comptroller, '_become', [unitroller._address, compRate, compMarkets, otherMarkets]);
    await send(comptroller, '_become', [unitroller._address]);
    //get unitroller then implementate Comptroller
    newUnitroller = await saddle.getContractAt("Comptroller", unitroller._address);
    generateLogAddress('Unitroller', comptroller._address);
    //set price oracle
    await send(newUnitroller, "_setPriceOracle", [oracleProxy._address]);
    writeLog(`newUnitroller (${newUnitroller._address}) setPriceOracle [${oracleProxy._address}]`, true);
    //set max assets
    await send(newUnitroller, "_setMaxAssets", [maxAssets]);
    writeLog(`newUnitroller (${newUnitroller._address}) setMaxAssets [20]`, true);
    //set max close factor
    await send(newUnitroller, "_setCloseFactor", [closeFactorMantisa]);
    writeLog(`newUnitroller (${newUnitroller._address}) setCloseFactor [0.051]`, true);
    //set max liquidation incentive
    await send(newUnitroller, "_setLiquidationIncentive", [liquidationIncentiveMantisa]);
    writeLog(`newUnitroller (${newUnitroller._address}) setLiquidationIncentive [1.1]`, true);
    // set comp rate
    await send(newUnitroller, "_setCompRate", [compRate]);
    writeLog(`newUnitroller (${newUnitroller._address}) _setCompRate [1.1]`, true);
    //add Comp Markets
    await send(newUnitroller, "_addCompMarkets", [compMarkets]);
    writeLog(`newUnitroller (${newUnitroller._address}) _addCompMarkets []`, true);
};

//deploy Price Oracle and Proxy 
async function priceOracleProxy() {
    oracleProxy = await saddle.deploy('PriceOracleProxy', [root]);
    generateLogAddress('PriceOracleProxy', oracleProxy._address);
    //deploy adapter [Money on Chain]
    priceOracleAdapterMoC = await saddle.deploy('PriceOracleAdapterMoc', [root]);
    generateLogAddress('PriceOracleAdapterMoc', priceOracleAdapterMoC._address);
    //only for test
    if (eTest) {
        priceOracleMoC = await saddle.deploy('MockPriceProviderMoC', [new BigNumber('1e+18')]);
        generateLogAddress('MockPriceProviderMoC', priceOracleMoC._address);
        //set mock to adapter [Money on Chain]
        let setPriceProvider = await send(priceOracleAdapterMoC, "setPriceProvider", [priceOracleMoC._address]);
        writeLog(`priceOracleAdapterMoC (${priceOracleAdapterMoC._address}) setPriceProvider [${setPriceProvider._address}]`, true);
    }

};

//deploy InterestRateModel 
async function interestRateModel() {
    // 0.05 0.2 2 0.90
    interestRate = await saddle.deploy('JumpRateModelV2', [etherMantissa(0.05), etherMantissa(0.2), etherMantissa(2), etherMantissa(0.90), root]);
    generateLogAddress('JumpRateModel', interestRate._address);
};

//deploy cTokens 
async function cTokens() {
    //deploy underlying Dai
    writeLog("underlyingDai => StandardToken", false);
    underlyingDai = await saddle.deploy('StandardToken', [new BigNumber(20000e18), "dai token", 18, "rDai"]);
    generateLogAddress('underlyingDai', underlyingDai._address);
    //deploy cDai
    writeLog("cDai => CErc20Immutable", false);
    cDai = await saddle.deploy('CErc20Immutable', [underlyingDai._address, newUnitroller._address, interestRate._address, new BigNumber(2e18), "rLending Dai", "crDAI", 8, root]);
    generateLogAddress('cDai', cDai._address);
    //set cDai to adapterMoC
    await send(oracleProxy, "setAdapterToToken", [cDai._address, priceOracleAdapterMoC._address]);
    writeLog("set adapter to cToken => cDai - priceOracleAdapterMoneyOnChain \n", true);
    //deploy underlying Rif
    writeLog("underlyingRif => StandardToken", false);
    underlyingRif = await saddle.deploy('StandardToken', [new BigNumber(10000e18), "rif token", 18, "RIF"]);
    generateLogAddress('underlyingRif', underlyingRif._address);
    //deploy cRif
    writeLog("cRif => CErc20Immutable", false);
    cRif = await saddle.deploy('CErc20Immutable', [underlyingRif._address, newUnitroller._address, interestRate._address, new BigNumber(2e18), "rLending Dai", "crDAI", 8, root]);
    generateLogAddress('cRif', cRif._address);
    //deploy cRBTC
    cRBTC = await saddle.deploy('CRBTC', [newUnitroller._address, interestRate._address, new BigNumber(2e18), "RSK Smart Bitcoin", "cRBTC", 8, root]);
    generateLogAddress('cRBTC', cRif._address);
    //set cDai to market
    await send(newUnitroller, "_supportMarket", [cDai._address]);
    writeLog("_supportMarket => cDai ", true);
    //set collateral
    await send(newUnitroller, "_setCollateralFactor", [cDai._address, etherMantissa(0.5)], { from: root });
    writeLog("_setCollateralFactor => cDai - 0.5 ", true);
};

//deploy Maximillion
async function maximillion() {
    max = await saddle.deploy('Maximillion', [cRBTC._address]);
    generateLogAddress('Maximillion', max._address);
};

//deploy all contracts 
async function deployMaint() {
    //validate args
    validateEnvironment();
    //deploy contracts
    await unitrollerDeploy();
    await priceOracleProxy();
    await comptrollerDeploy();
    await interestRateModel();
    await cTokens();
    await maximillion();
    console.log('\x1b[32m%s\x1b[0m', "All contracts are deployed..", "🌱");
}
deployMaint();