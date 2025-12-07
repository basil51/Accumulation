# Threshold Tuning Guide

This guide explains how to tune detection thresholds to optimize signal quality and reduce false positives.

---

## Overview

Detection thresholds control when signals are generated. The system has three levels of threshold configuration:

1. **System-Level Thresholds** - Global defaults for all tokens
2. **Token-Specific Thresholds** - Overrides for individual coins
3. **User-Level Thresholds** - Personal preferences (future)

---

## Current Default Thresholds

### Global Thresholds

| Threshold | Default Value | Description | Impact |
|-----------|--------------|-------------|--------|
| `large_transfer_usd` | 50,000 | Minimum USD value for large transfer detection | Higher = fewer signals, lower false positives |
| `unit_threshold_default` | 100,000 | Minimum units for low-price token detection | Higher = fewer signals for meme coins |
| `supply_percentage_threshold` | 0.05 | Minimum % of circulating supply | Higher = only very large accumulations |
| `liquidity_ratio_threshold` | 0.01 | Minimum % of token liquidity | Higher = only significant moves relative to liquidity |
| `exchange_outflow_threshold_usd` | 100,000 | Minimum USD for exchange outflow detection | Higher = fewer exchange-related signals |
| `swap_spike_factor` | 3.0 | Multiplier for DEX swap volume spike detection | Higher = requires larger volume spikes |
| `lp_add_threshold_usd` | 10,000 | Minimum USD for LP addition detection | Higher = only significant liquidity additions |
| `candidate_signal_threshold` | 60 | Minimum score for candidate signals | Higher = fewer candidate signals |
| `alert_signal_threshold` | 75 | Minimum score for alert-level signals | Higher = fewer alerts, higher quality |

---

## Tuning Strategy

### Step 1: Monitor False Positive Rates

1. Navigate to **Admin Panel → False Positives** tab
2. Review false positive analytics:
   - Overall false positive rate (target: < 10%)
   - False positive rate by signal type
   - False positive rate by score range
   - False positive rate by coin

### Step 2: Identify Patterns

Look for patterns in false positives:

- **High false positive rate for low scores (0-59)**: Increase `candidate_signal_threshold`
- **High false positive rate for medium scores (60-74)**: Increase `alert_signal_threshold` or adjust rule thresholds
- **Specific coins with high false positive rates**: Use token-specific thresholds
- **Accumulation signals have more false positives**: Increase `supply_percentage_threshold` or `liquidity_ratio_threshold`
- **Market signals have more false positives**: Increase `large_transfer_usd` or `swap_spike_factor`

### Step 3: Adjust Thresholds

#### Conservative Approach (Fewer Signals, Higher Quality)

- Increase `large_transfer_usd` by 20-50%
- Increase `candidate_signal_threshold` to 65-70
- Increase `alert_signal_threshold` to 80-85
- Increase `supply_percentage_threshold` to 0.1
- Increase `liquidity_ratio_threshold` to 0.02

#### Aggressive Approach (More Signals, Lower Quality)

- Decrease `large_transfer_usd` by 20-30%
- Decrease `candidate_signal_threshold` to 55-60
- Decrease `alert_signal_threshold` to 70-75
- Decrease `supply_percentage_threshold` to 0.03
- Decrease `liquidity_ratio_threshold` to 0.005

### Step 4: Test and Monitor

1. Make small incremental changes (5-10% at a time)
2. Monitor for 24-48 hours
3. Review false positive rates again
4. Adjust based on results

---

## Threshold Descriptions

### `large_transfer_usd`

**Purpose**: Detects large on-chain transfers (Rule A - HighVolumeRule)

**When to increase**:
- Too many false positives from normal trading activity
- High-cap tokens (BTC, ETH) generating too many signals

**When to decrease**:
- Missing legitimate accumulation signals
- Low-cap tokens need lower thresholds

**Recommended ranges**:
- High-cap tokens (>$1B market cap): $100,000 - $500,000
- Mid-cap tokens ($100M - $1B): $50,000 - $100,000
- Low-cap tokens (<$100M): $10,000 - $50,000

### `unit_threshold_default`

**Purpose**: Detects large absolute unit transfers for low-price tokens (Rule B)

**When to increase**:
- Meme coins generating too many false positives
- Low-price tokens with high supply

**When to decrease**:
- Missing accumulation signals for low-price tokens

**Recommended ranges**:
- High-price tokens: 10,000 - 50,000
- Mid-price tokens: 50,000 - 100,000
- Low-price tokens: 100,000 - 1,000,000

### `supply_percentage_threshold`

**Purpose**: Detects transfers representing significant % of supply (Rule C)

**When to increase**:
- Too many false positives from normal trading
- High-supply tokens generating noise

**When to decrease**:
- Missing accumulation signals for low-supply tokens

**Recommended ranges**:
- High-supply tokens: 0.1 - 0.5%
- Mid-supply tokens: 0.05 - 0.1%
- Low-supply tokens: 0.01 - 0.05%

### `liquidity_ratio_threshold`

**Purpose**: Detects transfers relative to token liquidity (Rule D)

**When to increase**:
- High-liquidity tokens generating too many signals
- Need to focus on significant moves only

**When to decrease**:
- Low-liquidity tokens need lower thresholds
- Missing signals for tokens with low liquidity

**Recommended ranges**:
- High-liquidity tokens: 0.02 - 0.05
- Mid-liquidity tokens: 0.01 - 0.02
- Low-liquidity tokens: 0.005 - 0.01

### `candidate_signal_threshold`

**Purpose**: Minimum score for candidate signals (shown in dashboard, not alerted)

**When to increase**:
- Too many low-quality candidate signals
- Dashboard cluttered with noise

**When to decrease**:
- Missing potential accumulation patterns
- Need more signals for analysis

**Recommended range**: 55 - 70

### `alert_signal_threshold`

**Purpose**: Minimum score for alert-level signals (users get notified)

**When to increase**:
- Too many false positive alerts
- Users complaining about alert quality

**When to decrease**:
- Missing legitimate high-quality signals
- Users want more alerts

**Recommended range**: 70 - 85

### `swap_spike_factor`

**Purpose**: Multiplier for detecting DEX swap volume spikes (Rule G)

**When to increase**:
- Too many false positives from normal DEX activity
- Need to focus on significant volume spikes only

**When to decrease**:
- Missing legitimate swap volume spikes
- Need to catch smaller accumulation patterns

**Recommended range**: 2.0 - 5.0

### `lp_add_threshold_usd`

**Purpose**: Minimum USD value for LP addition detection (Rule H)

**When to increase**:
- Too many false positives from small LP additions
- Need to focus on significant liquidity events

**When to decrease**:
- Missing legitimate LP additions
- Low-liquidity tokens need lower thresholds

**Recommended range**: $5,000 - $50,000

---

## Token-Specific Tuning

For tokens with consistently high false positive rates:

1. Navigate to **Admin Panel → Token Settings**
2. Click **Add New Settings**
3. Select the token
4. Override specific thresholds:
   - `minLargeTransferUsd`: Override `large_transfer_usd`
   - `minUnits`: Override `unit_threshold_default`
   - `supplyPctSpecial`: Override `supply_percentage_threshold`
   - `liquidityRatioSpecial`: Override `liquidity_ratio_threshold`

**Example**: For BTC (high-cap token):
- `minLargeTransferUsd`: 200,000
- `supplyPctSpecial`: 0.1
- `liquidityRatioSpecial`: 0.02

---

## Best Practices

1. **Start Conservative**: Begin with higher thresholds, then lower if needed
2. **Monitor Continuously**: Check false positive rates weekly
3. **Make Incremental Changes**: Adjust by 5-10% at a time
4. **Document Changes**: Note why thresholds were changed
5. **Test Before Production**: Use staging environment if available
6. **Review by Coin**: Some coins may need token-specific tuning
7. **Consider Market Conditions**: Volatile markets may need different thresholds

---

## Troubleshooting

### High False Positive Rate (>15%)

- Increase `candidate_signal_threshold` and `alert_signal_threshold`
- Increase `large_transfer_usd` for high-cap tokens
- Use token-specific thresholds for problematic coins
- Review false positive analytics to identify patterns

### Too Few Signals

- Decrease `candidate_signal_threshold` and `alert_signal_threshold`
- Decrease `large_transfer_usd` for low-cap tokens
- Decrease `supply_percentage_threshold` for low-supply tokens
- Review if thresholds are too conservative

### Inconsistent Signal Quality

- Review false positive rates by score range
- Adjust thresholds based on score distribution
- Consider using token-specific thresholds
- Monitor daily trends for patterns

---

## Related Documentation

- [Detection Engine](./detection_engine.md) - Detailed rule descriptions
- [Settings](./settings.md) - System settings structure
- [Admin Panel](./admin_panel.md) - Admin panel features

---

**Last Updated**: 2025-12-06  
**Status**: Active - Ready for use

