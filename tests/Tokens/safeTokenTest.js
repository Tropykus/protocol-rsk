const {
  makeCToken,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

const exchangeRate = 5;

describe('CRBTC', function () {
  let root, nonRoot, accounts;
  let cToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = saddle.accounts;
    cToken = await makeCToken({kind: 'crbtc', comptrollerOpts: {kind: 'bool'}});
  });

  describe("getCashPrior", () => {
    it("returns the amount of ether held by the cRBTC contract before the current message", async () => {
      expect(await call(cToken, 'harnessGetCashPrior', [], {value: 100})).toEqualNumber(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(await call(cToken, 'harnessDoTransferIn', [root, 100], {value: 100})).toEqualNumber(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(call(cToken, 'harnessDoTransferIn', [nonRoot, 100], {value: 100})).rejects.toRevert("revert R7");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(call(cToken, 'harnessDoTransferIn', [root, 77], {value: 100})).rejects.toRevert("revert R10");
    });

    describe("doTransferOut", () => {
      it("transfers ether out", async () => {
        const beforeBalances = await getBalances([cToken], [nonRoot]);
        const receipt = await send(cToken, 'harnessDoTransferOut', [nonRoot, 77], {value: 77});
        const afterBalances = await getBalances([cToken], [nonRoot]);
        expect(receipt).toSucceed();
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [cToken, nonRoot, 'eth', 77]
        ]));
      });

      it("reverts if it fails", async () => {
        await expect(call(cToken, 'harnessDoTransferOut', [root, 77], {value: 0})).rejects.toRevert();
      });
    });
  });
});
