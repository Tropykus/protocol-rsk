
tropykus Protocol
=================

tropykus is an algorithmic distributed protocol deployed on the RSK network. As such, it's main motivation is to allow users to lend crypto currencies as collateral and to borrow crypto assets based on interest rates set by real-time supply and demand smart contracts. The tropykus Protocol is developed using RSK smart contracts for supplying or borrowing assets. Through the cToken contracts, accounts on the blockchain *supply* capital (rBTC or ERC-20 tokens) to receive cTokens or *borrow* assets from the protocol (holding other assets as collateral). The tropykus cToken contracts track these balances and algorithmically set interest rates for borrowers.

You can read the protocol documentation at [Gitbook](https://tropykus.gitbook.io/tropykus-protocol/)

Contracts
=========

We detail a few of the core contracts in the tropykus protocol.

<dl>
  <dt>CToken, CErc20 and CRBTC</dt>
  <dd>The tropykus cTokens, which are self-contained borrowing and lending contracts. CToken contains the core logic and CErc20 and CRBTC add public interfaces for Erc20 tokens and rBTC, respectively. Each CToken is assigned an interest rate and risk model (see InterestRateModel and Comptroller sections), and allows accounts to *mint* (supply capital), *redeem* (withdraw capital), *borrow* and *repay a borrow*. Each CToken is an ERC-20 compliant token where balances represent ownership of the market.</dd>
</dl>

<dl>
  <dt>Price Oracle Proxy</dt>
  <dd>This contract controls the adapters that link the protocol with price oracles.</dd>
</dl>

<dl>
  <dt>Comptroller</dt>
  <dd>The risk model contract, which validates permissible user actions and disallows actions if they do not fit certain risk parameters. For instance, the Comptroller enforces that each borrowing user must maintain a sufficient collateral balance across all cTokens.</dd>
</dl>

<dl>
  <dt>TROP</dt>
  <dd>The tropykus Governance Token (TROP). Holders of this token have the ability to govern the protocol via the governor contract. Once the token is **launched**</dd>
</dl>

<dl>
  <dt>Governor Alpha</dt>
  <dd>The administrator of the tropykus timelock contract. Holders of TROP token may create and vote on proposals which will be queued into the tropykus timelock and then have effects on tropykus cToken and Comptroller contracts. This contract may be replaced in the future with a beta version.</dd>
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

#### Deployed Networks

| Contract           | Mainnet       | Testnet  |
| :------------------|:------------- |:-------- |
| Unitroller (Comptroller Proxy)  | [0x962308Fef8EdfAdD705384840e7701f8F39ed0c0](https://rootstock.blockscout.com/address/0x962308Fef8EdfAdD705384840e7701f8F39ed0c0) | [0xb1BEc5376929b4E0235F1353819DBa92c4B0C6bb](https://rootstock-testnet.blockscout.com/address/0xb1BEc5376929b4E0235F1353819DBa92c4B0C6bb) |
| Comptroller   | [0x8Cb69F6cB3c07c219789F3B655bF8f068C5c1848](https://rootstock.blockscout.com/address/0x8Cb69F6cB3c07c219789F3B655bF8f068C5c1848) | [0x2DcC80D32f2603C6763FdcA16f8E69e16f59DA36](https://rootstock-testnet.blockscout.com/address/0x2DcC80D32f2603C6763FdcA16f8E69e16f59DA36) |
| kUSDRIF           | [0xDdf3CE45fcf080DF61ee61dac5Ddefef7ED4F46C](https://rootstock.blockscout.com/address/0xDdf3CE45fcf080DF61ee61dac5Ddefef7ED4F46C) | [0xfbee4444493194468df1de7450a37d840eb8b555](https://rootstock-testnet.blockscout.com/address/0xfbee4444493194468df1de7450a37d840eb8b555) |
| kRBTC          | [0x0aeadb9d4c6a80462a47e87e76e487fa8b9a37d7](https://rootstock.blockscout.com/address/0x0aeadb9d4c6a80462a47e87e76e487fa8b9a37d7) | [0x5b35072cd6110606c8421e013304110fa04a32a3](https://rootstock-testnet.blockscout.com/address/0x5b35072cd6110606c8421e013304110fa04a32a3) |
| kDOC         | [0x544eb90e766b405134b3b3f62b6b4c23fcd5fda2](https://rootstock.blockscout.com/address/0x544eb90e766b405134b3b3f62b6b4c23fcd5fda2) | [0x71e6b108d823c2786f8ef63a3e0589576b4f3914](https://rootstock-testnet.blockscout.com/address/0x71e6b108d823c2786f8ef63a3e0589576b4f3914) |
| kBPRO         | [0x405062731d8656af5950ef952be9fa110878036b](https://rootstock.blockscout.com/address/0x405062731d8656af5950ef952be9fa110878036b) | [0x844a99Ba756539Aee698ce2915d678bA0FeE4d9d](https://rootstock-testnet.blockscout.com/address/0x844a99Ba756539Aee698ce2915d678bA0FeE4d9d) |

Installation
------------
To run tropykus, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/TruStartUp/tropykus-protocol
    cd tropykus-protocol
    yarn install --lock-file # or `npm install`

REPL
----

The tropykus Protocol has a simple scenario evaluation tool to test and evaluate scenarios which could occur on the blockchain. We inherited this feature from the original source code and this is primarily used for constructing high-level integration tests. The tool also has a REPL to interact with local the tropykus Protocol (similar to `truffle console`).

    yarn repl -n development
    yarn repl -n rinkeby

    > Read CToken cBAT Address
    Command: Read CToken cBAT Address
    AddressV<val=0xAD53863b864AE703D31b819d29c14cDA93D7c6a6>

You can read more about the scenario runner in the [Scenario Docs](https://github.com/TruStartUp/tropykus-protocol/tree/master/scenario/SCENARIO.md) on steps for using the repl.

Testing
-------
Jest contract tests are defined under the [tests directory](https://github.com/TruStartUp/tropykus-protocol/tree/master/tests). To run the tests run:

    yarn test

Integration Specs
-----------------

There are additional tests under the [spec/scenario](https://github.com/TruStartUp/tropykus-protocol/tree/master/spec/scenario) folder. These are high-level integration tests based on the scenario runner depicted above. The aim of these tests is to be highly literate and have high coverage in the interaction of contracts.

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
tropykus initially developed and tested on:
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

### Recommend 🤓
Recommend for GNU SO.
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

Copy the .envrc.example and rename it to .envrc, change the mnemonic, then use `direnv allow` on this directory.
Finally run `yarn deploy [networkName]` to deploy to the selected network


Debugging 🔩
-------
Debug in local ganache-cli with VS Code

    #run ganache-cli in a terminal
    ganache-cli --gasLimit 20000000 --gasPrice 20000 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true -v -k "istanbul"

Configure launch.json (VS Code).

In .buil/launch.json (create if is necesary) add the follow:****

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

Deprecated Functions and Markets
----------

### Deprecated Functions

The following functions are deprecated and should not be used in new integrations:

#### `getSupplierSnapshotStored(address account)`
- **Status:** DEPRECATED
- **Location:** `CToken.sol`
- **Description:** This function was intended to be used for the kSAT market only. If used in other markets, it can lead to read errors.
- **Recommendation:** Do not use this function in new code. Use standard CToken functions instead.

### Deprecated Markets

The following markets have been deprecated or are no longer actively supported:

#### kSAT Market
- **Status:** DEPRECATED
- **Description:** The kSAT (micro rBTC) market was a specialized market with unique snapshot functionality. This market is no longer actively maintained or supported as well as the Hurricane Interest Rate Model.
- **Note:** The `getSupplierSnapshotStored` function was specifically designed for this market and should not be used with other markets.
- 
#### kUSDT Market
- **Status:** DEPRECATED
- **Description:** The legacy kUSDT market was deprecated due to potential vulnerabilities that could be exploited with its integration.


> **Important:** When integrating with the tropykus Protocol, avoid using deprecated functions and markets. Always refer to the latest contract interfaces and documentation.

Security and Liability
----------
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE
