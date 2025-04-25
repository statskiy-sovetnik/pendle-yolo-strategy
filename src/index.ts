import { PendleYoloStrategy } from "./strategies/pendleYoloStrategy";
import defaultConfig from "./config";

async function main() {
  console.log("Starting Pendle YOLO Strategy");
  
  // Create the strategy instance
  const strategy = new PendleYoloStrategy(defaultConfig.chainId, defaultConfig);
  
  // Initialize the strategy (fetch initial market data)
  await strategy.initialize();
  
  // Execute the strategy for each configured market
  for (let i = 0; i < defaultConfig.markets.length; i++) {
    await strategy.executeStrategy(i);
  }
  
  // Print final market states
  const marketStates = strategy.getMarketStates();
  console.log("Final market states:", marketStates);
  
  console.log("Strategy execution completed");
}

main().catch((error) => {
  console.error("Strategy execution failed:", error);
  process.exit(1);
});