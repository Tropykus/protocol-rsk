const { hours, days } = require("./common");
require('../loader');

function Value(exchangeRate, borrowBalance) {
    this.exchangeRate = exchangeRate;
    this.borrowBalance = borrowBalance;
}

(async () => {
    [dep, alice, bob, eve] = await ethers.getSigners();
    comptroller = await ethers.getContractAt('ComptrollerG6', Comptroller, dep);
    rif = await ethers.getContractAt('StandardToken', RIF, dep);
    doc = await ethers.getContractAt('StandardToken', DOC, dep);
    rdoc = await ethers.getContractAt('StandardToken', RDOC, dep);
    usdt = await ethers.getContractAt('StandardToken', USDT, dep);
    crif = await ethers.getContractAt('CErc20Immutable', cRIF, dep);
    cdoc = await ethers.getContractAt('CErc20Immutable', cDOC, dep);
    crdoc = await ethers.getContractAt('CRDOC', cRDOC, dep);
    cusdt = await ethers.getContractAt('CErc20Immutable', cUSDT, dep);
    crbtc = await ethers.getContractAt('CRBTC', cRBTC, dep);
    csat = await ethers.getContractAt('CRBTC', cSAT, dep);
    priceOracleProxy = await ethers.getContractAt('PriceOracleProxy', PriceOracleProxy, dep);
    rbtcOracle = await ethers.getContractAt('MockPriceProviderMoC', RBTCOracle, dep);
    mkts = await comptroller.getAllMarkets();
    users = [dep, alice, bob, eve];
    users.forEach(async (u) => await comptroller.connect(u).enterMarkets(mkts));

    let values = [];
    // Dep injects enough liquidity into the kDOC market
    await doc.approve(cdoc.address, ethers.utils.parseEther('1000'));
    await cdoc.mint(ethers.utils.parseEther('1000'));

    // Alice mint enough USDT to use as collateral
    await usdt.transfer(alice.address, ethers.utils.parseEther('5000'));
    await usdt.connect(alice).approve(cusdt.address, ethers.utils.parseEther('5000'));
    await cusdt.connect(alice).mint(ethers.utils.parseEther('5000'));

    // Alice borrows 100 DOC from the kDOC market
    values.push(new Value(Number(await cdoc.callStatic.exchangeRateCurrent()) / 1e18, Number(await cdoc.callStatic.borrowBalanceCurrent(alice.address)) / 1e18, Number(await cdoc.callStatic.supplyRatePerBlock()) / 1e18 * 1051200));
    await cdoc.connect(alice).borrow(ethers.utils.parseEther('100'));
    values.push(new Value(Number(await cdoc.callStatic.exchangeRateCurrent()) / 1e18, Number(await cdoc.callStatic.borrowBalanceCurrent(alice.address)) / 1e18, Number(await cdoc.callStatic.supplyRatePerBlock()) / 1e18 * 1051200));

    // Simulation for 7 days
    i = 0;
    while (i < 7) {
        i++;
        day = days(1);
        for await (let i of day) {
            await cdoc.balanceOfUnderlying(dep.address).then(tx => tx.wait());
        }
        values.push(new Value(Number(await cdoc.callStatic.exchangeRateCurrent()) / 1e18, Number(await cdoc.callStatic.borrowBalanceCurrent(alice.address)) / 1e18, Number(await cdoc.callStatic.supplyRatePerBlock()) / 1e18 * 1051200));
        console.table(values);
    }
    console.table(values);
})();