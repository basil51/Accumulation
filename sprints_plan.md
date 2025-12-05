# sprints_plan.md — Full Development Roadmap (Version 1)

This file defines the complete sprint plan for the new crypto accumulation detection SaaS platform.

The plan is designed for **Cursor-first development**, fast iteration, and modular delivery.

---

# 🚀 Sprint 0 — Project Initialization (1–2 days)

### Goals

Set up the entire development environment, folder structure, CI/CD, and shared libraries.

### Tasks

* Initialize monorepo: `/frontend` (Next.js 15), `/backend` (NestJS), `/worker` (Python optional)
* Configure pnpm workspace
* Create shared folder `/packages/types` for DTOs & event models
* Setup Docker (Postgres, Redis)
* Initialize Prisma with base schema
* Setup `.env` templates
* Create GitHub repo + basic CI (lint, build)
* Deploy empty frontend & backend to staging (Vercel + Fly.io or Render)

### Deliverables

* Working dev environment
* Running local infrastructure
* Verified deployment pipeline

---

# 🟦 Sprint 1 — Core Backend Infrastructure (5–7 days)

### Goals

Build all backend fundamentals including auth, users, subscriptions, and integration foundation.

### Tasks

* Implement Auth module (email + password)
* Add JWT + refresh tokens
* Implement subscription system (Free, Basic, Pro, Premium)
* Implement USDT manual payment module (user uploads TX hash)
* Create Token module (CRUD)
* Create Watchlist module
* Create Settings module (user thresholds)
* Build Integrations framework (interfaces for Alchemy, Covalent, TheGraph, DexScreener)
* Implement Alchemy integration (transfers, logs)
* Implement Covalent integration (DEX swaps, LP events)

### Deliverables

* Backend API ready for frontend integration
* User auth + subscription logic complete
* First data ingestion from Alchemy & Covalent

---

# 🟩 Sprint 2 — Event Normalization + Storage Pipeline (4–6 days)

### Goals

Build robust ingestion pipeline that normalizes all incoming blockchain events.

### Tasks

* Create `NormalizedEvent` schema in DB
* Build normalization layer
* Build job queues:

  * `queue_ingest`
  * `queue_normalize`
  * `queue_detection`
* Setup BullMQ producers & consumers (Redis-based)
* Create provider-specific mappers:

  * Alchemy → NormalizedEvent
  * Covalent → NormalizedEvent
  * DexScreener → price/volume injection
* Implement deduplication + idempotency
* Store normalized events in DB

### Deliverables

* Fully working multi-provider event ingestion
* Unified normalized blockchain events

---

# 🟥 Sprint 3 — Detection Engine (5–10 days)

### Goals

Implement the core logic that identifies accumulation & market anomalies.

### Tasks

* Build rule engine
* Implement all rules:

  * Large Transfer USD
  * Units Threshold
  * Supply %
  * Liquidity Ratio
  * Whale Clusters
  * Exchange Outflow
  * DEX Spike
  * LP Additions
  * Price-volume confirmation
* Implement scoring model (0–100)
* Create candidate signals
* Create alert signals
* Implement deduplication + cooldown logic
* Save evidence breakdown in DB

### Deliverables

* Fully operational scoring engine
* Signals stored in DB and visible through API

---

# 🟪 Sprint 4 — Alerts & Notifications (3–5 days)

### Goals

Enable real-time alerts for users.

### Tasks

* Build Alerts module (DB + service)
* Implement notification channels:

  * Email
  * Telegram
* Build user alert preferences
* Add per-user throttling
* Add per-user cooldown windows
* Build `queue_alerts` worker

### Deliverables

* Alerts delivered to users in real time
* Clean UI-ready alert payloads

---

# 🟨 Sprint 5 — Frontend UI (5–8 days)

### Goals

Build all primary user interfaces.

### Tasks

* Authentication pages
* Dashboard displaying recent accumulation signals
* Token Explorer (token details + recent events)
* My Watchlist
* My Alerts
* Settings page
* Subscription page + USDT manual payment upload
* Admin panel: payment approvals + signal logs
* Responsive mobile layout

### Deliverables

* UI MVP for beta testers
* Fully integrated with backend API

---

# 🟧 Sprint 6 — Admin Panel & Payment System (3–5 days)

### Goals

Give the founder full admin control.

### Tasks

* Admin dashboard
* Approve/reject USDT payments
* View active plans & users
* View signals history
* System-level settings
* Provider usage dashboard
* Queue health dashboard

### Deliverables

* Full operational admin control panel

---

# 🟫 Sprint 7 — Optimization & Scaling (3–7 days)

### Goals

Stabilize the system for production launch.

### Tasks

* Add caching for hot endpoints
* Reduce DB load by compressing event evidence
* Add log rotation
* Improve ingestion rate limits
* Add error recovery logic for providers
* Add API request batching

### Deliverables

* Stable, efficient, scalable infrastructure

---

# 🟩 Sprint 8 — Beta Release (ongoing ~1 week)

### Goals

Prepare for test users.

### Tasks

* Invite 5–20 small testers
* Monitor false positives
* Tune thresholds
* Fix high-priority bugs
* Add token-specific tuning
* Improve UI usability

### Deliverables

* Beta-ready platform used by real traders

---

# 🟦 Sprint 9 — Production Launch (2–4 days)

### Goals

Release to public.

### Tasks

* Add landing page
* Add pricing page
* Improve documentation
* Add onboarding wizard
* Final performance profiling

### Deliverables

* Public-launch ready infrastructure
* Announce on social media and crypto groups

---

# Total Expected Timeline

**Estimated total: 30–40 development days** (solo founder pace).

---

# Priorities

If resources tighten, prioritize:

1. Detection Engine
2. Event Normalization
3. Basic UI + Alerts

Everything else is secondary.

---

End of `sprints_plan.md`.
