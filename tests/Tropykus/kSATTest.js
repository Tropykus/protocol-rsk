const { etherMantissa, etherBalance, etherGasCost, etherUnsigned } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller, fastForward } = require('../Utils/Compound');

const blockNumber = 2e7;
const borrowIndex = 1e18;

async function pretendBlock(cToken, accrualBlock = blockNumber, deltaBlocks = 1) {
  await send(cToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(cToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber + deltaBlocks)]);
  await send(cToken, 'harnessSetBorrowIndex', [etherUnsigned(borrowIndex)]);
}

describe('rBTC (micro KSAT)', () => {
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
  });
  describe('Basic operation', () => {
    describe('Subsidy fund', () => {
      it('Should be able to add RBTC to the subsidy fund', async () => {
        expect(Number(await etherBalance(kSAT._address)) / 1e18).toEqual(0);
        expect(await send(kSAT, 'addSubsidy', [], { from: root, value: etherMantissa(1) })).toSucceed();
        expect(Number(await etherBalance(kSAT._address)) / 1e18).toEqual(1);
        expect(Number(await call(kSAT, 'subsidyFund', { from: bob })) / 1e18).toEqual(1);
      });
      it('Should revert tx if fails to accrueInterest or math calculations', async () => {
        expect(Number(await etherBalance(kSAT._address)) / 1e18).toEqual(0);
        await pretendBlock(kSAT, blockNumber, 5e70);
        await expect(send(kSAT, 'addSubsidy', [], { from: root, value: etherMantissa(1) })).rejects.toRevert('revert R1');
      });
    });
    describe('Exchange rate', () => {
      beforeEach(async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        expect(await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root })).toSucceed();
      });
      it('Should be 0.02 as exchange rate for anyone if has not interacted with the protocol yet', async () => {
        expect(Number(await call(kSAT, 'exchangeRateStored', { from: alice })) / 1e18).toEqual(0.02);
        expect(Number(await call(kSAT, 'exchangeRateStored', { from: bob })) / 1e18).toEqual(0.02);
      });
      it('Should have different exchange rate per user', async () => {
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        fastForward(kSAT, 2880);
        await send(kSAT, 'exchangeRateCurrent', { from: alice });
        expect(Number(await call(kSAT, 'exchangeRateStored', { from: alice })) / 1e18).toBeGreaterThan(0.02);
        expect(Number(await call(kSAT, 'exchangeRateStored', { from: bob })) / 1e18).toEqual(0.02);
      });
    });
    describe('Minting', () => {
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
      it('Should allow minting multiple times up to 0.025 as limit', async () => {
        expect(await send(kRBTC, 'mint', [], { from: alice, value: etherMantissa(3) })).toSucceed();
        expect(Number(await call(kRBTC, 'balanceOf', [alice]))).toEqual(Number(etherMantissa(150)));
        expect(Number(await call(kRBTC, 'balanceOfUnderlying', [alice]))).toEqual(Number(etherMantissa(3)));
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.5)], { from: alice })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.005) })).toSucceed();
        fastForward(kSAT, 2880);
        await send(kSAT, 'balanceOfUnderlying', [alice]);
        const supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.underlyingAmount) / 1e18).toEqual(0.005);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toBeGreaterThan(0.005);
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.02) })).toSucceed();
      });
      it('Allow to deposit after redeeming all the initial deposit, exchangeRate is not 0', async () => {
        expect(await send(kRBTC, 'mint', [], { from: root, value: etherMantissa(5) })).toSucceed();
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: root })).toSucceed();
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: root, value: etherMantissa(0.025) })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        expect(Number(await call(kSAT, 'balanceOf', [alice], { from: alice })) / 1e18).toEqual(1.25);
        expect(Number(await call(kSAT, 'exchangeRateCurrent', [], { from: alice }))).toEqual(Number(etherMantissa(0.02)));
        fastForward(kSAT, 2880);
        expect(Number(await call(kSAT, 'balanceOf', [alice], { from: alice })) / 1e18).toEqual(1.25);
        await send(kSAT, 'exchangeRateCurrent', { from: alice });
        expect(Number(await call(kSAT, 'exchangeRateStored', { from: alice })) / 1e18).toBeGreaterThan(0.02);
        expect(await send(kSAT, 'redeem', [etherMantissa(1.25)], { from: alice })).toSucceed();
        expect(Number(await call(kSAT, 'exchangeRateCurrent', [], { from: alice }))).toEqual(Number(etherMantissa(0.02)));
        supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.tokens)).toEqual(0);
        expect(Number(supplySnapshot.underlyingAmount)).toEqual(0);
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
      });
    });
    describe('Redeeming', () => {
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
      it('Should not allow deposit the max value allowed after redeeming a portion', async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.005) })).toSucceed();
        fastForward(kSAT, 2880);
        await send(kSAT, 'balanceOfUnderlying', [alice]);
        supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.underlyingAmount) / 1e18).toEqual(0.005);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toBeGreaterThan(0.005);
        expect(await send(kSAT, 'redeemUnderlying', [etherMantissa(0.001)], { from: alice })).toSucceed();
        supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.underlyingAmount) / 1e18).toBeGreaterThan(0.004);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toBeGreaterThan(0.004);
        await expect(send(kSAT, 'mint', { from: alice, value: etherMantissa(0.021) })).rejects.toRevert('revert R8');
      });
      it('Should redeem all the underlying', async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(kSAT, 'mint', [], { from: root, value: etherMantissa(0.005) })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        fastForward(kSAT, 2880);
        await send(kSAT, 'balanceOfUnderlying', [alice]);
        supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.underlyingAmount) / 1e18).toEqual(0.025);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toBeGreaterThan(0.025);
        expect(await send(kSAT, 'redeemUnderlying', [etherMantissa(-1)], { from: alice })).toSucceed();
        supplySnapshot = await call(kSAT, 'getSupplierSnapshotStored', [alice], { from: alice });
        expect(Number(supplySnapshot.underlyingAmount) / 1e18).toEqual(0);
        expect(Number(await call(kSAT, 'balanceOfUnderlying', [alice], { from: alice })) / 1e18).toEqual(0);
      });
      it('Should avoid redeeming if the deposit is collateral to a debt in another market', async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(kSAT, 'mint', [], { from: root, value: etherMantissa(0.005) })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.01)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        expect(await send(kSAT, 'redeemUnderlying', [etherMantissa(-1)], { from: alice })).toHaveTokenFailure('COMPTROLLER_REJECTION', 'REDEEM_COMPTROLLER_REJECTION');
      });
      it('Should allow to redeem a portion such as the debt is not undercollateralized', async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(kSAT, 'mint', [], { from: root, value: etherMantissa(0.005) })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.001)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        await send(kSAT, 'balanceOfUnderlying', [alice]);
        expect(await send(kSAT, 'redeem', [etherMantissa(1.15)], { from: alice })).toSucceed();
      });
    });
    describe('Borrowing and repaying borrows', () => {
      beforeEach(async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
      });
      it('Should allow borrowing up to the collateral limit in another market', async () => {
        currentBalance = Number(await etherBalance(alice)) / 1e18;
        tx = await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice });
        expect(tx).toSucceed();
        gas = Number(await etherGasCost(tx)) / 1e18;
        expect(Number(await etherBalance(alice)) / 1e18).toBeCloseTo(currentBalance - gas + 0.0125, 13);
      });
      it('Should fail if the borrowing amount is higher than the maximum allowed by the current collateral', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0126)], { from: alice })).toHaveTokenFailure('COMPTROLLER_REJECTION', 'BORROW_COMPTROLLER_REJECTION');
      });
      it('Should allow paying a portion of a debt', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        expect(await send(kRBTC, 'repayBorrow', { from: alice, value: etherMantissa(0.01) })).toSucceed();
      });
      it('Should fail if paying the whole debt without amount', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        await expect(send(kRBTC, 'repayBorrowAll', { from: alice })).rejects.toRevert('revert R10');
      });
      it('Should allow paying the whole debt', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        currentBalance = Number(await etherBalance(alice)) / 1e18;
        mktBalance = Number(await etherBalance(kRBTC._address)) / 1e18;
        tx = await send(kRBTC, 'repayBorrowAll', { from: alice, value: etherMantissa(1) });
        gas = Number(await etherGasCost(tx)) / 1e18;
        expect(tx).toSucceed();
        expect(Number(await etherBalance(alice)) / 1e18).toBeCloseTo(currentBalance - gas - 0.0125, 13);
        expect(Number(await etherBalance(kRBTC._address)) / 1e18).toBeCloseTo(mktBalance + 0.0125, 13);
        expect(Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18).toEqual(0);
      });
      it('Should allow paying the whole debt delta considered', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        currentBalance = Number(await etherBalance(alice)) / 1e18;
        mktBalance = Number(await etherBalance(kRBTC._address)) / 1e18;
        currentDebt = Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        tx = await send(kRBTC, 'repayBorrowAll', { from: alice, value: etherMantissa(currentDebt + 0.000002) });
        gas = Number(await etherGasCost(tx)) / 1e18;
        expect(tx).toSucceed();
        expect(Number(await etherBalance(alice)) / 1e18).toBeCloseTo(currentBalance - gas - currentDebt, 13);
        expect(Number(await etherBalance(kRBTC._address)) / 1e18).toBeCloseTo(mktBalance + currentDebt, 13);
        expect(Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18).toEqual(0);
      });
      it('Should allow a borrower to borrow again after repaying a former debt', async () => {
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        currentDebt = Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18;
        expect(await send(kRBTC, 'repayBorrowAll', { from: alice, value: etherMantissa(currentDebt + 0.000002) })).toSucceed();
        expect(Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18).toEqual(0);
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        expect(Number(await call(kRBTC, 'borrowBalanceCurrent', [alice], { from: alice })) / 1e18).toEqual(0.0125);
      });
    });
    describe('Liquidation', () => {
      beforeEach(async () => {
        await send(kRBTC, 'mint', { from: root, value: etherMantissa(5) });
        await send(kRBTC, 'borrow', [etherMantissa(2.5)], { from: root });
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
      });
      it('Should allow a liquidator to liquidate an undercollateralized borrow and seized the collateral', async () => {
        expect(await send(kSAT, 'mint', [], { from: alice, value: etherMantissa(0.025) })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.0125)], { from: alice })).toSucceed();
        expect(await send(comptroller.priceOracle, 'setDirectPrice', [kRBTC._address, etherMantissa(75000)])).toSucceed();
        fastForward(kSAT, 2880);
        fastForward(kRBTC, 2880);
        await send(comptroller, 'fastForward', [2880]);
        await send(kSAT, 'balanceOfUnderlying', [alice]);
        liquidityData = await call(comptroller, 'getHypotheticalAccountLiquidity', [alice, kSAT._address, 0, 0]);
        expect(Number(liquidityData[2]) / 1e18).toBeGreaterThan(0);
        bobCurrentBalance = Number(await etherBalance(bob)) / 1e18;
        tx = await send(kRBTC, 'liquidateBorrow', [alice, kSAT._address], { from: bob, value: etherMantissa(0.006) });
        expect(tx).toSucceed();
        liquidationGas = Number(await etherGasCost(tx)) / 1e18;
        liquidityData = await call(comptroller, 'getHypotheticalAccountLiquidity', [alice, kSAT._address, 0, 0]);
        expect(Number(await etherBalance(bob)) / 1e18).toBeCloseTo(bobCurrentBalance - liquidationGas - 0.006, 13);
        bobKSATBalance = Number(await call(kSAT, 'balanceOf', [bob])) / 1e18;
        expect(bobKSATBalance).toBeCloseTo(0.030259365994236318, 13); // Bob
      });
    });
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