const fs = require('fs');

var contracts;
if (fs.existsSync("./.build/contracts.json")) {
    contracts = JSON.parse(fs.readFileSync("./.build/contracts.json").toString());
} else {
    console.log('Compile the contracts before running this script');
    process.exit()
}

fs.writeFileSync('./abis/Unitroller.json', contracts.contracts['contracts/Unitroller.sol:Unitroller'].abi);
console.log('Unitroller.json created');
fs.writeFileSync('./abis/ComptrollerG6.json', contracts.contracts['contracts/ComptrollerG6.sol:ComptrollerG6'].abi);
console.log('ComptrollerG6.json created');
fs.writeFileSync('./abis/JumpRateModelV2.json', contracts.contracts['contracts/JumpRateModelV2.sol:JumpRateModelV2'].abi);
console.log('JumpRateModelV2.json created');
fs.writeFileSync('./abis/CToken.json', contracts.contracts['contracts/CErc20Immutable.sol:CErc20Immutable'].abi);
console.log('CToken.json created');
fs.writeFileSync('./abis/CRBTC.json', contracts.contracts['contracts/CRBTC.sol:CRBTC'].abi);
console.log('CRBTC.json created');
fs.writeFileSync('./abis/WhitePaperInterestRateModel.json', contracts.contracts['contracts/WhitePaperInterestRateModel.sol:WhitePaperInterestRateModel'].abi);
console.log('WhitePaperInterestRateModel.json created');
fs.writeFileSync('./abis/HurricaneInterestRateModel.json', contracts.contracts['contracts/HurricaneInterestRateModel.sol:HurricaneInterestRateModel'].abi);
console.log('HurricaneInterestRateModel.json created');
fs.writeFileSync('./abis/PriceOracleProxy.json', contracts.contracts['contracts/PriceOracleProxy.sol:PriceOracleProxy'].abi);
console.log('PriceOracleProxy.json created');
fs.writeFileSync('./abis/PriceOracleAdapterMoc.json', contracts.contracts['contracts/PriceOracleAdapterMoc.sol:PriceOracleAdapterMoc'].abi);
console.log('PriceOracleAdapterMoc.json created');
fs.writeFileSync('./abis/PriceProviderMoC.json', contracts.contracts['contracts/PriceOracleAdapterMoc.sol:PriceProviderMoC'].abi);
console.log('PriceProviderMoC.json created');
fs.writeFileSync('./abis/TropykusLens.json', contracts.contracts['contracts/Lens/TropykusLens.sol:TropykusLens'].abi);
console.log('TropykusLens.json created');
fs.writeFileSync('./abis/StandardToken.json', contracts.contracts['contracts/ERC20.sol:StandardToken'].abi);
console.log('StandardToken.json created');
fs.writeFileSync('./abis/CErc20Immutable.json', contracts.contracts['contracts/CErc20Immutable.sol:CErc20Immutable'].abi);
console.log('CErc20Immutable.json created');
