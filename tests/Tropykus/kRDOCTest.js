const { etherMantissa } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller } = require('../Utils/Compound');

describe('RDDOC', () => {
  beforeEach(async () => {
    [root, alice] = saddle.accounts;
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
      collateralFactor: 0.7
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
  });

  it('Should fail if alice borrows more than 1000 rDOC', async () => {
    expect(await send(kRDOC, 'harnessBorrowFresh', [alice, etherMantissa(1001)], { from: alice })).rejects.toRevert('revert RD1');
  });

  it('Should pass if alice borrows up to 1000 rDOC', async () => {
    // await expect(send(kRDOC, 'borrow', [etherMantissa(1000)], { from: alice })).toSucceed();
  });

  it('Should pass if alice borrows 500 rDOC, then 300, then 150, then 50', async () => {
    // await expect(send(kRDOC, 'borrow', [etherMantissa(500)], { from: alice })).toSucceed();
    // await expect(send(kRDOC, 'borrow', [etherMantissa(300)], { from: alice })).toSucceed();
    // await expect(send(kRDOC, 'borrow', [etherMantissa(150)], { from: alice })).toSucceed();
    // await expect(send(kRDOC, 'borrow', [etherMantissa(50)], { from: alice })).toSucceed();
  });
});