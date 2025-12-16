# Quick Fix: Add These 5 Ethereum Coins NOW

## Problem Identified

After 12 hours with no signals, the issue is:
- ✅ System is working correctly
- ❌ Your current coins don't have transactions >= $1 USD
- ✅ Solution: Add high-volume coins

## Top 5 Coins to Add (Copy-Paste Ready)

### 1. WETH (Wrapped Ethereum) - HIGHEST PRIORITY
```
Contract: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
Symbol: WETH
Chain: ETHEREUM
Price: ~$3,000
Why: Most liquid token, constant large transfers
```

### 2. WBTC (Wrapped Bitcoin)
```
Contract: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
Symbol: WBTC
Chain: ETHEREUM
Price: ~$60,000
Why: Very high value, large transfers common
```

### 3. UNI (Uniswap)
```
Contract: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
Symbol: UNI
Chain: ETHEREUM
Price: ~$5-15
Why: Popular DeFi token, active trading
```

### 4. LINK (Chainlink)
```
Contract: 0x514910771AF9Ca656af840dff83E8264EcF986CA
Symbol: LINK
Chain: ETHEREUM
Price: ~$10-20
Why: Oracle token, high volume
```

### 5. AAVE (Aave)
```
Contract: 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9
Symbol: AAVE
Chain: ETHEREUM
Price: ~$80-150
Why: Major DeFi protocol token
```

## How to Add (Step-by-Step)

### Via Admin Panel:

1. **Go to**: Admin Panel → Coin Management tab
2. **Click**: "Add New Coin" button
3. **Fill in**:
   - Contract Address: (copy from above)
   - Chain: ETHEREUM
   - Symbol: (copy from above)
   - Name: (auto-fills or enter manually)
4. **Click**: "Add Coin"
5. **Mark as Active**: Check the "Active" checkbox
6. **Mark as Famous**: Check the "Famous" checkbox (optional but recommended)

### Repeat for all 5 coins

## Expected Results

### Within 15 minutes (next ingestion cycle):
- ✅ Events with `amountUsd >= $1` should appear
- ✅ Signals should start being created

### What to Look For in Logs:

**Before (what you're seeing now):**
```
[Dust] Enriching amountUsd: amount=4.96e-20 * price=$3046.97 = $1.51e-16 (will be skipped as dust)
skipped: Dust transaction: amountUsd ($1.51e-16) below minimum threshold ($1)
```

**After (what you should see):**
```
Enriched amountUsd: 0.5 * $3046.97 = $1523.49
✅ SIGNAL CREATED | Final score=45 | Triggered rules=3
Created alert signals for coin ... with score 45
```

## Verify It's Working

### Check Database (Run in PostgreSQL):

```sql
-- Check if events >= $1 exist
SELECT 
  COUNT(*) as events_above_1_usd,
  MAX("amountUsd") as max_amount,
  token_symbol
FROM normalized_events
WHERE "amountUsd" >= 1 
  AND "timestamp" > NOW() - INTERVAL '1 hour'
GROUP BY token_symbol
ORDER BY events_above_1_usd DESC;

-- Check if signals exist
SELECT COUNT(*) as total_signals
FROM accumulation_signals
WHERE "createdAt" > NOW() - INTERVAL '1 hour';
```

### Check via Frontend:

1. Go to Signals page
2. Check both "Accumulation" and "Market" tabs
3. You should see signals appearing

### Check via API:

```bash
# Check accumulation signals
curl http://localhost:4007/api/admin/signals?type=accumulation&limit=10

# Check market signals  
curl http://localhost:4007/api/admin/signals?type=market&limit=10
```

## Why These 5 Coins?

1. **WETH**: Most liquid token, constant large transfers (whales, DEXs, protocols)
2. **WBTC**: Very high price, so even small amounts = large USD values
3. **UNI**: Popular DeFi token with active trading
4. **LINK**: Oracle token with high volume
5. **AAVE**: Major DeFi protocol with significant transfers

## If Still No Signals After Adding These:

1. **Wait 15 minutes** for next ingestion cycle
2. **Check coin status**: Make sure they're marked as "Active"
3. **Check watchlist**: Add them to your watchlist if needed
4. **Verify prices**: Check that coins have valid prices in database
5. **Check logs**: Look for any errors in terminal

## Summary

**Action**: Add these 5 coins via Admin Panel → Coin Management
**Wait**: 15 minutes for next ingestion cycle
**Expected**: Signals should start appearing

The system is working - you just need better coins! 🚀

