# Pending Tasks & Incomplete Steps

This document lists all tasks that are **not yet finished** or **pending implementation**.

Last Updated: 2025-12-07

---

## 🔴 High Priority (Core Features)

### 1. Event Ingestion Services (CRITICAL BLOCKER)
**Status:** ❌ Not Started  
**Priority:** 🔴 **HIGHEST** - Required for alerts and signals to work  
**Location:** `backend/src/integrations/`

**What's Missing:**
- [ ] Alchemy integration service (`alchemy.service.ts`) - Fetch ERC20 transfers
- [ ] Covalent integration service (`covalent.service.ts`) - Fetch multi-chain transfers
- [ ] TheGraph integration service (`thegraph.service.ts`) - Fetch DEX swap events
- [ ] DexScreener integration service (`dexscreener.service.ts`) - Fetch liquidity data
- [ ] Scheduled jobs/cron to poll providers every 15-60 seconds
- [ ] Event enrichment with USD prices (CoinGecko integration)
- [ ] Block tracking per coin (last processed block)

**Current State:**
- ✅ Event normalization pipeline exists
- ✅ Detection engine exists
- ✅ Signal creation logic exists
- ✅ Alert creation logic exists
- ✅ Frontend pages exist
- ❌ **NO active event ingestion** - events only come via webhooks (not automatic)

**Impact:**
- Signals page shows empty (no events → no signals)
- Alerts page shows empty (no signals → no alerts)
- Platform cannot function without this

**Reference:** `MISSING_STEPS_FOR_ALERTS_SIGNALS.md` (detailed implementation guide)

---

### 2. Payment Module - Binance USDT Integration
**Status:** ⏳ Not Started  
**Priority:** High  
**Location:** Moved from Sprint 9 to future sprint

**What's Missing:**
- [ ] Automatic payment verification (currently manual admin approval)
- [ ] Binance Pay API integration (optional - for automatic detection)
- [ ] Blockchain scanner integration (TronScan, BscScan, Etherscan APIs)
- [ ] Auto-renewal subscription system
- [ ] Payment webhook handling

**Current State:**
- ✅ Payment model exists in database
- ✅ Admin can manually approve/reject payments
- ✅ Users can upload payment proof (screenshot + txHash)
- ❌ No automatic verification

**Reference:** `payment_flow.md`

---

## 🟡 Medium Priority (Feature Enhancements)

### 2. Email & Telegram Notifications
**Status:** ⏳ Pending (Infrastructure Ready)  
**Priority:** Medium  
**Location:** Sprint 4 - Alerts & Notifications

**What's Missing:**
- [ ] Configure actual email service (SendGrid/Mailgun API keys)
- [ ] Configure Telegram Bot API
- [ ] Test email delivery
- [ ] Test Telegram message delivery

**Current State:**
- ✅ Notification service infrastructure exists
- ✅ Email notification service (placeholder)
- ✅ Telegram notification service (placeholder)
- ✅ Alert queue processor (BullMQ)
- ❌ No actual API keys configured

**Note:** Infrastructure is ready, just needs API keys and configuration.

---

### 3. RULE F - Exchange Outflow Detection
**Status:** ⏳ Pending  
**Priority:** Medium  
**Location:** Detection Engine

**What's Missing:**
- [ ] CEX (Centralized Exchange) address mapping infrastructure
- [ ] Exchange wallet address database
- [ ] Outflow detection rule implementation

**Current State:**
- ✅ All other detection rules implemented (A, B, C, D, E, G, H)
- ❌ RULE F requires exchange address mapping first

**Reference:** `detection_engine.md`

---

## 🟢 Low Priority (Future Enhancements)

### 4. Enhanced Admin Analytics
**Status:** ⏳ Future Enhancement  
**Priority:** Low

**What's Missing:**
- [ ] Charts and graphs for analytics dashboard
- [ ] Advanced reporting features
- [ ] Export functionality

**Current State:**
- ✅ Basic analytics dashboard exists
- ✅ Metrics cards (total users, subscriptions, payments, signals)
- ❌ No visual charts/graphs

---

### 5. Staging Deployment
**Status:** ⏳ Optional - Moved to Later Sprint  
**Priority:** Low

**What's Missing:**
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Fly.io/Render
- [ ] Verify deployment pipeline
- [ ] Environment configuration for staging

**Current State:**
- ✅ GitHub repository exists
- ✅ CI/CD pipeline (GitHub Actions) configured
- ✅ Production build verified
- ❌ No staging environment deployed

---

### 6. Onboarding Wizard Backend Integration
**Status:** ⏳ Enhancement  
**Priority:** Low

**What's Missing:**
- [ ] Track onboarding completion per user in database
- [ ] Backend endpoint to mark onboarding as complete
- [ ] User preference to show/hide onboarding

**Current State:**
- ✅ Onboarding wizard component exists
- ✅ Integrated into dashboard
- ✅ Uses localStorage for persistence
- ❌ No backend tracking

---

## 📋 Summary

### By Priority

**Highest Priority (CRITICAL BLOCKER):**
1. **Event Ingestion Services** - Required for alerts and signals to work

**High Priority:**
2. Payment Module - Binance USDT Integration

**Medium Priority:**
2. Email & Telegram Notifications (needs API keys)
3. RULE F - Exchange Outflow Detection

**Low Priority:**
4. Enhanced Admin Analytics (charts)
5. Staging Deployment
6. Onboarding Wizard Backend Integration

### By Status

**Not Started:**
- Payment Module automation
- RULE F implementation
- Staging deployment

**Infrastructure Ready (Needs Configuration):**
- Email notifications (needs SendGrid/Mailgun API key)
- Telegram notifications (needs Bot API key)

**Future Enhancements:**
- Enhanced admin analytics
- Onboarding backend integration

---

## 🎯 Recommended Next Steps

1. **Event Ingestion Services** - Implement Alchemy/Covalent/TheGraph integrations (CRITICAL - blocks core functionality)
2. **Payment Module** - Implement automatic payment verification
3. **Notifications** - Configure email and Telegram services
4. **RULE F** - Build CEX address mapping infrastructure

---

**Note:** All core sprints (1-9) are complete. The platform is production-ready for manual payment verification. These pending tasks are enhancements and automation features.

