export enum StrategyMode {
  PT = "PT",
  YT = "YT",
  LP = "LP",
}

export interface MarketData {
  timestamp: number;
  ptPrice: number;
  ytPrice: number;
  lpPrice: number;
  tvl: number;
  fixedYield: number;
  impliedYield: number;
  underlyingApy: number;
  daysToMaturity: number;
  expired: boolean;
}

export interface Position {
  mode: StrategyMode;
  amount: bigint;
  tokenAddress: string;
  initialUsdValue: number;
  currentUsdValue: number;
}

export interface MarketState {
  marketConfig: {
    name: string;
    marketAddress: string;
    ptAddress: string;
    ytAddress: string;
    syAddress: string;
    underlyingAddress: string;
    maturityTimestamp: number;
    usdAllocation: number;
  };
  marketData: MarketData;
  currentMode: StrategyMode;
  position: Position | null;
  usdcBalance: bigint;
  initialUsdValue: number;
}

export interface SwapData {
  callData: string;
  router: string;
  target: string;
  value: string;
  callType: string;
  tokenInAmount: string;
  minTokenOut: string;
  gas?: string;
}

export interface LiquidityData {
  callData: string;
  router: string;
  target: string;
  value: string;
  callType: string;
  tokenInAmount: string;
  minLpOut: string;
  gas?: string;
}

export interface AssetInfo {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  expiry: string;
  accentColor: string;
  price: {
    usd: number;
    acc: number;
  };
  priceUpdatedAt: string;
  name: string;
}

export interface MarketDataPoint {
  timestamp: string;
  liquidity: {
    usd: number;
    acc: number;
  };
  tradingVolume: {
    usd: number;
    acc: number;
  };
  underlyingInterestApy: number;
  underlyingRewardApy: number;
  underlyingApy: number;
  impliedApy: number;
  ytFloatingApy: number;
  swapFeeApy: number;
  voterApy: number;
  ptDiscount: number;
  pendleApy: number;
  arbApy: number;
  lpRewardApy: number;
  aggregatedApy: number;
  maxBoostedApy: number;
  estimatedDailyPoolRewards: Array<{
    asset: AssetInfo;
    amount: number;
  }>;
  totalPt: number;
  totalSy: number;
  totalLp: number;
  totalActiveSupply: number;
  assetPriceUsd: number;
}