import axios from "axios";
import { BigNumber } from "ethers";
import { LiquidityData, SwapData } from "../utils/types";
import defaultConfig from "../config";

const BASE_URL = defaultConfig.apiBaseUrl;

interface TokenPrice {
  address: string;
  price: number;
}

interface ApyHistoryItem {
  timestamp: number;
  underlyingApy: number;
  impliedApy: number;
}

interface MarketInfo {
  address: string;
  pt: string;
  yt: string;
  sy: string;
  underlying: string;
  expiry: number;
  tvl: number;
  volume24h: number;
  apr: number;
  // Additional fields may be available
}

// Helper function for SDK API calls
async function callSDK<T>(endpoint: string, data: any): Promise<T> {
  try {
    const response = await axios.post(`${BASE_URL}${endpoint}`, data);
    if (response.data && response.data.data) {
      return response.data.data as T;
    }
    throw new Error("Invalid response data");
  } catch (error) {
    console.error(`Error calling SDK endpoint ${endpoint}:`, error);
    throw error;
  }
}

// Helper function for regular API GET calls
async function fetchAPI<T>(endpoint: string): Promise<T> {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    if (response.data && response.data.data) {
      return response.data.data as T;
    }
    throw new Error("Invalid response data");
  } catch (error) {
    console.error(`Error fetching API endpoint ${endpoint}:`, error);
    throw error;
  }
}

export async function getTokenPrices(
  chainId: number,
  addresses: string[]
): Promise<Record<string, number>> {
  try {
    const addressesParam = addresses.join(",");
    const tokenPrices = await fetchAPI<TokenPrice[]>(
      `/v1/${chainId}/assets/prices?addresses=${addressesParam}`
    );
    
    const priceMap: Record<string, number> = {};
    tokenPrices.forEach((item: TokenPrice) => {
      priceMap[item.address.toLowerCase()] = item.price;
    });
    
    return priceMap;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

export async function getMarketList(chainId: number): Promise<MarketInfo[]> {
  try {
    return await fetchAPI<MarketInfo[]>(`/v1/${chainId}/markets/active`);
  } catch (error) {
    console.error("Error fetching market list:", error);
    return [];
  }
}

export async function getMarketApyHistory(
  chainId: number,
  marketAddress: string
): Promise<ApyHistoryItem[]> {
  try {
    return await fetchAPI<ApyHistoryItem[]>(`/v2/${chainId}/markets/${marketAddress}/apy-history`);
  } catch (error) {
    console.error("Error fetching market APY history:", error);
    return [];
  }
}

export async function swapTokens(
  chainId: number,
  marketAddress: string,
  receiverAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: BigNumber,
  slippage: number = 0.5
): Promise<SwapData> {
  return callSDK<SwapData>(`/v1/sdk/${chainId}/markets/${marketAddress}/swap`, {
    receiver: receiverAddress,
    slippage: slippage / 100, // Convert from percentage to decimal
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    enableAggregator: true
  });
}

export async function addLiquidity(
  chainId: number,
  marketAddress: string,
  receiverAddress: string,
  tokenIn: string,
  amountIn: BigNumber,
  slippage: number = 0.5
): Promise<LiquidityData> {
  return callSDK<LiquidityData>(`/v1/sdk/${chainId}/markets/${marketAddress}/add-liquidity`, {
    receiver: receiverAddress,
    slippage: slippage / 100, // Convert from percentage to decimal
    tokenIn,
    amountIn: amountIn.toString()
  });
}

export async function removeLiquidity(
  chainId: number,
  marketAddress: string,
  receiverAddress: string,
  lpAmount: BigNumber,
  tokenOut: string,
  slippage: number = 0.5
): Promise<LiquidityData> {
  return callSDK<LiquidityData>(`/v1/sdk/${chainId}/markets/${marketAddress}/remove-liquidity`, {
    receiver: receiverAddress,
    slippage: slippage / 100, // Convert from percentage to decimal
    tokenOut,
    amountIn: lpAmount.toString()
  });
}