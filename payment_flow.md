# payment_flow.md — USDT Payment Flow & Billing Architecture

This document defines the **end-to-end USDT payment flow**, the admin workflow, data validation rules, backend endpoints, and UI requirements for activating user subscriptions using **USDT transfers to Binance**.

This is a production-ready specification intended for implementation in NestJS + Next.js.

---

# 1. Overview

The platform uses **USDT only** as the payment method. Users transfer USDT to the platform’s Binance wallet address and upload a proof of payment. An admin verifies the payment and activates the subscription.

Supported networks:

* **TRC20** (recommended – extremely low fees)
* **BEP20** (low fees)
* **ERC20** (optional, high fees)

---

# 2. Payment Steps (User-Facing)

The USDT payment process consists of **4 user steps**:

### **Step 1 — Choose a Subscription Plan**

User selects: Basic ($19), Pro ($49), or Premium ($99) — paid in USDT.

### **Step 2 — Display Payment Instructions**

The page shows:

* Binance USDT wallet address (static)
* QR code
* Supported networks
* Payment amount
* “Important Notes” section:

  * Send exact amount
  * Ensure correct network
  * Include screenshot of successful transfer

### **Step 3 — Upload Payment Proof**

User fills the payment form:

* Chosen network (TRC20 / BEP20 / ERC20)
* Transaction hash (optional but encouraged)
* Screenshot (required)

### **Step 4 — Pending Verification Page**

User is taken to:

```
Your payment is currently pending.
We will verify it within 12 hours.
```

A timer counts down the expected verification window.

---

# 3. Admin Flow

### **Admin Portal Features**

Admins can:

* View all pending payments
* Click any payment to view full details
* See screenshot in large size
* Compare amount vs plan amount
* Approve or reject

### **Admin Actions**

1. **Approve** → subscription becomes active immediately
2. **Reject** → user notified (email + in-app)

### **Audit Log (Optional)**

Every admin action creates an entry in `AdminLog`.

---

# 4. Backend Architecture

## **4.1 Payment Table (from database_schema_v2.md)**

Payments are saved with `status = PENDING` initially.

```ts
status: PENDING | CONFIRMED | REJECTED
```

---

## **4.2 API Endpoints**

### **POST /api/payments/initiate**

Creates a pending payment.

**Body:**

```json
{
  "plan": "PRO",
  "network": "TRC20"
}
```

**Response:**

* Returns payment ID and Binance wallet address

---

### **POST /api/payments/upload-proof**

Uploads screenshot + tx hash.

**Body:**

* paymentId
* txHash (optional)
* screenshot file

Uploaded screenshot stored in S3 or local storage.

---

### **GET /api/payments/my-payments**

List of user payment attempts.

---

### **Admin Endpoints**

#### **GET /api/admin/payments/pending**

Returns pending payments.

#### **POST /api/admin/payments/approve**

**Body:**

```json
{
  "paymentId": "..."
}
```

Action:

* Updates subscription level
* Sets expiry to `now() + 30 days`
* Updates payment status to CONFIRMED

#### **POST /api/admin/payments/reject**

Sets status → REJECTED

---

# 5. Subscription Activation Logic

When admin approves payment:

```
user.subscriptionLevel = planSelected
user.subscriptionExpiry = now() + 30 days
payment.status = CONFIRMED
```

Tasks triggered:

* Send confirmation email (optional)
* In-app notification
* Analytics update

---

# 6. UI Requirements

## **6.1 User Payment Page**

Shows:

* USDT address
* QR code
* Supported networks
* Total amount
* Form to upload screenshot

---

## **6.2 Pending Page**

Shows:

* "Payment Pending"
* Payment details
* Countdown to verification

---

## **6.3 Admin Panel**

Table columns:

* User email
* Plan
* Amount
* Network
* Screenshot
* TxHash
* Approve / Reject buttons

Screenshot viewer supports fullscreen preview.

---

# 7. Security Considerations

* All file uploads validated for type & size
* Rate limit payment creation endpoint
* Admin routes protected by RBAC
* Store Binance wallet address in server environment variables
* Ensure screenshot URLs are non-public

---

# 8. Future Automation Roadmap

Future features (not included in v1):

### **1. Binance Pay API Integration**

Automatic USDT detection + payment confirmation.

### **2. Blockchain Scanner**

Verify txHash automatically by scanning:

* TronScan API
* BscScan API
* Etherscan API

### **3. Auto-renew Subscription**

Using smart contract or wallet signatures.

---

# End of payment_flow.md
