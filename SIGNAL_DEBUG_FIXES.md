# Signal Detection Debug Fixes

## Problem Summary

The system was producing **zero signals** because:
1. All events were being skipped with "Missing/invalid amountUsd after normalization"
2. Price resolution was failing silently during ingestion
3. Backfill logic was running AFTER the skip check, so it never executed

## Root Cause Analysis

### Critical Bug: Backfill Order
- **Location**: `backend/src/signals/services/rule-engine.service.ts`
- **Issue**: Events were checked for `amountUsd` validity (line 64-78) BEFORE attempting to backfill from price (line 98-108)
- **Result**: Events with missing price during ingestion were permanently skipped, even if price became available later

### Price Resolution Issues
- **Location**: `backend/src/integrations/scheduler/ingestion-scheduler.service.ts`
- **Issue**: Price resolution failures were logged at debug level only, making debugging difficult
- **Result**: No visibility into why prices were missing

### Debugging Gaps
- **Location**: `backend/src/signals/services/signal-debug-inspector.service.ts`
- **Issue**: Limited diagnostic information about why events were skipped
- **Result**: Difficult to trace signal generation failures

## Fixes Implemented

### 1. Fixed Backfill Order (CRITICAL)
**File**: `backend/src/signals/services/rule-engine.service.ts`

**Changes**:
- Moved coin lookup and price backfill BEFORE the skip check
- Added database persistence for backfilled `amountUsd` values
- Enhanced logging to show backfill attempts and results

**Impact**: Events with missing price during ingestion can now be processed if price is available when the rule engine runs.

### 2. Enhanced Price Resolution Logging
**File**: `backend/src/integrations/scheduler/ingestion-scheduler.service.ts`

**Changes**:
- Added detailed logging at each step of price resolution (stored → cached → CoinGecko)
- Changed debug messages to warnings when price is unavailable
- Added success logging when price is fetched and cached
- Enhanced amountUsd calculation logging

**Impact**: Better visibility into price resolution failures and successes.

### 3. Improved Debug Inspector
**File**: `backend/src/signals/services/signal-debug-inspector.service.ts`

**Changes**:
- Enhanced rule evaluation logging with status indicators (✅/❌)
- Added evidence logging for each rule
- Improved final score logging with signal creation status
- Added skip reasons to notes for summary

**Impact**: Much easier to debug why events are skipped or why signals are/aren't created.

### 4. Enhanced Guardrails
**File**: `backend/src/signals/services/rule-engine.service.ts`

**Changes**:
- Added detailed logging for each guardrail check
- Enhanced guardrail reasons with actual values (not just "missing")
- Added data availability diagnostics before rule evaluation
- Improved evidence in guardrail results

**Impact**: Clear visibility into why rules are skipped due to missing data.

### 5. Data Availability Diagnostics
**File**: `backend/src/signals/services/rule-engine.service.ts`

**Changes**:
- Added data availability summary before rule evaluation
- Logs amountUsd, priceUsd, liquidityUsd, and baseline metrics status
- Helps identify which data is missing for debugging

**Impact**: Quick identification of missing data dependencies.

## Code Flow After Fixes

### Before (Broken):
```
1. Fetch event
2. Check amountUsd → SKIP if missing ❌
3. Get coin metadata
4. Try to backfill amountUsd (NEVER REACHED)
```

### After (Fixed):
```
1. Fetch event
2. Get coin metadata
3. Try to backfill amountUsd from price ✅
4. Persist backfilled amountUsd to DB ✅
5. Check amountUsd → Only skip if still missing after backfill
6. Evaluate rules
```

## Expected Behavior

### Scenario 1: Price Available During Ingestion
- ✅ `amountUsd` is calculated during ingestion
- ✅ Event passes validation
- ✅ Rules are evaluated normally

### Scenario 2: Price Missing During Ingestion, Available Later
- ⚠️ `amountUsd` is null during ingestion
- ✅ Event is saved with `amountUsd = null`
- ✅ Rule engine backfills `amountUsd` from current price
- ✅ Event passes validation
- ✅ Rules are evaluated normally

### Scenario 3: Price Never Available
- ⚠️ `amountUsd` is null during ingestion
- ⚠️ Price is still missing in rule engine
- ⚠️ Event is skipped with detailed reason
- ✅ Debug logs show exactly why (price missing)

### Scenario 4: Dust Transactions (Very Small Amounts)
- ✅ `amountUsd` is calculated (may be backfilled)
- ⚠️ `amountUsd` is below $1 minimum threshold (e.g., `9.047e-15`)
- ✅ Event is correctly skipped as dust transaction
- ✅ Debug logs show: `Dust transaction: amountUsd ($X.XXe-XX) below minimum threshold ($1)`
- **This is EXPECTED behavior** - these are legitimate dust transactions that should be filtered out

## Debugging Guide

### Check Terminal Logs For:

1. **Price Resolution**:
   ```
   ✅ Fetched and cached price for 0x... on ETHEREUM: $1234.56
   ❌ No price available for coin ... - events will be skipped unless price is backfilled later
   ```

2. **Backfill Attempts**:
   ```
   ✅ Backfilled and persisted amountUsd: 1e-12 * $1234.56 = $1.23e-9
   [Backfill] Event ...: amount=1e-12 (1e-12) * price=$1234.56 = $1.23e-9
   ```

3. **Dust Transactions** (Expected - Not an Error):
   ```
   [SignalDebug] Event ... skipped: Dust transaction: amountUsd ($9.047e-15) below minimum threshold ($1)
   Dust detected: amount=1e-15 tokens, price=$1234.56, calculated=$9.047e-15
   ```
   **Note**: These are legitimate dust transactions. The system is working correctly by filtering them out.

4. **Skip Reasons (Missing Price)**:
   ```
   [SignalDebug] Event ... skipped: Missing/invalid amountUsd after normalization (price unavailable: null)
   ```

5. **Rule Evaluation**:
   ```
   [SignalDebug] Event ... | Rule HighVolumeRule -> ✅ TRIGGERED score=20
   [SignalDebug] Event ... | Final score=45 | Triggered rules=3
   ```

6. **Guardrails**:
   ```
   [Guardrail] HighVolumeRule: Guardrail: USD amount unavailable (null) - skipping USD-based rule
   ```

### Understanding Dust Transactions

Dust transactions are very small transfers (often < $0.01) that occur on-chain. Examples:
- `amountUsd = 9.047e-15` = $0.000000000000009047 (extremely small)
- `amountUsd = 1.234e-16` = $0.000000000000000123 (even smaller)

**Why they happen:**
- Very small token amounts (e.g., 0.000000000000009 tokens)
- Even with reasonable prices, these result in tiny USD values
- Common in DeFi protocols (dust from rounding, airdrops, etc.)

**System behavior:**
- ✅ Correctly calculates `amountUsd` (backfill works)
- ✅ Correctly identifies as dust (< $1 threshold)
- ✅ Correctly skips processing (saves resources)
- ✅ Logs clearly indicate this is dust, not an error

**This is expected and correct behavior!** The system is filtering out noise.

## Testing Recommendations

1. **Test with coins that have price**:
   - Verify signals are created normally
   - Check that amountUsd is calculated correctly

2. **Test with coins missing price**:
   - Verify events are saved with amountUsd = null
   - Check that backfill attempts are logged
   - Verify skip reasons are clear

3. **Test price backfill**:
   - Add a coin without price
   - Process events
   - Add price to coin
   - Re-process events
   - Verify backfill works and signals are created

4. **Monitor terminal logs**:
   - Look for price resolution messages
   - Check backfill success/failure
   - Verify rule evaluation logs

## Next Steps

1. **Monitor production logs** to see:
   - How many events are backfilled successfully
   - How many events are still skipped due to missing price
   - Which coins consistently lack price data

2. **Consider price service improvements**:
   - Add retry logic for CoinGecko API calls
   - Implement price fallback to multiple sources
   - Add price refresh job for stale prices

3. **Add metrics**:
   - Track backfill success rate
   - Track price resolution success rate
   - Monitor signal creation rate

## Files Modified

1. `backend/src/signals/services/rule-engine.service.ts` - Fixed backfill order, enhanced logging
2. `backend/src/integrations/scheduler/ingestion-scheduler.service.ts` - Enhanced price resolution logging
3. `backend/src/signals/services/signal-debug-inspector.service.ts` - Improved debug output

## Summary

The main fix was **moving the backfill logic before the skip check**. This allows events with missing price during ingestion to be processed if price becomes available later. Combined with enhanced logging and diagnostics, this should resolve the "zero signals" issue and make future debugging much easier.

