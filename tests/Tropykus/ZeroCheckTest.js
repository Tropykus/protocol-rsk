const { etherMantissa, etherUnsigned } = require("../Utils/Ethereum");
const { makeComptroller, makeInterestRateModel, makeCToken } = require('../Utils/Compound');

describe('Zero-check for addresses', () => {
  beforeEach(async () => {
    [root, alice] = saddle.accounts;
  });
  it('Should make initialization of CEr20-based market to fail if zero address for its underlying', async () => {
    comptroller = await makeComptroller({
      kind: 'unitroller-g6',
    });
    interestModel = await makeInterestRateModel({
      kind: 'white-paper',
    });
    await expect(
      deploy('CErc20Immutable', [
        '0x0000000000000000000000000000000000000000',
        comptroller._address,
        interestModel._address,
        etherMantissa(0.02),
        'Test',
        'TST',
        etherUnsigned(18),
        root,
      ])
    ).rejects.toRevert('revert');
  });
  it('Should avoid cToken pending admin with zero address', async () => {
    token = await makeCToken();
    await expect(send(token, '_setPendingAdmin', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid interest rate pending admin with zero address', async () => {
    interestModel = await makeInterestRateModel({
      kind: 'white-paper',
    });
    await expect(send(interestModel, '_setPendingAdmin', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid unitroller pending implementation with zero address', async () => {
    unitroller = await deploy('Unitroller', { from: root });
    await expect(send(unitroller, '_setPendingImplementation', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid unitroller pending admin with zero address', async () => {
    unitroller = await deploy('Unitroller', { from: root });
    await expect(send(unitroller, '_setPendingAdmin', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid unitroller pending admin with zero address', async () => {
    comptroller = await makeComptroller({
      kind: 'unitroller-g6',
    });
    interestModel = await makeInterestRateModel({
      kind: 'white-paper',
    });
    await expect(
      deploy('CRBTC', [
        comptroller._address,
        interestModel._address,
        etherMantissa(0.02),
        'Test',
        'TST',
        etherUnsigned(18),
        '0x0000000000000000000000000000000000000000',
      ])
    ).rejects.toRevert('revert A1');
  });
  it('Should avoid setting an empty crbtc companion', async () => {
    kSAT = await makeCToken({
      name: 'kSAT',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'white-paper',
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 52050,
      collateralFactor: 0.5,
    });
    await expect(send(kSAT, 'setCompanion', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid BaseJumpV2 to pending admin zero address', async () => {
    interestModel = await makeInterestRateModel({ kind: 'jump-rateV2' });
    await expect(send(interestModel, 'setPendingAdmin', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should make initialization of CRDOC market to fail if zero address for its underlying', async () => {
    comptroller = await makeComptroller({
      kind: 'unitroller-g6',
    });
    interestModel = await makeInterestRateModel({
      kind: 'white-paper',
    });
    await expect(
      deploy('CRDOC', [
        '0x0000000000000000000000000000000000000000',
        comptroller._address,
        interestModel._address,
        etherMantissa(0.02),
        'Test',
        'TST',
        etherUnsigned(18),
        root,
      ])
    ).rejects.toRevert('revert');
  });
  it('Should avoid borrow cap to zero address', async () => {
    comptroller = await makeComptroller({ kind: 'unitroller-g6' });
    await expect(send(comptroller, '_setBorrowCapGuardian', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid pause cap to zero address', async () => {
    comptroller = await makeComptroller({ kind: 'unitroller-g6' });
    await expect(send(comptroller, '_setPauseGuardian', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
  it('Should avoid deploying a companion with zero addresses', async () => {
    comptroller = await makeComptroller({ kind: 'unitroller-g6' });
    kSAT = await makeCToken({
      name: 'kSAT',
      kind: 'crbtc',
      comptroller,
      interestRateModelOpts: {
        kind: 'white-paper',
      },
      exchangeRate: 0.02,
      supportMarket: true,
      underlyingPrice: 52050,
      collateralFactor: 0.5,
    });
    await expect(deploy('CRBTCCompanion', [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
    ])).rejects.toRevert('revert A1');
    await expect(deploy('CRBTCCompanion', [
      comptroller._address,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
    ])).rejects.toRevert('revert A1');
    await expect(deploy('CRBTCCompanion', [
      comptroller._address,
      kSAT._address,
      '0x0000000000000000000000000000000000000000',
    ])).rejects.toRevert('revert A1');
  });
  it('Should avoid price oracle proxy being deploy with zero address', async () => {
    await expect(deploy('PriceOracleProxy', ['0x0000000000000000000000000000000000000000'], { from: root })).rejects.toRevert('revert A1');
  });
});