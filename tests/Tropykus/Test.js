const {
    etherUnsigned,
    etherMantissa,
    UInt256Max
} = require('../Utils/Ethereum');

const {
    makeCToken,
    balanceOf,
    fastForward,
    setBalance,
    getBalances,
    adjustBalances,
    preApprove,
    quickMint,
    preSupply,
    quickRedeem,
    quickRedeemUnderlying
} = require('../Utils/Compound');
const { deployContract } = require('ethereum-waffle');
const { isCall } = require('hardhat/internal/hardhat-network/stack-traces/opcodes');

const exchangeRate = etherUnsigned(0.02);
const mintAmount = etherUnsigned(500);
const mintTokens = mintAmount.dividedBy(exchangeRate);

async function preMint(cToken, minter, mintAmount, mintTokens, exchangeRate) {
    await send(cToken.underlying, 'approve', [cToken._address, mintAmount], { from: minter });
    await send(cToken.comptroller, 'mintAllowed', [cToken._address, minter, mintAmount]);
    await send(cToken.comptroller, 'mintVerify', [cToken._address, minter, mintAmount, mintTokens]);
    await send(cToken, 'harnessSetBalance', [minter, 0]);
    await send(cToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(cToken, minter, mintAmount) {
    return send(cToken, 'harnessMintFresh', [minter, mintAmount], { from: minter });
}

describe('DOC/RIF/USD markets', () => {
    let root, minter, redeemer, accounts;
    let cToken;

    beforeEach(async () => {
        [root, minter, redeemer, ...accounts] = saddle.accounts;

        const token = await deploy('StandardToken', [
            etherUnsigned('2000000'), 'Test DOC Tropykus', 18, 'tDOC'
        ])

        cToken = await makeCToken({
            underlying: token,
            comptrollerOpts: {
                kind: 'unitroller-g6'
            },
            interestRateModelOpts: {
                kind: 'jump-rateV2',
                baseRate: etherUnsigned(0.08),
                multiplier: etherUnsigned(0.02),
                jump: etherUnsigned(0.55),
                kink: etherUnsigned(0.90)
            },
            exchangeRate
        });

        await send(cToken.comptroller, '_supportMarket', [cToken._address]);
        await send(cToken.underlying, 'transfer', [minter, mintAmount]);
    });

    it('When an address deposits and then withdraws', async () => {
        await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);

        expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
        expect(Number(await balanceOf(cToken, minter))).toEqual(Number(mintTokens));

        console.log(Number(etherUnsigned(await call(cToken, 'balanceOfUnderlying', [minter]))));

        await send(cToken.comptroller, 'fastForward', [5000]);
        await send(cToken, 'harnessFastForward', [5000]);

        console.log(Number(await balanceOf(cToken, minter)));
        console.log(Number(etherUnsigned(await call(cToken, 'balanceOfUnderlying', [minter]))));

        console.log('Done');
    })
})