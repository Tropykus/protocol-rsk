import { Event } from '../Event';
import { World } from '../World';
import { TROP } from '../Contract/TROP';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getComp } from '../ContractLookup';

export function compFetchers() {
  return [
    new Fetcher<{ comp: TROP }, AddressV>(`
        #### Address

        * "<TROP> Address" - Returns the address of TROP token
          * E.g. "TROP Address"
      `,
      "Address",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new AddressV(comp._address)
    ),

    new Fetcher<{ comp: TROP }, StringV>(`
        #### Name

        * "<TROP> Name" - Returns the name of the TROP token
          * E.g. "TROP Name"
      `,
      "Name",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.name().call())
    ),

    new Fetcher<{ comp: TROP }, StringV>(`
        #### Symbol

        * "<TROP> Symbol" - Returns the symbol of the TROP token
          * E.g. "TROP Symbol"
      `,
      "Symbol",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.symbol().call())
    ),

    new Fetcher<{ comp: TROP }, NumberV>(`
        #### Decimals

        * "<TROP> Decimals" - Returns the number of decimals of the TROP token
          * E.g. "TROP Decimals"
      `,
      "Decimals",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.decimals().call())
    ),

    new Fetcher<{ comp: TROP }, NumberV>(`
        #### TotalSupply

        * "TROP TotalSupply" - Returns TROP token's total supply
      `,
      "TotalSupply",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.totalSupply().call())
    ),

    new Fetcher<{ comp: TROP, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "TROP TokenBalance <Address>" - Returns the TROP token balance of a given address
          * E.g. "TROP TokenBalance Geoff" - Returns Geoff's TROP balance
      `,
      "TokenBalance",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { comp, address }) => new NumberV(await comp.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ comp: TROP, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "TROP Allowance owner:<Address> spender:<Address>" - Returns the TROP allowance from owner to spender
          * E.g. "TROP Allowance Geoff Torrey" - Returns the TROP allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { comp, owner, spender }) => new NumberV(await comp.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ comp: TROP, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "TROP GetCurrentVotes account:<Address>" - Returns the current TROP votes balance for an account
          * E.g. "TROP GetCurrentVotes Geoff" - Returns the current TROP vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ comp: TROP, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "TROP GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current TROP votes balance at given block
          * E.g. "TROP GetPriorVotes Geoff 5" - Returns the TROP vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { comp, account, blockNumber }) => new NumberV(await comp.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ comp: TROP, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "TROP GetCurrentVotesBlock account:<Address>" - Returns the current TROP votes checkpoint block for an account
          * E.g. "TROP GetCurrentVotesBlock Geoff" - Returns the current TROP votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => {
        const numCheckpoints = Number(await comp.methods.numCheckpoints(account.val).call());
        const checkpoint = await comp.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ comp: TROP, account: AddressV }, NumberV>(`
        #### VotesLength

        * "TROP VotesLength account:<Address>" - Returns the TROP vote checkpoint array length
          * E.g. "TROP VotesLength Geoff" - Returns the TROP vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ comp: TROP, account: AddressV }, ListV>(`
        #### AllVotes

        * "TROP AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "TROP AllVotes Geoff" - Returns the TROP vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => {
        const numCheckpoints = Number(await comp.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await comp.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getCompValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("TROP", compFetchers(), world, event);
}
