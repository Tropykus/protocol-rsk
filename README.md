
rLending Protocol
=================

rLending is an algorithmic distributed protocol deployed on the RSK network.. As such, it's main motivation is to allow users to lend crypto currencies as collateral and to borrow crypto assets based on interest rates set by real-time supply and demand smart contracts. The rLending Protocol is developed using RSK smart contracts for supplying or borrowing assets. Through the cToken contracts, accounts on the blockchain *supply* capital (rBTC or ERC-20 tokens) to receive cTokens or *borrow* assets from the protocol (holding other assets as collateral). The rLending cToken contracts track these balances and algorithmically set interest rates for borrowers.

You can read the protocol documentation at [rlending.app](https://rlending.app/docs/introduction)

For questions about interacting with rLending, please visit our [Telegram](https://t.me/rLendingCommunity).

Contracts
=========

We detail a few of the core contracts in the rLending protocol.

<dl>
  <dt>CToken, CErc20 and CRBTC</dt>
  <dd>The rLending cTokens, which are self-contained borrowing and lending contracts. CToken contains the core logic and CErc20 and CRBTC add public interfaces for Erc20 tokens and rBTC, respectively. Each CToken is assigned an interest rate and risk model (see InterestRateModel and Comptroller sections), and allows accounts to *mint* (supply capital), *redeem* (withdraw capital), *borrow* and *repay a borrow*. Each CToken is an ERC-20 compliant token where balances represent ownership of the market.</dd>
</dl>

<dl>
  <dt>Price Oracle Proxy</dt>
  <dd>This contract controlls the adapters that link the protocol with price oracles.</dd>
</dl>

<dl>
  <dt>Comptroller</dt>
  <dd>The risk model contract, which validates permissible user actions and disallows actions if they do not fit certain risk parameters. For instance, the Comptroller enforces that each borrowing user must maintain a sufficient collateral balance across all cTokens.</dd>
</dl>

<dl>
  <dt>RLEN</dt>
  <dd>The rLending Governance Token (RLEN). Holders of this token have the ability to govern the protocol via the governor contract.</dd>
</dl>

<dl>
  <dt>Governor Alpha</dt>
  <dd>The administrator of the rLending timelock contract. Holders of RLEN token may create and vote on proposals which will be queued into the rLending timelock and then have effects on rLending cToken and Copmtroller contracts. This contract may be replaced in the future with a beta version.</dd>
</dl>

<dl>
  <dt>InterestRateModel</dt>
  <dd>Contracts which define interest rate models. These models algorithmically determine interest rates based on the current utilization of a given market (that is, how much of the supplied assets are liquid versus borrowed).</dd>
</dl>

<dl>
  <dt>Careful Math</dt>
  <dd>Library for safe math operations.</dd>
</dl>

<dl>
  <dt>ErrorReporter</dt>
  <dd>Library for tracking error codes and failure conditions.</dd>
</dl>

<dl>
  <dt>Exponential</dt>
  <dd>Library for handling fixed-point decimal numbers.</dd>
</dl>

<dl>
  <dt>SafeToken</dt>
  <dd>Library for safely handling Erc20 interaction.</dd>
</dl>


Installation
------------
To run rLending, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/riflending/rlending-protocol
    cd rlending-protocol
    yarn install --lock-file # or `npm install`

REPL
----

The rlending Protocol has a simple scenario evaluation tool to test and evaluate scenarios which could occur on the blockchain. We inherited this feature from the original source code and this is primarily used for constructing high-level integration tests. The tool also has a REPL to interact with local the rlending Protocol (similar to `truffle console`).

    yarn repl -n development
    yarn repl -n rinkeby

    > Read CToken cBAT Address
    Command: Read CToken cBAT Address
    AddressV<val=0xAD53863b864AE703D31b819d29c14cDA93D7c6a6>

You can read more about the scenario runner in the [Scenario Docs](https://github.com/riflending/rlending-protocol/tree/master/scenario/SCENARIO.md) on steps for using the repl.

Testing
-------
Jest contract tests are defined under the [tests directory](https://github.com/riflending/rlending-protocol/tree/master/tests). To run the tests run:

    yarn test

Integration Specs
-----------------

There are additional tests under the [spec/scenario](https://github.com/riflending/rlending-protocol/tree/master/spec/scenario) folder. These are high-level integration tests based on the scenario runner depicted above. The aim of these tests is to be highly literate and have high coverage in the interaction of contracts.


Testing
-------
Contract tests are defined under the [tests directory](https://github.com/riflending/rlending-protocol/tree/master/tests). To run the tests run:

    yarn test


Code Coverage
-------------
To run code coverage, run:

    yarn coverage

Linting
-------
To lint the code, run:

    yarn lint


Note for Developers: Prerequisites 📋
-------------
rLending initially developed and tested on:
* Operating system: macOS, debian 10 (buster), ubuntu LTS.

* [RSK-node](https://developers.rsk.co/quick-start/step1-install-rsk-local-node/)
* [Node.js](https://nodejs.org/en/download/)(LTS 12)
* [npm](https://docs.npmjs.com/cli/install) (optional)
* [yarn](https://yarnpkg.com/lang/en/docs/install/)
* [make](#make), [g++](#g++)
* [ganache-cli](#ganache-cli) (optional)
* [ganache](https://www.trufflesuite.com/ganache)
* [solc](https://solidity.readthedocs.io/en/v0.4.24/installing-solidity.html#binary-packages)
* [sol-select](https://github.com/crytic/solc-select)(optional)
* [node-gyp](https://github.com/nodejs/node-gyp#installation)(optional)
* [direnv] (https://direnv.net/)

#### g++

    #ubuntu/debian
    sudo apt install g++

#### make

    #ubuntu/debian
    sudo apt-get install make

### Recomend 🤓
Recomend for GNU SO.
Install build-essential package and node-gyp.

    #ubuntu/debian
    sudo apt-get install build-essential
    npm install -g node-gyp

Also recommend seting git pull to [default rebase mode](https://coderwall.com/p/tnoiug/rebase-by-default-when-doing-git-pull).

    #ubuntu/debian
    git config --global pull.rebase true

Deployment
-------
To deploy the contracts we use buidler.

Copy the .envrc.example and rename it to .envrc, change the mnemonic, then use`direnv allow` on this dirally rectory.
Finally run `yarn deploy [networkName]` to deploy to the selected network


Debugging 🔩
-------
Debug in local ganache-cli with VS Code

    #run ganache-cli in a terminal
    ganache-cli --gasLimit 20000000 --gasPrice 20000 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true -v -k "istanbul"

Configure launch.json (VS Code).

In .buil/launch.json (create if is necesary) add the follow:

    {
    "version": "0.2.0",
    "configurations": [
        {
            "name": "dev",
            "request": "launch",
            "type": "node",
            "runtimeExecutable": "/usr/bin/npx",
            "program": "saddle",
            "args": [
              "test",
            ],
        },
    ]
    }


Discussion
----------

For any concerns with the protocol, open an issue or visit us on [Telegram](https://t.me/rLendingCommunity) to discuss.

For security concerns, please email [contact@rlending.app](mailto:contact@rlending.app).

_© Copyright 2021, rLending_
