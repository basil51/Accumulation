# CoinGecko Import Guide

**Date:** 2025-12-07  
**Status:** ✅ Complete

## Overview

The CoinGecko import function allows admins to automatically populate the database with the top 1000 coins from CoinGecko, sorted by market cap (default sorting on CoinGecko).

## How It Works

### 1. Coin Selection Criteria

- **Source:** [CoinGecko](https://www.coingecko.com/) - Top 1000 coins
- **Sorting:** Market Cap (default CoinGecko sorting)
- **Market Cap Threshold:** $25,000 minimum
  - Coin #1000 has approximately $24k market cap
  - $25k threshold ensures quality coins only
  - Coins below this threshold are considered less useful for signal detection

### 2. Import Process

1. **Fetch Coins:** Fetches top 1000 coins from CoinGecko API (sorted by market cap)
2. **Filter by Market Cap:** Only imports coins with market cap ≥ $25k
3. **Extract Chain Data:** For each coin, fetches detailed data to get platform addresses
4. **Multi-Chain Creation:** Creates coin records for each supported chain the coin exists on
5. **Auto-Flagging:**
   - Top 100 coins by market cap → Marked as "Famous"
   - Top 100 coins by market cap → Marked as "Active"
6. **Chain Tracking:** Automatically creates/updates ChainInfo records for all chains found

### 3. Supported Chains

The import function supports the following chains (mapped from CoinGecko platform IDs):

- **Ethereum** (ethereum)
- **Binance Smart Chain** (binance-smart-chain)
- **Polygon** (polygon-pos)
- **Arbitrum** (arbitrum)
- **Base** (base)
- **Avalanche** (avalanche)
- **Fantom** (fantom)
- **Solana** (solana)

### 4. Chain Management

After import, the system automatically:

1. **Creates ChainInfo Records:** One record per chain found during import
2. **Updates Statistics:**
   - `coinCount`: Number of coins on this chain
   - `signalCount`: Number of signals detected (updated as signals are generated)
3. **Tracks Status:** `isActive` flag indicates if signal detection is enabled for this chain

**Current Status:**
- **Primary Chain:** Ethereum (currently the main focus for signal detection)
- **Infrastructure:** All chains are supported, ready for expansion

## Usage

### Admin Panel

1. Navigate to **Admin Panel** → **Coin Management** tab
2. Click **"Import from CoinGecko (Top 1000)"** button
3. Confirm the import (may take several minutes)
4. View results:
   - Number of coins created
   - Number of coins skipped (already exist)
   - Number of errors
   - List of chains found

### API Endpoint

```bash
POST /api/admin/coins/import-coingecko
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "limit": 1000,
  "minMarketCap": 25000
}
```

**Response:**
```json
{
  "message": "Coin import completed",
  "created": 850,
  "skipped": 120,
  "errors": 30,
  "chains": ["Ethereum", "Polygon", "Arbitrum", "Base", "BSC"]
}
```

## Rate Limiting

- **CoinGecko Free Tier:** 10-50 calls/minute
- **Implementation:** 1.2-1.5 second delay between requests
- **Estimated Time:** ~20-30 minutes for 1000 coins
- **Recommendation:** Use CoinGecko Pro API key for faster imports (500 calls/minute)

## Chain List

After import, view all chains in the **Coin Management** tab:

- **Chain Name:** Display name (e.g., "Ethereum")
- **Chain ID:** Enum value (e.g., "ETHEREUM")
- **Status:** Active/Inactive toggle
- **Coin Count:** Number of coins on this chain
- **Signal Count:** Number of signals detected

## Next Steps

1. **Import Coins:** Run the import to populate the database
2. **Review Chains:** Check the chains list to see which chains have coins
3. **Plan Signal Detection:** 
   - Currently focused on Ethereum
   - Infrastructure ready for other chains
   - Can enable/disable chains via admin panel

## Technical Details

### CoinGecko API Endpoints Used

1. **Markets Endpoint:** `/api/v3/coins/markets`
   - Fetches top coins by market cap
   - Paginated (250 per page, 4 pages for 1000 coins)

2. **Coin Details Endpoint:** `/api/v3/coins/{id}`
   - Fetches detailed coin data including platform addresses
   - One request per coin

### Database Updates

- **Coins Table:** New coin records created
- **ChainInfo Table:** Chain records created/updated
- **Statistics:** Coin counts updated automatically

### Error Handling

- **Rate Limiting:** Automatic retry with delays
- **Duplicate Coins:** Skipped (not counted as errors)
- **Invalid Data:** Logged and skipped
- **Network Errors:** Retried with exponential backoff

---

**Implementation Complete** ✅

The CoinGecko import function is ready to use. Admins can now easily populate the database with top coins and track all supported chains.

