import marketData from "../fixtures/market-data.json";
import { SwapData, LiquidityData } from "../../../src/utils/types";

/**
 * Mock implementation of the Pendle API for testing
 */
export class MockPendleApi {
  /**
   * Mock token prices for testing
   */
  static async getTokenPrices(
    chainId: number,
    addresses: string[]
  ): Promise<Record<string, number>> {
    const priceMap: Record<string, number> = {};
    
    // Map addresses to market data from fixtures
    addresses.forEach(address => {
      // Convert address to lowercase for case-insensitive comparison
      const addr = address.toLowerCase();
      
      // Resolv market tokens
      if (addr === "0xa6f0a4d18b6f6ddd408936e81b7b3a8befa18e77".toLowerCase()) {
        priceMap[addr] = marketData.markets.resolv.ptPrice;
      } else if (addr === "0x61468ea4d55c02744041f16daf8ed0262891661f".toLowerCase()) {
        priceMap[addr] = marketData.markets.resolv.ytPrice;
      } else if (addr === "0x715509bde846104cf2ccebf6fdf7ef1bb874bc45".toLowerCase()) {
        priceMap[addr] = marketData.markets.resolv.lpPrice;
      }
      
      // sKAITO market tokens
      else if (addr === "0xa28a34f1e16d845a0a709bafaac3831ca7a417a7".toLowerCase()) {
        priceMap[addr] = marketData.markets.skaito.ptPrice;
      } else if (addr === "0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750".toLowerCase()) {
        priceMap[addr] = marketData.markets.skaito.ytPrice;
      } else if (addr === "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b".toLowerCase()) {
        priceMap[addr] = marketData.markets.skaito.lpPrice;
      }
      
      // sUSDz market tokens
      else if (addr === "0x2c14e596c51fb6c0dbad96858b1829835257b93b".toLowerCase()) {
        priceMap[addr] = marketData.markets.susdz.ptPrice;
      } else if (addr === "0x18839da000e86b3a55fe3f0e32cfe6ef23e84096".toLowerCase()) {
        priceMap[addr] = marketData.markets.susdz.ytPrice;
      } else if (addr === "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1".toLowerCase()) {
        priceMap[addr] = marketData.markets.susdz.lpPrice;
      }
      
      // Underlying tokens (USDC or equivalent)
      else if (addr.includes("underlying")) {
        priceMap[addr] = 1.0; // USDC price
      } else {
        priceMap[addr] = 1.0; // Default price
      }
    });
    
    return priceMap;
  }

  /**
   * Mock market APY history for testing
   */
  static async getMarketApyHistory(
    chainId: number,
    marketAddress: string
  ): Promise<any[]> {
    const addr = marketAddress.toLowerCase();
    let marketInfo;
    
    // Resolv market
    if (addr === "0x715509bde846104cf2ccebf6fdf7ef1bb874bc45".toLowerCase()) {
      marketInfo = marketData.markets.resolv;
    }
    // sKAITO market
    else if (addr === "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b".toLowerCase()) {
      marketInfo = marketData.markets.skaito;
    }
    // sUSDz market
    else if (addr === "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1".toLowerCase()) {
      marketInfo = marketData.markets.susdz;
    } else {
      // Default market data
      marketInfo = marketData.markets.resolv;
    }
    
    return [
      {
        timestamp: Math.floor(Date.now() / 1000),
        underlyingApy: marketInfo.underlyingApy,
        impliedApy: marketInfo.impliedYield
      }
    ];
  }

  /**
   * Mock swap tokens function for testing
   */
  static async swapTokens(
    chainId: number,
    marketAddress: string,
    receiverAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    slippage: number = 0.5
  ): Promise<SwapData> {
    // Use market data to calculate tokenOut amount
    const tokenInPrice = await this.getTokenPrice(chainId, tokenIn);
    const tokenOutPrice = await this.getTokenPrice(chainId, tokenOut);
    
    // Calculate token out amount based on price ratio
    const amountInValue = amountIn * BigInt(Math.floor(tokenInPrice * 1e6)) / BigInt(1e6);
    const amountOut = amountInValue * BigInt(1e6) / BigInt(Math.floor(tokenOutPrice * 1e6));
    
    // Apply slippage
    const minAmountOut = amountOut * BigInt(10000 - Math.floor(slippage * 100)) / BigInt(10000);
    
    return {
      callData: "0x", // Mock calldata
      router: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock router address
      target: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock target address
      value: "0", // No ETH value
      callType: "SWAP", // Call type
      tokenInAmount: amountIn.toString(),
      minTokenOut: minAmountOut.toString(),
      gas: "500000" // Estimated gas
    };
  }

  /**
   * Mock add liquidity function for testing
   */
  static async addLiquidity(
    chainId: number,
    marketAddress: string,
    receiverAddress: string,
    tokenIn: string,
    amountIn: bigint,
    slippage: number = 0.5
  ): Promise<LiquidityData> {
    // Use market data to calculate LP token amount
    const tokenInPrice = await this.getTokenPrice(chainId, tokenIn);
    const lpTokenPrice = await this.getTokenPrice(chainId, marketAddress);
    
    // Calculate LP token amount based on price ratio
    const amountInValue = amountIn * BigInt(Math.floor(tokenInPrice * 1e6)) / BigInt(1e6);
    const lpAmount = amountInValue * BigInt(1e6) / BigInt(Math.floor(lpTokenPrice * 1e6));
    
    // Apply slippage
    const minLpOut = lpAmount * BigInt(10000 - Math.floor(slippage * 100)) / BigInt(10000);
    
    return {
      callData: "0x", // Mock calldata
      router: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock router address
      target: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock target address
      value: "0", // No ETH value
      callType: "ADD_LIQUIDITY", // Call type
      tokenInAmount: amountIn.toString(),
      minLpOut: minLpOut.toString(),
      gas: "500000" // Estimated gas
    };
  }

  /**
   * Mock remove liquidity function for testing
   */
  static async removeLiquidity(
    chainId: number,
    marketAddress: string,
    receiverAddress: string,
    lpAmount: bigint,
    tokenOut: string,
    slippage: number = 0.5
  ): Promise<LiquidityData> {
    // Use market data to calculate token out amount
    const lpTokenPrice = await this.getTokenPrice(chainId, marketAddress);
    const tokenOutPrice = await this.getTokenPrice(chainId, tokenOut);
    
    // Calculate token out amount based on price ratio
    const lpValue = lpAmount * BigInt(Math.floor(lpTokenPrice * 1e6)) / BigInt(1e6);
    const tokenOutAmount = lpValue * BigInt(1e6) / BigInt(Math.floor(tokenOutPrice * 1e6));
    
    // Apply slippage
    const minTokenOut = tokenOutAmount * BigInt(10000 - Math.floor(slippage * 100)) / BigInt(10000);
    
    return {
      callData: "0x", // Mock calldata
      router: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock router address
      target: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mock target address
      value: "0", // No ETH value
      callType: "REMOVE_LIQUIDITY", // Call type
      tokenInAmount: lpAmount.toString(),
      minLpOut: minTokenOut.toString(),
      gas: "500000" // Estimated gas
    };
  }

  /**
   * Helper function to get token price for a specific address
   */
  private static async getTokenPrice(chainId: number, tokenAddress: string): Promise<number> {
    const addr = tokenAddress.toLowerCase();
    
    // Resolv market tokens
    if (addr === "0xa6f0a4d18b6f6ddd408936e81b7b3a8befa18e77".toLowerCase()) {
      return marketData.markets.resolv.ptPrice;
    } else if (addr === "0x61468ea4d55c02744041f16daf8ed0262891661f".toLowerCase()) {
      return marketData.markets.resolv.ytPrice;
    } else if (addr === "0x715509bde846104cf2ccebf6fdf7ef1bb874bc45".toLowerCase()) {
      return marketData.markets.resolv.lpPrice;
    }
    
    // sKAITO market tokens
    else if (addr === "0xa28a34f1e16d845a0a709bafaac3831ca7a417a7".toLowerCase()) {
      return marketData.markets.skaito.ptPrice;
    } else if (addr === "0x5f42d7365ed7b51a77c275e9f36a8d8f9cc56750".toLowerCase()) {
      return marketData.markets.skaito.ytPrice;
    } else if (addr === "0xa46cac2243ecd83a6a9ad58232c1967ebd14d41b".toLowerCase()) {
      return marketData.markets.skaito.lpPrice;
    }
    
    // sUSDz market tokens
    else if (addr === "0x2c14e596c51fb6c0dbad96858b1829835257b93b".toLowerCase()) {
      return marketData.markets.susdz.ptPrice;
    } else if (addr === "0x18839da000e86b3a55fe3f0e32cfe6ef23e84096".toLowerCase()) {
      return marketData.markets.susdz.ytPrice;
    } else if (addr === "0xd7c3cece4bd8ff41ade50d59ece7bc91dc2545c1".toLowerCase()) {
      return marketData.markets.susdz.lpPrice;
    }
    
    // USDC or equivalent
    return 1.0;
  }
}