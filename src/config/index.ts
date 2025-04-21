import { config as dotenvConfig } from "dotenv";
dotenvConfig();

export interface MarketConfig {
  name: string;
  marketAddress: string;
  ptAddress: string;
  ytAddress: string;
  syAddress: string;
  underlyingAddress: string;
  maturityTimestamp: number;
  usdAllocation: number;
}

export interface Config {
  chainId: number;
  provider: string;
  privateKey: string;
  usdcAddress: string;
  rebalanceThresholdDelta: number; // in percentage (0.5 = 0.5%)
  rebalanceInterval: number; // in milliseconds
  markets: MarketConfig[];
  stopLossThreshold: number; // in percentage (50 = 50%)
  apiBaseUrl: string;
}

const defaultConfig: Config = {
  chainId: 8453, // Base chain
  provider: process.env.RPC_URL || "https://mainnet.base.org",
  privateKey: process.env.PRIVATE_KEY || "",
  usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  rebalanceThresholdDelta: 0.5, // 0.5%
  rebalanceInterval: 4 * 60 * 60 * 1000, // 4 hours
  stopLossThreshold: 50, // 50%
  apiBaseUrl: "https://api-v2.pendle.finance/api/core",
  markets: [
    // Example market - replace with actual markets you want to target
    {
      name: "USDC/wstETH Market",
      marketAddress: "0x0ad7a2cd6477268fad467f79f506db8f3bb5aabb", // Example - replace with actual
      ptAddress: "0xb02eedc9e7eac466c7df3d447f2862972eb7291a", // Example - replace with actual
      ytAddress: "0x55a75a7505cdba3fa0b8d3c9bbf78d61c6ef0753", // Example - replace with actual
      syAddress: "0xc3863272170dc0421cd0dedf88d7248a4b3bdd24", // Example - replace with actual
      underlyingAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      maturityTimestamp: 1717171200, // Example - replace with actual maturity (June 1, 2024)
      usdAllocation: 1000, // $1000 allocation
    },
  ],
};

export default defaultConfig;