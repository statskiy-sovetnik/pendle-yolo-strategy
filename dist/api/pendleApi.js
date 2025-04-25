"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenPrices = getTokenPrices;
exports.getMarketList = getMarketList;
exports.getMarketApyHistory = getMarketApyHistory;
exports.swapTokens = swapTokens;
exports.addLiquidity = addLiquidity;
exports.removeLiquidity = removeLiquidity;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const BASE_URL = config_1.default.apiBaseUrl;
// Helper function for SDK API calls
async function callSDK(endpoint, data) {
    try {
        const response = await axios_1.default.post(`${BASE_URL}${endpoint}`, data);
        if (response.data && response.data.data) {
            return response.data.data;
        }
        throw new Error("Invalid response data");
    }
    catch (error) {
        console.error(`Error calling SDK endpoint ${endpoint}:`, error);
        throw error;
    }
}
// Helper function for regular API GET calls
async function fetchAPI(endpoint) {
    try {
        const response = await axios_1.default.get(`${BASE_URL}${endpoint}`);
        if (response.data && response.data.data) {
            return response.data.data;
        }
        throw new Error("Invalid response data");
    }
    catch (error) {
        console.error(`Error fetching API endpoint ${endpoint}:`, error);
        throw error;
    }
}
async function getTokenPrices(chainId, addresses) {
    try {
        const addressesParam = addresses.join(",");
        const tokenPrices = await fetchAPI(`/v1/${chainId}/assets/prices?addresses=${addressesParam}`);
        const priceMap = {};
        tokenPrices.forEach((item) => {
            priceMap[item.address.toLowerCase()] = item.price;
        });
        return priceMap;
    }
    catch (error) {
        console.error("Error fetching token prices:", error);
        return {};
    }
}
async function getMarketList(chainId) {
    try {
        return await fetchAPI(`/v1/${chainId}/markets/active`);
    }
    catch (error) {
        console.error("Error fetching market list:", error);
        return [];
    }
}
async function getMarketApyHistory(chainId, marketAddress) {
    try {
        return await fetchAPI(`/v2/${chainId}/markets/${marketAddress}/apy-history`);
    }
    catch (error) {
        console.error("Error fetching market APY history:", error);
        return [];
    }
}
async function swapTokens(chainId, marketAddress, receiverAddress, tokenIn, tokenOut, amountIn, slippage = 0.5) {
    return callSDK(`/v1/sdk/${chainId}/markets/${marketAddress}/swap`, {
        receiver: receiverAddress,
        slippage: slippage / 100, // Convert from percentage to decimal
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        enableAggregator: true
    });
}
async function addLiquidity(chainId, marketAddress, receiverAddress, tokenIn, amountIn, slippage = 0.5) {
    return callSDK(`/v1/sdk/${chainId}/markets/${marketAddress}/add-liquidity`, {
        receiver: receiverAddress,
        slippage: slippage / 100, // Convert from percentage to decimal
        tokenIn,
        amountIn: amountIn.toString()
    });
}
async function removeLiquidity(chainId, marketAddress, receiverAddress, lpAmount, tokenOut, slippage = 0.5) {
    return callSDK(`/v1/sdk/${chainId}/markets/${marketAddress}/remove-liquidity`, {
        receiver: receiverAddress,
        slippage: slippage / 100, // Convert from percentage to decimal
        tokenOut,
        amountIn: lpAmount.toString()
    });
}
