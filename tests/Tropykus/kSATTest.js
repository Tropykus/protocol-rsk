const { etherMantissa } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, fastForward } = require('../Utils/Compound');

describe('rBTC (micro KSAT)', () => {
    beforeEach(async () => {
        [root, alice] = saddle.accounts;
        comptroller = await makeComptroller({
            kind: 'unitroller-g6'
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

    });
    it('Avoid minting if mint value is above 0.025 rBTC', async () => {
        await expect(send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.026) })).rejects.toRevert('revert R8');
    });
    it('Avoid minting if there is not enough market cap', async () => {
        expect(await send(
            comptroller,
            'enterMarkets',
            [markets.map(mkt => mkt._address)],
            { from: alice }),
        ).toSucceed();
        await expect(send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).rejects.toRevert('revert R9');
    });
    it('Should allow minting if the amount is less or equal to 0.025 and there is enough market cap', async () => {
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
        expect(Number(await call(kRBTC, 'balanceOf', [alice]))).toEqual(Number(etherMantissa(150)));
        expect(Number(await call(kRBTC, 'balanceOfUnderlying', [alice]))).toEqual(Number(etherMantissa(3)));
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.5)], { from: alice })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
    });
    it('Interest plus withdraw', async () => {
        /*
        Alice deposits 0.02 rBTC in the market at 4% APY
        After six months, Alice saved 0.0204 rBTC
        She withdraws the MAX after these six months. She got 0.0204 rBTC in her wallet.
        */
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(1)], { from: alice })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.02) })).toSucceed();
        expect((Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })))).toEqual(Number(etherMantissa(0.02)));
        fastForward(kSAT, 518400);
        expect((Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.02039452054794520547, 10)
    });
});