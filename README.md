# Pendle YOLO Strategy

A yield optimization strategy for Pendle Finance markets that dynamically positions between PT (Principal Token), YT (Yield Token), and LP (Liquidity Provider) based on market conditions.

## Stage 1 Implementation

The first stage of the project implements the basic YOLO strategy functionality:

1. Strategy determines the optimal position based on yield comparisons
2. Automatic position entry/exit based on yield calculations
3. Support for multiple Pendle markets

### How the Strategy Works

The strategy compares three types of yields for each market:
- **Fixed Yield** (from PTs) - determined by PT price discount and time to maturity
- **Implied Yield** (from YTs) - the implied APY from yield tokens
- **Underlying APY** (via LPs) - market yield available via liquidity providing

Based on which yield is highest, the strategy will position in:
- PT if Fixed Yield > Implied Yield AND Fixed Yield > Underlying APY
- YT if Implied Yield > Fixed Yield AND Implied Yield > Underlying APY
- LP otherwise

### Key Components

- `PendleYoloStrategy`: Main strategy implementation
- `pendleApi.ts`: API client for interacting with Pendle markets
- `config/index.ts`: Configuration for markets and parameters

### Setup

1. Create a `.env` file with:
```
RPC_URL=<your_rpc_url>
PRIVATE_KEY=<your_private_key>
```

2. Install dependencies:
```
yarn install
```

3. Build the project:
```
yarn build
```

4. Run the strategy:
```
yarn start
```

## Configuration

The strategy is configured in `src/config/index.ts`. You can modify:

- Target markets
- USD allocation per market
- Chain ID
- RPC provider

## Future Development

- Stage 2: Periodic rebalancing and strategy adjustment
- Stage 3: Risk management and stop-loss implementation