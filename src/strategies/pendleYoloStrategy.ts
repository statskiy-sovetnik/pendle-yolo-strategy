import { BigNumber, ethers } from "ethers";
import { MarketState, StrategyMode, MarketData, Position } from "../utils/types";
import { 
  getTokenPrices, 
  getMarketApyHistory, 
  swapTokens, 
  addLiquidity, 
  removeLiquidity 
} from "../api/pendleApi";
import { 
  calculateDaysToMaturity, 
  calculateFixedYield, 
  formatBigNumber, 
  parseBigNumber 
} from "../utils/helpers";
import defaultConfig from "../config";

export class PendleYoloStrategy {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private markets: MarketState[] = [];
  
  constructor(
    private chainId: number = defaultConfig.chainId,
    private config = defaultConfig
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(this.config.provider);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    
    // Initialize markets state from config
    this.markets = this.config.markets.map(marketConfig => ({
      marketConfig,
      marketData: {
        timestamp: 0,
        ptPrice: 0,
        ytPrice: 0,
        lpPrice: 0,
        tvl: 0,
        fixedYield: 0,
        impliedYield: 0,
        underlyingApy: 0,
        daysToMaturity: 0,
        expired: false
      },
      currentMode: StrategyMode.PT, // Default mode
      position: null,
      usdcBalance: BigNumber.from(0),
      initialUsdValue: 0
    }));
  }
  
  /**
   * Get configuration for testing
   */
  public getConfig() {
    return {
      chainId: this.chainId,
      markets: this.config.markets
    };
  }
  
  /**
   * Initialize the strategy by fetching current market data
   */
  public async initialize(): Promise<void> {
    console.log("Initializing YOLO strategy...");
    await this.updateMarketData();
    console.log("Strategy initialized");
  }
  
  /**
   * Update market data for all configured markets
   */
  public async updateMarketData(): Promise<void> {
    console.log("Updating market data...");
    const tokenAddresses: string[] = [];
    
    // Collect all token addresses we need prices for
    this.markets.forEach(market => {
      tokenAddresses.push(market.marketConfig.ptAddress);
      tokenAddresses.push(market.marketConfig.ytAddress);
      tokenAddresses.push(market.marketConfig.marketAddress); // LP token
      tokenAddresses.push(market.marketConfig.underlyingAddress);
    });
    
    // Fetch token prices
    const tokenPrices = await getTokenPrices(this.chainId, tokenAddresses);
    
    // Update market data for each market
    for (const market of this.markets) {
      const { marketConfig } = market;
      
      // Get APY history for this market to determine implied and underlying yields
      const apyHistory = await getMarketApyHistory(
        this.chainId,
        marketConfig.marketAddress
      );
      
      // Calculate days to maturity
      const daysToMaturity = calculateDaysToMaturity(marketConfig.maturityTimestamp);
      const expired = daysToMaturity <= 0;
      
      // Update market data
      market.marketData = {
        timestamp: Math.floor(Date.now() / 1000),
        ptPrice: tokenPrices[marketConfig.ptAddress.toLowerCase()] || 0,
        ytPrice: tokenPrices[marketConfig.ytAddress.toLowerCase()] || 0,
        lpPrice: tokenPrices[marketConfig.marketAddress.toLowerCase()] || 0,
        tvl: 0, // Would need to fetch from API
        fixedYield: calculateFixedYield(
          tokenPrices[marketConfig.ptAddress.toLowerCase()] || 0,
          daysToMaturity
        ),
        impliedYield: apyHistory.length > 0 ? apyHistory[0].impliedApy : 0,
        underlyingApy: apyHistory.length > 0 ? apyHistory[0].underlyingApy : 0,
        daysToMaturity,
        expired
      };
      
      console.log(`Market ${marketConfig.name} data updated:`, {
        pt: market.marketData.ptPrice,
        yt: market.marketData.ytPrice,
        lp: market.marketData.lpPrice,
        fixedYield: (market.marketData.fixedYield * 100).toFixed(2) + '%',
        impliedYield: (market.marketData.impliedYield * 100).toFixed(2) + '%',
        underlyingApy: (market.marketData.underlyingApy * 100).toFixed(2) + '%',
        daysToMaturity: market.marketData.daysToMaturity.toFixed(2)
      });
    }
  }
  
  /**
   * Determine the best strategy mode based on market data
   */
  private determineOptimalMode(marketData: MarketData): StrategyMode {
    if (marketData.expired) {
      // If market expired, only PT will work since it's redeemable at 1
      return StrategyMode.PT;
    }
    
    // Calculate delta between different yields
    const fixedToUnderlyingDelta = marketData.fixedYield - marketData.underlyingApy;
    const underlyingToImpliedDelta = marketData.underlyingApy - marketData.impliedYield;
    
    // Use threshold delta for determining if a position is significantly better
    // Config has delta as percentage (0.5 = 0.5%), so convert to decimal
    const thresholdDelta = this.config.rebalanceThresholdDelta / 100;
    
    // PT is good when fixed yield is significantly better than underlying APY (shorting yield)
    // This means we expect the actual yield to be lower than the fixed rate
    if (fixedToUnderlyingDelta > thresholdDelta) {
      return StrategyMode.PT;
    } 
    // YT is good when underlying APY is significantly better than implied APY (longing yield)
    // This means we expect the actual yield to be higher than what market expects
    else if (underlyingToImpliedDelta > thresholdDelta) {
      return StrategyMode.YT;
    } 
    // When neither PT nor YT offers significantly better returns, go with LP
    else {
      return StrategyMode.LP;
    }
  }
  
  /**
   * Execute strategy for a specific market
   */
  public async executeStrategy(marketIndex: number): Promise<void> {
    const market = this.markets[marketIndex];
    if (!market) {
      console.error(`Market at index ${marketIndex} not found`);
      return;
    }
    
    console.log(`Executing strategy for market ${market.marketConfig.name}`);
    
    // Update market data to ensure we have latest information
    await this.updateMarketData();
    
    // Determine optimal position based on market data
    const optimalMode = this.determineOptimalMode(market.marketData);
    console.log(`Current mode: ${market.currentMode}, Optimal mode: ${optimalMode}`);
    
    // If we don't have a position yet, enter one
    if (!market.position) {
      console.log(`No current position, entering ${optimalMode} position`);
      await this.enterPosition(marketIndex, optimalMode);
      return;
    }
    
    // If optimal mode is different from current mode, switch positions without considering threshold
    if (optimalMode !== market.currentMode) {
      console.log(`Switching from ${market.currentMode} to ${optimalMode}`);
      await this.exitPosition(marketIndex);
      await this.enterPosition(marketIndex, optimalMode);
    } else {
      console.log(`Maintaining ${market.currentMode} position (already optimal)`);
    }
  }
  
  /**
   * Enter a new position for a market
   */
  private async enterPosition(marketIndex: number, mode: StrategyMode): Promise<void> {
    const market = this.markets[marketIndex];
    if (!market) return;
    
    const { marketConfig } = market;
    
    // Get the current USDC balance for this market
    // In a real implementation, you would have account management logic here
    // For now we'll simulate having the allocation amount in USDC
    const usdcAmount = parseBigNumber(marketConfig.usdAllocation.toString(), 6); // USDC has 6 decimals
    
    try {
      let position: Position;
      let txData: any;
      
      switch (mode) {
        case StrategyMode.PT:
          // Buy PT with USDC
          txData = await swapTokens(
            this.chainId,
            marketConfig.marketAddress,
            this.wallet.address,
            this.config.usdcAddress, // Use USDC as input for initial purchase
            marketConfig.ptAddress,
            usdcAmount
          );
          
          position = {
            mode: StrategyMode.PT,
            amount: BigNumber.from(txData.minTokenOut),
            tokenAddress: marketConfig.ptAddress,
            initialUsdValue: marketConfig.usdAllocation,
            currentUsdValue: marketConfig.usdAllocation
          };
          break;
          
        case StrategyMode.YT:
          // Buy YT with USDC
          txData = await swapTokens(
            this.chainId,
            marketConfig.marketAddress,
            this.wallet.address,
            this.config.usdcAddress, // Use USDC as input for initial purchase
            marketConfig.ytAddress,
            usdcAmount
          );
          
          position = {
            mode: StrategyMode.YT,
            amount: BigNumber.from(txData.minTokenOut),
            tokenAddress: marketConfig.ytAddress,
            initialUsdValue: marketConfig.usdAllocation,
            currentUsdValue: marketConfig.usdAllocation
          };
          break;
          
        case StrategyMode.LP:
          // Add liquidity with USDC
          txData = await addLiquidity(
            this.chainId,
            marketConfig.marketAddress,
            this.wallet.address,
            this.config.usdcAddress, // Use USDC as input for initial purchase
            usdcAmount
          );
          
          position = {
            mode: StrategyMode.LP,
            amount: BigNumber.from(txData.minLpOut),
            tokenAddress: marketConfig.marketAddress,
            initialUsdValue: marketConfig.usdAllocation,
            currentUsdValue: marketConfig.usdAllocation
          };
          break;
          
        default:
          throw new Error(`Invalid strategy mode: ${mode}`);
      }
      
      // Execute the transaction
      console.log(`Executing transaction for ${mode} position with ${formatBigNumber(usdcAmount, 6)} USDC`);
      
      // First approve token spending if needed (for USDC)
      const usdcContract = new ethers.Contract(
        this.config.usdcAddress,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        this.wallet
      );
      
      // Approve the router to spend our USDC
      const approveTx = await usdcContract.approve(txData.router, usdcAmount);
      await approveTx.wait();
      console.log("Approved USDC spending");
      
      // Execute the main transaction
      const tx = await this.wallet.sendTransaction({
        to: txData.target,
        data: txData.callData,
        value: txData.value ? BigNumber.from(txData.value) : BigNumber.from(0),
        gasLimit: txData.gas ? BigNumber.from(txData.gas) : undefined
      });
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt.transactionHash}`);
      
      // Update market state
      this.markets[marketIndex].position = position;
      this.markets[marketIndex].currentMode = mode;
      this.markets[marketIndex].initialUsdValue = marketConfig.usdAllocation;
      
    } catch (error) {
      console.error(`Error entering ${mode} position:`, error);
    }
  }
  
  /**
   * Exit the current position for a market
   */
  private async exitPosition(marketIndex: number): Promise<void> {
    const market = this.markets[marketIndex];
    if (!market || !market.position) return;
    
    const { marketConfig, position } = market;
    
    try {
      let txData: any;
      
      switch (position.mode) {
        case StrategyMode.PT:
        case StrategyMode.YT:
          // Swap PT/YT back to USDC
          txData = await swapTokens(
            this.chainId,
            marketConfig.marketAddress,
            this.wallet.address,
            position.tokenAddress,
            this.config.usdcAddress, // Swap back to USDC
            position.amount
          );
          break;
          
        case StrategyMode.LP:
          // Remove liquidity to USDC
          txData = await removeLiquidity(
            this.chainId,
            marketConfig.marketAddress,
            this.wallet.address,
            position.amount,
            this.config.usdcAddress // Swap back to USDC
          );
          break;
          
        default:
          throw new Error(`Invalid strategy mode: ${position.mode}`);
      }
      
      console.log(`Exiting ${position.mode} position`);
      
      // First approve token spending if needed (for LP or PT/YT)
      const tokenContract = new ethers.Contract(
        position.tokenAddress,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        this.wallet
      );
      
      // Approve the router to spend our tokens
      const approveTx = await tokenContract.approve(txData.router, position.amount);
      await approveTx.wait();
      console.log(`Approved ${position.mode} token spending`);
      
      // Execute the transaction
      const tx = await this.wallet.sendTransaction({
        to: txData.target,
        data: txData.callData,
        value: txData.value ? BigNumber.from(txData.value) : BigNumber.from(0),
        gasLimit: txData.gas ? BigNumber.from(txData.gas) : undefined
      });
      
      const receipt = await tx.wait();
      console.log(`Exit transaction confirmed: ${receipt.transactionHash}`);
      
      // Reset position
      this.markets[marketIndex].position = null;
      
    } catch (error) {
      console.error(`Error exiting ${position.mode} position:`, error);
    }
  }
  
  /**
   * Get the current state of all markets
   */
  public getMarketStates(): MarketState[] {
    return this.markets;
  }
}