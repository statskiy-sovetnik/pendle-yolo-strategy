"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const defaultConfig = {
    chainId: 8453, // Base chain
    provider: process.env.RPC_URL || "https://base-rpc.publicnode.com",
    privateKey: process.env.PRIVATE_KEY || "",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    rebalanceThresholdDelta: 0.5, // 0.5%
    rebalanceInterval: 4 * 60 * 60 * 1000, // 4 hours
    stopLossThreshold: 50, // 50%
    apiBaseUrl: "https://api-v2.pendle.finance/api/core",
    markets: [
        {
            name: "Resolv USD",
            marketAddress: "0x715509bde846104cf2ccebf6fdf7ef1bb874bc45",
            ptAddress: "0xa6f0a4d18b6f6ddd408936e81b7b3a8befa18e77",
            ytAddress: "0x61468ea4d55c02744041f16daf8ed0262891661f",
            syAddress: "0x4665d514e82b2f9c78fa2b984e450f33d9efc842",
            underlyingAddress: "0x35e5db674d8e93a03d814fa0ada70731efe8a4b9", // USDC
            maturityTimestamp: 1758758400, // Sep 25 2025
            usdAllocation: 35,
        },
        {
            name: "sKAITO",
            marketAddress: "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b",
            ptAddress: "0xa28a34f1e16d845a0a709bafaac3831ca7a417a7",
            ytAddress: "0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750",
            syAddress: "0x4b272672a58da22b213e733f5aba48cfec534d30",
            underlyingAddress: "0x548d3b444da39686d1a6f1544781d154e7cd1ef7", // USDC
            maturityTimestamp: 1753920000, // July 31 2025
            usdAllocation: 35,
        },
        {
            name: "sUSDz",
            marketAddress: "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1",
            ptAddress: "0x2c14e596c51fb6c0dbad96858b1829835257b93b",
            ytAddress: "0x18839da000e86b3a55fe3f0e32cfe6ef23e84096",
            syAddress: "0xff702347d81725ed8bbe341392af511e29cfed98",
            underlyingAddress: "0xe31ee12bdfdd0573d634124611e85338e2cbf0cf", // USDC
            maturityTimestamp: 1758758400, // Sep 25 2025
            usdAllocation: 30,
        },
    ],
};
exports.default = defaultConfig;
