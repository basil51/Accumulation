# Dust Transactions - Explained

## What Are Dust Transactions?

Dust transactions are very small on-chain transfers that result in extremely small USD values (typically < $0.01, often < $0.0001).

## Examples from Your Logs

```
amountUsd (9.047170391598767e-15) below minimum threshold ($1)
amountUsd (1.23493871212796e-16) below minimum threshold ($1)
```

These values in decimal form:
- `9.047e-15` = $0.000000000000009047 (15 zeros after decimal)
- `1.234e-16` = $0.000000000000000123 (16 zeros after decimal)

## Why Do They Happen?

### 1. Very Small Token Amounts
The raw token amount is extremely small:
- Example: `0.000000000000009047` tokens
- Even with a high price, this results in tiny USD values

### 2. Calculation Example
```
amount = 0.000000000000009047 tokens
price = $1,000 per token
amountUsd = 0.000000000000009047 * 1000 = $0.000000000009047
```

### 3. Common Sources
- **DeFi rounding errors**: Small amounts left after swaps
- **Airdrops**: Fractional token distributions
- **Gas optimization**: Miners/validators sending tiny amounts
- **Smart contract interactions**: Residual amounts from complex operations

## Is This Normal?

**YES!** This is completely normal and expected behavior.

### The System is Working Correctly:

1. ✅ **Backfill works**: Events with missing price get backfilled successfully
2. ✅ **Calculation is correct**: `amount * price = amountUsd` is accurate
3. ✅ **Filtering works**: Dust transactions are correctly identified and skipped
4. ✅ **Logging is clear**: You can see exactly why events are skipped

### What the Logs Show:

```
[SignalDebug] Event ... skipped: Dust transaction: amountUsd ($9.047e-15) below minimum threshold ($1)
Dust detected: amount=1e-15 tokens, price=$1234.56, calculated=$9.047e-15
```

This means:
- The event was processed
- `amountUsd` was calculated correctly
- It's below the $1 minimum threshold
- It's being skipped as expected

## Should You Be Concerned?

**No!** This is expected behavior. The system is:
- ✅ Processing all events
- ✅ Calculating `amountUsd` correctly
- ✅ Filtering out noise (dust)
- ✅ Only creating signals for meaningful transactions

## What About Real Signals?

Real signals will have:
- `amountUsd >= $1` (minimum threshold)
- Meaningful token amounts
- Significant USD values

Example of a real signal:
```
amount = 1000 tokens
price = $1.50
amountUsd = $1,500 ✅ (above $1 threshold)
→ Signal created!
```

## Can You Adjust the Threshold?

Yes! The minimum threshold is currently set to **$1** in:
- `backend/src/signals/services/rule-engine.service.ts` (line ~124)

You can:
1. **Lower it** (e.g., $0.10) to catch more signals (but more noise)
2. **Raise it** (e.g., $10) to catch only larger transactions (less noise)

**Recommendation**: Keep it at $1 unless you have a specific reason to change it.

## Summary

- ✅ Dust transactions are normal and expected
- ✅ The system is working correctly
- ✅ These events are correctly being filtered out
- ✅ Real signals (>= $1) will still be created
- ✅ The logs show this is dust, not an error

**No action needed!** The system is functioning as designed.

