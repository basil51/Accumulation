# Crypto Accumulation & Market Intelligence Platform

A SaaS platform for **real-time accumulation detection**, **whale tracking**, **smart money movement**, and **market intelligence** across all major blockchain networks.

## 🚀 Features

- **Accumulation Detection** - USD, Units, and Supply-based detection
- **Whale Tracking** - Large movements and smart money clusters
- **Real-time Market Signals** - Volume spikes, price anomalies, DEX activity
- **Multi-chain Support** - Ethereum, BSC, Polygon, Arbitrum, Base, Avalanche, Fantom, Solana
- **Wallet Explorer** - Track wallet portfolios and movements
- **Customizable Alerts** - Email and Telegram notifications

## 🛠️ Tech Stack

### Frontend
- Next.js 15
- TailwindCSS
- shadcn/ui

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- Redis + BullMQ

### Data Providers
- Alchemy - EVM transfers and events
- Covalent - Multi-chain data
- TheGraph - DEX and LP events
- CoinGecko - Prices and market data
- DexScreener - Real-time DEX data

## 📁 Project Structure

```
accumulation/
├── frontend/          # Next.js frontend application
├── backend/          # NestJS backend API
├── packages/          # Shared packages
│   └── types/         # Shared TypeScript types
├── docker-compose.yml # Local development infrastructure
└── docs/             # Documentation (markdown files)
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accumulation
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   
   **Note:** This project uses `pnpm` as the package manager. Make sure you have pnpm installed:
   ```bash
   npm install -g pnpm
   # or
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

3. **Start Docker services (PostgreSQL & Redis)**
   ```bash
   pnpm docker:up
   # or
   docker-compose up -d
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:4000
   - Backend API: http://localhost:3001/api

## 📚 Documentation

All project documentation is in the root directory:

### Core Planning
- **[status.md](./status.md)** - Daily progress tracker (START HERE)
- **[RoadMap.md](./RoadMap.md)** - Project overview and goals
- **[sprints_plan.md](./sprints_plan.md)** - Development roadmap

### Architecture & Design
- **[system_architecture.md](./system_architecture.md)** - System architecture
- **[database_schema.md](./database_schema.md)** - Database schema
- **[api_endpoints.md](./api_endpoints.md)** - API documentation
- **[detection_engine.md](./detection_engine.md)** - Detection rules and scoring

### User Guides
- **[USER_ONBOARDING.md](./USER_ONBOARDING.md)** - User onboarding guide
- **[BETA_TESTING_GUIDE.md](./BETA_TESTING_GUIDE.md)** - Beta testing guide
- **[THRESHOLD_TUNING_GUIDE.md](./THRESHOLD_TUNING_GUIDE.md)** - Threshold tuning guide

### Technical Guides
- **[environment_variables.md](./environment_variables.md)** - Environment variables
- **[deployment.md](./deployment.md)** - Deployment instructions
- **[testing_strategy.md](./testing_strategy.md)** - Testing approach
- **[error_handling.md](./error_handling.md)** - Error handling
- **[security.md](./security.md)** - Security practices

See [status.md](./status.md) for complete documentation index.

## 🔐 Environment Variables

See [environment_variables.md](./environment_variables.md) for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- Provider API keys (Alchemy, Covalent, CoinGecko, etc.)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

## 🚢 Deployment

See [deployment.md](./deployment.md) for detailed deployment instructions.

## 📝 License

Private project - All rights reserved

## 👥 Contributing

This is a private project. For questions or issues, contact the project maintainer.

---

## 🎯 Current Status

**Sprint 8:** ✅ Complete - Beta Release preparation  
**Sprint 9:** 🟡 In Progress - Production Launch

### Completed Features
- ✅ Authentication & User Management
- ✅ Subscription System (Free, Basic, Pro, Premium)
- ✅ Signal Detection Engine (9+ detection rules)
- ✅ Multi-chain Support (Ethereum, Polygon, Arbitrum, Base, BSC, Avalanche, Fantom)
- ✅ Watchlist & Alerts
- ✅ Admin Panel (User management, payment approval, system settings)
- ✅ Token-Specific Tuning
- ✅ False Positive Monitoring & Analytics
- ✅ Threshold Tuning Infrastructure
- ✅ Feedback Collection System
- ✅ Landing Page & Pricing Page

### In Progress
- 🟡 Onboarding Wizard
- 🟡 Documentation Improvements
- 🟡 Performance Optimization

### Prisma 
   cd /home/basel/Projects/Accumulation/backend && npx prisma studio
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Prisma Studio is up on http://localhost:5555

**Last Updated:** 2025-12-07

Recommended next files:

api_endpoints.md

queue_flow.md

providers_cost_analysis.md

token_metadata.md

frontend_structure.md

alerts_flow.md