import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { StrategyMode } from "../../src/utils/types";
import { PendleYoloStrategy } from "../../src/strategies/pendleYoloStrategy";
import { MockPendleApi } from "./helpers/mockPendleApi";
import {
  USDC_ADDRESS, 
  mockTransactionExecution, 
  determineOptimalStrategy,
  fundWithUSDC
} from "./helpers/test-setup";
import marketData from "./fixtures/market-data.json";

// Mock the pendleApi module
jest.mock("../../src/api/pendleApi", () => ({
  getTokenPrices: (chainId: number, addresses: string[]) => 
    MockPendleApi.getTokenPrices(chainId, addresses),
  getMarketApyHistory: (chainId: number, marketAddress: string) => 
    MockPendleApi.getMarketApyHistory(chainId, marketAddress),
  swapTokens: (chainId: number, marketAddress: string, receiverAddress: string, 
               tokenIn: string, tokenOut: string, amountIn: BigNumber, slippage?: number) => 
    MockPendleApi.swapTokens(chainId, marketAddress, receiverAddress, tokenIn, tokenOut, amountIn, slippage),
  addLiquidity: (chainId: number, marketAddress: string, receiverAddress: string,
                 tokenIn: string, amountIn: BigNumber, slippage?: number) => 
    MockPendleApi.addLiquidity(chainId, marketAddress, receiverAddress, tokenIn, amountIn, slippage),
  removeLiquidity: (chainId: number, marketAddress: string, receiverAddress: string,
                    lpAmount: BigNumber, tokenOut: string, slippage?: number) => 
    MockPendleApi.removeLiquidity(chainId, marketAddress, receiverAddress, lpAmount, tokenOut, slippage)
}));

// Mock ethers wallet sendTransaction
jest.mock("ethers", () => {
  const originalModule = jest.requireActual("ethers");
  return {
    ...originalModule,
    Wallet: class MockWallet {
      address: string;
      provider: any;
      
      constructor(privateKey: string, provider: any) {
        this.address = "0x1234567890123456789012345678901234567890";
        this.provider = provider;
      }
      
      async sendTransaction(tx: any) {
        await mockTransactionExecution(tx, this);
        return {
          wait: () => Promise.resolve({ status: 1 })
        };
      }
    }
  };
});

describe("PendleYoloStrategy", function() {
  let strategy: PendleYoloStrategy;
  let signers: Signer[];
  let testUser: Signer;
  let testUserAddress: string;

  beforeEach(async function() {
    signers = await ethers.getSigners();
    testUser = signers[0];
    testUserAddress = await testUser.getAddress();
    
    // Create a mock config for testing
    const mockConfig = {
      chainId: 8453, // Base chain
      provider: "http://localhost:8545", // Use Hardhat's local URL
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat test private key
      usdcAddress: USDC_ADDRESS,
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
          underlyingAddress: "0x35e5db674d8e93a03d814fa0ada70731efe8a4b9",
          maturityTimestamp: 1758758400, // Sep 25 2025
          usdAllocation: 35,
        },
        {
          name: "sKAITO",
          marketAddress: "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b",
          ptAddress: "0xa28a34f1e16d845a0a709bafaac3831ca7a417a7",
          ytAddress: "0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750",
          syAddress: "0x4b272672a58da22b213e733f5aba48cfec534d30",
          underlyingAddress: "0x548d3b444da39686d1a6f1544781d154e7cd1ef7",
          maturityTimestamp: 1753920000, // July 31 2025
          usdAllocation: 35,
        },
        {
          name: "sUSDz",
          marketAddress: "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1",
          ptAddress: "0x2c14e596c51fb6c0dbad96858b1829835257b93b",
          ytAddress: "0x18839da000e86b3a55fe3f0e32cfe6ef23e84096",
          syAddress: "0xff702347d81725ed8bbe341392af511e29cfed98",
          underlyingAddress: "0xe31ee12bdfdd0573d634124611e85338e2cbf0cf",
          maturityTimestamp: 1758758400, // Sep 25 2025
          usdAllocation: 30,
        },
      ],
    };
    
    // Create the strategy instance with the mock config
    strategy = new PendleYoloStrategy(mockConfig.chainId, mockConfig);
    
    // Fund the test wallet with USDC for testing
    try {
      await fundWithUSDC(testUserAddress, ethers.utils.parseUnits("1000", 6)); // 1000 USDC
    } catch (error) {
      console.warn("Unable to fund test wallet with USDC, mocking only");
    }
  });

  describe("Initialization", function() {
    it("should initialize the strategy with market data", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify that markets have been initialized
      expect(marketStates.length).to.equal(3);
      expect(marketStates[0].marketConfig.name).to.equal("Resolv USD");
      expect(marketStates[1].marketConfig.name).to.equal("sKAITO");
      expect(marketStates[2].marketConfig.name).to.equal("sUSDz");
      
      // Verify that market data has been fetched
      expect(marketStates[0].marketData.timestamp).to.be.greaterThan(0);
      expect(marketStates[1].marketData.timestamp).to.be.greaterThan(0);
      expect(marketStates[2].marketData.timestamp).to.be.greaterThan(0);
    });
    
    it("should correctly calculate yields and prices", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify Resolv market data
      expect(marketStates[0].marketData.ptPrice).to.be.closeTo(
        marketData.markets.resolv.ptPrice, 0.01);
      expect(marketStates[0].marketData.ytPrice).to.be.closeTo(
        marketData.markets.resolv.ytPrice, 0.01);
      expect(marketStates[0].marketData.fixedYield).to.be.greaterThan(0);
      expect(marketStates[0].marketData.impliedYield).to.be.closeTo(
        marketData.markets.resolv.impliedYield, 0.01);
      expect(marketStates[0].marketData.underlyingApy).to.be.closeTo(
        marketData.markets.resolv.underlyingApy, 0.01);
      
      // Verify sKAITO market data
      expect(marketStates[1].marketData.ptPrice).to.be.closeTo(
        marketData.markets.skaito.ptPrice, 0.01);
      expect(marketStates[1].marketData.ytPrice).to.be.closeTo(
        marketData.markets.skaito.ytPrice, 0.01);
      expect(marketStates[1].marketData.fixedYield).to.be.greaterThan(0);
      expect(marketStates[1].marketData.impliedYield).to.be.closeTo(
        marketData.markets.skaito.impliedYield, 0.01);
      expect(marketStates[1].marketData.underlyingApy).to.be.closeTo(
        marketData.markets.skaito.underlyingApy, 0.01);
      
      // Verify sUSDz market data
      expect(marketStates[2].marketData.ptPrice).to.be.closeTo(
        marketData.markets.susdz.ptPrice, 0.01);
      expect(marketStates[2].marketData.ytPrice).to.be.closeTo(
        marketData.markets.susdz.ytPrice, 0.01);
      expect(marketStates[2].marketData.fixedYield).to.be.greaterThan(0);
      expect(marketStates[2].marketData.impliedYield).to.be.closeTo(
        marketData.markets.susdz.impliedYield, 0.01);
      expect(marketStates[2].marketData.underlyingApy).to.be.closeTo(
        marketData.markets.susdz.underlyingApy, 0.01);
    });
  });

  describe("Strategy Determination", function() {
    it("should correctly determine strategies for each market", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify Resolv market strategy (based on our mock data)
      const resolvStrategy = determineOptimalStrategy(
        marketData.markets.resolv.fixedYield,
        marketData.markets.resolv.impliedYield,
        marketData.markets.resolv.underlyingApy,
        marketData.markets.resolv.expired
      );
      expect(resolvStrategy).to.equal(StrategyMode.PT); // Fixed yield > underlying APY
      
      // Verify sKAITO market strategy
      const skaitoStrategy = determineOptimalStrategy(
        marketData.markets.skaito.fixedYield,
        marketData.markets.skaito.impliedYield,
        marketData.markets.skaito.underlyingApy,
        marketData.markets.skaito.expired
      );
      expect(skaitoStrategy).to.equal(StrategyMode.YT); // Underlying APY > implied yield
      
      // Verify sUSDz market strategy
      const susdzStrategy = determineOptimalStrategy(
        marketData.markets.susdz.fixedYield,
        marketData.markets.susdz.impliedYield,
        marketData.markets.susdz.underlyingApy,
        marketData.markets.susdz.expired
      );
      // Should be LP because no significant difference between yields
      expect(susdzStrategy).to.equal(StrategyMode.LP); 
    });
  });

  describe("Strategy Execution", function() {
    it("should execute strategy for Resolv market", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Execute strategy for Resolv market (index 0)
      await strategy.executeStrategy(0);
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify that a position was established
      expect(marketStates[0].position).to.not.be.null;
      expect(marketStates[0].position?.mode).to.equal(StrategyMode.PT);
      expect(marketStates[0].position?.tokenAddress).to.equal("0xa6f0a4d18b6f6ddd408936e81b7b3a8befa18e77");
      expect(marketStates[0].position?.initialUsdValue).to.equal(35); // USD allocation
    });
    
    it("should execute strategy for sKAITO market", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Execute strategy for sKAITO market (index 1)
      await strategy.executeStrategy(1);
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify that a position was established
      expect(marketStates[1].position).to.not.be.null;
      expect(marketStates[1].position?.mode).to.equal(StrategyMode.YT);
      expect(marketStates[1].position?.tokenAddress).to.equal("0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750");
      expect(marketStates[1].position?.initialUsdValue).to.equal(35); // USD allocation
    });
    
    it("should execute strategy for sUSDz market", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Execute strategy for sUSDz market (index 2)
      await strategy.executeStrategy(2);
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify that a position was established
      expect(marketStates[2].position).to.not.be.null;
      expect(marketStates[2].position?.mode).to.equal(StrategyMode.LP);
      expect(marketStates[2].position?.tokenAddress).to.equal("0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1");
      expect(marketStates[2].position?.initialUsdValue).to.equal(30); // USD allocation
    });
    
    it("should execute all strategies in sequence", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Execute strategy for all markets
      for (let i = 0; i < 3; i++) {
        await strategy.executeStrategy(i);
      }
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Verify that positions were established for all markets
      expect(marketStates[0].position).to.not.be.null;
      expect(marketStates[1].position).to.not.be.null;
      expect(marketStates[2].position).to.not.be.null;
      
      // Verify total allocation
      const totalAllocation = 
        marketStates[0].position!.initialUsdValue + 
        marketStates[1].position!.initialUsdValue + 
        marketStates[2].position!.initialUsdValue;
      expect(totalAllocation).to.equal(100); // 35 + 35 + 30
    });
  });
});