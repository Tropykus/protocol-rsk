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
            collateralFactor: 0.5
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
        /*
        Alice deposits 0.5 rBTC in the market at 1% APY
        After six months, Alice saved 0.0025 rBTC
        She withdraws the MAX after these six months. She got 0.5025 rBTC in her wallet.
        */
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(0.5) })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: bob })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: bob, value: etherMantissa(1.5) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.463324959)], { from: bob })).toSucceed();

        fastForward(kRBTC, 518400);

        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toEqual(0.501972602745783);
    });

    it('Withdraw + borrow', async () => {
        /*
        Alice deposits 0.5 rBTC in the market at 1% APY
        After two months, Alice saved 0.00083 rBTC
        She withdraws 0.3 rBTC after these two months. 
        She left 0.20083 rBTC in Tropykus
        Two months later, she has 0.20083 + interest accrued 0.0020083 = 0.2028383 rBTC
        She borrows 30% of the amount permitted by its collateral in DOC at 8% APY
        50% collateral factor in rBTC: 0.10141 rBTC = 6186 DOC (assuming rBTC at 61.000) 
        Alice receives 30% of the possible permitted borrow: 1855,8 DOC 
        6 months later she pays 60% of the loan 
        One month later pays the remaining amount. 
        The loan is completely repaid.
        */
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(0.5) })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: bob })).toSucceed();
        expect(await send(kRBTC, 'mint', [], { from: bob, value: etherMantissa(1.5) })).toSucceed();

        expect(await send(kRBTC, 'borrow', [etherMantissa(0.5348469228795509)], { from: bob })).toSucceed();

        expect((await call(kRBTC, 'supplyRatePerBlock', [])/1e18) * (blocksPerDay * 365) * 100).toBeCloseTo(1, 8);

        fastForward(kRBTC, 172800);
        
        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.500821917808219, 10);
        expect(await send(kRBTC, 'redeemUnderlying', [etherMantissa(0.3)], { from: alice })).toSucceed();
        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.200821917808219, 10);

        fastForward(kRBTC, 172800);
        expect((Number(await call(kRBTC, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18)).toBeCloseTo(0.201253466055087, 10);

        expect(await send(kDOC.underlying, 'transfer', [bob, etherMantissa(10000)])).toSucceed();
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(5000)], { from: bob })).toSucceed();
        expect(await send(kDOC, 'mint', [etherMantissa(5000)], { from: bob })).toSucceed();

        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        hypotheticalAccountLiquidity = await call(comptroller, 'getHypotheticalAccountLiquidity', [alice, kDOC._address, 0, 0]);
        allowedToBorrow = Number(hypotheticalAccountLiquidity[1])/1e18;

        expect((await call(kDOC, 'borrowRatePerBlock', [])/1e18) * (blocksPerDay * 365) * 100).toBeCloseTo(8, 8);
        expect(await send(kDOC, 'borrow', [etherMantissa(allowedToBorrow * 0.3)], { from: alice })).toSucceed();

        fastForward(kDOC, 518400);

        aliceDOCDebt =  Number(await call(kDOC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(aliceDOCDebt * 0.6)], { from: alice })).toSucceed();
        expect(await send(kDOC, 'repayBorrow', [etherMantissa(aliceDOCDebt * 0.6)], { from: alice })).toSucceed();

        fastForward(kDOC, 86400);

        aliceDOCBalance = Number(await call(DOC, 'balanceOf', [alice], { from: alice })) / 1e18;
        aliceDOCDebt =  Number(await call(kDOC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(await send(kDOC.underlying, 'transfer', [alice, etherMantissa(aliceDOCDebt - aliceDOCBalance + 1)])).toSucceed();
        expect(await send(kDOC.underlying, 'approve', [kDOC._address, etherMantissa(aliceDOCDebt + 1)], { from: alice })).toSucceed();
        expect(await send(kDOC, 'repayBorrow', [etherMantissa(-1)], { from: alice })).toSucceed();
    });
});