# database_schema_v2.md — Database Schema (Prisma-Oriented)

This document defines the **V2 database schema** for the new project. It is fully optimized for Prisma, modularity, performance, and real-time analytics needs.

It follows the system architecture and supports:

* Multi-chain token tracking
* Whale & accumulation detection
* Market signals
* Wallet explorer
* USDT payment verification workflow
* Subscription tiers

All models are written in a way that can be directly implemented inside Prisma.

---

# 1. Users & Authentication

```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  password           String
  subscriptionLevel  SubscriptionLevel @default(FREE)
  subscriptionExpiry DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  payments           Payment[]
  watchlist          UserWatchlist[]
  settings           UserSettings?
  adminLogs         AdminLog[]  // if this user is an admin
}

enum SubscriptionLevel {
  FREE
  BASIC
  PRO
  PREMIUM
}
```

---

# 2. Payments (USDT-based)

```prisma
model Payment {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  amountUsdt    Float
  network       PaymentNetwork
  txHash        String?
  screenshotUrl String?
  status        PaymentStatus @default(PENDING)

  createdAt     DateTime @default(now())
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  REJECTED
}

enum PaymentNetwork {
  TRC20
  BEP20
  ERC20
}
```

---

# 3. Coins Table

Holds metadata for all active coins we track.

```prisma
model Coin {
  id                 String   @id @default(cuid())
  name               String
  symbol             String
  contractAddress    String
  chain              Chain

  totalSupply        Float?
  circulatingSupply  Float?
  priceUsd           Float?
  liquidityUsd       Float?

  updatedAt          DateTime @updatedAt

  marketSignals      MarketSignal[]
  accumulationSignals AccumulationSignal[]
  tokenSettings      TokenSettings?
  watchlist          UserWatchlist[]

  @@unique([contractAddress, chain])
  @@index([contractAddress, chain])
}

enum Chain {
  ETHEREUM
  BSC
  POLYGON
  ARBITRUM
  BASE
  AVALANCHE
  FANTOM
  SOLANA
}
```

---

# 4. Market Signals

Represents general market-driven alerts.

```prisma
model MarketSignal {
  id        String   @id @default(cuid())
  coinId    String
  coin      Coin     @relation(fields: [coinId], references: [id])

  signalType MarketSignalType
  score       Int
  details     Json

  createdAt   DateTime @default(now())

  @@index([coinId])
  @@index([createdAt])
  @@index([signalType])
}

enum MarketSignalType {
  VOLUME_SPIKE
  PRICE_ANOMALY
  TRENDING
  LIQUIDITY_CHANGE
  DEX_ACTIVITY
}
```

---

# 5. Whale Transactions

Tracks large movements from whales and smart money wallets.

```prisma
model WhaleTransaction {
  id        String   @id @default(cuid())

  wallet    String
  token     String  // token contract
  chain     Chain

  amount       Float
  amountUsd    Float
  txHash       String
  timestamp    DateTime

  createdAt   DateTime @default(now())

  @@index([wallet])
  @@index([token, chain])
  @@index([timestamp])
}
```

---

# 6. Accumulation Signals

Created when a rule detects meaningful accumulation.

```prisma
model AccumulationSignal {
  id         String   @id @default(cuid())
  coinId     String
  coin       Coin     @relation(fields: [coinId], references: [id])

  amountUnits     Float
  amountUsd       Float
  supplyPercentage Float?
  liquidityRatio   Float?

  score       Int
  createdAt   DateTime @default(now())

  @@index([coinId])
  @@index([createdAt])
  @@index([score])
}
```

---

# 7. User Watchlist

Allows user-specific tracking thresholds.

```prisma
model UserWatchlist {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  coinId       String
  coin         Coin     @relation(fields: [coinId], references: [id], onDelete: Cascade)

  thresholdUsd        Float?
  thresholdPercentage Float?

  notificationsEnabled Boolean @default(true)

  createdAt     DateTime @default(now())

  @@unique([userId, coinId])
  @@index([userId])
  @@index([coinId])
}
```

---

# 8. API Usage Log (Optional but recommended)

Helps monitor provider cost & reliability.

```prisma
model ApiUsageLog {
  id          String   @id @default(cuid())
  provider    String
  endpoint    String
  costUnits   Int?
  success     Boolean
  createdAt   DateTime @default(now())
  meta        Json?
}
```

---

# 9. Admin Notes & Audit Logs (Optional)

Useful for subscription verification.

```prisma
model AdminLog {
  id        String   @id @default(cuid())
  adminId   String
  user      User     @relation(fields: [adminId], references: [id])
  action    String
  meta      Json?
  createdAt DateTime @default(now())
}
```

---

# 10. System Settings

Stores global system-level configuration.

```prisma
model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json     // JSON value for flexibility
  updatedAt DateTime @updatedAt
  updatedBy String?  // admin user ID

  @@index([key])
}
```

---

# 11. User Settings

Stores user-specific preferences and threshold overrides.

```prisma
model UserSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Threshold overrides
  overrideLargeTransferUsd Float?
  overrideMinUnits         Float?
  overrideSupplyPct        Float?
  useSystemDefaults        Boolean @default(true)

  // Alert preferences
  emailEnabled             Boolean @default(true)
  telegramEnabled          Boolean @default(false)
  telegramChatId           String?
  notificationsEnabled     Boolean @default(true)
  minSignalScore           Int     @default(65)
  cooldownMinutes          Int     @default(30)

  // Dashboard preferences
  darkMode                 Boolean @default(false)
  rowsPerPage              Int     @default(50)
  timeWindow               String  @default("24h")

  // Watchlist preferences (chains to monitor)
  watchlistChains          String[] // ["eth", "bsc", "sol"]

  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([userId])
}
```

---

# 12. Token Settings

Stores token-specific threshold tuning (admin-configurable).

```prisma
model TokenSettings {
  id                    String   @id @default(cuid())
  coinId                String   @unique
  coin                  Coin     @relation(fields: [coinId], references: [id], onDelete: Cascade)

  minLargeTransferUsd   Float?
  minUnits              Float?
  supplyPctSpecial      Float?
  liquidityRatioSpecial Float?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([coinId])
}
```

---

# 13. Normalized Events (Optional but Recommended)

Stores normalized events for audit trail, backtesting, and debugging.

```prisma
model NormalizedEvent {
  id            String   @id @default(cuid())
  eventId       String   @unique // UUID from normalization
  provider      String   // 'alchemy' | 'covalent' | 'thegraph' | 'coingecko' | 'dexscreener'
  chain         Chain
  type          String   // 'transfer' | 'swap' | 'lp_add' | 'lp_remove' | 'price_update'

  txHash        String
  timestamp     DateTime

  tokenContract String
  tokenSymbol   String
  tokenDecimals Int

  fromAddress   String?
  toAddress     String?

  amount        Float
  amountUsd     Float

  rawData       Json     // Original provider payload

  createdAt     DateTime @default(now())

  @@index([tokenContract, chain])
  @@index([timestamp])
  @@index([txHash])
  @@index([provider, chain])
}
```

---

# 14. Additional Notes

### **1. PostgreSQL Recommended Types**

* Use `numeric` for on-chain amounts
* Use `jsonb` for flexible metadata fields

### **2. Indexes (Already Added in Models)**

All critical indexes are now included directly in the Prisma models using `@@index` directives:
* `Coin.contractAddress + chain` (unique constraint + index)
* `WhaleTransaction.wallet` (add if needed)
* `MarketSignal.coinId` (add if needed)
* `AccumulationSignal.coinId` (add if needed)
* `UserWatchlist.userId` (add if needed)
* `NormalizedEvent` (multiple indexes for performance)

### **3. Sharding Strategy (Future)**

If you grow to > 200M records:

* Move WhaleTransactions and MarketSignals to a time-series database
* Or partition PostgreSQL by month

---

# End of database_schema_v2.md
