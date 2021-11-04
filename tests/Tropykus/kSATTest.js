const { etherMantissa, etherUnsigned } = require("../Utils/Ethereum");
const { makeCToken, makeComptroller } = require('../Utils/Compound');

async function mintExplicit(cToken, minter, mintAmount) {
    return send(cToken, 'mint', [], { from: minter, value: etherMantissa(mintAmount) });
}

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
            needsCompanion: true,
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
    });
    it('Avoid minting if mint value is above 0.025 rBTC', async () => {
        const markets = [kRBTC, kSAT];
        expect(await mintExplicit(kRBTC, alice, 3)).toSucceed();
        expect(Number(await call(kRBTC, 'balanceOf', [alice]))).toEqual(Number(etherMantissa(150)));
        expect(Number(await call(kRBTC, 'balanceOfUnderlying', [alice]))).toEqual(Number(etherMantissa(3)));
        expect(await send(comptroller, 'enterMarkets', [markets.map(mkt => mkt._address)], { from: alice })).toSucceed();
        expect(await send(kRBTC, 'borrow', [etherMantissa(0.5)], { from: alice })).toSucceed();
        await expect(mintExplicit(kSAT, alice, 0.026)).rejects.toRevert('revert R8');
    });
});