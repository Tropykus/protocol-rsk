const { etherMantissa, etherBalance } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, fastForward, totalSupply } = require('../Utils/Compound');

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
        After six months, Alice saved 0.02039452054794520547 rBTC
        She withdraws the MAX after these six months. She got 0.02039452054794520547 rBTC in her wallet.
        */
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(1)], { from: alice })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.02) })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: root, value: etherMantissa(0.01) })).toSucceed();
        expect((Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })))).toEqual(Number(etherMantissa(0.02)));
        fastForward(kSAT, 518400);
        currentBalance = Number(await etherBalance(alice)) / 1e18;
        expect(Number(await call(kSAT, 'balanceOf', [alice], { from: alice })) / 1e18).toEqual(1);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toBeCloseTo(0.02039452054794520547, 10);
        expect(await send(kSAT, 'redeem', [etherMantissa(1)], { from: alice })).toSucceed();
        expect(Number(await etherBalance(alice)) / 1e18).toBeCloseTo(currentBalance + 0.02039452054794520547, 2);
    });
    describe('Market cap always as 80% of the total debt in other markets', () => {
        let totalSupply;
        it('Must fail if there is no debt in other markets', async () => {
            totalSupply = Number(await call(kSAT, 'totalSupply', [])) / 1e18;
            await expect(
                send(
                    kSAT.companion,
                    'verifySupplyMarketCapLimit',
                    [etherMantissa(totalSupply), etherMantissa(0), etherMantissa(0.02)],
                    { from: alice },
                )
            ).rejects.toRevert('revert R9');
        });
        it('Market cap 80% of 1000 equals 800', async () => {
            expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
            expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
            expect(await send(kRBTC, 'borrow', [etherMantissa(0.01921229586935639)], { from: alice })).toSucceed();
            expect(
                await send(
                    kSAT.companion,
                    'verifySupplyMarketCapLimit',
                    [etherMantissa(0), etherMantissa(0.01536983669548511), etherMantissa(0.02)],
                    { from: alice },
                )
            ).toSucceed();
        });
        it('Market cap 80% of 1000 as 800.0001 must fail', async () => {
            expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
            expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
            expect(await send(kRBTC, 'borrow', [etherMantissa(0.01921229586935639)], { from: alice })).toSucceed();
            await expect(
                send(
                    kSAT.companion,
                    'verifySupplyMarketCapLimit',
                    [etherMantissa(0), etherMantissa(0.0153698386167147), etherMantissa(0.02)],
                    { from: alice },
                )
            ).rejects.toRevert('revert R9');
        });
    });
});