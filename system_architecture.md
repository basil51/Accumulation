# system_architecture.md — System Architecture for Crypto Accumulation & Market Intelligence Platform

**Purpose:** This document describes the high-level architecture, components, data flows, modules, and operational considerations required to implement the platform described in the project plan. It is written to be developer- and devops-friendly and can be used as the implementation blueprint for Cursor agents and engineers.

---

## 1. High-Level Overview

The platform is composed of three logical layers:

1. **Data Ingestion & Indexing (Workers & Integrations)**
2. **Backend API & Business Logic (NestJS)**
3. **Frontend (Next.js)**

Supporting services: PostgreSQL (Prisma), Redis + BullMQ (jobs), object storage for artifacts (S3-compatible), observability (Sentry + Prometheus/Grafana), and reverse proxy (Traefik).

```
External Providers  ->  Ingestion Workers  ->  Normalized Event Queue  ->  Detection Workers  ->  Database
                                                       |                                         |
                                                       v                                         v
                                                   Alert Dispatcher                             API / Frontend
```

---

## 2. Components & Responsibilities

### 2.1 Data Providers (external)

* **Alchemy** — primary EVM RPC & transfer/event fetching
* **Covalent** — multi-chain transfers, holders, historical queries
* **TheGraph** — DEX subgraphs (LP changes, swaps)
* **CoinGecko** — pricing & market metadata
* **DexScreener** — new pairs, liquidity snapshots

Each provider is encapsulated in its own integration module. Modules expose a unified `fetchEvents()` interface that returns normalized events.

### 2.2 Ingestion Layer (Workers)

* **Fetcher Scheduler**: Cron-based schedulers that trigger provider fetchers at configurable intervals (per-provider). Implemented as NestJS scheduled jobs or standalone worker processes.
* **Provider Fetchers**: Per-provider fetcher services (e.g., `AlchemyFetcher`, `CovalentFetcher`, `TheGraphFetcher`). They transform raw payloads into the unified event schema.
* **Event Normalizer**: Transform provider-specific payload into the canonical `Event` shape.
* **Event Queue**: Normalized events are pushed to Redis-backed BullMQ queues for downstream processing.

**Notes:** Fetchers must implement rate limit guards, retries with exponential backoff, and cost logging (ApiCostService).

### 2.3 Detection Engine (Workers)

* **Detection Worker**: Consumes normalized events and runs detection rules (accumulation, whale clusters, LP changes, DEX spikes). The rules produce `MarketSignals` and `AccumulationSignals` records.
* **Scoring Engine**: Rule weights and thresholds are configurable (stored in DB or config service). The scoring engine should be pluggable and unit-testable.
* **Deduplication**: Signals are deduplicated by signature (token + window + rule hash) to avoid repeated alerts.

### 2.4 Alert Dispatcher

* **Alert Queue**: Signals that pass alert thresholds push messages to `alert-dispatch` queue.
* **Channels**: Telegram, Email (SendGrid/Mailgun), Webhooks (enterprise), and in-app notification (UI). Currently payment activation uses manual verification.
* **Rate Limiting**: Global and per-user rate limiting to prevent spam.

### 2.5 Backend API (NestJS)

* Provides REST endpoints (OpenAPI) for:

  * Authentication & profiles
  * Tokens & coins
  * Signals & alerts
  * Watchlists
  * Wallet explorer
  * Payments management
* Auth: Auth.js integration for Next + Nest (JWT via httpOnly cookies or bearer tokens for API).

**Key modules:** `auth`, `users`, `tokens`, `transactions`, `signals`, `alerts`, `integrations`, `jobs`, `billing`, `admin`.

### 2.6 Frontend (Next.js)

* Pages described in project plan: dashboard, signals, coins list, coin detail, wallet explorer, settings, subscription, admin.
* Data fetching via server-side where appropriate and client-side real-time updates via lightweight WebSocket or polling.
* WebSockets: optional for live streaming to clients — can be implemented with a dedicated gateway service or via SSE.

### 2.7 Database & Storage

* **PostgreSQL**: primary relational DB via Prisma. Use JSONB for flexible fields.
* **Redis**: caches (token metadata, price snapshots), BullMQ queues.
* **Object Storage (S3-compatible)**: store uploaded screenshots and other artifacts (payment proofs).

---

## 3. Canonical Event Schema

All ingestion modules must convert provider data into a single canonical event object to simplify downstream logic.

```json
{
  "eventId": "uuid",
  "source": "alchemy|covalent|thegraph|dexscreener",
  "chain": "ethereum|bsc|polygon|solana",
  "type": "transfer|swap|lp_add|lp_remove|price_update",
  "txHash": "0x...",
  "timestamp": "2025-12-xxTxx:xx:xxZ",
  "token": {
    "contract": "0x...",
    "symbol": "ABC",
    "decimals": 18
  },
  "from": "0x...",
  "to": "0x...",
  "amount": "123.45",
  "amountUSD": "12345.67",
  "meta": { /* provider raw payload or parsed metadata */ }
}
```

Requirements:

* `amountUSD` must always be present (derive using CoinGecko price or cached price feed)
* Include provider `raw` payload under `meta.raw` for audits

---

## 4. Detection Rules (Summary)

Rules are implemented as composable functions. Example rules:

* **Large Transfer**: `amountUSD >= N` → candidate
* **SupplyShare**: `(amount / circulating_supply) >= P%` → candidate
* **LiquidityRatio**: `amountUSD / liquidityUSD >= R%` → candidate
* **WhaleCluster**: multiple large transfers to different wallets in window T
* **DEXSwapSpike**: swap volume in window > baseline * factor
* **LPChange**: detect LP add/remove events (via TheGraph)

Each rule returns `{score: number, reason: string, evidence: {...}}`.

A final signal score is a weighted sum. Configurable thresholds create `candidate` vs `alert` states.

---

## 5. Scaling & Operational Considerations

### 5.1 Horizontal Scaling

* Workers: multiple worker processes per queue (BullMQ concurrency). Auto-scale via container orchestrator.
* API: stateless NestJS instances behind Traefik / load balancer.
* Redis: single primary + replicas for performance if needed.
* Postgres: managed DB or primary + read replicas for heavy read workloads.

### 5.2 Cost Controls

* Cache provider responses (Redis) and only fetch detailed data for tokens in watchlists or trending tokens.
* Track API usage/costs per provider via `api_usage_log` table and cap accordingly.
* Adaptive sampling: reduce polling frequency for low-interest tokens.

### 5.3 Reliability

* Retries with exponential backoff and dead-letter queue for failed events.
* Circuit breaker for expensive providers (stop polling if errors or cost exceed limits).
* Backfill job to fetch historic data for a token on-demand.

### 5.4 Security

* Secrets in env variables or secrets manager
* HTTPS enforced via Traefik
* Rate limiting on API (per-user)
* Input validation (DTOs) in NestJS
* Proper RBAC for admin routes

### 5.5 Observability

* Structured logs (Winston) with correlation IDs
* Error reporting (Sentry)
* Metrics (Prometheus) + dashboards (Grafana)
* Health checks for each service

---

## 6. Deployment & CI/CD

* **CI:** GitHub Actions — lint, unit tests, build docker images
* **CD:** Deploy to VPS via docker-compose or to cloud (DigitalOcean App Platform, AWS ECS, or Kubernetes)
* **Images:** backend, frontend, worker images, test image
* **Migrations:** Prisma migrations executed in CI or during deploy

---

## 7. Operational Runbook (Short)

* Start services: `docker-compose up -d`
* Check DB migrations: `prisma migrate deploy`
* Seed provider API keys into vault
* Monitor: open Grafana + Sentry dashboard
* Payment flow: Admin verifies incoming USDT payments and mark subscriptions active

---

## 8. Next Steps for Implementation

1. Create `integrations/*` module skeletons (Alchemy, Covalent, TheGraph, DexScreener)
2. Implement the canonical event schema + normalizer
3. Build fetcher schedulers and push events to BullMQ
4. Implement detection worker with basic rules
5. Implement backend endpoints for Signals + Watchlists
6. Build minimal Next.js UI for Dashboard + Signals
7. Add USDT payment proof UI + admin approval flow

---

**End of system_architecture.md**
