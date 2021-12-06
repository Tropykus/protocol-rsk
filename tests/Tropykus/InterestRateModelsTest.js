const {
  makeInterestRateModel,
} = require('../Utils/Compound');

describe('Interest Rate Models Government', () => {
  describe('white-paper', () => {
    beforeEach(async () => {
      [owner, newOwner, nonOwner] = saddle.accounts;
      interestRateModel = await makeInterestRateModel({ kind: 'white-paper', baseRate: 1, multiplier: 10 });
    });
    it('Should allow the admin to propose a new admin', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
    });
    it('Should allow the new admin to accept ownership', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      expect(await send(interestRateModel, '_acceptPendingAdmin', { from: newOwner })).toSucceed();
    });
    it('Should avoid anyone proposing a new admin', async () => {
      await expect(send(interestRateModel, '_setPendingAdmin', [nonOwner], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should avoid anyone accepting ownerwhip', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      await expect(send(interestRateModel, '_acceptPendingAdmin', { from: nonOwner })).rejects.toRevert('revert NONNEWADMIN');
    });
    it('Should avoid anyone to set the new blocks per year info', async () => {
      await expect(send(interestRateModel, 'setBlocksPerYear', [2000000], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should change the perceived data for whitepaper', async () => {
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(1051200);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock'))).toEqual(951293759512);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock'))).toEqual(9512937595129);
      expect(await send(interestRateModel, 'setBlocksPerYear', [2000000])).toSucceed();
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(2000000);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock')) / 1e18).toBeCloseTo(0.0000005, 6);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
    });
  });
  describe('jump-rate', () => {
    beforeEach(async () => {
      [owner, newOwner, nonOwner] = saddle.accounts;
      interestRateModel = await makeInterestRateModel({ kind: 'jump-rate', baseRate: 1, multiplier: 10, jump: 10 });
    });
    it('Should allow the admin to propose a new admin', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
    });
    it('Should allow the new admin to accept ownership', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      expect(await send(interestRateModel, '_acceptPendingAdmin', { from: newOwner })).toSucceed();
    });
    it('Should avoid anyone proposing a new admin', async () => {
      await expect(send(interestRateModel, '_setPendingAdmin', [nonOwner], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should avoid anyone accepting ownerwhip', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      await expect(send(interestRateModel, '_acceptPendingAdmin', { from: nonOwner })).rejects.toRevert('revert NONNEWADMIN');
    });
    it('Should avoid anyone to set the new blocks per year info', async () => {
      await expect(send(interestRateModel, 'setBlocksPerYear', [2000000], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should change the perceived data for whitepaper', async () => {
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(1051200);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock'))).toEqual(951293759512);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock'))).toEqual(9512937595129);
      expect(Number(await call(interestRateModel, 'jumpMultiplierPerBlock'))).toEqual(9512937595129);
      expect(await send(interestRateModel, 'setBlocksPerYear', [2000000])).toSucceed();
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(2000000);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock')) / 1e18).toBeCloseTo(0.0000005, 6);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
      expect(Number(await call(interestRateModel, 'jumpMultiplierPerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
    });
  });
  describe('jump-rateV2', () => {
    beforeEach(async () => {
      [owner, newOwner, nonOwner] = saddle.accounts;
      interestRateModel = await makeInterestRateModel({ kind: 'jump-rateV2', baseRate: 1, multiplier: 10, jump: 10 });
    });
    it('Should allow the admin to propose a new admin', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
    });
    it('Should allow the new admin to accept ownership', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      expect(await send(interestRateModel, '_acceptPendingAdmin', { from: newOwner })).toSucceed();
    });
    it('Should avoid anyone proposing a new admin', async () => {
      await expect(send(interestRateModel, '_setPendingAdmin', [nonOwner], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should avoid anyone accepting ownerwhip', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      await expect(send(interestRateModel, '_acceptPendingAdmin', { from: nonOwner })).rejects.toRevert('revert NONNEWADMIN');
    });
    it('Should avoid anyone to set the new blocks per year info', async () => {
      await expect(send(interestRateModel, 'setBlocksPerYear', [2000000], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should change the perceived data for whitepaper', async () => {
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(1051200);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock'))).toEqual(951293759512);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock'))).toEqual(10569930661254);
      expect(Number(await call(interestRateModel, 'jumpMultiplierPerBlock'))).toEqual(9512937595129);
      expect(await send(interestRateModel, 'setBlocksPerYear', [2000000])).toSucceed();
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(2000000);
      expect(Number(await call(interestRateModel, 'baseRatePerBlock')) / 1e18).toBeCloseTo(0.0000005, 6);
      expect(Number(await call(interestRateModel, 'multiplierPerBlock')) / 1e18).toBeCloseTo(0.00001, 5);
      expect(Number(await call(interestRateModel, 'jumpMultiplierPerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
    });
  });
  describe('hurricane', () => {
    beforeEach(async () => {
      [owner, newOwner, nonOwner] = saddle.accounts;
      interestRateModel = await makeInterestRateModel({
        kind: 'hurricane',
        baseBorrowRate: 10,
        promisedBaseReturnRate: 10,
        borrowRateSlope: 10,
        supplyRateSlope: 10
      });
    });
    it('Should allow the admin to propose a new admin', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
    });
    it('Should allow the new admin to accept ownership', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      expect(await send(interestRateModel, '_acceptPendingAdmin', { from: newOwner })).toSucceed();
    });
    it('Should avoid anyone proposing a new admin', async () => {
      await expect(send(interestRateModel, '_setPendingAdmin', [nonOwner], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should avoid anyone accepting ownerwhip', async () => {
      expect(await send(interestRateModel, '_setPendingAdmin', [newOwner])).toSucceed();
      await expect(send(interestRateModel, '_acceptPendingAdmin', { from: nonOwner })).rejects.toRevert('revert NONNEWADMIN');
    });
    it('Should avoid anyone to set the new blocks per year info', async () => {
      await expect(send(interestRateModel, 'setBlocksPerYear', [2000000], { from: nonOwner })).rejects.toRevert('revert NONADMIN');
    });
    it('Should change the perceived data for whitepaper', async () => {
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(1051200);
      expect(Number(await call(interestRateModel, 'baseBorrowRatePerBlock'))).toEqual(9512937595129);
      expect(Number(await call(interestRateModel, 'promisedBaseReturnRatePerBlock'))).toEqual(9512937595129);
      expect(Number(await call(interestRateModel, 'borrowRateSlopePerBlock'))).toEqual(9512937595129);
      expect(Number(await call(interestRateModel, 'supplyRateSlopePerBlock'))).toEqual(9512937595129);
      expect(await send(interestRateModel, 'setBlocksPerYear', [2000000])).toSucceed();
      expect(Number(await call(interestRateModel, 'blocksPerYear'))).toEqual(2000000);
      expect(Number(await call(interestRateModel, 'baseBorrowRatePerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
      expect(Number(await call(interestRateModel, 'promisedBaseReturnRatePerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
      expect(Number(await call(interestRateModel, 'borrowRateSlopePerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
      expect(Number(await call(interestRateModel, 'supplyRateSlopePerBlock')) / 1e18).toBeCloseTo(0.000005, 5);
    });
  });
});