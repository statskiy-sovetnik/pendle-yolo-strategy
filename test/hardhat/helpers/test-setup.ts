import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { StrategyMode } from "../../../src/utils/types";

// USDC address on Base
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Mock transaction execution
export async function mockTransactionExecution(
  txData: {
    callData: string;
    router: string;
    target: string;
    value: string;
  },
  signer: Signer
): Promise<void> {
  // In a real test, this would execute the transaction
  // For our mocked test, we'll just log it
  console.log(`Mocked transaction to ${txData.target}`);
  return;
}

// Helper to parse transaction result
export function parseTransactionResult(result: any): BigNumber {
  // In a real test, this would parse transaction receipt or return value
  // For our mocked test, we'll just return a mock value
  return BigNumber.from("1000000000000000000"); // 1 token with 18 decimals
}

// Helper to determine optimal strategy mode based on market data
export function determineOptimalStrategy(
  fixedYield: number,
  impliedYield: number,
  underlyingApy: number,
  expired: boolean,
  thresholdDelta: number = 0.5
): StrategyMode {
  if (expired) {
    return StrategyMode.PT;
  }
  
  // Calculate delta between different yields (convert from percentage to decimal)
  const fixedToUnderlyingDelta = fixedYield - underlyingApy;
  const underlyingToImpliedDelta = underlyingApy - impliedYield;
  
  // Use threshold delta for determining if a position is significantly better
  const thresholdDeltaDecimal = thresholdDelta / 100;
  
  // PT is good when fixed yield is significantly better than underlying APY
  if (fixedToUnderlyingDelta > thresholdDeltaDecimal) {
    return StrategyMode.PT;
  } 
  // YT is good when underlying APY is significantly better than implied APY
  else if (underlyingToImpliedDelta > thresholdDeltaDecimal) {
    return StrategyMode.YT;
  } 
  // When neither PT nor YT offers significantly better returns, go with LP
  else {
    return StrategyMode.LP;
  }
}

// Helper to fund an address with USDC
export async function fundWithUSDC(
  address: string,
  amount: BigNumber
): Promise<void> {
  // Get a reference to the USDC contract
  const usdc = await ethers.getContractAt(
    ["function transfer(address to, uint256 amount) returns (bool)"],
    USDC_ADDRESS
  );
  
  // Find a whale with sufficient USDC
  const usdcWhale = "0xda9360F80F7AcE88F14a504f4D950d0eE5A93db9"; // Replace with actual whale address for Base
  
  // Impersonate the whale
  await ethers.getImpersonatedSigner(usdcWhale);
  const whaleSigner = await ethers.getSigner(usdcWhale);
  
  // Transfer USDC to the target address
  await usdc.connect(whaleSigner).transfer(address, amount);
  
  // Stop impersonating
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [usdcWhale]);
}