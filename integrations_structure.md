# integrations_structure.md — Integrations Architecture & Module Structure

This document defines the **entire structure of the Integrations Layer**, including how each provider module is organized, unified interfaces, event normalization pipelines, error handling, retries, cost tracking, caching, schedulers, and queues.

It is designed to be implemented inside a NestJS backend using:

* BullMQ (Redis) for jobs
* Axios or Fetch for HTTP
* Prisma for persistence

---

# 1. Overview

### The platform integrates with 5 major data sources:

1. **Alchemy** — EVM chains transfers & events
2. **Covalent** — multi-chain data (holders, transfers, pricing, balances)
3. **TheGraph** — DEX & LP events
4. **CoinGecko** — prices & market stats
5. **DexScreener** — liquidity, swaps, trending pairs

Each provider has its own module under:

```
/backend/src/integrations/
```

Example structure:

```
integrations/
  ├── common/
  │     ├── integrations.interface.ts
  │     ├── event-normalizer.ts
  │     ├── http-client.ts
  │     ├── rate-limit.guard.ts
  │     ├── retry.util.ts
  │     └── provider-errors.ts
  ├── alchemy/
  │     ├── alchemy.module.ts
  │     ├── alchemy.service.ts
  │     ├── alchemy.fetcher.ts
  │     └── mappers/
  ├── covalent/
  ├── thegraph/
  ├── coingecko/
  └── dexscreener/
```

---

# 2. Unified Integration Interface

All providers must implement a **common interface** for consistency.

```ts
export interface ProviderIntegration {
  provider: string; // 'alchemy' | 'covalent' | 'thegraph' | 'coingecko' | 'dexscreener'

  fetchEvents(params: FetchParams): Promise<NormalizedEvent[]>;

  getTokenPrice?(contract: string, chain: string): Promise<number | null>;

  healthCheck(): Promise<boolean>;
}
```

### `FetchParams` structure:

```ts
export interface FetchParams {
  chain: string;
  fromBlock?: number;
  toBlock?: number;
  address?: string; // token contract
  limit?: number;
}
```

---

# 3. Normalized Event Schema

All providers return a unified structure:

```ts
export interface NormalizedEvent {
  eventId: string; // uuid
  provider: string;
  chain: string;
  type: 'transfer' | 'swap' | 'lp_add' | 'lp_remove' | 'price_update';

  txHash: string;
  timestamp: Date;

  token: {
    contract: string;
    symbol: string;
    decimals: number;
  };

  from?: string;
  to?: string;

  amount: number;
  amountUsd: number;

  raw: any; // original provider payload
}
```

This abstraction makes the detection engine independent of the data source.

---

# 4. Provider Modules

## 4.1 Alchemy Module

Primary for **EVM transfers**.

### Responsibilities:

* Fetch native & ERC20 transfers
* Fetch logs/events when needed
* Convert to normalized events

### Components:

```
alchemy/
  ├── alchemy.module.ts
  ├── alchemy.service.ts
  ├── alchemy.fetcher.ts
  ├── mappers/
```

### fetcher example:

```ts
class AlchemyFetcher {
  async fetchTransfers(chain, fromBlock, toBlock) {
    // call Alchemy transfers API
    // map to normalized events
  }
}
```

---

## 4.2 Covalent Module

Used for **multi-chain transfers**, **balances**, **holders**, **historical data**.

### Responsibilities:

* Multi-chain support
* Wallet activity
* Historical token balances
* Token holders / supply
* Trending transfers

Covalent is extremely good for filling gaps left by Alchemy.

### Example structure:

```
covalent/
  ├── covalent.module.ts
  ├── covalent.service.ts
  ├── covalent.fetcher.ts
  ├── mappers/
```

Covalent will return transfers with buyer/seller/wallet info that we normalize.

---

## 4.3 TheGraph Module

Used for **DEX events**, **LP pool changes**, **swap events**.

### Responsibilities:

* LP added / removed
* Swap volume by token
* Per-pair liquidity
* New pool detection

### Interfaces:

```
thegraph/
  ├── uniswap-v2.subgraph.ts
  ├── uniswap-v3.subgraph.ts
  ├── sushiswap.subgraph.ts
```

Return normalized liquidity events.

---

## 4.4 CoinGecko Module

Used for **pricing & market data** only. CoinGecko is the primary source for token prices, market capitalization, and trending data.

### Responsibilities:

* Price lookup by contract address and chain
* Historical prices (optional, for charts)
* Trending coins
* Market cap / volume / liquidity data
* Token metadata (name, symbol, logo)
* Price conversion (USD, EUR, etc.)

### Components:

```
coingecko/
  ├── coingecko.module.ts
  ├── coingecko.service.ts
  ├── coingecko.fetcher.ts
  ├── mappers/
  │     └── price.mapper.ts
  └── cache/
        └── price-cache.ts
```

### Service Methods:

```ts
class CoinGeckoService {
  // Get current price by contract address and chain
  async getPrice(contract: string, chain: string): Promise<number | null>;
  
  // Get price for multiple tokens at once (batch)
  async getPrices(contracts: Array<{contract: string, chain: string}>): Promise<Map<string, number>>;
  
  // Get comprehensive market data
  async getMarketData(coinId: string): Promise<MarketData>;
  
  // Get trending coins
  async getTrending(): Promise<TrendingCoin[]>;
  
  // Get historical prices (for charts)
  async getHistoricalPrices(contract: string, chain: string, days: number): Promise<PricePoint[]>;
  
  // Search for tokens
  async searchTokens(query: string): Promise<TokenSearchResult[]>;
}
```

### Rate Limits:

* **Free tier**: 10-50 calls/minute (varies by endpoint)
* **Pro tier**: 500 calls/minute
* **Recommendation**: Use Pro API key for production

### Caching Strategy:

CoinGecko prices should be **heavily cached** to reduce API calls:

* Cache prices for **60 seconds** (prices don't change that frequently)
* Use Redis for distributed caching
* Cache trending coins for **5 minutes**
* Cache market data for **2 minutes**

### Implementation Example:

```ts
class CoinGeckoFetcher {
  private cache: RedisCache;
  
  async getPrice(contract: string, chain: string): Promise<number | null> {
    // Check cache first
    const cacheKey = `price:${chain}:${contract}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return parseFloat(cached);
    
    // Fetch from API
    const chainId = this.mapChainToCoinGeckoId(chain);
    const response = await this.httpClient.get(
      `/simple/token_price/${chainId}`,
      { contract_addresses: contract, vs_currencies: 'usd' }
    );
    
    const price = response.data[contract.toLowerCase()]?.usd;
    if (price) {
      // Cache for 60 seconds
      await this.cache.set(cacheKey, price.toString(), 60);
      return price;
    }
    
    return null;
  }
  
  async getPrices(contracts: Array<{contract: string, chain: string}>): Promise<Map<string, number>> {
    // Group by chain for batch requests
    const byChain = this.groupByChain(contracts);
    const prices = new Map<string, number>();
    
    for (const [chain, chainContracts] of Object.entries(byChain)) {
      const chainPrices = await this.getBatchPrices(chain, chainContracts);
      chainPrices.forEach((price, contract) => {
        prices.set(`${chain}:${contract}`, price);
      });
    }
    
    return prices;
  }
}
```

### Error Handling:

* **Rate limit errors**: Implement exponential backoff, use cached prices as fallback
* **Invalid contract**: Return null, don't throw
* **Network errors**: Retry up to 3 times, use cached price if available
* **Timeout**: Use cached price if available, otherwise return null

### Chain Mapping:

CoinGecko uses different chain identifiers:

```ts
const chainMapping = {
  'ETHEREUM': 'ethereum',
  'BSC': 'binance-smart-chain',
  'POLYGON': 'polygon-pos',
  'ARBITRUM': 'arbitrum-one',
  'BASE': 'base',
  'AVALANCHE': 'avalanche',
  'FANTOM': 'fantom',
  'SOLANA': 'solana'
};
```

### Price Enrichment:

CoinGecko is used to enrich normalized events with USD values:

```ts
async function enrichEventWithPrice(event: NormalizedEvent): Promise<NormalizedEvent> {
  if (!event.amountUsd && event.amount > 0) {
    const price = await coingeckoService.getPrice(
      event.token.contract,
      event.chain
    );
    
    if (price) {
      event.amountUsd = event.amount * price;
    }
  }
  
  return event;
}
```

### Notes:

* CoinGecko is **read-only** - we don't send events to CoinGecko
* Primary use case: Price lookups for event normalization
* Secondary use case: Market data for coin detail pages
* Always use batch endpoints when possible to reduce API calls
* Monitor API usage to stay within rate limits

---

## 4.5 DexScreener Module

Best free provider for **real-time DEX data**.

### Responsibilities:

* Liquidity
* Swaps
* New pairs
* Price via DEX
* Volume in pools

### Example:

```
dexscreener/
  ├── dexscreener.module.ts
  ├── dexscreener.service.ts
  ├── dexscreener.fetcher.ts
```

---

# 5. Event Normalization Pipeline

### Pipeline:

```
Provider → Fetcher → Raw Event → Mapper → NormalizedEvent[] → Queue
```

### Steps:

1. Fetch raw events from provider API
2. Map raw fields → normalized format
3. Enrich with price via CoinGecko or cached price
4. Add eventId (UUID)
5. Push to Redis queue: `events:normalized`

---

# 6. Schedulers (Cron Jobs)

### Job Frequency Guidelines:

| Provider    | Interval | Notes                  |
| ----------- | -------- | ---------------------- |
| Alchemy     | 15 sec   | Fast event ingestion   |
| Covalent    | 30 sec   | Multi-chain but slower |
| TheGraph    | 20 sec   | DEX events             |
| CoinGecko   | 60 sec   | Prices                 |
| DexScreener | 15 sec   | High-frequency pools   |

Schedulers live under:

```
integrations/schedulers/*
```

---

# 7. Queues (BullMQ)

### Queue Names:

```
queue_normalized_events
queue_detection
queue_alerts
queue_prices
```

### Event Flow:

```
Normalized Events → Detection Queue → Detection Engine → Signals
```

---

# 8. Error Handling

### Each provider must:

* Detect rate-limit responses
* Implement exponential backoff
* Switch between API keys automatically if needed
* Log errors to ApiUsageLog
* Trigger circuit breaker when provider is unstable

### Global Retry Strategy:

```
1st retry → 1s
2nd retry → 3s
3rd retry → 7s
```

---

# 9. Cost & Usage Tracking

Every provider request should log:

* provider name
* endpoint
* cost units (if available)
* duration
* success / fail
* raw metadata

Inside the DB table: `ApiUsageLog`.

---

# 10. Future Integrations (Extensible Architecture)

The system is prepared to support:

* QuickNode (for Solana RPC)
* Arkham API (labelled wallets)
* Glassnode (macro on-chain)
* Dune API (SQL analytics)
* Binance API (CEX inflow/outflow)

No architectural changes required.

---

# End of integrations_structure.md
