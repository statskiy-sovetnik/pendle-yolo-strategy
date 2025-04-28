import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
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
    tests: "./test/hardhat",
  }
};

export default config;