const { etherMantissa } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, fastForward } = require('../Utils/Compound');

describe('rBTC (standard)', () => {
    beforeEach(async () => {
        blocksPerDay = 2880;
        [root, alice, bob] = saddle.accounts;
        comptroller = await makeComptroller({
            kind: 'unitroller-g6'
        });
        kRBTC = await makeCToken({
            name: 'kRBTC',
            kind: 'crbtc',
            comptroller,
            interestRateModelOpts: {
                kind: 'white-paper',
                baseRate: 0.02,
                multiplier: 0.1,
            },
            exchangeRate: 0.02,
            supportMarket: true,
            underlyingPrice: 61000,
            collateralFactor: 0.75
        });

        DOC = await deploy('StandardToken', [
            etherMantissa(2000000),
            'Test DOC Tropykus',
            18,
            'tDOC'
        ])

        kDOC = await makeCToken({
            name: 'kDOC',
            kind: 'cerc20',
            comptroller,
            underlying: DOC,
            interestRateModelOpts: {
                kind: 'jump-rateV2',
                baseRate: 0.08,
                multiplier: 0.02,
                jump: 0.55,
                kink: 0.9
            },
            exchangeRate: 0.02,
            supportMarket: true,
            underlyingPrice: 1,
            collateralFactor: 0.7
        });
        markets = [kRBTC, kDOC];

        await send(kRBTC, '_setReserveFactor', [etherMantissa(0.2)], { from: root })
        await send(kDOC, '_setReserveFactor', [etherMantissa(0.5)], { from: root })
    });

    it('Withdrawn earnings with 1% APY after 180 days', async () => {
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(0.5) })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: bob })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: bob, value: etherMantissa(1.5) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.463324959)], { from: bob })).toSucceed();

        fastForward(kRBTC, 518400);

        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toEqual(0.501972602745783);
    });

    it('Withdraw + borrow', async () => {
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(0.5) })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: bob })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: bob, value: etherMantissa(1.5) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.5348469228795509)], { from: bob })).toSucceed();

        expect((await call(kRBTC, 'supplyRatePerBlock', [])/1e18) * (blocksPerDay * 365) * 100).toBeCloseTo(1, 7);

        fastForward(kRBTC, 172800);
        
        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.500821917808219, 7);
        expect(await send(kRBTC, 'redeemUnderlying', [etherMantissa(0.3)], { from: alice })).toSucceed();
        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.200821917808219, 7);

        fastForward(kRBTC, 172800);
        await send(kRBTC, 'exchangeRateCurrent', []);

        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.201253466055087, 7);

        expect(await send(kDOC.underlying, 'transfer', [bob, etherMantissa(10000)])).toSucceed();
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(5000)], { from: bob })).toSucceed();
        expect(await send(kDOC, 'mint', [etherMantissa(5000)], { from: bob })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        hypotheticalAccountLiquidity = await call(comptroller, 'getHypotheticalAccountLiquidity', [alice, kRBTC._address, 0, 0]);
        allowedToBorrow = Number(hypotheticalAccountLiquidity[1])/1e18;
        expect(allowedToBorrow).toBeCloseTo(9207.346072020220, 7);

        expect((await call(kDOC, 'borrowRatePerBlock', [])/1e18) * (blocksPerDay * 365) * 100).toBeCloseTo(8, 7);
        expect(allowedToBorrow * 0.3).toBeCloseTo(2762.2038216060700, 7);
        expect(await send(kDOC, 'borrow', [etherMantissa(allowedToBorrow * 0.3)], { from: alice })).toSucceed();

        fastForward(kDOC, 518400);

        aliceDOCDebt =  Number(await call(kDOC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(aliceDOCDebt).toBeCloseTo(2887.901221585370000, 7);
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(aliceDOCDebt * 0.6)], { from: alice })).toSucceed();
        expect(await send(kDOC, 'repayBorrow', [etherMantissa(aliceDOCDebt * 0.6)], { from: alice })).toSucceed();
        expect(aliceDOCDebt * 0.6).toBeCloseTo(1732.7407329512200, 7);

        fastForward(kDOC, 86400);
        await send(kRBTC, 'exchangeRateCurrent', []);

        aliceDOCBalance = Number(await call(DOC, 'balanceOf', [alice], { from: alice })) / 1e18;
        aliceDOCDebt =  Number(await call(kDOC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(aliceDOCDebt).toBeCloseTo(1163.237463887960000, 7);
        expect(await send(kDOC.underlying, 'transfer', [alice, etherMantissa(aliceDOCDebt - aliceDOCBalance + 1)])).toSucceed();
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(aliceDOCDebt + 1)], { from: alice })).toSucceed();
        expect(await send(kDOC, 'repayBorrow', [etherMantissa(-1)], { from: alice })).toSucceed();

        aliceDOCDebt =  Number(await call(kDOC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(aliceDOCDebt).toEqual(0);
    });
});