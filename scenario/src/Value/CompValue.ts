import { Event } from '../Event';
import { World } from '../World';
import { RLEN } from '../Contract/RLEN';
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
    new Fetcher<{ comp: RLEN }, AddressV>(`
        #### Address

        * "<RLEN> Address" - Returns the address of RLEN token
          * E.g. "CRLENomp Address"
      `,
      "Address",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new AddressV(comp._address)
    ),

    new Fetcher<{ comp: RLEN }, StringV>(`
        #### Name

        * "<RLEN> Name" - Returns the name of the RLEN token
          * E.g. "RLEN Name"
      `,
      "Name",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.name().call())
    ),

    new Fetcher<{ comp: RLEN }, StringV>(`
        #### Symbol

        * "<RLEN> Symbol" - Returns the symbol of the RLEN token
          * E.g. "RLEN Symbol"
      `,
      "Symbol",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.symbol().call())
    ),

    new Fetcher<{ comp: RLEN }, NumberV>(`
        #### Decimals

        * "<RLEN> Decimals" - Returns the number of decimals of the RLEN token
          * E.g. "RLEN Decimals"
      `,
      "Decimals",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.decimals().call())
    ),

    new Fetcher<{ comp: RLEN }, NumberV>(`
        #### TotalSupply

        * "RLEN TotalSupply" - Returns RLEN token's total supply
      `,
      "TotalSupply",
      [
        new Arg("comp", getComp, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.totalSupply().call())
    ),

    new Fetcher<{ comp: RLEN, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "RLEN TokenBalance <Address>" - Returns the RLEN token balance of a given address
          * E.g. "RLEN TokenBalance Geoff" - Returns Geoff's RLEN balance
      `,
      "TokenBalance",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { comp, address }) => new NumberV(await comp.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ comp: RLEN, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "RLEN Allowance owner:<Address> spender:<Address>" - Returns the RLEN allowance from owner to spender
          * E.g. "RLEN Allowance Geoff Torrey" - Returns the RLEN allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { comp, owner, spender }) => new NumberV(await comp.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ comp: RLEN, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "RLEN GetCurrentVotes account:<Address>" - Returns the current RLEN votes balance for an account
          * E.g. "RLEN GetCurrentVotes Geoff" - Returns the current RLEN vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ comp: RLEN, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "RLEN GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current RLEN votes balance at given block
          * E.g. "RLEN GetPriorVotes Geoff 5" - Returns the RLEN vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { comp, account, blockNumber }) => new NumberV(await comp.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ comp: RLEN, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "RLEN GetCurrentVotesBlock account:<Address>" - Returns the current RLEN votes checkpoint block for an account
          * E.g. "RLEN GetCurrentVotesBlock Geoff" - Returns the current RLEN votes checkpoint block for Geoff
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

    new Fetcher<{ comp: RLEN, account: AddressV }, NumberV>(`
        #### VotesLength

        * "RLEN VotesLength account:<Address>" - Returns the RLEN vote checkpoint array length
          * E.g. "RLEN VotesLength Geoff" - Returns the RLEN vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("comp", getComp, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ comp: RLEN, account: AddressV }, ListV>(`
        #### AllVotes

        * "RLEN AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "RLEN AllVotes Geoff" - Returns the RLEN vote checkpoint array
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
  return await getFetcherValue<any, any>("RLEN", compFetchers(), world, event);
}
