# environment_variables.md — Environment Configuration

This document defines **all environment variables** required for the platform to run. These should be stored in `.env` files (one per environment) and never committed to version control.

---

## 1. Environment Files Structure

```
.env.example          # Template with all variables (committed)
.env                  # Local development (gitignored)
.env.staging          # Staging environment (gitignored)
.env.production       # Production environment (gitignored)
```

---

## 2. Database Configuration

### PostgreSQL

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/accumulation_db?schema=public"

# Connection pool settings (optional)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

**Notes:**
* Use strong passwords in production
* Consider connection pooling for high traffic
* Use SSL in production: `?sslmode=require`

---

## 3. Redis Configuration

```bash
# Redis connection (for BullMQ queues and caching)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""  # Optional, leave empty if no password
REDIS_DB=0

# Full Redis URL (alternative to above)
REDIS_URL="redis://localhost:6379"
```

**Notes:**
* Use password in production
* Consider Redis Cluster for high availability

---

## 4. Application Configuration

### General

```bash
# Application environment
NODE_ENV="development"  # development | staging | production

# Application port
PORT=3007

# API base URL
API_BASE_URL="http://localhost:4007"

# Frontend URL (for CORS and redirects)
FRONTEND_URL="http://localhost:3007"

# Application secret (for JWT, sessions, etc.)
APP_SECRET="your-super-secret-key-change-in-production"

# JWT configuration
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_REFRESH_EXPIRES_IN="30d"
```

**Notes:**
* Generate strong random secrets for production
* Use different secrets per environment
* `APP_SECRET` should be at least 32 characters

---

## 5. Authentication Configuration

```bash
# Auth.js / NextAuth configuration
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-nextauth-secret"

# OAuth providers (if using in future)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

---

## 6. Data Provider API Keys

### Alchemy

```bash
# Alchemy API keys (one per chain or use mainnet key)
ALCHEMY_API_KEY_ETHEREUM="your-alchemy-eth-key"
ALCHEMY_API_KEY_POLYGON="your-alchemy-polygon-key"
ALCHEMY_API_KEY_ARBITRUM="your-alchemy-arbitrum-key"
ALCHEMY_API_KEY_BASE="your-alchemy-base-key"
```

**Notes:**
* Get keys from https://www.alchemy.com/
* Free tier: 300M compute units/month
* Consider separate keys per environment

### Covalent

```bash
COVALENT_API_KEY="your-covalent-api-key"
```

**Notes:**
* Get key from https://www.covalenthq.com/
* Free tier: 100k requests/month
* Paid tiers available

### TheGraph

```bash
# TheGraph API endpoint (no key required for public subgraphs)
THEGRAPH_API_URL="https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

# Or use TheGraph Studio for custom subgraphs
THEGRAPH_STUDIO_API_KEY=""
```

**Notes:**
* Public subgraphs are free
* Custom subgraphs may require authentication

### CoinGecko

```bash
# CoinGecko API key (optional, free tier has rate limits)
COINGECKO_API_KEY=""

# CoinGecko Pro API key (for higher rate limits)
COINGECKO_PRO_API_KEY=""
```

**Notes:**
* Free tier: 10-50 calls/minute
* Pro tier: 500 calls/minute
* API key optional but recommended

### DexScreener

```bash
# DexScreener API (no key required, but rate limited)
DEXSCREENER_API_URL="https://api.dexscreener.com/latest/dex"
```

**Notes:**
* Free, no authentication required
* Rate limit: ~300 requests/minute
* Consider caching responses

---

## 7. Payment Configuration

### Binance USDT Wallet

```bash
# Binance USDT wallet address (where users send payments)
BINANCE_USDT_WALLET_ADDRESS="TYourBinanceTRC20Address"

# Supported networks (comma-separated)
PAYMENT_NETWORKS="TRC20,BEP20,ERC20"

# Subscription prices in USDT
SUBSCRIPTION_PRICE_BASIC=19
SUBSCRIPTION_PRICE_PRO=49
SUBSCRIPTION_PRICE_PREMIUM=99
```

**Notes:**
* Use TRC20 address (lowest fees)
* Keep wallet address secure
* Consider using environment-specific addresses

---

## 8. File Storage Configuration

### AWS S3 (Recommended for Production)

```bash
# AWS S3 configuration
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="accumulation-uploads"
AWS_S3_ENDPOINT=""  # Leave empty for AWS, set for S3-compatible services
```

### Local Storage (Development)

```bash
# Local file storage path
UPLOAD_DIR="./uploads"

# Maximum file size (in bytes)
MAX_FILE_SIZE=5242880  # 5MB

# Allowed file types (comma-separated)
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp"
```

**Notes:**
* Use S3 or compatible service in production
* Set appropriate CORS policies
* Use signed URLs for secure access

---

## 9. Email Configuration

### SendGrid

```bash
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourapp.com"
SENDGRID_FROM_NAME="Accumulation Platform"
```

### Mailgun (Alternative)

```bash
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="mg.yourapp.com"
MAILGUN_FROM_EMAIL="noreply@yourapp.com"
```

**Notes:**
* Choose one email provider
* SendGrid free tier: 100 emails/day
* Mailgun free tier: 5,000 emails/month

---

## 10. Telegram Bot Configuration

```bash
# Telegram bot token (for alerts)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# Telegram bot username
TELEGRAM_BOT_USERNAME="@your_bot_username"

# Webhook URL (for production)
TELEGRAM_WEBHOOK_URL="https://yourapp.com/api/telegram/webhook"
```

**Notes:**
* Get token from @BotFather on Telegram
* Use webhooks in production for better performance
* Polling is fine for development

---

## 11. Monitoring & Observability

### Sentry (Error Tracking)

```bash
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT="development"  # development | staging | production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

### Prometheus (Metrics)

```bash
# Prometheus metrics endpoint
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

### Logging

```bash
# Log level
LOG_LEVEL="info"  # debug | info | warn | error

# Log format
LOG_FORMAT="json"  # json | text

# Log file path (optional)
LOG_FILE_PATH="./logs/app.log"
```

---

## 12. Rate Limiting

```bash
# API rate limiting
RATE_LIMIT_TTL=60  # Time window in seconds
RATE_LIMIT_MAX=100  # Max requests per window

# Per-user rate limiting
USER_RATE_LIMIT_TTL=60
USER_RATE_LIMIT_MAX=30
```

---

## 13. Security Configuration

```bash
# CORS origins (comma-separated)
CORS_ORIGINS="http://localhost:3001,https://yourapp.com"

# HTTPS enforcement (production only)
FORCE_HTTPS=true

# Session configuration
SESSION_SECRET="your-session-secret"
SESSION_MAX_AGE=86400000  # 24 hours in milliseconds

# Admin IP whitelist (optional, comma-separated)
ADMIN_IP_WHITELIST=""
```

---

## 14. Feature Flags

```bash
# Enable/disable features
FEATURE_TELEGRAM_ALERTS=true
FEATURE_EMAIL_ALERTS=true
FEATURE_WALLET_EXPLORER=true
FEATURE_SOLANA_SUPPORT=false  # Disabled initially
FEATURE_AUTO_PAYMENT_VERIFICATION=false  # Manual for now
```

---

## 15. Development-Only Variables

```bash
# Seed database on startup
SEED_DATABASE=false

# Skip authentication (development only)
SKIP_AUTH=false

# Mock provider responses (testing)
MOCK_PROVIDERS=false

# Debug mode
DEBUG="*"  # Enable all debug logs
```

---

## 16. Production Checklist

Before deploying to production, ensure:

- [ ] All secrets are strong and unique
- [ ] Database uses SSL connection
- [ ] Redis has password protection
- [ ] CORS origins are restricted
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured
- [ ] Error tracking (Sentry) is enabled
- [ ] Logging is configured
- [ ] File uploads use S3 (not local storage)
- [ ] Environment variables are stored in secrets manager (not in code)
- [ ] `.env` files are in `.gitignore`
- [ ] `.env.example` is committed (without real values)

---

## 17. Environment Variable Validation

Create a validation script to check all required variables are set:

```typescript
// scripts/validate-env.ts
const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'APP_SECRET',
  'JWT_SECRET',
  // ... etc
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

Run this script on application startup or in CI/CD.

---

## 18. Secrets Management (Production)

For production, consider using:

* **AWS Secrets Manager**
* **HashiCorp Vault**
* **Kubernetes Secrets**
* **Docker Secrets**
* **Environment-specific CI/CD secrets**

Never commit secrets to version control!

---

**End of environment_variables.md**

