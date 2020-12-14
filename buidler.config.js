const networks = require('./buidler.networks')

const {TASK_COMPILE_GET_COMPILER_INPUT} = require("@nomiclabs/buidler/builtin-tasks/task-names");

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-deploy");

// This must occur after buidler-deploy!
task(TASK_COMPILE_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  input.settings.metadata.useLiteralContent = process.env.USE_LITERAL_CONTENT != 'false';
  console.log(`useLiteralContent: ${input.settings.metadata.useLiteralContent}`)
  return input;
})

const optimizerEnabled = !process.env.OPTIMIZER_DISABLED

const config = {
  solc: {
    version: "0.5.17",
    optimizer: {
      enabled: optimizerEnabled,
      runs: 200
    },
    evmVersion: "istanbul"
  },
  paths: {
    artifacts: "./build"
  },
  networks,
  namedAccounts: {
    deployer: {
      default: 0
    },
    rifOracle: {
      30: '0x504EfCadfB020d6Bbaec8a5C5bb21453719d0e00',
      31: '0x9d4b2c05818a0086e641437fcb64ab6098c7bbec'
    },
    rbtcOracle: {
      30: '0x7b19bb8e6c5188ec483b784d6fb5d807a77b21bf',
      31: '0x2d39cc54dc44ff27ad23a91a9b5fd750dae4b218'
    },
    dai: {
      30: "0x6b1a73d547f4009a26b8485b63d7015d248ad406",
      31: "0x0d86fca9be034a363cf12c9834af08d54a10451c"
    },
    rif: {
      30: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
      31: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
    }
  }
};

module.exports = config
