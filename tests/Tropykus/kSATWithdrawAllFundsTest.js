const { etherMantissa, etherBalance, etherGasCost, etherUnsigned } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, fastForward } = require('../Utils/Compound');

describe('kSAT Market protected against all liquidity withdrawal', () => {
  beforeEach(async () => {
    [root, alice, bob] = saddle.accounts;
    comptroller = await makeComptroller({
      kind: 'unitroller-g6',
      closeFactor: 0.5,
      liquidationIncentive: 0.07,
    });
    kSAT = await makeCToken({
      name: 'kSAT',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'hurricane',
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 52050,
      collateralFactor: 0.5,
    });
    kRBTC = await makeCToken({
      name: 'kRBTC',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'white-paper',
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 52050,
      collateralFactor: 0.5
    });
    markets = [kRBTC, kSAT];
    expect(await send(kSAT, 'addSubsidy', { from: root, value: etherMantissa(1) })).toSucceed();
    await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: root });
    await send(kRBTC, 'mint', { from: root, value: etherMantissa(10) });
    expect(await send(kRBTC, 'borrow', [etherMantissa(3)])).toSucceed();
  });
  it('Should allow a lender to mint after other lenders withdraw with utilization', async () => {
    expect(await send(kSAT, 'mint', { from: root, value: etherMantissa(0.025) })).toSucceed();
    expect(await send(kSAT, 'mint', { from: alice, value: etherMantissa(0.025) })).toSucceed();
    await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: bob });
    expect(await send(kRBTC, 'mint', { from: bob, value: etherMantissa(1) })).toSucceed();
    expect(await send(kSAT, 'borrow', [etherMantissa(0.01)], { from: bob })).toSucceed();
    fastForward(kSAT, 2880);
    fastForward(kRBTC, 2880);
    await send(comptroller, 'fastForward', [2880]);
    expect(await send(kSAT, 'redeem', [etherMantissa(1.25)], { from: alice })).toSucceed();
    expect(await send(kSAT, 'redeem', [etherMantissa(1.25)], { from: root })).toSucceed();
    expect(await send(kSAT, 'mint', { from: root, value: etherMantissa(0.025) })).toSucceed();
  });
});