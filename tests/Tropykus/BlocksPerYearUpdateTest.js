const {
  etherMantissa,
  etherBalance,
  etherGasCost,
  etherUnsigned,
} = require('../Utils/Ethereum');

const {
  makeComptroller,
  makeCToken,
  fastForward,
} = require('../Utils//Compound');

describe('Blocks per year update effect on Tropykus protocol', () => {
  blocksPerYear1 = 1051200;
  blocksPerYear2 = 2000000;
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
    kDOC = await makeCToken({
      name: 'kDOC',
      comptroller,
      interestRateModelOpts: {
        kind: 'jump-rateV2',
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 1,
      collateralFactor: 0.8
    });
    markets = [kRBTC, kSAT, kDOC];
    expect(await send(
      comptroller,
      'enterMarkets',
      [markets.map((mkt) => mkt._address)],
      { from: root },
    )).toSucceed();
    expect(await send(
      comptroller,
      'enterMarkets',
      [markets.map((mkt) => mkt._address)],
      { from: alice },
    )).toSucceed();
    expect(await send(
      kDOC.underlying,
      'approve',
      [kDOC._address, etherMantissa(10000)],
      { from: root },
    )).toSucceed();
    expect(await send(
      kDOC,
      'mint',
      [etherMantissa(10000)],
      { from: root },
    )).toSucceed();
  });
  describe('Supply and borrow rates are the same at 50% utilization rate upon change', () => {
    describe('kDOC case', () => {
      it('should fit for change on blocks per year', async () => {
        expect(Number(await call(kDOC.underlying, 'balanceOf', [kDOC._address])) / 1e18).toBeCloseTo(10e3, 8);
        expect(Number(await call(kDOC, 'supplyRatePerBlock')) / 1e18).toBeCloseTo(0, 8);
        expect(Number(await call(kDOC, 'borrowRatePerBlock')) / 1e18).toBeCloseTo(0.05 / blocksPerYear1, 8);
        expect(Number(await call(kDOC.underlying, 'balanceOf', [alice])) / 1e18).toEqual(0);
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(10) })).toSucceed();
        expect(await send(kDOC, 'borrow', [etherMantissa(5000)], { from: alice })).toSucceed();
        cash = Number(await call(kDOC, 'getCash'))/1e18;
        borrows = Number(await call(kDOC, 'totalBorrows'))/1e18;
        reserves = Number(await call(kDOC, 'totalReserves'))/1e18;
        params = [cash, borrows, reserves];
        expect(Number(await call(kDOC.interestRateModel, 'utilizationRate', params)) / 1e18).toBeCloseTo(0.5, 8);
        br = Number(await call(kDOC.interestRateModel, 'getBorrowRate', params)) / 1e18;
        expect(Number(await call(kDOC.underlying, 'balanceOf', [alice])) / 1e18).toEqual(5000);
        expect(Number(await call(kDOC, 'borrowRatePerBlock')) / 1e18).toBeCloseTo(br, 8);
        expect(await send(kDOC.interestRateModel, 'setBlocksPerYear', [blocksPerYear2])).toSucceed();
        expect(Number(await call(kDOC, 'borrowRatePerBlock')) / 1e18).toBeCloseTo(br, 8);
      });
    });
  });
});