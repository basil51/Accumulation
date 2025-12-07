# New Project Plan — Crypto Accumulation & Market Intelligence Platform (Version 1)

> **This is the official first plan for the new project (clean start, new folder, no connection to previous code).**
> **Data Sources: Alchemy + Covalent + TheGraph + CoinGecko + DexScreener**
> **Payment Method: USDT only (via Binance transfer)**

---

## 1. Project Definition

A SaaS platform for **real‑time accumulation detection**, **whale tracking**, **smart money movement**, and **market intelligence** across all major chains.

Users will get:

* Accumulation detection (USD, Units, Supply‑based)
* Whale movements
* Real‑time market signals
* Per‑coin analytics
* DEX activity & liquidity analytics
* Wallet explorer
* Market overview insights

---

## 2. Project Goals

1. Build a strong crypto analytics platform for traders
2. Use affordable and scalable data providers
3. Keep the architecture modular for future growth
4. Avoid expensive providers like Bitquery
5. Provide one payment method trusted by all traders: **USDT**

---

## 3. System Stack (Tech Stack)

### **Frontend**

* Next.js 15
* TailwindCSS
* shadcn/ui

### **Backend**

* NestJS
* Prisma ORM
* PostgreSQL
* Redis + BullMQ (Jobs / Schedulers / Workers)

### **Data Providers**

* **Alchemy** → Transfers, ERC20, ERC721, major chains
* **Covalent** → Multi‑chain, holders, transfers, balances
* **TheGraph** → LP data, DEX swaps, pools
* **CoinGecko API** → Prices, market data, trending coins
* **DexScreener API** → Liquidity, swaps, new pairs

### **Authentication**

* Auth.js (NextAuth successor)

### **Payments**

* **USDT only** via Binance wallet transfer
* Manual verification (auto verification later possible)

---

## 4. Database Schema

### **Users**

* id
* email
* password
* subscription_level
* subscription_expiry
* created_at

### **Payments**

* id
* user_id
* amount_usdt
* tx_hash
* network (TRC20/BEP20/ERC20)
* screenshot_url
* status (pending / confirmed)
* created_at

### **Coins**

* id
* name
* symbol
* contract_address
* chain
* total_supply
* circulating_supply
* price_usd
* liquidity_usd
* is_active (boolean) - Active trading coin flag
* is_famous (boolean) - Famous/popular coin flag
* updated_at

**Note:** The Coin table serves as the master database of all active coins tracked by the platform. Each coin is uniquely identified by `contract_address + chain` combination. This table will be populated and maintained as new coins are discovered through data ingestion.

**Coin Import Process:**
1. Import top 1000 coins from CoinGecko (sorted by market cap, default sorting)
2. Filter coins with market cap > $25k (coin #1000 has ~$24k market cap, so $25k threshold ensures quality)
3. For each coin, extract all supported chains from CoinGecko platforms data
4. Create coin records for each chain the coin exists on
5. Automatically mark top 100 coins as "famous" and top 100 as "active"

### **ChainInfo**

* id
* chain (enum: ETHEREUM, BSC, POLYGON, ARBITRUM, BASE, AVALANCHE, FANTOM, SOLANA)
* name (display name)
* is_active (boolean) - Whether signal detection is active for this chain
* coin_count (number) - Number of coins on this chain
* signal_count (number) - Number of signals detected on this chain
* created_at
* updated_at

**Note:** The ChainInfo table tracks all supported blockchain networks. After importing coins, this table is automatically populated with all chains found. Currently, signal detection is primarily focused on Ethereum, but the infrastructure supports all listed chains.

### **MarketSignals**

* id
* coin_id
* signal_type (buy, sell, anomaly, whale, etc.)
* score
* details (JSON)
* created_at

### **WhaleTransactions**

* id
* wallet
* token
* amount
* usd_value
* chain
* tx_hash
* created_at

### **AccumulationSignals**

* id
* coin_id
* amount_units
* amount_usd
* supply_percentage
* liquidity_ratio
* score
* created_at

### **UserWatchlist**

* id
* user_id
* coin_id
* threshold_usd
* threshold_percentage
* notifications_enabled

---

## 5. System Logic (High-Level)

### **1) On‑chain Fetching Jobs**

* Alchemy → Transfers / events
* Covalent → Multi-chain transfers, holders
* TheGraph → LP & swap events
* DexScreener → Liquidity + new pairs

### **2) Normalize Events**

Every provider becomes a unified event shape.

### **3) Detection Engine**

Runs scoring rules:

* Accumulation rules
* Whale activity rules
* LP changes
* DEX spikes
* Market anomalies

### **4) Generate Signals**

Store signal → show in dashboard → optional notifications.

### **5) Update Market Dashboard**

Refresh market metrics and trending data.

---

## 6. Supported Signal Categories

### **Market Signals**

* Volume spikes
* Price anomalies
* Market movers

### **Accumulation Signals**

* USD‑based accumulation
* Units‑based accumulation
* Supply‑percentage accumulation

### **Whale Signals**

* Large buys
* New whale arrivals
* Whale clusters

### **DEX Activity**

* Large buy swaps
* Large sell swaps

### **Liquidity (LP) Signals**

* LP added
* LP removed

---

## 7. User Interface Pages

### 1) **Dashboard**

* Market overview
* Whale movements
* Latest accumulation signals

### 2) **Signals Page** (Tabbed)

* Accumulation
* Whales
* DEX Swaps
* Liquidity
* Market Signals
* **Search by Symbol** (UX Improvement) - Users can filter signals by coin symbol (e.g., "ETH", "BTC") instead of requiring coin ID

### 3) **Coins List**

* Active coins
* Trending
* Market metrics

### 4) **Coin Details**

* Price
* Accumulation chart
* Whale activity
* Liquidity
* Swaps
* Market indicators

### 5) **Wallet Explorer**

* Wallet portfolio
* Accumulated tokens
* Movement timeline

### 6) **User Settings**

* Thresholds
* Watchlist
* Notification preferences

### **Watchlist UX Improvements** (Planned)

* **Chain Selection First** - Users first select which chain (Ethereum, Polygon, Arbitrum, Base, etc.)
* **Coin Selection** - After selecting chain, users see a searchable list of active coins for that chain
* **Coin Database** - Maintain a comprehensive database of active coins with chain information
* **Better UX** - No more manual coin ID entry; intuitive dropdown/autocomplete interface

### 7) **Subscription Page**

* Plan overview
* USDT payment
* Upload payment proof

### 8) **Admin Panel**

* Approve payments
* Manage users
* View analytics

---

## 8. Subscription Plans

Below is the improved 4‑tier subscription structure including **Free**, **Basic**, **Pro**, and **Premium**. This structure is the standard for SaaS analytics platforms and gives a clear upgrade path.

---

### **Free Tier**

**Price:** $0

**Includes:**

* Delayed market signals (15–30 minutes delay)
* Limited market overview
* View top 10 trending coins
* 1 watchlist coin
* No whale alerts
* No accumulation alerts

---

### **Basic Tier**

**Price:** **$19 / month (paid in USDT)**

**Includes:**

* Real-time accumulation alerts (low sensitivity)
* Whale alerts (limited volume: >$10k)
* Market overview (full)
* Access to coin details pages
* Up to 10 watchlist coins
* Basic DEX swap insights
* Limited LP alerts

**Target User:** Beginners and small traders.

---

### **Pro Tier**

**Price:** **$49 / month (paid in USDT)**

**Includes:**

* All accumulation alerts (medium + high sensitivity)
* Full whale tracking (>$5k + smart money clusters)
* Real-time DEX swap analysis
* LP add/remove alerts
* Market signals (price anomalies, volume spikes)
* 25 watchlist coins
* Wallet Explorer (limited)
* Priority data refresh

**Target User:** Active traders and signal users.

---

### **Premium Tier**

**Price:** **$99 / month (paid in USDT)**

**Includes:**

* Unlimited accumulation detection
* Full whale analytics (all thresholds)
* Smart Money tracking
* Multi-chain aggregation
* 50 watchlist coins
* Full Wallet Explorer
* Early access to new features
* Full market intelligence dashboard
* Liquidity, swaps, new pools detection
* Priority support

**Target User:** Professional traders, institutions, crypto desks.

---

## 9. USDT Payment Flow

USDT Payment Flow

### Supported Networks

* TRC20 (recommended, low fees)
* BEP20
* ERC20 (optional, high fees)

### Process

1. User selects a subscription
2. System displays Binance USDT address
3. User sends payment
4. User uploads screenshot
5. Admin confirms
6. Subscription activates for 30 days

---

## 10. Implementation Sprints

(To be written after your approval of this full plan.)

---

**Plan Version 1 completed — ready for your feedback or expansion.**

next steps:

- system_architecture.md

- database_schema_v2.md

- payment_flow.md

- integrations_structure.md

- detection_engine.md

- settings.md

- Sprint_plane.md


