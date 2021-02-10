const {
  etherBalance,
  etherGasCost,
  getContract
} = require('./Utils/Ethereum');

const {
  makeComptroller,
  makeCToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Compound');

describe('Maximillion', () => {
  let root, borrower;
  let maximillion, cRBTC;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    cRBTC = await makeCToken({kind: "crbtc", supportMarket: true});
    maximillion = await deploy('Maximillion', [cRBTC._address]);
  });

  describe("constructor", () => {
    it("sets address of cRBTC", async () => {
      expect(await call(maximillion, "cRBTC")).toEqual(cRBTC._address);
    });
  });

  describe("repayBehalf", () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(cRBTC, borrower, 1, 1, 150);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(cRBTC, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(100));
      expect(afterBorrowSnap.principal).toEqualNumber(50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(cRBTC, borrower, 1, 1, 90);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(cRBTC, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(90));
      expect(afterBorrowSnap.principal).toEqualNumber(0);
    });
  });
});
