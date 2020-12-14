const {
  address,
  encodeParameters,
} = require('../Utils/Ethereum');
const {
  makeComptroller,
  makeCToken,
} = require('../Utils/Compound');
const { default: BigNumber } = require('bignumber.js');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('RlendingLens', () => {
  let rLendingLens;
  let acct;

  beforeEach(async () => {
    rLendingLens = await deploy('RlendingLens');
    acct = accounts[0];
  });

  describe('cTokenMetadata', () => {
    it('is correct for a cErc20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(rLendingLens, 'cTokenMetadata', [cErc20._address]))
      ).toEqual(
        {
          cToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed: false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          cTokenDecimals: "8",
          underlyingDecimals: "18"
        }
      );
    });

    it('is correct for cEth', async () => {
      let cEth = await makeCToken({ kind: 'crbtc' });
      expect(
        cullTuple(await call(rLendingLens, 'cTokenMetadata', [cEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        cToken: cEth._address,
        cTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
      });
    });
  });

  describe('cTokenMetadataAll', () => {
    it('is correct for a cErc20 and CRBTC', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({ kind: 'crbtc' });
      expect(
        (await call(rLendingLens, 'cTokenMetadataAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          cToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed: false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          cTokenDecimals: "8",
          underlyingDecimals: "18"
        },
        {
          borrowRatePerBlock: "0",
          cToken: cEth._address,
          cTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
        }
      ]);
    });
  });

  describe('cTokenBalances', () => {
    it('is correct for cERC20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(rLendingLens, 'cTokenBalances', [cErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for cRBTC', async () => {
      let cEth = await makeCToken({ kind: 'crbtc' });
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(rLendingLens, 'cTokenBalances', [cEth._address, acct], { gasPrice: '0' }))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('cTokenBalancesAll', () => {
    it('is correct for cEth and cErc20', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({ kind: 'crbtc' });
      let ethBalance = await web3.eth.getBalance(acct);

      expect(
        (await call(rLendingLens, 'cTokenBalancesAll', [[cErc20._address, cEth._address], acct], { gasPrice: '0' })).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          cToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('cTokenUnderlyingPrice', () => {
    it('gets correct price for cErc20', async () => {
      let cErc20 = await makeCToken();
      expect(
        cullTuple(await call(rLendingLens, 'cTokenUnderlyingPrice', [cErc20._address]))
      ).toEqual(
        {
          cToken: cErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for cEth', async () => {
      let cEth = await makeCToken({ kind: 'crbtc' });
      //set price of cRBTC
      await send(cEth.comptroller.priceOracle, "setDirectPrice", [cEth._address, new BigNumber('1e18')]);
      expect(
        cullTuple(await call(rLendingLens, 'cTokenUnderlyingPrice', [cEth._address]))
      ).toEqual(
        {
          cToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      );
    });
  });

  describe('cTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let cErc20 = await makeCToken();
      let cEth = await makeCToken({ kind: 'crbtc' });
      //set price of cRBTC
      await send(cEth.comptroller.priceOracle, "setDirectPrice", [cEth._address, new BigNumber('1e18')]);
      expect(
        (await call(rLendingLens, 'cTokenUnderlyingPriceAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          cToken: cErc20._address,
          underlyingPrice: "0",
        },
        {
          cToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let comptroller = await makeComptroller();

      expect(
        cullTuple(await call(rLendingLens, 'getAccountLimits', [comptroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let comp, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      comp = await deploy('RLEN', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(comp, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rLendingLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rLendingLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + 17281).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + 1).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('comp', () => {
    let comp, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      comp = await deploy('RLEN', [acct]);
    });

    describe('getCompBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(rLendingLens, 'getCompBalanceMetadata', [comp._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getCompBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let comptroller = await makeComptroller();
        await send(comptroller, 'setCompAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(rLendingLens, 'getCompBalanceMetadataExt', [comp._address, comptroller._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getCompVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rLendingLens, 'getCompVotes', [comp._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(rLendingLens, 'getCompVotes', [comp._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert RLEN::getPriorVotes: not yet determined')
      });
    });
  });
});
