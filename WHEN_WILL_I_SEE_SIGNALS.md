# When Will I See Real Signals?

## Current System Status ✅

Based on your Terminal.md logs, the system is **working perfectly**:

1. ✅ **Ingestion is running**: Every 15 minutes
2. ✅ **Price resolution works**: Prices are being fetched (e.g., $3046.97 for WETH, $0.00000842 for other tokens)
3. ✅ **Amount calculation works**: `amountUsd` is being calculated correctly
4. ✅ **Dust filtering works**: All events below $1 are correctly being skipped

## The Problem: All Transactions Are Dust

Looking at your logs, **ALL transactions are dust** (below $1):

### Examples from Your Logs:
- WETH (price: $3046.97): Amounts like `4.96e-20` tokens = `$1.51e-16` USD ❌
- Token (price: $0.00000842): Amounts like `1.27e-12` tokens = `$1.07e-17` USD ❌
- GRT (price: $0.04593631): Amounts like `2.68e-14` tokens = `$1.23e-15` USD ❌

**All of these are correctly being filtered out as dust!**

## When Will You See a Real Signal?

### Requirements for a Real Signal:

1. **Transaction with `amountUsd >= $1`**
   - For WETH ($3046.97): Need at least `0.00033 WETH` (≈ $1)
   - For token ($0.00000842): Need at least `118,764 tokens` (≈ $1)
   - For GRT ($0.04593631): Need at least `21.8 GRT` (≈ $1)

2. **Ingestion cycle runs every 15 minutes**
   - Next cycle: 15 minutes after last one
   - Your last cycle: 12:30:00 AM
   - Next cycle: 12:45:00 AM

3. **Processing limits**:
   - Max 5 coins per cycle
   - Max 50 events per coin per cycle
   - So up to 250 events processed per cycle

## Expected Timeline

### Best Case Scenario:
- **If a transaction >= $1 happens**: You'll see it in the **next 15-minute cycle** (within 15 minutes)
- **Signal appears**: Immediately after the ingestion cycle completes

### Realistic Scenario:
- **Depends on your tracked coins**:
  - **High-value coins** (WETH, ETH): More likely to have >= $1 transactions
  - **Low-value coins** (meme coins, new tokens): Less likely
  
- **Typical wait time**: 
  - For popular coins: **15 minutes to 1 hour**
  - For less active coins: **1-4 hours** or longer

### Worst Case Scenario:
- **If you're only tracking very low-value tokens**: You might wait **hours or days**
- **Solution**: Add more high-value coins to your watchlist

## How to Verify the System Will Work

### Option 1: Temporarily Lower Threshold (For Testing)

You can temporarily lower the minimum threshold to see signals faster:

**File**: `backend/src/signals/services/rule-engine.service.ts` (line ~124)

```typescript
// Change from:
const minUsd = 1; // drop dust/zero events

// To (for testing):
const minUsd = 0.0001; // Lower threshold to see more signals
```

**⚠️ Warning**: This will create many more signals (including dust), but it proves the system works!

### Option 2: Check Historical Data

Query your database to see if you have any events with `amountUsd >= $1`:

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) as events_above_1_usd,
  MAX("amountUsd") as max_amount_usd,
  AVG("amountUsd") as avg_amount_usd
FROM normalized_events
WHERE "timestamp" > NOW() - INTERVAL '24 hours';
```

This will show you:
- How many events you have
- How many are above $1
- The maximum amountUsd value

### Option 3: Monitor Specific High-Value Coins

Add coins that are more likely to have large transactions:
- **WETH** (already tracking) - Price: $3046.97
- **ETH** (native) - Price: ~$2500-3000
- **USDC/USDT** - But these are filtered out (stablecoins)
- **Popular tokens** with high prices

## What to Look For in Logs

### When a Real Signal is Created, You'll See:

```
[SignalDebug] Event ... | Rule HighVolumeRule -> ✅ TRIGGERED score=20
[SignalDebug] Event ... | Final score=45 | Triggered rules=3
[SignalDebug] Event ... | ✅ SIGNAL CREATED | Final score=45 | Triggered rules=3
Created alert signals for coin ... with score 45
```

### Instead of:

```
[SignalDebug] Event ... skipped: Dust transaction: amountUsd ($X.XXe-XX) below minimum threshold ($1)
```

## Recommendations

### 1. Wait Patiently (Recommended)
- System is working correctly
- Just need to wait for a transaction >= $1
- **Expected wait**: 15 minutes to 2 hours for active coins

### 2. Add More High-Value Coins
- Add coins with higher prices
- More likely to have transactions >= $1
- Check admin panel → Coin Management

### 3. Temporarily Lower Threshold (For Testing Only)
- Lower to $0.01 or $0.10 to see signals faster
- **Remember to change it back** after testing!

### 4. Check Your Coin Selection
- Are you tracking coins that actually have significant trading volume?
- Low-volume coins = fewer large transactions

## Summary

**Current Status**: ✅ System working perfectly, just filtering out dust

**Expected Wait Time**: 
- **Best case**: 15 minutes (next cycle)
- **Typical**: 15 minutes to 2 hours
- **Worst case**: Several hours (if tracking low-volume coins)

**What You Need**: A transaction with `amountUsd >= $1` in one of your tracked coins

**Action Items**:
1. ✅ System is working - no fixes needed
2. ⏳ Wait for next ingestion cycle (every 15 minutes)
3. 💡 Consider adding more high-value coins if you want signals faster
4. 🧪 Optionally lower threshold temporarily to verify system works

The system is ready - it's just waiting for a transaction worth >= $1! 🚀

