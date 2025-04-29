import axios from "axios";
import { AssetInfo, LiquidityData, MarketDataPoint, SwapData } from "../utils/types";
import defaultConfig from "../config";
import { parse } from "csv-string";

const BASE_URL = defaultConfig.apiBaseUrl;

interface TokenPrice {
  address: string;
  price: number;
}

interface HistoricalPriceQuery {
  timeFrame?: "hour" | "day" | "week";
  timestampStart?: Date;
  timestampEnd?: Date;
}

interface HistoricalPriceResponse {
  total: number;
  currency: string;
  timeFrame: string;
  timestamp_start: number;
  timestamp_end: number;
  results: string;
}

interface PriceDataPoint {
  timestamp: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

interface ApyHistoryItem {
  timestamp: number;
  underlyingApy: number;
  impliedApy: number;
}

interface HistoricalDataQuery {
  timeFrame?: "hour" | "day" | "week";
  timestampStart?: Date;
  timestampEnd?: Date;
}

interface HistoricalDataResponse {
  total: number;
  timestamp_start: string;
  timestamp_end: string;
  results: string;
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
async function fetchAPI<T>(endpoint: string, params?: any): Promise<T> {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, params ? { params } : undefined);
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
  addresses: string[],
  timestamp?: Date
): Promise<Record<string, number>> {
  try {
    // If no timestamp provided, get current prices
    if (!timestamp) {
      const addressesParam = addresses.join(",");
      const tokenPrices = await fetchAPI<TokenPrice[]>(
        `/v1/${chainId}/assets/prices?addresses=${addressesParam}`
      );
      
      const priceMap: Record<string, number> = {};
      tokenPrices.forEach((item: TokenPrice) => {
        priceMap[item.address.toLowerCase()] = item.price;
      });
      
      return priceMap;
    } else {
      // For historical prices, we need to fetch each token individually
      const priceMap: Record<string, number> = {};
      
      // Create a time window around the requested timestamp
      const timestampStart = new Date(timestamp.getTime() - 12 * 60 * 60 * 1000); // 12h before
      const timestampEnd = new Date(timestamp.getTime() + 12 * 60 * 60 * 1000);   // 12h after
      
      const query: HistoricalPriceQuery = {
        timeFrame: "hour", // Use hourly granularity for more precise results
        timestampStart,
        timestampEnd
      };
      
      // For historical prices, fetch each token price individually
      for (const address of addresses) {
        try {
          // Request historical price data for this token
          const response = await axios.get<HistoricalPriceResponse>(
            `${BASE_URL}/v4/${chainId}/prices/${address}/ohlcv`,
            { params: query }
          );
          
          if (!response.data || !response.data.results) {
            console.warn(`Invalid historical price response for ${address}`);
            continue;
          }
          
          // Parse CSV results
          const csvData = parse(response.data.results, { output: 'objects' });
          
          if (csvData.length === 0) {
            console.warn(`No price data available for ${address} around timestamp ${timestamp.toISOString()}`);
            continue;
          }
          
          // Find the closest data point to the requested timestamp
          const targetTimestampMs = timestamp.getTime();
          let closestDataPoint = csvData[0];
          let smallestDiff = Math.abs(new Date(csvData[0].time).getTime() - targetTimestampMs);
          
          for (let i = 1; i < csvData.length; i++) {
            const dataPointTime = new Date(csvData[i].time).getTime();
            const diff = Math.abs(dataPointTime - targetTimestampMs);
            
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestDataPoint = csvData[i];
            }
          }
          
          // Use the closing price from the closest data point
          priceMap[address.toLowerCase()] = parseFloat(closestDataPoint.close);
        } catch (error) {
          console.error(`Error fetching historical price for ${address}:`, error);
          // Continue with the next token if one fails
        }
      }
      
      return priceMap;
    }
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
  marketAddress: string,
  timestampStart?: Date,
  timestampEnd?: Date,
  timeFrame: "hour" | "day" | "week" = "day"
): Promise<ApyHistoryItem[]> {
  try {
    // If no timestamps provided, just return latest data (existing behavior)
    if (!timestampStart && !timestampEnd) {
      return await fetchAPI<ApyHistoryItem[]>(`/v2/${chainId}/markets/${marketAddress}/apy-history`);
    }
    
    // Otherwise, prepare query params for historical data
    const query: HistoricalDataQuery = {
      timeFrame
    };
    
    if (timestampStart) {
      query.timestampStart = timestampStart;
    }
    
    if (timestampEnd) {
      query.timestampEnd = timestampEnd;
    }
    
    // Fetch historical data
    try {
      const response = await axios.get<HistoricalDataResponse>(
        `${BASE_URL}/v2/${chainId}/markets/${marketAddress}/apy-history`, 
        { params: query }
      );
      
      if (!response.data || !response.data.results) {
        throw new Error("Invalid historical data response");
      }
      
      // Parse CSV results into ApyHistoryItem objects
      const csvData = parse(response.data.results, { output: 'objects' });
      
      // Transform into ApyHistoryItem format
      return csvData.map((item: any) => ({
        timestamp: Number(item.timestamp),
        underlyingApy: Number(item.underlyingApy),
        impliedApy: Number(item.impliedApy)
      }));
    } catch (error) {
      console.error("Error fetching historical market APY data:", error);
      return [];
    }
  } catch (error) {
    console.error("Error fetching market APY history:", error);
    return [];
  }
}

/**
 * Get comprehensive market data at a specific timestamp
 * @param chainId - Chain ID of the network
 * @param marketAddress - Address of the market
 * @param timestamp - Optional specific timestamp to get data for
 * @returns Comprehensive market data including APYs, liquidity, rewards, etc.
 */
export async function getMarketDataAtTimestamp(
  chainId: number,
  marketAddress: string,
  timestamp?: Date
): Promise<MarketDataPoint | null> {
  try {
    // Prepare the query parameters
    const params: any = {};
    
    // If timestamp is provided, convert to ISO string
    if (timestamp) {
      params.timestamp = timestamp.toISOString();
    }
    
    // Make the API call
    const response = await axios.get(
      `${BASE_URL}/v2/${chainId}/markets/${marketAddress}/data`,
      { params }
    );
    
    // Check if we got valid data
    if (response.data && response.data.data) {
      return response.data.data as MarketDataPoint;
    }
    
    // Handle error cases
    throw new Error("Invalid market data response");
  } catch (error) {
    console.error(`Error fetching market data for ${marketAddress}:`, error);
    return null;
  }
}

export async function swapTokens(
  chainId: number,
  marketAddress: string,
  receiverAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
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
  amountIn: bigint,
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
  lpAmount: bigint,
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