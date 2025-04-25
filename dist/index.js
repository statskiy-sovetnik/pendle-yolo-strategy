"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pendleYoloStrategy_1 = require("./strategies/pendleYoloStrategy");
const config_1 = __importDefault(require("./config"));
async function main() {
    console.log("Starting Pendle YOLO Strategy");
    // Create the strategy instance
    const strategy = new pendleYoloStrategy_1.PendleYoloStrategy(config_1.default.chainId, config_1.default);
    // Initialize the strategy (fetch initial market data)
    await strategy.initialize();
    // Execute the strategy for each configured market
    for (let i = 0; i < config_1.default.markets.length; i++) {
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
