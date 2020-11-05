const BigNumber = require('bignumber.js');
const {
    etherMantissa
} = require('../tests/Utils/Ethereum');

const [environment, verb] = args;
let eTest = false;
let eVerb = false;

let root, accounts;
let oracleProxy, comptroller, interestRate, underlyingDai, underlyingRif, cDai, cRif, cRBTC;
[root, a1, ...accounts] = saddle.accounts;

//validate enviroment
function validateEnvironment() {
    if (environment == 'test')
        eTest = true;
    if (verb == 'v')
        eVerb = true;
}
function writeLog(log, isVerbose) {
    (eVerb) ? console.log(log) : ((!isVerbose) ? (console.log(log)) : null);
}

//deploy contract by contract name, params and account
async function deployContract(contractName, param = null, byAccount = null) {
    //validate params, account 
    let deploy = (!param) ? ((!byAccount) ? saddle.deploy(contractName) : saddle.deploy(contractName, { byAccount })) : ((!byAccount) ? saddle.deploy(contractName, param) : saddle.deploy(contractName, param, { byAccount }));
    //deploy contract
    let contract = await deploy;
    //validate msj to response
    let msjparam = !param ? "" : "\n  params => " + param;
    let msjAccount = !byAccount ? "" : "\n  account=> " + byAccount;
    (eVerb) ? console.log(`Deployed ${contractName} to ${contract._address}  ${msjparam} ${msjAccount}\n`) : console.log(`Deployed ${contractName}\n`);
    return contract;
}

//deploy Unitroller 
async function unitroller() {
    await deployContract('Unitroller');
};

//deploy ComptrollerG3 
async function comptrollerG3() {
    comptroller = await deployContract('ComptrollerG3');
    await send(comptroller, "_setPriceOracle", [oracleProxy._address]);
    writeLog(`comptroller (${comptroller._address}) setPriceOracle [${oracleProxy._address}]`, true);
    await send(comptroller, "_setMaxAssets", [20]);
    writeLog(`comptroller (${comptroller._address}) setMaxAssets [20]`, true);
    await send(comptroller, "_setCloseFactor", [etherMantissa(0.5)]);
    writeLog(`comptroller (${comptroller._address}) setCloseFactor [0.5]`, true);
    await send(comptroller, "_setLiquidationIncentive", [etherMantissa(1.1)]);
    writeLog(`comptroller (${comptroller._address}) setLiquidationIncentive [1.1]`, true);
};

//deploy Price Oracle and Proxy 
async function priceOracleProxy() {
    oracleProxy = await deployContract('PriceOracleProxy', [root]);
    //deploy adapter [Money on Chain]
    let priceOracleAdapterMoC = await deployContract('PriceOracleAdapterMoc', [root]);
    //only for test
    if (eTest) {
        //rewrite deploy priceOracleProxy => PriceOracleExtends
        let priceOracle = await deployContract('PriceOracleProxyExtends', [root]);
        //adapter compound
        let priceOracleAdapterCompound = await deployContract('PriceOracleAdapterCompound', [root]);
        //deploy mock [Money on Chain]
        const priceOracleMoC = await deployContract('MockPriceProviderMoC', [new BigNumber('1e+18')]);
        //set mock to adapter [Money on Chain]
        let setPriceProvider = await send(priceOracleAdapterMoC, "setPriceProvider", [priceOracleMoC._address]);
        writeLog(`priceOracleAdapterMoC (${priceOracleAdapterMoC._address}) setPriceProvider [${priceOracleMoC._address}]`, true);
    }

};

//deploy InterestRateModel 
async function interestRateModel() {
    // 0.05 0.2 2 0.90
    interestRate = await deployContract('JumpRateModel', [etherMantissa(0.05), etherMantissa(0.2), etherMantissa(2), etherMantissa(0.90)]);
};


//deploy InterestRateModel 
async function cTokens() {
    writeLog("underlyingDai => StandardToken", false);
    //deploy underlying Dai
    underlyingDai = await deployContract('StandardToken', [new BigNumber(10000e18), "dai token", 18, "rDai"]);
    writeLog("cDai => CErc20Immutable", false);
    //deploy cDai
    cDai = await deployContract('CErc20Immutable', [underlyingDai._address, comptroller._address, interestRate._address, new BigNumber(2e18), "rLending Dai", "crDAI", 8, root]);
    writeLog("underlyingRif => StandardToken", false);
    //deploy underlying Rif
    underlyingRif = await deployContract('StandardToken', [new BigNumber(10000e18), "rif token", 18, "RIF"]);
    writeLog("cRif => CErc20Immutable", false);
    //deploy cRif
    cRif = await deployContract('CErc20Immutable', [underlyingRif._address, comptroller._address, interestRate._address, new BigNumber(2e18), "rLending Dai", "crDAI", 8, root]);
    //deploy cRBTC
    cRBTC = await deployContract('CRBTC', [comptroller._address, interestRate._address, new BigNumber(2e18), "RSK Smart Bitcoin", "cRBTC", 8, root]);
};

//deploy Maximillion
async function maximillion() {
    max = await deployContract('Maximillion', [cRBTC._address]);
};

//deploy all contracts 
async function deployMaint() {
    validateEnvironment();
    await unitroller();
    await priceOracleProxy();
    await comptrollerG3();
    await interestRateModel();
    await cTokens();
    await maximillion();

    //finish log
    console.log('\x1b[32m%s\x1b[0m', "All contract are deployed..");
    console.log('\x1b[42m%s\x1b[0m', "The script deploy is over!!", "🌱");
}

//call to deploy
deployMaint();