-- Diagnostic Queries to Check Signal Status
-- Run these in your PostgreSQL database to see what's happening

-- 1. Check if ANY accumulation signals exist
SELECT 
  COUNT(*) as total_accumulation_signals,
  COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) as signals_above_1_usd,
  MAX("amountUsd") as max_amount_usd,
  MIN("amountUsd") as min_amount_usd,
  AVG("amountUsd") as avg_amount_usd,
  MAX("createdAt") as most_recent_signal
FROM accumulation_signals;

-- 2. Check signals from last 24 hours
SELECT 
  COUNT(*) as signals_last_24h,
  MAX("amountUsd") as max_amount,
  MIN("amountUsd") as min_amount
FROM accumulation_signals
WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- 3. Check market signals
SELECT 
  COUNT(*) as total_market_signals,
  MAX(score) as max_score,
  MIN(score) as min_score,
  MAX("createdAt") as most_recent_signal
FROM market_signals;

-- 4. Check events with amountUsd >= 1 (these should create signals)
SELECT 
  COUNT(*) as events_above_1_usd,
  MAX("amountUsd") as max_amount_usd,
  token_symbol,
  chain,
  COUNT(DISTINCT "tokenContract") as unique_tokens
FROM normalized_events
WHERE "amountUsd" >= 1 
  AND "timestamp" > NOW() - INTERVAL '24 hours'
GROUP BY token_symbol, chain
ORDER BY events_above_1_usd DESC
LIMIT 20;

-- 5. Check all events (including dust) to see what you're processing
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) as events_above_1_usd,
  COUNT(CASE WHEN "amountUsd" < 1 AND "amountUsd" > 0 THEN 1 END) as dust_events,
  COUNT(CASE WHEN "amountUsd" IS NULL OR "amountUsd" = 0 THEN 1 END) as null_or_zero_events,
  MAX("amountUsd") as max_amount_usd,
  token_symbol,
  chain
FROM normalized_events
WHERE "timestamp" > NOW() - INTERVAL '24 hours'
GROUP BY token_symbol, chain
ORDER BY total_events DESC
LIMIT 20;

-- 6. Check which coins you're tracking
SELECT 
  c.symbol,
  c.name,
  c."contractAddress",
  c.chain,
  c."isActive",
  c."isFamous",
  c."priceUsd",
  COUNT(DISTINCT uw.id) as watchlist_count
FROM coins c
LEFT JOIN user_watchlist uw ON uw."coinId" = c.id
WHERE c.chain = 'ETHEREUM'
GROUP BY c.id, c.symbol, c.name, c."contractAddress", c.chain, c."isActive", c."isFamous", c."priceUsd"
ORDER BY c."isFamous" DESC, c."isActive" DESC, watchlist_count DESC;

-- 7. Check if signals are being created but filtered out
SELECT 
  COUNT(*) as total_events_processed,
  COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) as events_that_should_create_signals,
  token_symbol,
  chain
FROM normalized_events
WHERE "timestamp" > NOW() - INTERVAL '12 hours'
GROUP BY token_symbol, chain
HAVING COUNT(CASE WHEN "amountUsd" >= 1 THEN 1 END) > 0
ORDER BY events_that_should_create_signals DESC;

