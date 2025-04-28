import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { StrategyMode } from "../../src/utils/types";
import { PendleYoloStrategy } from "../../src/strategies/pendleYoloStrategy";
import { 
  USDC_ADDRESS,
  determineOptimalStrategy
} from "./helpers/test-setup";


// We'll use the actual API for forked network tests
describe("PendleYoloStrategy", function() {
  // Increase timeout for network interaction
  this.timeout(60000);
  
  let strategy: PendleYoloStrategy;
  let signers: Signer[];
  let testUser: Signer;
  let testUserAddress: string;
  let usdcContract: Contract;
  
  // Base chain addresses for tokens we need to test with
  const USDC_WHALE = "0xda9360F80F7AcE88F14a504f4D950d0eE5A93db9";

  beforeAll(async function() {
    signers = await ethers.getSigners();
    testUser = signers[0];
    testUserAddress = await testUser.getAddress();
    
    // Get USDC contract for interactions
    usdcContract = await ethers.getContractAt(
      "IERC20",
      USDC_ADDRESS
    );

    // Fund test user with USDC
    try {
      // Impersonate the USDC whale 
      await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
      const whaleSigner = await ethers.getImpersonatedSigner(USDC_WHALE);
      
      // Get USDC contract with the whale as signer
      const whaleUsdcContract = await ethers.getContractAt(
        "IERC20",
        USDC_ADDRESS,
        whaleSigner
      );
      
      // Transfer some USDC to our test user
      const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      await whaleUsdcContract.transfer(testUserAddress, usdcAmount);
      
      // Stop impersonating
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
      
      // Verify balance
      const balance = await usdcContract.balanceOf(testUserAddress);
      console.log(`USDC balance for test user: ${ethers.formatUnits(balance, 6)}`);
      
      if (balance < ethers.parseUnits("100", 6)) {
        throw new Error("Insufficient USDC balance for tests");
      }
    } catch (error) {
      console.error("Error setting up USDC balance:", error);
    }
  });
  
  beforeEach(async function() {
    // Create a config for testing on a forked Base network
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
          underlyingAddress: "0x35e5db674d8e93a03d814fa0ada70731efe8a4b9", // USDbC
          maturityTimestamp: 1758758400, // Sep 25 2025
          usdAllocation: 35,
        },
        {
          name: "sKAITO",
          marketAddress: "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b",
          ptAddress: "0xa28a34f1e16d845a0a709bafaac3831ca7a417a7",
          ytAddress: "0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750",
          syAddress: "0x4b272672a58da22b213e733f5aba48cfec534d30",
          underlyingAddress: "0x548d3b444da39686d1a6f1544781d154e7cd1ef7", // kUSDT
          maturityTimestamp: 1753920000, // July 31 2025
          usdAllocation: 35,
        },
        {
          name: "sUSDz",
          marketAddress: "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1",
          ptAddress: "0x2c14e596c51fb6c0dbad96858b1829835257b93b",
          ytAddress: "0x18839da000e86b3a55fe3f0e32cfe6ef23e84096",
          syAddress: "0xff702347d81725ed8bbe341392af511e29cfed98",
          underlyingAddress: "0xe31ee12bdfdd0573d634124611e85338e2cbf0cf", // USDbCz
          maturityTimestamp: 1758758400, // Sep 25 2025
          usdAllocation: 30,
        },
      ],
    };
    
    // Create the strategy instance with the config
    strategy = new PendleYoloStrategy(mockConfig.chainId, mockConfig);
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
      
      // Print market data for debugging
      console.log("Resolv USD Market Data:", {
        ptPrice: marketStates[0].marketData.ptPrice,
        ytPrice: marketStates[0].marketData.ytPrice,
        fixedYield: marketStates[0].marketData.fixedYield,
        impliedYield: marketStates[0].marketData.impliedYield,
        underlyingApy: marketStates[0].marketData.underlyingApy,
      });
      
      console.log("sKAITO Market Data:", {
        ptPrice: marketStates[1].marketData.ptPrice,
        ytPrice: marketStates[1].marketData.ytPrice,
        fixedYield: marketStates[1].marketData.fixedYield,
        impliedYield: marketStates[1].marketData.impliedYield,
        underlyingApy: marketStates[1].marketData.underlyingApy,
      });
      
      console.log("sUSDz Market Data:", {
        ptPrice: marketStates[2].marketData.ptPrice,
        ytPrice: marketStates[2].marketData.ytPrice,
        fixedYield: marketStates[2].marketData.fixedYield,
        impliedYield: marketStates[2].marketData.impliedYield,
        underlyingApy: marketStates[2].marketData.underlyingApy,
      });
    });
  });

  describe("Strategy Determination", function() {
    it("should determine strategies based on actual market data", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Get the market states
      const marketStates = strategy.getMarketStates();
      
      // Determine optimal strategy for each market based on real data
      for (const market of marketStates) {
        const optimalStrategy = determineOptimalStrategy(
          market.marketData.fixedYield,
          market.marketData.impliedYield,
          market.marketData.underlyingApy,
          market.marketData.expired
        );
        
        console.log(`${market.marketConfig.name} Optimal Strategy: ${optimalStrategy}`);
        
        // Verify that we got a valid strategy
        expect(Object.values(StrategyMode)).to.include(optimalStrategy);
      }
    });
  });

  describe("Single Transaction Execution", function() {
    // For initial testing, we'll just verify we can call the API endpoints
    // and generate transaction data - we won't execute real transactions yet
    
    it("should generate valid swap transaction data", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Test the swap functionality
      const { chainId, markets } = strategy.getConfig();
      const market = markets[0]; // Use the first market
      
      // Import the pendleApi module directly
      const pendleApi = require("../../src/api/pendleApi");
      
      // Generate swap transaction data
      const usdcAmountIn = ethers.parseUnits("10", 6); // 10 USDC
      
      // Check that we can generate a swap transaction (USDC -> PT)
      const swapData = await pendleApi.swapTokens(
        chainId,
        market.marketAddress,
        testUserAddress,
        market.underlyingAddress,
        market.ptAddress,
        usdcAmountIn
      );
      
      // Verify the swap data has required fields
      expect(swapData).to.have.property("callData");
      expect(swapData.callData).to.not.equal("0x");
      expect(swapData).to.have.property("router");
      expect(swapData).to.have.property("target");
      expect(swapData).to.have.property("tokenInAmount");
      expect(swapData).to.have.property("minTokenOut");
      
      console.log("Swap transaction data generated successfully");
    });
    
    it("should generate valid add liquidity transaction data", async function() {
      // Initialize the strategy
      await strategy.initialize();
      
      // Test the add liquidity functionality
      const { chainId, markets } = strategy.getConfig();
      const market = markets[0]; // Use the first market
      
      // Import the pendleApi module directly
      const pendleApi = require("../../src/api/pendleApi");
      
      // Generate add liquidity transaction data
      const usdcAmountIn = ethers.parseUnits("10", 6); // 10 USDC
      
      // Check that we can generate an add liquidity transaction
      const liquidityData = await pendleApi.addLiquidity(
        chainId,
        market.marketAddress,
        testUserAddress,
        market.underlyingAddress,
        usdcAmountIn
      );
      
      // Verify the liquidity data has required fields
      expect(liquidityData).to.have.property("callData");
      expect(liquidityData.callData).to.not.equal("0x");
      expect(liquidityData).to.have.property("router");
      expect(liquidityData).to.have.property("target");
      expect(liquidityData).to.have.property("tokenInAmount");
      expect(liquidityData).to.have.property("minLpOut");
      
      console.log("Add liquidity transaction data generated successfully");
    });
  });
});