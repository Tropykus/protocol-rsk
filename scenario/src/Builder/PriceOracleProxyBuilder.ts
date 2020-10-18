import {Event} from '../Event';
import {addAction, World} from '../World';
import {PriceOracleProxy} from '../Contract/PriceOracleProxy';
import {Invokation} from '../Invokation';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {storeAndSaveContract} from '../Networks';
import {getContract} from '../Contract';
import {getAddressV} from '../CoreValue';
import {AddressV} from '../Value';

const PriceOracleProxyContract = getContract("PriceOracleProxy");

export interface PriceOracleProxyData {
  invokation?: Invokation<PriceOracleProxy>,
  contract?: PriceOracleProxy,
  description: string,
  address?: string,
  cRBTC: string,
  cUSDC: string,
  cDAI: string
}

export async function buildPriceOracleProxy(world: World, from: string, event: Event): Promise<{world: World, priceOracleProxy: PriceOracleProxy, invokation: Invokation<PriceOracleProxy>}> {
  const fetchers = [
    new Fetcher<{guardian: AddressV, priceOracle: AddressV, cRBTC: AddressV, cUSDC: AddressV, cSAI: AddressV, cDAI: AddressV, cUSDT: AddressV}, PriceOracleProxyData>(`
        #### Price Oracle Proxy

        * "Deploy <Guardian:Address> <PriceOracle:Address> <cRBTC:Address> <cUSDC:Address> <cSAI:Address> <cDAI:Address> <cUSDT:Address>" - The Price Oracle which proxies to a backing oracle
        * E.g. "PriceOracleProxy Deploy Admin (PriceOracle Address) cRBTC cUSDC cSAI cDAI cUSDT"
      `,
      "PriceOracleProxy",
      [
        new Arg("guardian", getAddressV),
        new Arg("priceOracle", getAddressV),
        new Arg("cRBTC", getAddressV),
        new Arg("cUSDC", getAddressV),
        new Arg("cSAI", getAddressV),
        new Arg("cDAI", getAddressV),
        new Arg("cUSDT", getAddressV)
      ],
      async (world, {guardian, priceOracle, cRBTC, cUSDC, cSAI, cDAI, cUSDT}) => {
        return {
          invokation: await PriceOracleProxyContract.deploy<PriceOracleProxy>(world, from, [guardian.val, priceOracle.val, cRBTC.val, cUSDC.val, cSAI.val, cDAI.val, cUSDT.val]),
          description: "Price Oracle Proxy",
          cRBTC: cRBTC.val,
          cUSDC: cUSDC.val,
          cSAI: cSAI.val,
          cDAI: cDAI.val,
          cUSDT: cUSDT.val
        };
      },
      {catchall: true}
    )
  ];

  let priceOracleProxyData = await getFetcherValue<any, PriceOracleProxyData>("DeployPriceOracleProxy", fetchers, world, event);
  let invokation = priceOracleProxyData.invokation!;
  delete priceOracleProxyData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const priceOracleProxy = invokation.value!;
  priceOracleProxyData.address = priceOracleProxy._address;

  world = await storeAndSaveContract(
    world,
    priceOracleProxy,
    'PriceOracleProxy',
    invokation,
    [
      { index: ['PriceOracleProxy'], data: priceOracleProxyData }
    ]
  );

  return {world, priceOracleProxy, invokation};
}
