The system is working correctly — the issue is 100% from amountUsd being NULL or invalid

see Terminal.md which copied for Terminal to show debug at terminal 
skipped: Missing/invalid amountUsd after normalization


This means:

ingestion pipeline is receiving events without usable price data, so the system cannot calculate amountUsd.
When amountUsd is missing, every signal rule will automatically skip that event.

This is why we receive ZERO signals.

✅ Why amountUsd becomes NULL

Based on logs and architecture, one or more of these is happening:

1. tokenPriceUsd is missing

Price-service may not be returning a price for the token contract because:

Price API (Coingecko, Defillama, Coinpaprika, or custom) does not know the token

The token is too new

There is no mapping between the token contract → price API ID

There is a change at token settings 

If tokenPriceUsd = null, the system cannot compute:

amountUsd = amountNormalized * tokenPriceUsd


So it becomes null → SKIPPED.

2. amountNormalized is failing

Sometimes:

Decimals are wrong in DB

Events come from logs where the transfer amount is encoded differently

Amount is zero (you said you allowed zero-amount events before)

If amountNormalized is invalid, amountUsd will fail too.

3. Your normalization function returns NaN

If the parser returns NaN, your pipeline marks it as invalid and skips.