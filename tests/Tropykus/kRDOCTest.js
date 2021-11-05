const { etherMantissa } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller } = require('../Utils/Compound');

describe('RDDOC', () => {
  beforeEach(async () => {
    [root, alice, bob] = saddle.accounts;
    comptroller = await makeComptroller({
      kind: 'unitroller-g6'
    });

    rDOC = await deploy('StandardToken', [
      etherMantissa(2000000),
      'Test rDOC Tropykus',
      18,
      'trDOC'
    ])

    kRDOC = await makeCToken({
      name: 'krDOC',
      kind: 'crdoc',
      comptroller,
      underlying: rDOC,
      interestRateModelOpts: {
        kind: 'jump-rateV2',
        baseRate: 0.001,
        multiplier: 0.00470588235,
        jump: 0.00588,
        kink: 0.85
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 1,
      collateralFactor: 0.75
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
      markets = [kRBTC, kRDOC];
    expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
    expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(0.5) })).toSucceed();

    expect(await send(kRDOC.underlying, 'transfer', [bob, etherMantissa(10000)])).toSucceed();

    expect(await send(kRDOC.underlying, 'approve', [kRDOC._address, etherMantissa(10000)], { from: bob })).toSucceed();
    expect(await send(kRDOC, 'mint', [etherMantissa(10000)], { from: bob })).toSucceed();
  });

  it('Should fail if alice borrows more than 1000 rDOC', async () => {
    await expect(send(kRDOC, 'borrow', [etherMantissa(1001)], { from: alice })).rejects.toRevert('revert RD1');
  });
  it('Should pass if alice borrows up to 1000 rDOC', async () => {
    expect(await send(kRDOC, 'borrow', [etherMantissa(1000)], { from: alice })).toSucceed();
  });
  it('Should pass if alice borrows 999.999 rDOC', async () => {
    expect(await send(kRDOC, 'borrow', [etherMantissa(999.999)], { from: alice })).toSucceed();
  });
  it('Should pass if alice borrows 500 rDOC, then 300, then 150, then 50', async () => {
    expect(await send(kRDOC, 'borrow', [etherMantissa(500)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(300)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(150)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(50)], { from: alice })).toSucceed();
  });
  it('Should fail if alice borrows 500 rDOC, then 300, then 150, then 50 and attempts to borrow something else', async () => {
    expect(await send(kRDOC, 'borrow', [etherMantissa(500)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(300)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(150)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(50)], { from: alice })).toSucceed();
    await expect(send(kRDOC, 'borrow', [etherMantissa(0.1)], { from: alice })).rejects.toRevert('revert RD1');
  });
  it('Should pass if alice borrows 1000 rDOC and then bob also borrows 1000 rDOC', async () => {
    expect(await send(kRDOC, 'borrow', [etherMantissa(1000)], { from: alice })).toSucceed();
    expect(await send(kRDOC, 'borrow', [etherMantissa(1000)], { from: bob })).toSucceed();
  });
});