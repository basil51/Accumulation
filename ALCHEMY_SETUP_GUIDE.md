# Alchemy API Setup Guide

## 403 Forbidden Error - Troubleshooting

If you're getting a `403 Forbidden` error from Alchemy API, here's how to fix it:

### Common Causes

1. **API Key Not Set**
   - Check if `ALCHEMY_API_KEY` is in your `backend/.env` file
   - Make sure there are no quotes around the key value

2. **Invalid API Key**
   - The API key might be incorrect or expired
   - Get a new key from https://www.alchemy.com/

3. **API Key Format Issues**
   - Remove any quotes: `ALCHEMY_API_KEY="key"` ❌ → `ALCHEMY_API_KEY=key` ✅
   - Remove any extra spaces
   - Make sure there's no newline or special characters

4. **Wrong Chain Access**
   - Some API keys might be restricted to specific chains
   - Make sure your key has access to the chain you're trying to use

### Step-by-Step Setup

1. **Get an Alchemy API Key**
   - Go to https://www.alchemy.com/
   - Sign up or log in
   - Create a new app (or use existing)
   - Copy the API key

2. **Add to `.env` File**
   ```bash
   # In backend/.env
   ALCHEMY_API_KEY=your-api-key-here
   ```
   
   **Important:** 
   - No quotes around the value
   - No spaces before or after the `=`
   - Example: `ALCHEMY_API_KEY=abc123xyz` ✅

3. **Verify the Key**
   - Restart your backend server
   - Check logs for: `Alchemy API key configured: abc123xy...`
   - If you see a warning about key not set, the `.env` file isn't being loaded

4. **Test the Connection**
   - The scheduler will automatically test the connection on startup
   - Look for health check logs
   - If you see 403 errors, double-check the key format

### Example `.env` Entry

```bash
# Correct format
ALCHEMY_API_KEY=abc123xyz789

# Wrong formats (don't use these)
ALCHEMY_API_KEY="abc123xyz789"  # ❌ Quotes
ALCHEMY_API_KEY = abc123xyz789  # ❌ Spaces around =
ALCHEMY_API_KEY=abc123xyz789    # ❌ Trailing spaces
```

### Free Tier Limits

- **300M compute units/month**
- One key works for all supported chains (Ethereum, Polygon, Arbitrum, Base)
- Rate limit: ~200ms between requests recommended

### Supported Chains

- ✅ Ethereum (ETH_MAINNET)
- ✅ Polygon (MATIC_MAINNET)
- ✅ Arbitrum (ARB_MAINNET)
- ✅ Base (BASE_MAINNET)
- ❌ BSC (not supported by Alchemy - use Covalent)
- ❌ Avalanche (not supported by Alchemy - use Covalent)
- ❌ Fantom (not supported by Alchemy - use Covalent)
- ❌ Solana (different API structure)
- ❌ Bitcoin (not supported)

### Still Getting 403?

1. **Check the key is correct:**
   ```bash
   # In backend directory
   cat .env | grep ALCHEMY_API_KEY
   ```

2. **Verify no extra characters:**
   - Copy the key directly from Alchemy dashboard
   - Paste it directly into `.env` (don't type it)

3. **Test with curl:**
   ```bash
   # Replace YOUR_KEY with your actual key
   curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
   
   If this returns 403, the key is invalid. Get a new one from Alchemy.

4. **Check Alchemy Dashboard:**
   - Make sure the app is active
   - Check if there are any restrictions on the key
   - Verify the key hasn't been regenerated

### Need Help?

- Alchemy Docs: https://docs.alchemy.com/
- Alchemy Support: https://help.alchemy.com/
- Check backend logs for detailed error messages

