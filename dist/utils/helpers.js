"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDaysToMaturity = calculateDaysToMaturity;
exports.calculateFixedYield = calculateFixedYield;
exports.formatBigNumber = formatBigNumber;
exports.parseBigNumber = parseBigNumber;
exports.calculateSlippage = calculateSlippage;
exports.isSameDay = isSameDay;
exports.formatTimestamp = formatTimestamp;
const ethers_1 = require("ethers");
function calculateDaysToMaturity(maturityTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const secondsToMaturity = Math.max(0, maturityTimestamp - now);
    return secondsToMaturity / 86400; // Convert seconds to days
}
function calculateFixedYield(ptPrice, daysToMaturity) {
    if (daysToMaturity <= 0 || ptPrice >= 1)
        return 0;
    // Fixed yield formula: ((1 - ptPrice) / ptPrice) * (365 / daysToMaturity)
    return ((1 - ptPrice) / ptPrice) * (365 / daysToMaturity);
}
function formatBigNumber(value, decimals = 18) {
    return parseFloat(ethers_1.ethers.utils.formatUnits(value, decimals));
}
function parseBigNumber(value, decimals = 18) {
    return ethers_1.ethers.utils.parseUnits(value.toString(), decimals);
}
function calculateSlippage(amount, slippagePercent) {
    // Calculate minimum amount with slippage (e.g., 0.5% slippage)
    const slippageMultiplier = 10000 - Math.floor(slippagePercent * 100);
    return amount.mul(slippageMultiplier).div(10000);
}
// Helper to determine if timestamps are on the same day (for daily operations)
function isSameDay(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return (date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate());
}
// Helper to format timestamp to readable date string
function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}
