# Recommended Ethereum Coins for Signal Detection

## Why No Signals After 12 Hours?

After analyzing your system, here's what's happening:

1. ✅ **System is working correctly** - All dust transactions (< $1) are being filtered
2. ⚠️ **Problem**: The coins you're tracking likely don't have many transactions >= $1
3. ✅ **Solution**: Add high-volume, high-value coins that frequently have large transactions

## Recommended Ethereum Coins (High Volume, High Price)

### Top Priority (Add These First)

These coins have high prices and high volume, making them most likely to generate signals:

1. **WETH (Wrapped Ethereum)**
   - Contract: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
   - Symbol: `WETH`
   - Price: ~$3,000-3,500
   - **Why**: Most liquid token on Ethereum, constant large transfers
   - **Minimum for signal**: ~0.00033 WETH (very likely to see)

2. **USDC (USD Coin)**
   - Contract: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
   - Symbol: `USDC`
   - Price: ~$1.00
   - **Note**: Currently filtered as stablecoin, but you can track for volume analysis
   - **Minimum for signal**: 1 USDC (very common)

3. **USDT (Tether)**
   - Contract: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
   - Symbol: `USDT`
   - Price: ~$1.00
   - **Note**: Currently filtered as stablecoin
   - **Minimum for signal**: 1 USDT (very common)

4. **WBTC (Wrapped Bitcoin)**
   - Contract: `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`
   - Symbol: `WBTC`
   - Price: ~$60,000-70,000
   - **Why**: High value, large transfers common
   - **Minimum for signal**: ~0.000016 WBTC (very likely)

5. **DAI (Dai Stablecoin)**
   - Contract: `0x6B175474E89094C44Da98b954EedeAC495271d0F`
   - Symbol: `DAI`
   - Price: ~$1.00
   - **Minimum for signal**: 1 DAI

### High-Value DeFi Tokens

6. **UNI (Uniswap)**
   - Contract: `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`
   - Symbol: `UNI`
   - Price: ~$5-15
   - **Why**: Popular DeFi token, active trading
   - **Minimum for signal**: ~0.2 UNI

7. **LINK (Chainlink)**
   - Contract: `0x514910771AF9Ca656af840dff83E8264EcF986CA`
   - Symbol: `LINK`
   - Price: ~$10-20
   - **Why**: Oracle token, high volume
   - **Minimum for signal**: ~0.1 LINK

8. **AAVE (Aave)**
   - Contract: `0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9`
   - Symbol: `AAVE`
   - Price: ~$80-150
   - **Why**: Major DeFi protocol token
   - **Minimum for signal**: ~0.01 AAVE

9. **CRV (Curve)**
   - Contract: `0xD533a949740bb3306d119CC777fa900bA034cd52`
   - Symbol: `CRV`
   - Price: ~$0.50-1.50
   - **Why**: Active DeFi token
   - **Minimum for signal**: ~1-2 CRV

10. **MKR (Maker)**
    - Contract: `0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2`
    - Symbol: `MKR`
    - Price: ~$1,000-2,000
    - **Why**: High value governance token
    - **Minimum for signal**: ~0.001 MKR

### Popular Meme/Community Tokens (High Volume)

11. **SHIB (Shiba Inu)**
    - Contract: `0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE`
    - Symbol: `SHIB`
    - Price: ~$0.000008-0.00001
    - **Why**: Very high volume, many large transfers
    - **Minimum for signal**: ~100,000 SHIB (common)

12. **PEPE (Pepe)**
    - Contract: `0x6982508145454Ce325dDbE47a25d4ec3d2311933`
    - Symbol: `PEPE`
    - Price: ~$0.000001-0.00001
    - **Why**: High volume meme token
    - **Minimum for signal**: ~1,000,000 PEPE

### Layer 2 & Bridge Tokens

13. **ARB (Arbitrum)**
    - Contract: `0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1`
    - Symbol: `ARB`
    - Price: ~$1-2
    - **Why**: Popular L2 token
    - **Minimum for signal**: ~1 ARB

14. **OP (Optimism)**
    - Contract: `0x4200000000000000000000000000000000000042`
    - Symbol: `OP`
    - Price: ~$1-3
    - **Why**: Popular L2 token
    - **Minimum for signal**: ~0.5 OP

## How to Add These Coins

### Option 1: Via Admin Panel (Recommended)

1. Go to Admin Panel → Coin Management
2. Click "Add New Coin"
3. Enter:
   - **Contract Address**: (from list above)
   - **Chain**: ETHEREUM
   - **Symbol**: (from list above)
   - **Name**: (auto-filled or enter manually)
4. Click "Add Coin"
5. Mark as **Active** and/or **Famous** for priority processing

### Option 2: Via CoinGecko Import

1. Go to Admin Panel → Coin Management
2. Click "Import Next Batch (50 coins)"
3. This will import top coins from CoinGecko
4. Then mark the ones you want as Active/Famous

## Quick Start: Top 5 to Add NOW

If you want to see signals quickly, add these 5 first:

1. **WETH** - `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
2. **WBTC** - `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`
3. **UNI** - `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`
4. **LINK** - `0x514910771AF9Ca656af840dff83E8264EcF986CA`
5. **SHIB** - `0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE`

**Why these 5?**
- WETH & WBTC: Very high prices, large transfers common
- UNI & LINK: Popular DeFi tokens with good volume
- SHIB: High volume meme token (you're already tracking this based on logs!)

## Verify Signals Are Being Created

### Check Database Directly

Run this SQL query to see if ANY signals exist:

```sql
-- Check accumulation signals
SELECT 
  COUNT(*) as total_signals,
  COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) as signals_above_1_usd,
  MAX("amountUsd") as max_amount_usd,
  MIN("amountUsd") as min_amount_usd,
  AVG("amountUsd") as avg_amount_usd
FROM accumulation_signals
WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- Check market signals
SELECT 
  COUNT(*) as total_signals,
  MAX(score) as max_score,
  MIN(score) as min_score
FROM market_signals
WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- Check recent events with amountUsd >= 1
SELECT 
  COUNT(*) as events_above_1_usd,
  MAX("amountUsd") as max_amount_usd,
  token_symbol,
  chain
FROM normalized_events
WHERE "amountUsd" >= 1 
  AND "timestamp" > NOW() - INTERVAL '24 hours'
GROUP BY token_symbol, chain
ORDER BY events_above_1_usd DESC
LIMIT 20;
```

### Check via API

```bash
# Check accumulation signals
curl -X GET "http://localhost:4007/api/signals/accumulation?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check market signals
curl -X GET "http://localhost:4007/api/signals/market?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check admin signals (no auth needed if you're admin)
curl -X GET "http://localhost:4007/api/admin/signals?type=accumulation&limit=10"
```

## Expected Results After Adding These Coins

### Within 15 minutes (next ingestion cycle):
- You should see events with `amountUsd >= $1`
- Signals should start appearing

### Within 1-2 hours:
- Multiple signals for high-volume coins (WETH, WBTC, UNI)
- Signals for meme tokens if they have large transfers

### What to Look For in Logs:

```
✅ SIGNAL CREATED | Final score=45 | Triggered rules=3
Created alert signals for coin ... with score 45
```

Instead of:
```
skipped: Dust transaction: amountUsd ($X.XXe-XX) below minimum threshold ($1)
```

## Troubleshooting

### If Still No Signals After Adding These Coins:

1. **Check coin status**: Make sure coins are marked as "Active" in admin panel
2. **Check watchlist**: Add coins to your watchlist if needed
3. **Verify price**: Check that coins have valid prices in database
4. **Check ingestion**: Verify ingestion is running (every 15 minutes)
5. **Lower threshold temporarily**: For testing, lower minUsd to $0.10

## Summary

**Problem**: You're tracking coins with very low transaction volumes or very low prices
**Solution**: Add high-volume, high-value coins (WETH, WBTC, UNI, LINK, SHIB)
**Expected**: Signals within 15 minutes to 2 hours after adding these coins

The system is working - you just need better coins! 🚀

