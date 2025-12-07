# Missing Steps for Alerts & Signals to Work

**Last Updated:** 2025-12-07  
**Priority:** 🔴 CRITICAL - Required for core functionality

---

## 🎯 Current Status

### ✅ What's Working
- **Frontend Pages**: Alerts page and Signals page are fully implemented
- **Backend Endpoints**: All API endpoints for alerts and signals exist
- **Detection Engine**: Rule engine, scoring, and signal creation logic is complete
- **Event Processing Pipeline**: Normalization, deduplication, and detection queue processors exist
- **Mappers**: Alchemy and Covalent mappers exist (for webhook data)
- **Database Schema**: All tables (NormalizedEvent, AccumulationSignal, MarketSignal, Alert) are ready

### ❌ What's Missing (CRITICAL)
- **Active Event Ingestion**: No services actively fetch blockchain events from providers
- **Scheduled Jobs**: No cron jobs to poll providers for new events
- **Provider Fetcher Services**: No actual API integration code to call Alchemy/Covalent/etc.

---

## 🔴 Critical Missing Steps

### 1. Provider Integration Services (HIGHEST PRIORITY)

**Status:** ❌ Not Implemented  
**Location:** `backend/src/integrations/`

**What's Needed:**

#### 1.1 Alchemy Integration Service
- **File:** `backend/src/integrations/alchemy/alchemy.service.ts`
- **Purpose:** Fetch ERC20 transfers and native transfers from Alchemy API
- **Key Methods:**
  - `fetchTransfers(chain: Chain, fromBlock?: number, toBlock?: number): Promise<RawEvent[]>`
  - `fetchTokenTransfers(chain: Chain, contractAddress: string, fromBlock?: number): Promise<RawEvent[]>`
  - `getLatestBlock(chain: Chain): Promise<number>`
- **API Endpoints to Use:**
  - `alchemy_getAssetTransfers` (for transfers)
  - `eth_getBlockByNumber` (for latest block)
- **Rate Limits:** 300M compute units/month (free tier)

#### 1.2 Covalent Integration Service
- **File:** `backend/src/integrations/covalent/covalent.service.ts`
- **Purpose:** Fetch multi-chain transfers, balances, and historical data
- **Key Methods:**
  - `fetchTokenTransfers(chain: Chain, contractAddress: string, fromBlock?: number): Promise<RawEvent[]>`
  - `getTokenHolders(chain: Chain, contractAddress: string): Promise<Holder[]>`
- **API Endpoints to Use:**
  - `/v1/{chain_id}/tokens/{contract_address}/transfers_v2/`
  - `/v1/{chain_id}/tokens/{contract_address}/token_holders/`
- **Rate Limits:** 100k requests/month (free tier)

#### 1.3 TheGraph Integration Service
- **File:** `backend/src/integrations/thegraph/thegraph.service.ts`
- **Purpose:** Fetch DEX swap events and LP pool changes
- **Key Methods:**
  - `fetchSwaps(chain: Chain, tokenAddress: string, fromTimestamp?: number): Promise<SwapEvent[]>`
  - `fetchLPEvents(chain: Chain, poolAddress: string): Promise<LPEvent[]>`
- **API Endpoints to Use:**
  - GraphQL queries to Uniswap V2/V3 subgraphs
  - Other DEX subgraphs (SushiSwap, PancakeSwap, etc.)

#### 1.4 DexScreener Integration Service
- **File:** `backend/src/integrations/dexscreener/dexscreener.service.ts`
- **Purpose:** Fetch real-time DEX liquidity and swap data
- **Key Methods:**
  - `getPairData(chain: Chain, tokenAddress: string): Promise<PairData>`
  - `getRecentSwaps(chain: Chain, pairAddress: string): Promise<SwapEvent[]>`
- **API Endpoints to Use:**
  - `/v1/tokens/{tokenAddress}`
  - `/v1/pairs/{pairAddress}`

---

### 2. Event Ingestion Scheduler (CRITICAL)

**Status:** ❌ Not Implemented  
**Location:** `backend/src/integrations/scheduler/` or use `@nestjs/schedule`

**What's Needed:**

#### 2.1 Scheduled Jobs Module
- **File:** `backend/src/integrations/scheduler/ingestion-scheduler.service.ts`
- **Purpose:** Poll providers at regular intervals to fetch new events
- **Implementation:**
  ```typescript
  @Injectable()
  export class IngestionSchedulerService {
    @Cron('*/15 * * * * *') // Every 15 seconds
    async pollAlchemy() {
      // Fetch events for all active coins from Alchemy
    }
    
    @Cron('*/30 * * * * *') // Every 30 seconds
    async pollCovalent() {
      // Fetch events for all active coins from Covalent
    }
    
    @Cron('*/20 * * * * *') // Every 20 seconds
    async pollTheGraph() {
      // Fetch DEX events from TheGraph
    }
  }
  ```

#### 2.2 Coin Tracking Service
- **Purpose:** Track which coins to monitor and their last processed block
- **Key Features:**
  - Monitor all coins with `isActive: true` or `isFamous: true`
  - Track last processed block per coin per chain
  - Skip coins that don't have contract addresses (native coins)
  - Handle multiple chains per coin

---

### 3. Event Enrichment (Price Data)

**Status:** ⚠️ Partially Implemented  
**Location:** `backend/src/integrations/coingecko/`

**What's Needed:**
- ✅ CoinGecko service exists
- ❌ Price enrichment not integrated into event normalization pipeline
- **Action:** Call CoinGecko to get USD price for each event's token before saving

---

## 📋 Implementation Checklist

### Phase 1: Basic Event Ingestion (Minimum Viable)
- [ ] Create `AlchemyService` with `fetchTransfers()` method
- [ ] Create `CovalentService` with `fetchTokenTransfers()` method
- [ ] Create `IngestionSchedulerService` with cron jobs
- [ ] Integrate scheduler to poll for active/famous coins
- [ ] Track last processed block per coin
- [ ] Enrich events with USD prices (CoinGecko)
- [ ] Test with 1-2 coins manually

### Phase 2: Full Integration
- [ ] Implement TheGraph service for DEX events
- [ ] Implement DexScreener service for liquidity data
- [ ] Add error handling and retry logic
- [ ] Add rate limiting per provider
- [ ] Add monitoring/logging for ingestion health

### Phase 3: Optimization
- [ ] Batch API calls where possible
- [ ] Cache price data to reduce CoinGecko calls
- [ ] Implement circuit breakers for provider failures
- [ ] Add metrics for ingestion rate, errors, etc.

---

## 🔧 Required Environment Variables

Add to `backend/.env`:

```bash
# Alchemy (Required for EVM chains)
ALCHEMY_API_KEY="your-alchemy-api-key"

# Covalent (Required for multi-chain)
COVALENT_API_KEY="your-covalent-api-key"

# TheGraph (Optional - public subgraphs work without key)
THEGRAPH_API_URL="https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

# CoinGecko (Optional but recommended)
COINGECKO_API_KEY="your-coingecko-api-key"
# OR
COINGECKO_PRO_API_KEY="your-pro-key"
```

**Get API Keys:**
- Alchemy: https://www.alchemy.com/
- Covalent: https://www.covalenthq.com/
- CoinGecko: https://www.coingecko.com/en/api
- TheGraph: Public subgraphs are free (no key needed)

---

## 🎯 How It Works (Once Implemented)

1. **Scheduler runs every 15-30 seconds**
   - Fetches list of active/famous coins from database
   - For each coin, checks last processed block
   - Calls Alchemy/Covalent APIs to fetch new transfers

2. **Events are normalized**
   - Raw provider data → NormalizedEvent format
   - Enriched with USD prices from CoinGecko
   - Saved to `NormalizedEvent` table

3. **Detection engine processes events**
   - Events queued to `detection` queue
   - Rule engine evaluates events
   - Creates `AccumulationSignal` or `MarketSignal` if thresholds met

4. **Alerts are created**
   - For each signal, check users watching that coin
   - Create `Alert` records for users
   - Respect cooldowns and user preferences

5. **Frontend displays data**
   - Signals page shows all signals
   - Alerts page shows user-specific alerts

---

## 📝 Notes

### Current Limitation
- **Events are only ingested via webhooks** (POST `/api/events/alchemy`, `/api/events/covalent`)
- **No active polling** means no events unless external services send webhooks
- **Webhooks require setup** on Alchemy/Covalent dashboards (not automatic)

### Solution
- **Implement active polling** so the system fetches events automatically
- **No external webhook setup required** - system is self-sufficient
- **Works immediately** once API keys are configured

### Testing Strategy
1. Start with 1-2 test coins (e.g., USDC, WETH on Ethereum)
2. Manually trigger ingestion for those coins
3. Verify events are saved
4. Verify signals are created
5. Verify alerts are created for test users
6. Then enable full scheduler

---

## 🚀 Quick Start (Once Services Are Implemented)

1. **Add API keys to `.env`**
2. **Add coins to database** (via admin panel or CoinGecko import)
3. **Mark coins as active/famous** (via admin panel)
4. **Start backend** - scheduler will begin polling
5. **Wait 1-2 minutes** - events should start appearing
6. **Check signals page** - should show real signals
7. **Add coins to watchlist** - alerts should appear

---

## 📚 Related Documentation

- `API_SETUP_GUIDE.md` - How to get API keys
- `integrations_structure.md` - Architecture for integrations
- `system_architecture.md` - Overall system design
- `detection_engine.md` - How signals are generated

---

**Priority:** This is the #1 blocker for the platform to show real data. All other infrastructure is ready.

