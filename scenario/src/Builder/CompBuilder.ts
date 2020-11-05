import { Event } from '../Event';
import { World, addAction } from '../World';
import { RLEN, CompScenario } from '../Contract/RLEN';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const CompContract = getContract('RLEN');
const CompScenarioContract = getContract('CompScenario');

export interface TokenData {
  invokation: Invokation<RLEN>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildComp(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; comp: RLEN; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "Comp Deploy Scenario account:<Address>" - Deploys Scenario Comp Token
        * E.g. "Comp Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await CompScenarioContract.deploy<CompScenario>(world, from, [account.val]),
          contract: 'CompScenario',
          symbol: 'rLEN',
          name: 'Compound Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Comp

      * "Comp Deploy account:<Address>" - Deploys Comp Token
        * E.g. "Comp Deploy Geoff"
    `,
      'RLEN',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await CompScenarioContract.deploy<CompScenario>(world, from, [account.val]),
            contract: 'CompScenario',
            symbol: 'rLEN',
            name: 'Compound Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await CompContract.deploy<RLEN>(world, from, [account.val]),
            contract: 'RLEN',
            symbol: 'rLEN',
            name: 'Compound Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployComp", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const comp = invokation.value!;
  tokenData.address = comp._address;

  world = await storeAndSaveContract(
    world,
    comp,
    'RLEN',
    invokation,
    [
      { index: ['RLEN'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, comp, tokenData };
}
