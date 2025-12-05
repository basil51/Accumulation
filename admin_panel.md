# admin_panel.md — Admin Panel Features & Workflows

This document defines the **complete admin panel functionality** for managing the platform, users, payments, signals, and system configuration.

---

## 1. Overview

The admin panel is a protected area accessible only to users with admin privileges. It provides comprehensive control over:

* Payment verification and subscription management
* User management
* System settings and thresholds
* Signal review and false positive marking
* Provider usage monitoring
* Analytics and reporting

---

## 2. Admin Authentication & Access Control

### 2.1 Admin User Model

Admins are regular `User` records with a special flag or role. Options:

**Option A: Role-based (Recommended)**
```prisma
model User {
  // ... existing fields
  role UserRole @default(USER)
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}
```

**Option B: Admin Table**
```prisma
model Admin {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
  level  AdminLevel @default(ADMIN)
}

enum AdminLevel {
  ADMIN
  SUPER_ADMIN
}
```

### 2.2 Access Control

* All admin routes protected by `@Roles('admin')` guard
* JWT token must include admin role
* Session timeout: 8 hours
* IP whitelist (optional, for production)

---

## 3. Dashboard Overview

### 3.1 Key Metrics Cards

* **Total Users**: Active users count
* **Active Subscriptions**: Breakdown by tier (Free, Basic, Pro, Premium)
* **Pending Payments**: Count of unverified payments
* **Signals Today**: Total signals generated in last 24h
* **Provider Health**: Status of all integrations (Alchemy, Covalent, etc.)
* **API Usage**: Total API calls today, cost estimates

### 3.2 Charts & Graphs

* User growth over time
* Subscription revenue (estimated from USDT payments)
* Signal volume by type (accumulation, whale, DEX, etc.)
* Top tokens by signal count
* Provider usage breakdown
* False positive rate (if feedback system implemented)

---

## 4. Payment Management

### 4.1 Pending Payments View

**Table Columns:**
* User email
* Subscription plan (Basic/Pro/Premium)
* Amount (USDT)
* Network (TRC20/BEP20/ERC20)
* Transaction hash (if provided)
* Screenshot thumbnail
* Submitted date
* Actions (Approve / Reject / View Details)

### 4.2 Payment Detail View

When clicking a payment, show:

* Full user profile
* Payment screenshot (full size, zoomable)
* Transaction hash (with blockchain explorer links)
* Amount comparison (expected vs submitted)
* Payment history for this user
* Admin notes field

### 4.3 Payment Actions

#### Approve Payment

**Workflow:**
1. Admin reviews screenshot and transaction hash
2. Clicks "Approve"
3. System:
   * Updates `user.subscriptionLevel` to selected plan
   * Sets `user.subscriptionExpiry` to `now() + 30 days`
   * Updates `payment.status` to `CONFIRMED`
   * Creates `AdminLog` entry
   * Sends confirmation email to user (optional)
   * Triggers in-app notification

#### Reject Payment

**Workflow:**
1. Admin clicks "Reject"
2. Optional: Add rejection reason
3. System:
   * Updates `payment.status` to `REJECTED`
   * Creates `AdminLog` entry
   * Sends rejection email to user with reason
   * Triggers in-app notification

### 4.4 Payment History

View all payments (pending, confirmed, rejected) with filters:
* Status filter
* Date range
* User search
* Plan filter

---

## 5. User Management

### 5.1 Users List

**Table Columns:**
* Email
* Subscription level
* Subscription expiry
* Created date
* Last login
* Actions (View / Edit / Suspend / Delete)

### 5.2 User Detail View

* Full profile information
* Subscription history
* Payment history
* Watchlist tokens
* Alert preferences
* Activity log (signals viewed, alerts received)

### 5.3 User Actions

* **Edit Subscription**: Manually upgrade/downgrade or extend expiry
* **Suspend Account**: Temporarily disable access
* **Delete Account**: Permanently remove (GDPR compliance)
* **Reset Password**: Send password reset email
* **View Activity**: See user's platform usage

---

## 6. System Settings Management

### 6.1 Global Thresholds

Editable form with all thresholds from `settings.md`:

* Large transfer USD threshold
* Unit threshold default
* Supply percentage threshold
* Liquidity ratio threshold
* Exchange outflow threshold
* Swap spike factor
* LP add threshold
* Candidate signal threshold
* Alert signal threshold

**Features:**
* Real-time validation
* Preview impact (how many signals would be affected)
* Save with confirmation
* Audit log entry

### 6.2 Provider Settings

Configure each provider:

* Enable/disable toggle
* Supported chains
* Rate limits (max calls per minute)
* API key management (masked display, update option)
* Health status indicator

### 6.3 Ingestion Settings

* Polling interval (seconds)
* Max blocks per cycle
* Max events per token per cycle
* Historical sync settings

### 6.4 Alerting Settings

* Max alerts per user per hour
* Global alert cooldown
* Telegram/Email enable toggles

### 6.5 Auto-Tuning Settings

* Enable/disable auto-tuning
* High cap USD threshold
* Threshold multipliers

---

## 7. Token Management

### 7.1 Token List

View all tracked tokens with:
* Name, symbol, contract address
* Chain
* Current price
* Market cap
* Liquidity
* Signal count (last 24h)
* Token-specific settings link

### 7.2 Token Settings

For each token, admins can set:
* Custom large transfer USD threshold
* Custom unit threshold
* Custom supply percentage
* Custom liquidity ratio

**Use Cases:**
* BTC needs very high USD threshold
* Meme coins need unit-based thresholds
* Low-liquidity tokens need careful tuning

### 7.3 Token Actions

* **Add Token**: Manually add a new token to track
* **Update Metadata**: Refresh price, supply, liquidity
* **Disable Tracking**: Stop ingesting events for this token
* **View Signals**: See all signals for this token

---

## 8. Signal Review & Quality Control

### 8.1 Signal List

View all generated signals with:
* Token name
* Signal type (Accumulation, Whale, Market, etc.)
* Score
* Amount USD
* Timestamp
* Status (New / Reviewed / Marked False Positive)

### 8.2 Signal Detail View

* Full signal details (score breakdown, evidence)
* Related transactions (tx hashes with explorer links)
* Token information
* Historical context (similar signals)

### 8.3 False Positive Marking

**Workflow:**
1. Admin reviews signal
2. If false positive, clicks "Mark as False Positive"
3. Optional: Add reason/notes
4. System:
   * Marks signal in DB (add `isFalsePositive` flag)
   * Logs feedback for ML training (future)
   * Adjusts thresholds if pattern detected

### 8.4 Signal Analytics

* False positive rate by rule
* Top performing rules
* Signals by token
* Time-to-detect metrics

---

## 9. Provider Usage Monitoring

### 9.1 Usage Dashboard

**Metrics per Provider:**
* Total API calls (today, week, month)
* Success rate
* Average response time
* Cost estimates (if available)
* Rate limit status
* Error breakdown

### 9.2 Usage Logs

Table of recent API calls:
* Provider
* Endpoint
* Timestamp
* Success/Failure
* Response time
* Cost units (if available)
* Error message (if failed)

**Filters:**
* Provider
* Date range
* Success/Failure
* Endpoint

### 9.3 Cost Tracking

* Daily cost per provider
* Monthly projections
* Cost alerts (if exceeding budget)

---

## 10. Queue & Worker Health

### 10.1 Queue Status

Monitor BullMQ queues:
* `queue_normalized_events` - pending, processing, completed, failed
* `queue_detection` - pending, processing, completed, failed
* `queue_alerts` - pending, processing, completed, failed
* `queue_prices` - pending, processing, completed, failed

### 10.2 Worker Health

* Active workers count
* Processing rate (events/sec)
* Error rate
* Average processing time

### 10.3 Queue Actions

* **Retry Failed Jobs**: Manually retry failed queue items
* **Clear Queue**: Clear stuck or old jobs
* **View Job Details**: Inspect individual job payloads

---

## 11. Analytics & Reporting

### 11.1 User Analytics

* User growth chart
* Subscription conversion rate
* Churn rate
* Active users (DAU, MAU)
* User engagement metrics

### 11.2 Signal Analytics

* Signal volume trends
* Signal accuracy (if feedback system)
* Top tokens by signal count
* Signal distribution by type
* Average time-to-detect

### 11.3 Revenue Analytics

* Estimated monthly revenue (from USDT payments)
* Subscription tier distribution
* Payment approval rate
* Average subscription duration

### 11.4 Export Reports

* Generate CSV/PDF reports
* Scheduled email reports (daily/weekly/monthly)
* Custom date ranges

---

## 12. Audit Logs

### 12.1 Admin Actions Log

All admin actions are logged in `AdminLog` table:

* Admin user
* Action type (e.g., "APPROVE_PAYMENT", "UPDATE_SETTINGS", "MARK_FALSE_POSITIVE")
* Target entity (payment ID, user ID, etc.)
* Metadata (JSON)
* Timestamp

### 12.2 Audit Log View

Table showing all admin actions with:
* Admin email
* Action
* Target
* Timestamp
* View details

**Filters:**
* Admin user
* Action type
* Date range

---

## 13. Security Features

### 13.1 Admin Session Management

* View active admin sessions
* Force logout
* Session timeout warnings

### 13.2 IP Whitelist (Optional)

* Configure allowed IP addresses for admin access
* Useful for production security

### 13.3 Two-Factor Authentication (Future)

* Enable 2FA for admin accounts
* TOTP-based authentication

---

## 14. API Endpoints (Admin)

### 14.1 Payment Endpoints

```
GET    /api/admin/payments/pending
GET    /api/admin/payments/:id
POST   /api/admin/payments/:id/approve
POST   /api/admin/payments/:id/reject
GET    /api/admin/payments/history
```

### 14.2 User Endpoints

```
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
POST   /api/admin/users/:id/suspend
DELETE /api/admin/users/:id
```

### 14.3 Settings Endpoints

```
GET    /api/admin/settings/system
PUT    /api/admin/settings/system
GET    /api/admin/settings/providers
PUT    /api/admin/settings/providers/:provider
```

### 14.4 Signal Endpoints

```
GET    /api/admin/signals
GET    /api/admin/signals/:id
POST   /api/admin/signals/:id/mark-false-positive
```

### 14.5 Analytics Endpoints

```
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/users
GET    /api/admin/analytics/signals
GET    /api/admin/analytics/revenue
```

---

## 15. UI Components

### 15.1 Admin Layout

* Sidebar navigation
* Top bar with admin user info and logout
* Breadcrumb navigation
* Notification center (pending payments count, alerts)

### 15.2 Data Tables

* Sortable columns
* Pagination
* Search/filter
* Bulk actions (where applicable)
* Export to CSV

### 15.3 Forms

* Validation
* Confirmation dialogs for destructive actions
* Success/error notifications
* Loading states

---

## 16. Future Enhancements

* **Automated Payment Verification**: Integrate blockchain scanners to auto-verify USDT payments
* **ML-Based False Positive Detection**: Use historical feedback to improve signal quality
* **Advanced Analytics**: Custom dashboards, cohort analysis
* **Bulk Operations**: Bulk approve payments, bulk user actions
* **Webhook Integration**: Notify external systems of admin actions
* **Role-Based Permissions**: Different admin levels with different permissions

---

**End of admin_panel.md**
