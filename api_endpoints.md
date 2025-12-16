# api_endpoints.md — API Endpoints Documentation

This document defines **all REST API endpoints** for the platform. The API follows RESTful conventions and returns JSON responses.

**Base URL:** `https://api.yourapp.com/api` (production) or `http://localhost:3007/api` (development)

---

## 1. Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "id": "clx123...",
  "email": "user@example.com",
  "subscriptionLevel": "FREE",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Errors:**
* `400` - Invalid email or password
* `409` - Email already exists

---

### POST /api/auth/login

Authenticate user and return JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "clx123...",
    "email": "user@example.com",
    "subscriptionLevel": "PRO",
    "subscriptionExpiry": "2025-02-15T10:00:00Z"
  }
}
```

**Errors:**
* `401` - Invalid credentials

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### POST /api/auth/logout

Logout user (invalidate refresh token).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 2. User Endpoints

### GET /api/users/me

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "clx123...",
  "email": "user@example.com",
  "subscriptionLevel": "PRO",
  "subscriptionExpiry": "2025-02-15T10:00:00Z",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### PUT /api/users/me

Update current user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "id": "clx123...",
  "email": "newemail@example.com",
  ...
}
```

---

### PUT /api/users/me/password

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

---

## 3. Coins/Tokens Endpoints

### GET /api/coins

Get list of tracked coins.

**Query Parameters:**
* `chain` - Filter by chain (ETHEREUM, BSC, POLYGON, etc.)
* `search` - Search by name or symbol
* `page` - Page number (default: 1)
* `limit` - Items per page (default: 50, max: 100)
* `sort` - Sort field (name, symbol, priceUsd, liquidityUsd)
* `order` - Sort order (asc, desc)

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Ethereum",
      "symbol": "ETH",
      "contractAddress": "0x0000...",
      "chain": "ETHEREUM",
      "priceUsd": 2500.50,
      "liquidityUsd": 10000000,
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

---

### GET /api/coins/:id

Get coin details by ID.

**Response (200):**
```json
{
  "id": "clx123...",
  "name": "Ethereum",
  "symbol": "ETH",
  "contractAddress": "0x0000...",
  "chain": "ETHEREUM",
  "totalSupply": 120000000,
  "circulatingSupply": 118000000,
  "priceUsd": 2500.50,
  "liquidityUsd": 10000000,
  "marketSignals": [...],
  "accumulationSignals": [...],
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### GET /api/coins/trending

Get trending coins.

**Query Parameters:**
* `limit` - Number of coins (default: 10, max: 50)
* `timeframe` - Timeframe (1h, 24h, 7d)

**Response (200):**
```json
{
  "data": [
    {
      "coin": {...},
      "signalCount": 15,
      "volume24h": 5000000
    }
  ]
}
```

---

## 4. Signals Endpoints

### GET /api/signals

Get list of signals.

**Headers:** `Authorization: Bearer <token>` (required for paid tiers)

**Query Parameters:**
* `type` - Signal type (ACCUMULATION, WHALE, MARKET, DEX, LP)
* `coinId` - Filter by coin ID
* `minScore` - Minimum score
* `startDate` - Start date (ISO 8601)
* `endDate` - End date (ISO 8601)
* `page` - Page number
* `limit` - Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "type": "ACCUMULATION",
      "coin": {
        "id": "clx456...",
        "name": "Ethereum",
        "symbol": "ETH"
      },
      "score": 85,
      "amountUsd": 100000,
      "amountUnits": 40,
      "supplyPercentage": 0.05,
      "liquidityRatio": 1.2,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 500,
    "page": 1,
    "limit": 50
  }
}
```

---

### GET /api/signals/:id

Get signal details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "clx123...",
  "type": "ACCUMULATION",
  "coin": {...},
  "score": 85,
  "details": {
    "rules": [
      {
        "rule": "large_transfer",
        "score": 20,
        "evidence": {...}
      }
    ],
    "events": [
      {
        "txHash": "0xabc...",
        "amountUsd": 50000
      }
    ]
  },
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

## 5. Watchlist Endpoints

### GET /api/watchlist

Get user's watchlist.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "coin": {...},
      "thresholdUsd": 10000,
      "thresholdPercentage": 0.05,
      "notificationsEnabled": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/watchlist

Add coin to watchlist.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "coinId": "clx456...",
  "thresholdUsd": 10000,
  "thresholdPercentage": 0.05,
  "notificationsEnabled": true
}
```

**Response (201):**
```json
{
  "id": "clx123...",
  "coin": {...},
  "thresholdUsd": 10000,
  ...
}
```

**Errors:**
* `400` - Coin already in watchlist
* `403` - Watchlist limit reached (subscription tier limit)

---

### DELETE /api/watchlist/:id

Remove coin from watchlist.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Removed from watchlist"
}
```

---

## 6. Alerts Endpoints

### GET /api/alerts

Get user's alerts.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
* `unread` - Filter unread alerts (true/false)
* `page` - Page number
* `limit` - Items per page

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "signal": {...},
      "read": false,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "unread": 5
  }
}
```

---

### PUT /api/alerts/:id/read

Mark alert as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Alert marked as read"
}
```

---

### PUT /api/alerts/read-all

Mark all alerts as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "All alerts marked as read"
}
```

---

## 7. Payment Endpoints

### POST /api/payments/initiate

Initiate a payment (create pending payment).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan": "PRO",
  "network": "TRC20"
}
```

**Response (201):**
```json
{
  "id": "clx123...",
  "amountUsdt": 49,
  "network": "TRC20",
  "walletAddress": "TYourBinanceTRC20Address",
  "status": "PENDING",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

### POST /api/payments/:id/upload-proof

Upload payment proof (screenshot and tx hash).

**Headers:** `Authorization: Bearer <token>`

**Request Body (multipart/form-data):**
* `screenshot` - Image file (required)
* `txHash` - Transaction hash (optional)

**Response (200):**
```json
{
  "id": "clx123...",
  "status": "PENDING",
  "screenshotUrl": "https://...",
  "txHash": "0xabc...",
  "message": "Payment proof uploaded. Awaiting verification."
}
```

---

### GET /api/payments/my-payments

Get user's payment history.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "amountUsdt": 49,
      "network": "TRC20",
      "status": "CONFIRMED",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## 8. Settings Endpoints

### GET /api/settings

Get user settings.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "thresholds": {
    "overrideLargeTransferUsd": 10000,
    "overrideMinUnits": 50000,
    "overrideSupplyPct": 0.02,
    "useSystemDefaults": false
  },
  "alerts": {
    "emailEnabled": true,
    "telegramEnabled": false,
    "notificationsEnabled": true,
    "minSignalScore": 65,
    "cooldownMinutes": 30
  },
  "dashboard": {
    "darkMode": false,
    "rowsPerPage": 50,
    "timeWindow": "24h"
  }
}
```

---

### PUT /api/settings

Update user settings.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "thresholds": {
    "overrideLargeTransferUsd": 15000,
    "useSystemDefaults": false
  },
  "alerts": {
    "telegramEnabled": true,
    "telegramChatId": "123456789"
  }
}
```

**Response (200):**
```json
{
  "message": "Settings updated successfully",
  "settings": {...}
}
```

---

## 9. Wallet Explorer Endpoints

### GET /api/wallets/:address

Get wallet information.

**Headers:** `Authorization: Bearer <token>` (PRO/PREMIUM only)

**Query Parameters:**
* `chain` - Filter by chain

**Response (200):**
```json
{
  "address": "0xabc...",
  "chains": ["ETHEREUM", "BSC"],
  "tokens": [
    {
      "coin": {...},
      "balance": 1000,
      "valueUsd": 2500000
    }
  ],
  "transactions": [...],
  "accumulationSignals": [...]
}
```

---

## 10. Admin Endpoints

All admin endpoints require admin role.

### GET /api/admin/payments/pending

Get pending payments.

**Headers:** `Authorization: Bearer <admin-token>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "user": {
        "id": "clx456...",
        "email": "user@example.com"
      },
      "amountUsdt": 49,
      "network": "TRC20",
      "txHash": "0xabc...",
      "screenshotUrl": "https://...",
      "status": "PENDING",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/admin/payments/:id/approve

Approve payment.

**Headers:** `Authorization: Bearer <admin-token>`

**Response (200):**
```json
{
  "message": "Payment approved",
  "payment": {...},
  "user": {
    "subscriptionLevel": "PRO",
    "subscriptionExpiry": "2025-02-15T10:00:00Z"
  }
}
```

---

### POST /api/admin/payments/:id/reject

Reject payment.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "reason": "Incorrect amount"
}
```

**Response (200):**
```json
{
  "message": "Payment rejected",
  "payment": {...}
}
```

---

### GET /api/admin/users

Get all users.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
* `search` - Search by email
* `subscriptionLevel` - Filter by subscription
* `page` - Page number
* `limit` - Items per page

**Response (200):**
```json
{
  "data": [...],
  "meta": {...}
}
```

---

### GET /api/admin/settings/system

Get system settings.

**Headers:** `Authorization: Bearer <admin-token>`

**Response (200):**
```json
{
  "globalThresholds": {...},
  "ingestionSettings": {...},
  "providerSettings": {...},
  "alertingSettings": {...}
}
```

---

### PUT /api/admin/settings/system

Update system settings.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "globalThresholds": {
    "large_transfer_usd": 60000
  }
}
```

**Response (200):**
```json
{
  "message": "Settings updated",
  "settings": {...}
}
```

---

## 11. Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

**Common HTTP Status Codes:**
* `200` - Success
* `201` - Created
* `400` - Bad Request
* `401` - Unauthorized
* `403` - Forbidden (insufficient permissions)
* `404` - Not Found
* `409` - Conflict (e.g., duplicate email)
* `422` - Validation Error
* `429` - Too Many Requests (rate limited)
* `500` - Internal Server Error

---

## 12. Rate Limiting

* **Public endpoints**: 100 requests/minute per IP
* **Authenticated endpoints**: 30 requests/minute per user
* **Admin endpoints**: 60 requests/minute per admin

Rate limit headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642234567
```

---

## 13. Pagination

All list endpoints support pagination:

**Query Parameters:**
* `page` - Page number (default: 1)
* `limit` - Items per page (default: 50, max: 100)

**Response Meta:**
```json
{
  "meta": {
    "total": 500,
    "page": 1,
    "limit": 50,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 14. Filtering & Sorting

Most list endpoints support:

**Query Parameters:**
* `sort` - Field to sort by
* `order` - Sort order (`asc` or `desc`)
* Various filter parameters (endpoint-specific)

**Example:**
```
GET /api/coins?chain=ETHEREUM&sort=priceUsd&order=desc&page=1&limit=20
```

---

## 15. WebSocket Events (Future)

For real-time updates, WebSocket connections may be added:

```
ws://api.yourapp.com/ws
```

**Events:**
* `signal:new` - New signal created
* `alert:new` - New alert for user
* `payment:status` - Payment status update

---

**End of api_endpoints.md**

