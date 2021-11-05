const { etherMantissa, etherBalance } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, totalSupply, totalCash, totalBorrows, totalReserves, fastForward } = require('../Utils/Compound');

function Value(values) {
  this.totalSupply = values.totalSupply;
  this.totalCash = values.totalCash;
  this.totalBorrows = values.totalBorrows;
  this.reserves = values.reserves;
  this.subsidyFund = values.subsidyFund;
  this.underlyingHolded = values.underlyingHolded;
  this.UR = values.UR;
  this.BR = values.BR;
  this.ESR = values.ESR;
}

const generator = function* (items) {
  let i = 0;
  while (i < items) {
    yield i++;
  }
}

describe('kSAT with Hurricane', () => {
  it('Scenario 1', async () => {
    const [root, alice, bob, charlie] = saddle.accounts;
    const users = [root, alice, bob, charlie];
    const config = {
      initialExchangeRateMantissa: 0.02,
      liquidationIncentiveMantissa: 0.07,
      closeFactorMantissa: 0.5,
      compSpeed: 0,
      markets: {
        rbtc: {
          reserveFactor: 0.20,
          collateralFactor: 0.75,
          baseBorrowRate: 0.02,
          multiplier: 0.1,
        },
        sat: {
          reserveFactor: 0.3,
          collateralFactor: 0.5,
          baseBorrowRate: 0.08,
          promisedBaseReturnRate: 0.04,
          optimal: 0.5,
          borrowRateSlope: 0.04,
          supplyRateSlope: 0.02,
          initialSubsidy: 0,
        },
      },
    };
    const { rbtc, sat } = config.markets;
    const comptroller = await makeComptroller({
      kind: 'unitroller-g6'
    });
    const kSAT = await makeCToken({
      name: 'kSAT',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'hurricane',
        baseBorrowRate: sat.baseBorrowRate,
        promisedBaseReturnRate: sat.promisedBaseReturnRate,
        optimalUtilizationRate: sat.optimalUtilizationRate,
        borrowRateSlope: sat.borrowRateSlope,
        supplyRateSlope: sat.supplyRateSlope,
      },
      exchangeRate: config.initialExchangeRateMantissa,
      supportMarket: true,
      underlyingPrice: 50000,
      collateralFactor: sat.collateralFactor,
    });
    const kRBTC = await makeCToken({
      name: 'kRBTC',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'white-paper',
        baseRate: rbtc.baseBorrowRate,
        multiplier: rbtc.multiplier,
      },
      exchangeRate: config.initialExchangeRateMantissa,
      supportMarket: true,
      underlyingPrice: 50000,
      collateralFactor: rbtc.collateralFactor
    });
    const markets = [kRBTC, kSAT];
    users.forEach(async (u) => {
      await send(comptroller, 'enterMarkets', [markets.map((mkt) => mkt._address)], { from: u })
    });

    // Alice sets the initial conditions for the markets
    await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(10) });
    await send(kRBTC, 'borrow', [etherMantissa(5)], { from: alice });
    expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();

    // Bob deposits some collateral on kRBTC to be able to borrow at kSAT side
    await send(kRBTC, 'mint', [], { from: bob, value: etherMantissa(10) });
    await send(kSAT, 'borrow', [etherMantissa(0.01)], { from: bob });

    let values = [];
    let totalCashResult;
    let totalBorrowsResult;
    let reserves;
    let totalSupplyResult;
    let subsidyFund;
    let underlyingHolded;
    let UR;
    let BR;
    let ESR;

    let iterations = generator(13);
    for (let i of iterations) {
      totalCashResult = Number(await totalCash(kSAT)) / 1e18;
      totalBorrowsResult = Number(await totalBorrows(kSAT)) / 1e18;
      reserves = Number(await totalReserves(kSAT)) / 1e18;
      totalSupplyResult = Number(await totalSupply(kSAT)) / 1e18;
      subsidyFund = Number(await call(kSAT, 'subsidyFund')) / 1e18;
      underlyingHolded = Number(await etherBalance(kSAT._address)) / 1e18;
      UR = Number(await call(kSAT.interestRateModel, 'utilizationRate', [etherMantissa(totalCashResult), etherMantissa(totalBorrowsResult), etherMantissa(reserves)])) / 1e18;
      BR = Number(await call(kSAT.interestRateModel, 'getBorrowRate', [etherMantissa(totalBorrowsResult), etherMantissa(totalBorrowsResult), etherMantissa(reserves)])) / 1e18;
      ESR = Number(await call(kSAT.interestRateModel, 'getSupplyRate', [etherMantissa(totalBorrowsResult), etherMantissa(totalBorrowsResult), etherMantissa(reserves), etherMantissa(sat.reserveFactor)])) / 1e18;
      values.push(new Value({ totalSupply: totalSupplyResult, totalCash: totalCashResult, totalBorrows: totalBorrowsResult, reserves, subsidyFund, underlyingHolded, UR, BR, ESR }));
      await send(kSAT, 'balanceOfUnderlying', [alice]);
      await send(comptroller, 'fastForward', [87600]);
      await send(kSAT, 'harnessFastForward', [87600]);
    }
    console.table(values);
  });
});