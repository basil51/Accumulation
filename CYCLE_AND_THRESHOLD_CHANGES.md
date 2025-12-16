# Changes Made: Cycle Time & Threshold Adjustments

## Changes Applied

### 1. ✅ Ingestion Cycle: 15 minutes → 5 minutes

**File**: `backend/src/integrations/scheduler/ingestion-scheduler.service.ts`

**Changed**:
- Cron schedule: `*/15 * * * *` → `*/5 * * * *`
- Events will be processed every 5 minutes instead of 15 minutes

**Impact**:
- ✅ Faster signal detection (3x more frequent)
- ✅ More API calls to Alchemy (but still within limits)
- ✅ More terminal logs (but helps with debugging)

### 2. ✅ Minimum USD Threshold: $1 → $0.10 (TEMPORARY FOR TESTING)

**Files Changed**:
- `backend/src/signals/services/rule-engine.service.ts` (line ~130)
- `backend/src/signals/services/signal.service.ts` (line ~42, ~158)

**Changed**:
- `minUsd = 1` → `minUsd = 0.10`
- This allows transactions >= $0.10 to create signals (instead of >= $1)

**Why**:
- Your current coins are producing mostly dust transactions (< $1)
- Lowering to $0.10 will let us see if signals ARE being created
- **This is TEMPORARY** - change back to $1 after verifying the system works

**Impact**:
- ✅ More signals will be created (10x more)
- ⚠️ Will include some dust transactions
- ✅ Helps verify the system is working

### 3. ✅ Enhanced Logging

**File**: `backend/src/signals/services/rule-engine.service.ts`

**Added**:
- Logs ALL events that pass the amountUsd threshold
- Shows: `amountUsd`, `score`, `triggeredRules`, `coin symbol`
- Helps debug why signals are/aren't being created

## What to Expect Now

### Within 5 minutes (next cycle):
- ✅ More events will be processed
- ✅ Events with `amountUsd >= $0.10` will create signals
- ✅ You should see logs like:
  ```
  Event ... evaluated: amountUsd=$0.15, score=20, triggeredRules=1, coin=WETH
  Created AccumulationSignal ... for coin ... with score 20
  ```

### What to Look For in Logs:

**Good Signs**:
```
Event ... evaluated: amountUsd=$0.50, score=20, triggeredRules=1, coin=WETH
✅ SIGNAL CREATED | Final score=20 | Triggered rules=1
Created AccumulationSignal ... for coin ... with score 20
```

**Still Dust**:
```
skipped: Dust transaction: amountUsd ($0.05) below minimum threshold ($0.10)
```

## Next Steps

### 1. Wait 5 minutes
- Next ingestion cycle will run
- Check terminal logs for signal creation

### 2. Check Signals Page
- Go to Signals page (Accumulation and Market tabs)
- You should see signals appearing

### 3. Verify in Database
```sql
-- Check signals created in last hour
SELECT COUNT(*) as signals_created, MAX("amountUsd") as max_amount
FROM accumulation_signals
WHERE "createdAt" > NOW() - INTERVAL '1 hour';
```

### 4. After Verifying System Works:

**Change thresholds back to $1**:

1. `backend/src/signals/services/rule-engine.service.ts` line ~130:
   ```typescript
   const minUsd = 1; // Change back from 0.10
   ```

2. `backend/src/signals/services/signal.service.ts` line ~42:
   ```typescript
   const minUsd = 1; // Change back from 0.10
   ```

3. `backend/src/signals/services/signal.service.ts` line ~158:
   ```typescript
   where.amountUsd = { gte: 1 }; // Change back from 0.10
   ```

## Why These Changes Help

### Cycle Time (5 min):
- **Before**: Had to wait 15 minutes to see new events
- **After**: See new events every 5 minutes
- **Benefit**: Faster feedback, more data processed

### Threshold ($0.10):
- **Before**: Only transactions >= $1 created signals (too high for your coins)
- **After**: Transactions >= $0.10 create signals
- **Benefit**: Can verify system works, see signals immediately
- **Note**: This is temporary - change back after testing

## Important Notes

1. **Threshold is TEMPORARY**: Change back to $1 after verifying signals work
2. **More signals = more noise**: With $0.10 threshold, you'll see more dust
3. **Still add good coins**: Even with lower threshold, add WETH, WBTC, UNI, etc. for better signals
4. **Cycle time is permanent**: 5 minutes is fine, but uses more API quota

## Summary

✅ **Cycle**: Changed to 5 minutes (permanent)
✅ **Threshold**: Lowered to $0.10 (temporary for testing)
✅ **Logging**: Enhanced to show all processed events

**Expected**: Signals should appear within 5 minutes!

