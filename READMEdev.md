Riflending Protocol DEV🚀
=================

Prerequisites 📋
------------
Operating system: macOS, debian 10 (buster), ubuntu LTS.

[Node.js](https://nodejs.org/en/download/)(LTS 12), [npm](https://docs.npmjs.com/cli/install) (optional), [yarn](https://yarnpkg.com/lang/en/docs/install/), [make](#make), [g++](#g++), [ganache-cli](#ganache-cli)/[ganache](https://www.trufflesuite.com/ganache), [solc](https://solidity.readthedocs.io/en/v0.4.24/installing-solidity.html#binary-packages), [node-gyp](https://github.com/nodejs/node-gyp#installation)(optional)
 
 #### ganache-cli

    #ubuntu/debian    
    npm install -g ganache-cli
    or
    yarn global add ganache-cli
    
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
    

------------


Installation
------------
To run riflending dev, pull the repository from GitHub
and install its dependencies with npm or yarn.
    
    git clone -b dev https://github.com/riflending/riflending-protocol

    cd riflending    
    yarn install --lock-file 
    or 
    npm install


------------


Testing 🔧
-------
Contract tests are defined under the [tests directory](https://github.com/compound-finance/compound-protocol/tree/master/tests). To run the tests run:

    yarn test

To be continue (TODO) ..

------------
_© Copyright 2020, RIF Lending_
