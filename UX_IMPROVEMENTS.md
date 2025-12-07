# UX Improvements — Signals & Watchlist Pages

This document tracks UX improvements planned and implemented for better user experience.

---

## 🎯 Overview

The current implementation requires users to manually enter coin IDs (CUID strings like `clx123abc...`), which is not user-friendly. These improvements will make the platform more intuitive by allowing users to search by familiar symbols (ETH, BTC) and select coins from dropdowns.

---

## 📋 Planned Improvements

### 1. Signals Page — Symbol Search

**Current State:**
- Users must enter coin ID (CUID) to filter signals
- Example: `clx7k2m3n4p5q6r7s8t9u0v1w2x3y4z5`
- Poor UX - users don't know coin IDs

**Planned Improvement:**
- Change filter from "Coin ID" to "Symbol"
- Users can type familiar symbols like "ETH", "BTC", "USDC"
- Backend will search coins by symbol and filter signals accordingly

**Implementation Tasks:**
- [ ] Add backend endpoint: `GET /api/coins/search?symbol=ETH`
- [ ] Update signals filter to accept symbol instead of coinId
- [ ] Update frontend Signals page to show "Symbol" label instead of "Coin ID"
- [ ] Add autocomplete/suggestions for coin symbols
- [ ] Handle multiple coins with same symbol (different chains)

**Benefits:**
- ✅ Intuitive - users know symbols
- ✅ Faster - no need to find coin ID first
- ✅ Better UX - familiar terminology

---

### 2. Watchlist Page — Chain-First Selection

**Current State:**
- Users must paste coin ID manually
- No guidance on which coins are available
- Poor UX - requires multiple steps to find coin ID

**Planned Improvement:**
- **Step 1:** User selects chain (Ethereum, Polygon, Arbitrum, Base, etc.)
- **Step 2:** System displays searchable list of active coins for that chain
- **Step 3:** User selects coin from dropdown/autocomplete
- **Step 4:** User sets thresholds (optional)
- **Step 5:** Add to watchlist

**Implementation Tasks:**
- [ ] Add backend endpoint: `GET /api/coins?chain=ETHEREUM`
- [ ] Add backend endpoint: `GET /api/coins/search?chain=ETHEREUM&q=ETH`
- [ ] Update frontend Watchlist page:
  - [ ] Add chain selection dropdown
  - [ ] Add coin search/autocomplete (filtered by selected chain)
  - [ ] Remove manual coin ID input
  - [ ] Show coin name, symbol, and contract address in selection
- [ ] Ensure Coin database is populated with active coins
- [ ] Add coin discovery/ingestion to populate coin database

**Benefits:**
- ✅ Guided flow - users see available options
- ✅ No manual ID entry - eliminates errors
- ✅ Better discovery - users can browse available coins
- ✅ Chain-aware - helps users understand multi-chain support

---

## 🗄️ Database Requirements

### Coin Table

The `Coin` table already exists with the required structure:

```prisma
model Coin {
  id                 String   @id @default(cuid())
  name               String
  symbol             String
  contractAddress    String
  chain              Chain    // ✅ Already has chain field
  totalSupply       Float?
  circulatingSupply Float?
  priceUsd          Float?
  liquidityUsd     Float?
  updatedAt         DateTime @updatedAt

  @@unique([contractAddress, chain])
  @@index([contractAddress, chain])
  @@index([symbol])  // ⚠️ May need to add index for symbol search
  @@index([chain])   // ⚠️ May need to add index for chain filtering
}
```

**Required Actions:**
- [ ] Add database index on `symbol` for faster symbol searches
- [ ] Add database index on `chain` for faster chain filtering
- [ ] Ensure coin database is populated with active coins
- [ ] Set up coin discovery/ingestion process

---

## 🔌 API Endpoints Required

### 1. Search Coins by Symbol

```
GET /api/coins/search?symbol=ETH
GET /api/coins/search?symbol=ETH&chain=ETHEREUM
```

**Response:**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Ethereum",
      "symbol": "ETH",
      "contractAddress": "0x0000...",
      "chain": "ETHEREUM"
    }
  ]
}
```

### 2. List Coins by Chain

```
GET /api/coins?chain=ETHEREUM
GET /api/coins?chain=ETHEREUM&limit=50&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Ethereum",
      "symbol": "ETH",
      "contractAddress": "0x0000...",
      "chain": "ETHEREUM"
    },
    // ... more coins
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### 3. Autocomplete Coin Search

```
GET /api/coins/autocomplete?q=ETH&chain=ETHEREUM
```

**Response:**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Ethereum",
      "symbol": "ETH",
      "contractAddress": "0x0000...",
      "chain": "ETHEREUM"
    }
  ]
}
```

---

## 🎨 Frontend Changes

### Signals Page

**Before:**
```tsx
<label>Coin ID</label>
<input placeholder="Optional coin ID" />
```

**After:**
```tsx
<label>Symbol</label>
<input placeholder="e.g. ETH, BTC, USDC" />
// With autocomplete showing matching coins
```

### Watchlist Page

**Before:**
```tsx
<label>Coin ID</label>
<input placeholder="clx123..." />
```

**After:**
```tsx
<label>Chain</label>
<select>
  <option>Ethereum</option>
  <option>Polygon</option>
  <option>Arbitrum</option>
  // ...
</select>

<label>Coin</label>
<Autocomplete
  placeholder="Search coins..."
  options={coinsForSelectedChain}
  displayField="symbol"
/>
```

---

## 📊 Supported Chains

The following chains are supported (from `Chain` enum):

- `ETHEREUM` - Ethereum Mainnet
- `BSC` - Binance Smart Chain
- `POLYGON` - Polygon
- `ARBITRUM` - Arbitrum One
- `BASE` - Base
- `AVALANCHE` - Avalanche
- `FANTOM` - Fantom
- `SOLANA` - Solana

---

## 🚀 Implementation Priority

1. **High Priority:**
   - Signals page symbol search (quick win)
   - Watchlist chain selection

2. **Medium Priority:**
   - Coin autocomplete
   - Coin database population

3. **Low Priority:**
   - Advanced filtering
   - Coin favorites/recent

---

## ✅ Completion Checklist

### Backend
- [ ] Add `GET /api/coins/search?symbol=...` endpoint
- [ ] Add `GET /api/coins?chain=...` endpoint
- [ ] Add `GET /api/coins/autocomplete?q=...` endpoint
- [ ] Add database indexes on `symbol` and `chain`
- [ ] Update signals filter to accept symbol

### Frontend
- [ ] Update Signals page filter to use symbol
- [ ] Add chain selection to Watchlist page
- [ ] Add coin autocomplete component
- [ ] Update watchlist form to use chain → coin flow
- [ ] Remove manual coin ID input fields

### Database
- [ ] Populate Coin table with active coins
- [ ] Set up coin discovery process
- [ ] Verify coin data is up-to-date

---

## 📝 Notes

- Coin IDs (CUID) will still be used internally - these changes only affect the UI
- Multiple coins can have the same symbol on different chains (e.g., USDC on Ethereum vs Polygon)
- Coin database should be populated from:
  - Data ingestion (when coins are discovered)
  - Manual admin entry
  - CoinGecko API (for popular coins)
  - Integration providers (Alchemy, Covalent)

---

**Last Updated:** 2025-12-06  
**Status:** Planned - Ready for Implementation

