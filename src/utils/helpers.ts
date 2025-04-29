import { ethers, TransactionReceipt } from "ethers";

export function calculateDaysToMaturity(maturityTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  const secondsToMaturity = Math.max(0, maturityTimestamp - now);
  return secondsToMaturity / 86400; // Convert seconds to days
}

export function calculateFixedYield(ptPrice: number, daysToMaturity: number): number {
  if (daysToMaturity <= 0 || ptPrice >= 1) return 0;
  // Fixed yield formula: ((1 - ptPrice) / ptPrice) * (365 / daysToMaturity)
  return ((1 - ptPrice) / ptPrice) * (365 / daysToMaturity);
}

export function formatBigNumber(value: bigint, decimals: number = 18): number {
  return parseFloat(ethers.formatUnits(value, decimals));
}

export function parseBigNumber(value: number | string, decimals: number = 18): bigint {
  return ethers.parseUnits(value.toString(), decimals);
}

export function calculateSlippage(amount: bigint, slippagePercent: number): bigint {
  // Calculate minimum amount with slippage (e.g., 0.5% slippage)
  const slippageMultiplier = 10000n - BigInt(Math.floor(slippagePercent * 100));
  return (amount * slippageMultiplier) / 10000n;
}

// Helper to determine if timestamps are on the same day (for daily operations)
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Helper to format timestamp to readable date string
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function validateTxReceipt(receipt: TransactionReceipt | null): boolean {
  if (!receipt || !receipt.status) {
    console.error("Transaction failed or receipt is invalid");
    return false;
  }
  return true;
}