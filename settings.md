# settings.md — System & User Settings Configuration

This document defines **all configurable settings** for the platform. It is split into two sections:

1. **System-Level Settings** — controlled only by admin.
2. **User-Level Settings** — customizable per user.

All settings are stored using:

* **PostgreSQL** (persistent values)
* **Redis** (cached for fast lookup)
* Loaded by the backend via a SettingsService.

---

# 1. SYSTEM-LEVEL SETTINGS (Admin Only)

System settings affect **all tokens, users, and detection rules**.

These values are stored in a `system_settings` table:

* `key: string`
* `value: string (JSON)`
* `updatedAt`

## 1.1 Global Thresholds

```json
{
  "large_transfer_usd": 50000,
  "unit_threshold_default": 100000,
  "supply_percentage_threshold": 0.05,
  "liquidity_ratio_threshold": 0.01,
  "exchange_outflow_threshold_usd": 100000,
  "swap_spike_factor": 3,
  "lp_add_threshold_usd": 10000,
  "candidate_signal_threshold": 60,
  "alert_signal_threshold": 75
}
```

### Purpose

These thresholds define when rules trigger across all chains/providers.
Admins may tune them after reviewing signal accuracy.

---

## 1.2 Ingestion Settings

```json
{
  "polling_interval_seconds": 12,
  "max_blocks_per_cycle": 300,
  "max_events_per_token_per_cycle": 2000,
  "allow_historical_sync": true,
  "historical_sync_days": 7
}
```

---

## 1.3 Provider-Level Settings

Each integration has adjustable parameters:

### Alchemy

```json
{
  "enabled": true,
  "chains": ["eth-mainnet", "polygon", "arbitrum"],
  "max_calls_per_min": 80
}
```

### Covalent

```json
{
  "enabled": true,
  "chains": ["eth", "polygon", "bsc", "avax"],
  "max_calls_per_min": 60
}
```

### TheGraph

```json
{
  "enabled": true,
  "subgraphs": ["uniswap", "sushiswap"],
  "max_calls_per_min": 120
}
```

### DexScreener

```json
{
  "enabled": true,
  "polling_interval_seconds": 20
}
```

---

## 1.4 Alerting Settings

```json
{
  "max_alerts_per_user_per_hour": 5,
  "global_alert_cooldown_minutes": 60,
  "telegram_enabled": true,
  "email_enabled": true
}
```

---

## 1.5 Token Metadata Auto-Tuning

The system automatically adjusts thresholds for high-cap tokens.

```json
{
  "auto_tune_enabled": true,
  "high_cap_usd": 500000000,
  "increase_threshold_large_transfer": 2.0,
  "increase_threshold_units": 3.0
}
```

---

# 2. USER-LEVEL SETTINGS

Stored in `user_settings` table.
Each user has override values for thresholds and preferences.

## 2.1 User Threshold Settings

```json
{
  "override_large_transfer_usd": 10000,
  "override_min_units": 50000,
  "override_supply_pct": 0.02,
  "use_system_defaults": false
}
```

### Behavior

* If user enables `use_system_defaults = true`, all overrides are ignored.
* If not, the detection engine prioritizes user-defined thresholds.

---

## 2.2 Watchlist Settings

```json
{
  "chains": ["eth", "bsc", "sol"],
  "tokens": ["0xabc...", "0xdef..."]
}
```

Users can follow:

* Specific tokens
* All tokens on a chain
* All tokens above marketcap threshold (future feature)

---

## 2.3 Alert Preferences

```json
{
  "email": true,
  "telegram": true,
  "telegram_chat_id": 123456789,
  "notifications_enabled": true,
  "min_signal_score": 65,
  "cooldown_minutes": 30
}
```

---

## 2.4 Dashboard Preferences

```json
{
  "dark_mode": true,
  "rows_per_page": 50,
  "time_window": "24h"
}
```

---

# 3. TOKEN-LEVEL SETTINGS (Admin)

Each token can have specific tuning:

```json
{
  "min_large_transfer_usd": 200000,
  "min_units": 1000000,
  "supply_pct_special": 0.02,
  "liquidity_ratio_special": 0.5
}
```

Use cases:

* BTC requires very high USD threshold
* Meme coins require unit-based thresholds
* Low-liquidity tokens need careful liquidity ratio handling

---

# 4. SETTINGS SERVICE DESIGN

```
SettingsService:
  - getSystemSetting(key)
  - setSystemSetting(key, value)
  - getUserSettings(userId)
  - setUserSettings(userId, changes)
  - getTokenSettings(tokenAddress)
  - refreshCache()
```

Backend caches settings for 60 seconds.

---

# 5. FRONTEND SETTINGS PAGES

The UI will include:

### 5.1 User Settings Page

* Threshold sliders
* Watchlist editor
* Alert toggle switches
* Telegram link button
* Default save buttons

### 5.2 Admin Settings Page

* Editable system thresholds
* Provider API quotas
* Auto-tuning parameters
* Reset caches

---

# 6. FUTURE SETTINGS EXTENSIONS

* Per-exchange thresholds
* Automatic ML-based threshold suggestions
* Risk level selector (Conservative / Balanced / Aggressive)
* Per-user chain limits

---

End of `settings.md`.
