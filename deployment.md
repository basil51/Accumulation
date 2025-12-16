# deployment.md — Deployment Guide

This document provides **complete deployment instructions** for the platform, including local development setup, staging, and production deployment.

---

## 1. Prerequisites

### Required Software

* **Node.js** 20.x or later
* **pnpm** 8.x or later (or npm/yarn)
* **Docker** 20.x or later (for local development)
* **Docker Compose** 2.x or later
* **PostgreSQL** 15+ (or use Docker)
* **Redis** 7+ (or use Docker)
* **Git**

### Required Accounts & Services

* **GitHub** - Version control
* **Vercel** (or similar) - Frontend hosting
* **Fly.io / Render / Railway** - Backend hosting
* **AWS S3** (or compatible) - File storage
* **Sentry** - Error tracking
* **SendGrid / Mailgun** - Email service

---

## 2. Local Development Setup

### 2.1 Clone Repository

```bash
git clone https://github.com/yourusername/accumulation.git
cd accumulation
```

### 2.2 Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your local values
nano .env
```

**Required local environment variables:**
* `DATABASE_URL` - Local PostgreSQL connection
* `REDIS_URL` - Local Redis connection
* `APP_SECRET` - Random secret (generate with `openssl rand -hex 32`)
* `JWT_SECRET` - Random secret
* Provider API keys (Alchemy, Covalent, etc.)

### 2.3 Docker Services (Optional)

Start PostgreSQL and Redis with Docker:

```bash
docker-compose up -d postgres redis
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: accumulation
      POSTGRES_PASSWORD: password
      POSTGRES_DB: accumulation_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2.4 Database Setup

```bash
# Install dependencies
cd backend
pnpm install

# Run Prisma migrations
pnpm prisma migrate dev

# (Optional) Seed database
pnpm prisma db seed
```

### 2.5 Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
pnpm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm install
pnpm run dev
```

**Terminal 3 - Workers (Optional):**
```bash
cd backend
pnpm run start:worker
```

**Access:**
* Frontend: http://localhost:4007
* Backend API: http://localhost:4007
* API Docs: http://localhost:4007/api/docs

---

## 3. Project Structure

```
accumulation/
├── backend/              # NestJS backend
│   ├── src/
│   ├── prisma/
│   ├── test/
│   └── package.json
├── frontend/           # Next.js frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── packages/          # Shared packages (optional)
│   └── types/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Staging Deployment

### 4.1 Backend Deployment (Fly.io Example)

**Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Login:**
```bash
fly auth login
```

**Initialize Fly app:**
```bash
cd backend
fly launch
```

**Configure:**
```bash
# Set environment variables
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set REDIS_URL="redis://..."
fly secrets set APP_SECRET="..."
# ... all other secrets
```

**Deploy:**
```bash
fly deploy
```

### 4.2 Frontend Deployment (Vercel)

**Install Vercel CLI:**
```bash
npm i -g vercel
```

**Deploy:**
```bash
cd frontend
vercel
```

**Set environment variables in Vercel dashboard:**
* `NEXT_PUBLIC_API_URL` - Backend API URL
* `NEXTAUTH_URL` - Frontend URL
* `NEXTAUTH_SECRET` - Secret

### 4.3 Database (Managed PostgreSQL)

**Options:**
* **Supabase** - Free tier available
* **Neon** - Serverless PostgreSQL
* **Railway** - Easy setup
* **AWS RDS** - Production-ready

**Migration:**
```bash
# Run migrations on staging database
DATABASE_URL="staging-db-url" pnpm prisma migrate deploy
```

### 4.4 Redis (Managed Redis)

**Options:**
* **Upstash** - Serverless Redis
* **Redis Cloud** - Managed Redis
* **AWS ElastiCache** - Production-ready

---

## 5. Production Deployment

### 5.1 Production Checklist

Before deploying to production:

- [ ] All environment variables set
- [ ] Database migrations tested
- [ ] SSL certificates configured
- [ ] Domain names configured
- [ ] Monitoring set up (Sentry, etc.)
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Error tracking enabled
- [ ] Logging configured

### 5.2 Backend Production Setup

**Fly.io Production Config (fly.toml):**
```toml
app = "accumulation-backend"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 3007
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3007

CMD ["node", "dist/main.js"]
```

### 5.3 Frontend Production Setup

**Vercel Configuration (vercel.json):**
```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.yourapp.com"
  }
}
```

### 5.4 Database Migrations (Production)

**Never run `prisma migrate dev` in production!**

Use `prisma migrate deploy`:

```bash
# In CI/CD pipeline or manually
DATABASE_URL="production-db-url" pnpm prisma migrate deploy
```

**Migration Strategy:**
1. Test migrations in staging
2. Backup production database
3. Run migrations during low-traffic window
4. Monitor for errors
5. Have rollback plan ready

### 5.5 Workers Deployment

Workers can run as separate Fly.io apps or on the same instance:

```bash
# Separate worker app
fly launch --name accumulation-worker
fly secrets set REDIS_URL="..."
fly deploy
```

Or use Fly.io processes:
```toml
[processes]
  app = "node dist/main.js"
  worker = "node dist/worker.js"

[[services]]
  processes = ["app"]
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm run test
      - run: pnpm run lint

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

### 6.2 Environment-Specific Deployments

**Staging:**
* Deploy on push to `develop` branch
* Use staging environment variables
* Staging database

**Production:**
* Deploy on push to `main` branch
* Use production environment variables
* Production database
* Require manual approval (optional)

---

## 7. Monitoring & Observability

### 7.1 Health Checks

**Backend Health Endpoint:**
```typescript
@Get('/health')
healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}
```

**Database Health:**
```typescript
@Get('/health/db')
async dbHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

### 7.2 Sentry Setup

```typescript
// backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 7.3 Logging

**Winston Configuration:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

---

## 8. Backup Strategy

### 8.1 Database Backups

**Automated Backups:**
* Use managed database service with automated backups
* Or set up cron job:

```bash
# Daily backup script
0 2 * * * pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Backup Retention:**
* Daily backups: 7 days
* Weekly backups: 4 weeks
* Monthly backups: 12 months

### 8.2 File Storage Backups

* S3 versioning enabled
* Cross-region replication (optional)
* Regular backup verification

---

## 9. Scaling Considerations

### 9.1 Horizontal Scaling

**Backend:**
* Multiple Fly.io instances behind load balancer
* Stateless application design
* Shared Redis for sessions/queues

**Workers:**
* Scale workers independently
* Use BullMQ concurrency settings
* Monitor queue depth

### 9.2 Database Scaling

* Read replicas for heavy read workloads
* Connection pooling (PgBouncer)
* Query optimization
* Index optimization

### 9.3 Caching Strategy

* Redis for hot data
* CDN for static assets
* API response caching
* Token metadata caching

---

## 10. Security Hardening

### 10.1 SSL/TLS

* Force HTTPS in production
* Use Let's Encrypt or managed certificates
* HSTS headers

### 10.2 Secrets Management

* Never commit secrets
* Use environment variables or secrets manager
* Rotate secrets regularly
* Use different secrets per environment

### 10.3 Network Security

* Firewall rules
* IP whitelisting for admin (optional)
* DDoS protection (Cloudflare)

---

## 11. Rollback Procedure

### 11.1 Application Rollback

**Fly.io:**
```bash
fly releases
fly releases rollback <release-id>
```

**Vercel:**
* Use Vercel dashboard to rollback to previous deployment

### 11.2 Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_20250115.sql

# Or revert migration
pnpm prisma migrate resolve --rolled-back <migration-name>
```

---

## 12. Troubleshooting

### 12.1 Common Issues

**Database Connection Errors:**
* Check DATABASE_URL
* Verify network connectivity
* Check firewall rules

**Redis Connection Errors:**
* Check REDIS_URL
* Verify Redis is running
* Check authentication

**API Rate Limiting:**
* Check provider API keys
* Verify rate limit settings
* Review API usage logs

### 12.2 Debug Mode

```bash
# Enable debug logging
DEBUG="*" pnpm run start:dev

# Check logs
fly logs
vercel logs
```

---

## 13. Maintenance Windows

### 13.1 Scheduled Maintenance

* Plan maintenance during low-traffic hours
* Notify users in advance
* Have rollback plan ready
* Monitor closely during maintenance

### 13.2 Zero-Downtime Deployments

* Use blue-green deployment
* Database migrations should be backward compatible
* Feature flags for gradual rollouts

---

**End of deployment.md**

