# detection_engine.md — Detection Engine & Scoring Algorithms

**Purpose:**
This document describes the detection engine for accumulation, whale activity, DEX/LP anomalies, and market signals. It includes the rule set, scoring model, configuration, example pseudocode, test strategy, and operational guidance for tuning thresholds and limiting false positives.

The engine consumes **NormalizedEvent** objects (see `system_architecture.md`) and outputs **MarketSignals** and **AccumulationSignals** persisted to the DB and optionally pushed to alert queues.

---

## 1. Design Goals

* **Deterministic & transparent:** Rules are human-readable and explainable.
* **Composable:** Rules are modular functions that return evidence + score contribution.
* **Pluggable thresholds:** All thresholds are config-driven and can be tuned per token or per chain.
* **False-positive control:** Use multiple evidences and cooldown windows to reduce noise.
* **Auditability:** Every signal contains evidence (normalized events and calculated metrics).

---

## 2. Inputs & Requirements

* **Inputs:** `NormalizedEvent` (transfer, swap, lp_add, lp_remove, price_update). Each event must have `amountUSD`.
* **External lookups:** token metadata (totalSupply, circulatingSupply, liquidityUSD), recent baseline metrics (avg volume, avg swaps), watchlist thresholds.
* **Config:** global and per-token thresholds stored in DB/config service.

---

## 3. High-level Flow

1. NormalizedEvent arrives in `queue_detection`.
2. Detection worker fetches relevant token metadata & recent baseline metrics.
3. Engine executes rule functions in order (or in parallel) producing partial scores + evidence.
4. Apply weighting to compute final `score` (0–100).
5. If `score >= candidate_threshold` → create `AccumulationSignal` (candidate).
6. If `score >= alert_threshold` → push to `queue_alerts` (alert) and create `MarketSignal`.
7. Deduplicate signals (token + window + rule hash). Respect per-user cooldowns for notifications.

---

## 4. Rule Set (Core Rules)

Each rule returns `{score, evidence}`. Score is a positive integer; the sum is normalized to 0–100 by `max_possible_score`.

### RULE A — Large Transfer (USD)

**Goal:** Detect single large on-chain transfers likely to represent whale accumulation.

* Condition: `event.amountUSD >= config.large_transfer_usd` (default $50,000)
* Evidence: txHash, from, to, amountUSD, token price
* Score contribution: 20
* Notes: Use user-specific override for high-cap tokens (BTC-like) via `token.min_large_usd`.

### RULE B — Units-Based Large Transfer

**Goal:** Detect large absolute unit transfers (important for low-price tokens).

* Condition: `event.amountUnits >= token.relative_unit_threshold` (default: 100k units for low-price tokens) OR user override
* Evidence: amount units, supply ratio
* Score contribution: 15

### RULE C — Supply Percentage Threshold

**Goal:** Detect transfers that represent a meaningful percentage of total or circulating supply.

* Compute: `pct_supply = amountUnits / circulatingSupply * 100`
* Condition: `pct_supply >= config.supply_pct_threshold` (default 0.05%)
* Score contribution: 15

### RULE D — Liquidity Ratio

**Goal:** Check transfer USD value relative to token liquidity in AMMs.

* Compute: `liquidity_ratio = amountUSD / token.liquidityUsd * 100`
* Condition: `liquidity_ratio >= config.liquidity_ratio_threshold` (default 1%)
* Score contribution: 10

### RULE E — Whale Cluster (Multiple Addresses)

**Goal:** Detect multiple large buys to distinct wallets within a short window (1h).

* Condition: `N distinct wallets` received `>= large_transfer_usd` within `window` (e.g., 1h)
* Evidence: list of wallets + amounts
* Score contribution: 18

### RULE F — Exchange Outflow / Inflow

**Goal:** Detect net outflow from CEX or big inflow to CEX (sellers / buyers).

* Use Covalent + scan APIs to map addresses to CEX addresses.
* Condition: `net_outflow_over_window >= config.exchange_outflow_usd` (default $100k)
* Interpretation: Outflow from exchange often indicates accumulation (withdraw to cold wallets)
* Score contribution: 12

### RULE G — DEX Swap Spike

**Goal:** Detect abnormal swap volume on DEX for token.

* Compare `sum_swap_usd(window)` to `baseline * factor` (e.g., 3x)
* Condition: `swap_usd >= baseline_swap_usd * config.swap_spike_factor` (default factor = 3)
* Score contribution: 12

### RULE H — LP Add (Liquidity Increase)

**Goal:** Detect liquidity additions that often accompany accumulation events.

* Condition: LP added amountUSD >= `config.lp_add_usd` OR `lp_add_pct > X%`
* Score contribution: 8

### RULE I — Price-Volume Confirmation

**Goal:** Confirm accumulation with supportive price/volume action.

* Condition: price increases or stable price while volume increases
* Use rolling windows (1h/6h/24h)
* Score contribution: 10

---

## 5. Weighting & Score Normalization

* Each rule has a configured `weight` (see contributions above). The engine sums contributions.
* `max_possible_score` = sum of all rule max contributions (default = 120 in above scheme). Normalize to 0–100:

```
normalized_score = min(100, round((raw_score / max_possible_score) * 100))
```

* **Candidate threshold:** 60 (configurable)
* **Alert threshold:** 75 (configurable)

---

## 6. Per-Token & Per-User Overrides

* Users can set watchlist thresholds (`threshold_usd`, `threshold_percentage`) — these override the global smallers.
* Admins can set token-level minimums (e.g., BTC min_large_usd = $100k).

---

## 7. Deduplication & Cooldowns

* Deduplicate identical signals by hashing: `hash = sha256(token + ruleSet + windowStart + windowEnd)`.
* Cooldown windows per token per user: default 1 hour for candidate signals, 12 hours for alerts.
* Maintain `recent_signals` cache in Redis.

---

## 8. Evidence & Auditing

Every MarketSignal / AccumulationSignal record must include:

* The list of triggering events (tx hashes)
* Metrics computed: amountUSD, pct_supply, liquidity_ratio, baseline numbers
* Rule-by-rule score breakdown (JSON)

This enables manual review and improves trust.

---

## 9. False-Positive Controls

1. **Require multi-evidence for alerts:** make alerts require at least 2 strong evidence rules (e.g., large transfer + exchange outflow OR large transfer + DEX spike).
2. **Whitelist known large transfers:** tokens with predictable large transfers (e.g., team allocations) should be excluded by label (use ledger-of-known-addresses or Arkham later).
3. **Volume baseline check:** ensure swap spike is measured against a baseline of the last 7 days.
4. **Liquidity sanity checks:** do not treat LP add by owner or router addresses as user liquidity.

---

## 10. Tuning Strategy

* **Start conservative:** high thresholds to reduce noise in early beta.
* **Collect feedback:** open manual feedback mechanism in admin to mark true/false positives.
* **Adjust weights:** use feedback + historical backtesting (on historical events) to recalibrate.
* **Token-specific tuning:** automatically increase thresholds for high-marketcap tokens.

---

## 11. Pseudocode Example (Simplified)

```python
# Pseudocode - Detection Worker
raw_event = queue.pop()
meta = fetch_token_meta(raw_event.token.contract)
baseline = fetch_baselines(raw_event.token.contract)

scores = []

# Run rules
if rule_large_transfer(raw_event, meta):
    scores.append({"rule":"large_transfer","score":20, "evidence":...})

if rule_supply_pct(raw_event, meta):
    scores.append({"rule":"supply_pct","score":15})

# ... other rules

raw_score = sum(item.score for item in scores)
normalized = normalize(raw_score)

if normalized >= ALERT_THRESHOLD and has_multi_evidence(scores):
    create_signal(type="accumulation", score=normalized, evidence=scores)
    push_alert_queue(signal)
elif normalized >= CANDIDATE_THRESHOLD:
    create_candidate(signal)

```

---

## 12. Testing & Backtesting

* **Unit tests:** each rule must have unit tests with synthetic events covering edge cases.
* **Integration tests:** feed historical data through the pipeline and validate signals match expected hits/losses.
* **Backtesting:** run engine over historical blocks (using Covalent/Alchemy historical endpoints) to compute precision/recall metrics.

Key metrics to monitor:

* True Positive Rate (TPR)
* False Positive Rate (FPR)
* Alert Volume per day
* Time-to-detect (latency)

---

## 13. Observability & Metrics

* Log each rule evaluation with `{token, rule, score, time, evidence}`.
* Emit metrics:

  * `signals.created` (counter)
  * `signals.alerted` (counter)
  * `detection.latency` (histogram)
  * `provider.errors` (counter)
* Dashboards: Signal volume, top tokens, false positive rate by rule

---

## 14. Future Enhancements

* **Machine Learning layer:** use labeled signals to train a model to reduce noise.
* **Wallet labeling:** integrate Arkham / Nansen for better whitelist/blacklist.
* **Advanced heuristics:** cross-chain correlated accumulation detection.

---

**End of detection_engine.md**
