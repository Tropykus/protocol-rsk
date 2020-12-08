import { Event } from '../Event';
import { addAction, World } from '../World';
import { PriceOracleProxy } from '../Contract/PriceOracleProxy';
import { PriceOracleAdapterCompound } from '../Contract/PriceOracleAdapterCompound';
import { PriceOracle } from '../Contract/PriceOracle';
import { Invokation } from '../Invokation';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';
import { getAddressV } from '../CoreValue';
import { AddressV, NumberV } from '../Value';
import { invoke } from '../Invokation';

const PriceOracleProxyContractExtend = getContract("PriceOracleProxyExtends");
const PriceOracleAdapterCompoundContract = getContract("PriceOracleAdapterCompound");
const SimplePriceOracle = getContract('SimplePriceOracle');
const addressUsdcMock = "0x0000000000000000000000000000000000000001"
const addressDaiMock = "0x0000000000000000000000000000000000000002";
const priceValueCRBTC = new NumberV(1e18);


export interface PriceOracleProxyData {
  invokation?: Invokation<PriceOracleProxy>,
  contract?: PriceOracleProxy,
  description: string,
  address?: string,
  cRBTC: string,
  cUSDC: string,
  cDAI: string
}
async function setCtokens(world: World, from: string, priceOracleProxy: PriceOracleProxy, cTokenAddress: string, adapterAddress: string): Promise<World> {
  return addAction(
    world,
    `Set adapter address ${adapterAddress.toString} to cToken address ${cTokenAddress.toString} `,
    await invoke(world, priceOracleProxy.methods.setAdapterToToken(cTokenAddress, adapterAddress), from)
  );
}

async function setPriceProviderAdapter(world: World, from: string, priceOracleAdapter: PriceOracleAdapterCompound, oracleAddress: string): Promise<World> {
  return addAction(
    world,
    `Set price provider oracle address ${oracleAddress.toString}`,
    await invoke(world, priceOracleAdapter.methods.setPriceProvider(oracleAddress), from)
  );
}

async function setKeyOracle(world: World, from: string, priceOracleAdapter: PriceOracleAdapterCompound, cTokenAddress: string, keyOracle: string): Promise<World> {
  return addAction(
    world,
    `Set key oracle address ${keyOracle.toString} to cToken address ${cTokenAddress.toString} `,
    await invoke(world, priceOracleAdapter.methods.setKeyOracle(cTokenAddress, keyOracle), from)
  );
}

export async function buildPriceOracleProxy(world: World, from: string, event: Event): Promise<{ world: World, priceOracleProxy: PriceOracleProxy, invokation: Invokation<PriceOracleProxy> }> {
  const fetchers = [
    new Fetcher<{ guardian: AddressV, priceOracle: AddressV, cRBTC: AddressV, cUSDC: AddressV, cSAI: AddressV, cDAI: AddressV, cUSDT: AddressV }, PriceOracleProxyData>(`
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
      async (world, { guardian, priceOracle, cRBTC, cUSDC, cSAI, cDAI, cUSDT }) => {
        // deploy proxy
        let proxy = await PriceOracleProxyContractExtend.deploy<PriceOracleProxy>(world, from, [guardian.val]);
        //deploy adapter
        let adapter = await PriceOracleAdapterCompoundContract.deploy<PriceOracleAdapterCompound>(world, from, [guardian.val]);
        //set result
        let result = (!proxy.error) ? ((!adapter.error) ? null : adapter) : (proxy);
        if (!result) {
          //deploy simplePriceOracle
          let simple = await SimplePriceOracle.deploy<PriceOracle>(world, from, []);
          //set price of cRBTC
          await invoke(world, simple.value!.methods.setDirectPrice(cRBTC.val, priceValueCRBTC.encode()), from);
          //set adapter to to cToken
          await setCtokens(world, from, proxy.value!, cRBTC.val, simple.value!._address);
          await setCtokens(world, from, proxy.value!, cUSDC.val, adapter.value!._address);
          await setCtokens(world, from, proxy.value!, cSAI.val, adapter.value!._address);
          await setCtokens(world, from, proxy.value!, cDAI.val, adapter.value!._address);
          await setCtokens(world, from, proxy.value!, cUSDT.val, adapter.value!._address);
          //set interface to adapter
          await setPriceProviderAdapter(world, from, adapter.value!, priceOracle.val);
          //set oracleKeyAddress to cTokens, uses address(2) for dai, address(1) for usdc and usdt
          await setKeyOracle(world, from, adapter.value!, cUSDC.val, addressUsdcMock);
          await setKeyOracle(world, from, adapter.value!, cUSDT.val, addressUsdcMock);
          await setKeyOracle(world, from, adapter.value!, cDAI.val, addressDaiMock);
          //set mock adapter
          await invoke(world, proxy.value!.methods.setMockAdapter(adapter.value!._address), from)
        } else {
          if (!proxy.error) {
            proxy.error = adapter.error;
          }
        }

        return {
          invokation: proxy,
          description: "Price Oracle Proxy",
          cRBTC: cRBTC.val,
          cUSDC: cUSDC.val,
          cSAI: cSAI.val,
          cDAI: cDAI.val,
          cUSDT: cUSDT.val
        };
      },
      { catchall: true }
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

  return { world, priceOracleProxy, invokation };
}
