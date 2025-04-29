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