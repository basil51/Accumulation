## Coin Price Backfill & Refresh Plan

Goal: populate `coin.priceUsd` so ingestion can compute `amountUsd` and signals fire.

### Prereqs
- Backend running.
- Env set: `COINGECKO_API_KEY` (or `COINGECKO_PRO_API_KEY`) in `backend/.env`.

### One-time Backfill (run now)
1) Hit admin import endpoint  
`POST /api/admin/coins/import-coingecko`  
Body (defaults OK):  
```json
{ "limit": 1000, "minMarketCap": 25000, "batchSize": 50, "batchDelayMinutes": 5 }
```
2) Wait for batches to finish (logs will show progress). It resumes from the last index automatically.
3) Re-run ingestion (cron will pick it up, or trigger manually) so new events get `amountUsd` from stored prices.

### Ongoing Refresh
- Schedule the same import daily to keep prices fresh (or add a smaller “top 200” import every few hours).
- If rate-limited (429), retry after cooldown; Pro key reduces delays.

### Validation
- Check logs for “Processed X new events” without “Missing/invalid amountUsd”.
- Verify DB: spot-check `coin.priceUsd` not null for active/famous coins.

### Optional Hardening
- Add fallback price lookup during ingestion (CoinGecko → Alchemy Prices) when `priceUsd` is missing.
- Cache price lookups to stay within rate limits.

