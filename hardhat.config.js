require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
const dotenv = require("dotenv");

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: "0.8.23",
  networks: {
    hardhat: {
      forking: {
        url: process.env.BASE_RPC_URL || "https://rpc.ankr.com/base",
        blockNumber: 24394885
      },
      chainId: 8453
    }
  },
  paths: {
    tests: "./test/hardhat"
  }
};
