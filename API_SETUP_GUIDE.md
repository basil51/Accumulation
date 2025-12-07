# API Setup Guide - Getting Real Market Data

## Current Status

### ✅ What's Working
- **Dashboard signals are SEEDED test data** (from `prisma/seed.ts`)
- Detection engine is implemented and ready
- Signal processing pipeline exists
- Watchlist functionality works

### ❌ What's Missing
- **Ingestion services are NOT implemented** - The `backend/src/integrations/` folder is empty
- No scheduled jobs to fetch real blockchain data
- No API integrations with Alchemy, Covalent, TheGraph, CoinGecko, or DexScreener

## Required API Keys

Add these to your `backend/.env` file:

### 1. Alchemy (Primary - EVM Chains)
```bash
# Single key works for all chains (recommended)
ALCHEMY_API_KEY="your-alchemy-api-key"

# OR use chain-specific keys (optional, for advanced setups)
# ALCHEMY_API_KEY_ETHEREUM="your-alchemy-eth-key"
# ALCHEMY_API_KEY_POLYGON="your-alchemy-polygon-key"
# ALCHEMY_API_KEY_ARBITRUM="your-alchemy-arbitrum-key"
# ALCHEMY_API_KEY_BASE="your-alchemy-base-key"
```

**Get keys from:** https://www.alchemy.com/
- Free tier: 300M compute units/month
- **One key works for all chains** - just use different endpoints
- The code will automatically use the right endpoint based on chain

### 2. Covalent (Multi-chain Data)
```bash
COVALENT_API_KEY="your-covalent-api-key"
```

**Get keys from:** https://www.covalenthq.com/
- Free tier: 100k requests/month
- Good for multi-chain support

### 3. TheGraph (DEX Events)
```bash
# Public subgraphs (no key needed)
THEGRAPH_API_URL="https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

# Or for custom subgraphs
THEGRAPH_STUDIO_API_KEY=""  # Optional
```

**Notes:**
- Public subgraphs are free
- No key required for basic usage

### 4. CoinGecko (Pricing)
```bash
# Optional but recommended
COINGECKO_API_KEY=""

# Or Pro tier for higher limits
COINGECKO_PRO_API_KEY=""
```

**Get keys from:** https://www.coingecko.com/en/api
- Free tier: 10-50 calls/minute
- Pro tier: 500 calls/minute
- **Optional** - can work without key but with rate limits

### 5. DexScreener (DEX Data)
```bash
# No key required
DEXSCREENER_API_URL="https://api.dexscreener.com/latest/dex"
```

**Notes:**
- Free, no authentication
- Rate limit: ~300 requests/minute

## Minimum Required Setup

To get started with **real alerts**, you need at minimum:

1. **Alchemy API Key** - Most important (one key works for all chains)
2. **Covalent API Key** - For multi-chain support
3. **CoinGecko API Key** (optional but recommended)

**Note:** Your `ALCHEMY_API_KEY` is perfect! One key works for Ethereum, Polygon, Arbitrum, Base, and other chains. The code will use the appropriate Alchemy endpoint based on which chain you're querying.

## How It Works (Once Implemented)

### Option 1: Watchlist-Based Monitoring
- Add coins to your watchlist
- System monitors only those coins
- Alerts only for watched coins

### Option 2: Global Monitoring (Future)
- System monitors all major tokens automatically
- Alerts for any significant accumulation
- Requires more API calls

## Implementation Status

The following components need to be built:

1. **Integration Services** (`backend/src/integrations/`)
   - `alchemy/` - Alchemy fetcher service
   - `covalent/` - Covalent fetcher service
   - `thegraph/` - TheGraph fetcher service
   - `coingecko/` - CoinGecko price service
   - `dexscreener/` - DexScreener service

2. **Scheduled Jobs**
   - Cron jobs to fetch data every 15-60 seconds
   - Event normalization pipeline
   - Queue processing

3. **Event Processing**
   - Normalize events from different providers
   - Feed into detection engine
   - Generate real signals

## Next Steps

1. **Get API Keys:**
   - Sign up for Alchemy (free tier)
   - Sign up for Covalent (free tier)
   - Optionally get CoinGecko key

2. **Add to `.env`:**
   ```bash
   ALCHEMY_API_KEY="your-key-here"  # Single key for all chains
   COVALENT_API_KEY="your-key-here"
   COINGECKO_API_KEY="your-key-here"  # Optional
   ```

3. **Wait for Integration Implementation:**
   - The ingestion services need to be built
   - This is planned for future sprints
   - Currently, only the detection engine is ready

## Current Workaround

Until ingestion services are implemented:
- Signals shown are **test data** from seed script
- You can test the UI and detection logic
- Real market data requires the integration layer

## Testing with Real Data

Once integrations are implemented:

1. **Add coins to watchlist** (recommended for testing)
2. **System will fetch events** from APIs
3. **Detection engine processes** events
4. **Signals appear** in dashboard
5. **Alerts sent** if thresholds met

## Cost Estimates (Free Tier)

- **Alchemy**: 300M compute units/month (plenty for testing)
- **Covalent**: 100k requests/month (good for development)
- **CoinGecko**: 10-50 calls/minute (sufficient)
- **TheGraph**: Free (public subgraphs)
- **DexScreener**: Free (rate limited)

**Total cost for testing: $0/month** (using free tiers)

