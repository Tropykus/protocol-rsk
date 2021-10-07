const fs = require('fs');

var contracts;
if (fs.existsSync("./.build/contracts.json")) {
    contracts = JSON.parse(fs.readFileSync("./.build/contracts.json").toString());
} else {
    console.log('Compile the contracts before running this script');
    process.exit()
}

fs.writeFileSync('./abis/Unitroller.json', JSON.stringify(contracts.contracts['contracts/Unitroller.sol:Unitroller'].abi));
console.log('Unitroller.json created');
fs.writeFileSync('./abis/ComptrollerG6.json', JSON.stringify(contracts.contracts['contracts/ComptrollerG6.sol:ComptrollerG6'].abi));
console.log('ComptrollerG6.json created');
fs.writeFileSync('./abis/JumpRateModelV2.json', JSON.stringify(contracts.contracts['contracts/JumpRateModelV2.sol:JumpRateModelV2'].abi));
console.log('JumpRateModelV2.json created');
fs.writeFileSync('./abis/CToken.json', JSON.stringify(contracts.contracts['contracts/CErc20Immutable.sol:CErc20Immutable'].abi));
console.log('CToken.json created');
fs.writeFileSync('./abis/CRBTC.json', JSON.stringify(contracts.contracts['contracts/CRBTC.sol:CRBTC'].abi));
console.log('CRBTC.json created');
fs.writeFileSync('./abis/WhitePaperInterestRateModel.json', JSON.stringify(contracts.contracts['contracts/WhitePaperInterestRateModel.sol:WhitePaperInterestRateModel'].abi));
console.log('WhitePaperInterestRateModel.json created');
fs.writeFileSync('./abis/HurricaneInterestRateModel.json', JSON.stringify(contracts.contracts['contracts/HurricaneInterestRateModel.sol:HurricaneInterestRateModel'].abi));
console.log('HurricaneInterestRateModel.json created');
fs.writeFileSync('./abis/PriceOracleProxy.json', JSON.stringify(contracts.contracts['contracts/PriceOracleProxy.sol:PriceOracleProxy'].abi));
console.log('PriceOracleProxy.json created');
fs.writeFileSync('./abis/PriceOracleAdapterMoc.json', JSON.stringify(contracts.contracts['contracts/PriceOracleAdapterMoc.sol:PriceOracleAdapterMoc'].abi));
console.log('PriceOracleAdapterMoc.json created');
fs.writeFileSync('./abis/PriceProviderMoC.json', JSON.stringify(contracts.contracts['contracts/PriceOracleAdapterMoc.sol:PriceProviderMoC'].abi));
console.log('PriceProviderMoC.json created');
fs.writeFileSync('./abis/TropykusLens.json', JSON.stringify(contracts.contracts['contracts/Lens/TropykusLens.sol:TropykusLens'].abi));
console.log('TropykusLens.json created');
fs.writeFileSync('./abis/StandardToken.json', JSON.stringify(contracts.contracts['contracts/ERC20.sol:StandardToken'].abi));
console.log('StandardToken.json created');
fs.writeFileSync('./abis/CErc20Immutable.json', JSON.stringify(contracts.contracts['contracts/CErc20Immutable.sol:CErc20Immutable'].abi));
console.log('CErc20Immutable.json created');
fs.writeFileSync('./abis/CRDOC.json', JSON.stringify(contracts.contracts['contracts/CRDOC.sol:CRDOC'].abi));
console.log('CRDOC.json created');
