# Docker Setup Notes

## Issue Encountered

There was a docker-compose compatibility issue when trying to start services. The ports have been configured to avoid conflicts:

- **PostgreSQL**: Port `5435` (mapped from container port 5432)
- **Redis**: Port `6381` (mapped from container port 6379)

## Manual Setup Options

### Option 1: Fix Docker Compose (Recommended)

Try using `docker compose` (v2) instead of `docker-compose`:

```bash
docker compose up -d
```

### Option 2: Use Existing Services

If you have PostgreSQL and Redis already running, update `.env` to use those connection strings instead.

### Option 3: Manual Container Creation

```bash
# PostgreSQL
docker run -d \
  --name accumulation-postgres \
  -e POSTGRES_USER=accumulation \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=accumulation_db \
  -p 5435:5432 \
  postgres:15-alpine

# Redis
docker run -d \
  --name accumulation-redis \
  -p 6381:6379 \
  redis:7-alpine
```

## Verify Services

Once services are running:

```bash
# Check PostgreSQL
psql postgresql://accumulation:password@localhost:5435/accumulation_db -c "SELECT 1;"

# Check Redis
redis-cli -p 6381 ping
```

## Run Migrations

After services are running:

```bash
cd backend
pnpm prisma migrate dev --name init
```

