# Stripe Connect Complete Flow - End-to-End Guide

**Date:** December 11, 2025
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 Overview

This document provides a comprehensive, end-to-end guide to SoundBridge's Stripe Connect integration, covering the entire creator journey from account setup through earning revenue and withdrawing funds.

---

## 📋 Table of Contents

1. [User Journey Overview](#user-journey-overview)
2. [Phase 1: Initial Setup (Deferred Onboarding)](#phase-1-initial-setup-deferred-onboarding)
3. [Phase 2: Earning Revenue](#phase-2-earning-revenue)
4. [Phase 3: Account Verification](#phase-3-account-verification)
5. [Phase 4: Requesting Payouts](#phase-4-requesting-payouts)
6. [Phase 5: Receiving Funds](#phase-5-receiving-funds)
7. [Technical Architecture](#technical-architecture)
8. [Database Flow](#database-flow)
9. [API Endpoints](#api-endpoints)
10. [Webhook Processing](#webhook-processing)
11. [Error Handling](#error-handling)
12. [Security & Compliance](#security--compliance)

---

## 🗺️ User Journey Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CREATOR REVENUE JOURNEY                       │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: SETUP (< 5 seconds)
┌──────────────────────────┐
│ Click "Setup Stripe"     │
│ ↓                        │
│ Account Created          │
│ ↓                        │
│ Status: Pending          │
└──────────────────────────┘

PHASE 2: EARNING (Weeks/Months)
┌──────────────────────────┐
│ Receive Tips             │
│ ↓                        │
│ Sell Event Tickets       │
│ ↓                        │
│ Balance Accumulates      │
└──────────────────────────┘

PHASE 3: VERIFICATION (5-15 minutes)
┌──────────────────────────┐
│ Balance ≥ $25            │
│ ↓                        │
│ Click "Verify Account"   │
│ ↓                        │
│ Complete Stripe Flow     │
│ ↓                        │
│ Status: Verified         │
└──────────────────────────┘

PHASE 4: PAYOUT REQUEST (< 1 minute)
┌──────────────────────────┐
│ Enter Amount             │
│ ↓                        │
│ Submit Request           │
│ ↓                        │
│ Status: Pending          │
└──────────────────────────┘

PHASE 5: RECEIVE FUNDS (2-7 days)
┌──────────────────────────┐
│ Stripe Processes         │
│ ↓                        │
│ Funds Transfer           │
│ ↓                        │
│ Money in Bank Account    │
└──────────────────────────┘
```

---

## Phase 1: Initial Setup (Deferred Onboarding)

### User Experience

**Location:** Dashboard → Revenue Tab → Bank Account Section

**User Actions:**
1. User clicks **"Complete Stripe Connect Setup"**
2. System creates Stripe Express account instantly
3. User sees success message
4. Page reloads with status "Pending Verification"

**Time Required:** < 5 seconds

### Technical Flow

```typescript
// 1. User clicks button
<button onClick={handleSetupStripeConnect}>
  Complete Stripe Connect Setup
</button>

// 2. Frontend sends request
const handleSetupStripeConnect = async () => {
  const response = await fetch('/api/stripe/connect/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      country: 'US',
      setupMode: 'deferred' // INSTANT SETUP
    }),
  });

  const result = await response.json();

  if (result.skipOnboarding) {
    // Success! No onboarding needed
    setSuccess(result.message);
    setTimeout(() => window.location.reload(), 2000);
  }
};

// 3. Backend creates Stripe account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: user.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// 4. Save to database
await supabase
  .from('creator_bank_accounts')
  .insert({
    user_id: user.id,
    stripe_account_id: account.id,
    verification_status: 'pending',
    is_verified: false,
    bank_name: 'Stripe Connect',
    currency: 'USD'
  });

// 5. Return success (no onboarding URL)
return NextResponse.json({
  success: true,
  accountId: account.id,
  message: 'Account created! You can start earning immediately.',
  skipOnboarding: true
});
```

### Database State After Setup

**Table: `creator_bank_accounts`**
```sql
user_id: 'uuid-123'
stripe_account_id: 'acct_1234567890'
verification_status: 'pending'
is_verified: false
bank_name: 'Stripe Connect'
currency: 'USD'
created_at: '2025-12-11T10:00:00Z'
```

**Table: `creator_revenue`**
```sql
user_id: 'uuid-123'
total_earned: 0.00
total_paid_out: 0.00
pending_balance: 0.00
payout_threshold: 50.00
```

### UI State

```
┌─────────────────────────────────────────┐
│ 💳 Bank Account                         │
├─────────────────────────────────────────┤
│ ✅ Stripe Connect: Connected            │
│ Status: Pending Verification            │
│                                         │
│ 📋 Complete Verification to Withdraw    │
│ You can start earning immediately!      │
│ Complete verification now to withdraw   │
│ funds anytime.                          │
│                                         │
│ [🛡️ Complete Verification Now]         │
└─────────────────────────────────────────┘
```

---

## Phase 2: Earning Revenue

### Revenue Sources

#### 1. Tips
**Flow:**
```
User Profile → Tip Button → Stripe Checkout → Webhook → Revenue Update
```

**API:** `POST /api/tips/create`

**Revenue Update:**
```typescript
// When tip payment succeeds (webhook: checkout.session.completed)
await supabase
  .from('creator_revenue')
  .update({
    total_earned: total_earned + tip_amount,
    pending_balance: pending_balance + tip_amount,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', creator_id);
```

#### 2. Event Tickets
**Flow:**
```
Event Page → Buy Ticket → Payment → Webhook → Revenue Update
```

**API:** `POST /api/events/tickets/purchase`

**Revenue Split:**
- Platform fee: 5% (configurable)
- Creator earnings: 95%

#### 3. Service Provider Bookings
**Flow:**
```
Service Listing → Book Service → Payment → Webhook → Revenue Update
```

**API:** `POST /api/service-provider/bookings/create`

### Revenue Tracking

**Real-time Balance Updates:**
```typescript
// Every successful payment triggers:
await supabase
  .from('creator_revenue')
  .update({
    total_earned: supabase.raw(`total_earned + ${amount}`),
    pending_balance: supabase.raw(`pending_balance + ${amount}`),
    updated_at: new Date().toISOString()
  })
  .eq('user_id', user_id);
```

### UI During Earning Phase

```
┌─────────────────────────────────────────┐
│ 💰 Revenue Overview                     │
├─────────────────────────────────────────┤
│ Total Earned:        $245.50            │
│ Available Balance:   $245.50            │
│ Pending Payouts:     $0.00              │
│                                         │
│ 📊 Recent Earnings                      │
│ ┌─────────────────────────────────────┐ │
│ │ Tip from @johndoe     +$5.00        │ │
│ │ Event ticket sale     +$15.00       │ │
│ │ Service booking       +$50.00       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ Complete verification to withdraw   │
│ [Complete Verification Now]             │
└─────────────────────────────────────────┘
```

---

## Phase 3: Account Verification

### When to Verify

**Triggers:**
1. User clicks "Complete Verification Now" (proactive)
2. User tries to request payout with unverified account (reactive)
3. User's balance reaches $25+ and system prompts them

### Verification Flow

```typescript
// 1. User clicks verification button
const handleCompleteVerification = async () => {
  const response = await fetch('/api/stripe/connect/create-account', {
    method: 'POST',
    body: JSON.stringify({
      country: userCountry,
      setupMode: 'immediate' // VERIFICATION MODE
    }),
  });

  const result = await response.json();

  if (result.onboardingUrl) {
    // Redirect to Stripe onboarding
    window.location.href = result.onboardingUrl;
  }
};

// 2. Backend creates onboarding link
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId, // Existing account from Phase 1
  refresh_url: `${baseUrl}/profile?tab=revenue&refresh=true`,
  return_url: `${baseUrl}/profile?tab=revenue&success=true`,
  type: 'account_onboarding',
});

return NextResponse.json({
  success: true,
  onboardingUrl: accountLink.url
});

// 3. User completes Stripe onboarding
// - Personal information (name, DOB, address)
// - Business details (if applicable)
// - Bank account information
// - Identity verification (document upload)

// 4. Stripe webhook: account.updated
case 'account.updated': {
  const account = event.data.object;

  // Check if account is now verified
  const isVerified = account.capabilities?.transfers === 'active' &&
                     account.capabilities?.card_payments === 'active';

  await supabase
    .from('creator_bank_accounts')
    .update({
      verification_status: isVerified ? 'verified' : 'in_progress',
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_account_id', account.id);
}
```

### Stripe Onboarding Steps

**Step 1: Business Details**
- Business type (Individual/Company)
- Industry category

**Step 2: Personal Information**
- Full legal name
- Date of birth
- Home address
- Phone number

**Step 3: Bank Account**
- Bank name
- Account holder name
- Account number
- Routing number

**Step 4: Identity Verification**
- Government ID (Passport, Driver's License, etc.)
- Photo verification (sometimes required)

**Time Required:** 5-15 minutes

### Database State After Verification

**Table: `creator_bank_accounts`**
```sql
user_id: 'uuid-123'
stripe_account_id: 'acct_1234567890'
verification_status: 'verified'  -- Updated!
is_verified: true                -- Updated!
bank_name: 'Stripe Connect'
currency: 'USD'
updated_at: '2025-12-11T14:30:00Z'
```

### UI After Verification

```
┌─────────────────────────────────────────┐
│ 💳 Bank Account                         │
├─────────────────────────────────────────┤
│ ✅ Stripe Connect: Connected            │
│ Status: Verified ✓                      │
│                                         │
│ 🎉 Your account is verified!            │
│ You can now request payouts.            │
│                                         │
│ Available Balance: $245.50              │
│ [Request Payout]                        │
└─────────────────────────────────────────┘
```

---

## Phase 4: Requesting Payouts

### Eligibility Check

**Before showing payout form:**

```typescript
// 1. Check eligibility
const response = await fetch('/api/payouts/eligibility');
const { eligible, availableBalance, message } = await response.json();

if (!eligible) {
  // Show reason why not eligible
  showError(message);
  return;
}

// 2. Show payout form
showPayoutForm(availableBalance);
```

**Eligibility Criteria:**
```typescript
const eligible = (
  availableBalance >= 25.00 &&
  verificationStatus === 'verified' &&
  pendingPayouts < 3 &&
  stripeAccountId !== null
);
```

### Payout Request Flow

```typescript
// 1. User enters amount
const [amount, setAmount] = useState(0);

// 2. Validate amount
const validateAmount = () => {
  if (amount < 25.00) {
    return 'Minimum payout is $25.00';
  }
  if (amount > availableBalance) {
    return 'Insufficient balance';
  }
  return null;
};

// 3. Submit request
const handleRequestPayout = async () => {
  const response = await fetch('/api/payouts/request', {
    method: 'POST',
    body: JSON.stringify({
      amount: parseFloat(amount),
      currency: 'USD'
    })
  });

  const result = await response.json();

  if (result.success) {
    showSuccess(`Payout of $${amount} requested!`);
    refreshBalance();
  }
};
```

### Backend Processing

```typescript
// 1. Validate request
if (amount < 25.00) {
  return NextResponse.json({ error: 'Minimum $25' }, { status: 400 });
}

// 2. Check balance
const { data: revenue } = await supabase
  .from('creator_revenue')
  .select('pending_balance')
  .eq('user_id', user.id)
  .single();

if (revenue.pending_balance < amount) {
  return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
}

// 3. Create Stripe payout
const payout = await stripe.payouts.create(
  {
    amount: Math.round(amount * 100), // Cents
    currency: 'usd',
    statement_descriptor: 'SoundBridge Payout',
  },
  {
    stripeAccount: stripeAccountId,
  }
);

// 4. Save payout record
await supabase
  .from('creator_payouts')
  .insert({
    user_id: user.id,
    stripe_payout_id: payout.id,
    amount: amount,
    currency: 'USD',
    status: 'pending',
    requested_at: new Date().toISOString(),
    estimated_arrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

// 5. Update revenue balance
await supabase
  .from('creator_revenue')
  .update({
    pending_balance: revenue.pending_balance - amount,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', user.id);

// 6. Return success
return NextResponse.json({
  success: true,
  payoutId: payout.id,
  amount: amount,
  status: 'pending',
  estimatedArrival: '2025-12-18T00:00:00Z'
});
```

### Database State After Request

**Table: `creator_payouts`**
```sql
id: 'payout-uuid-456'
user_id: 'uuid-123'
stripe_payout_id: 'po_1234567890'
amount: 100.00
currency: 'USD'
status: 'pending'
requested_at: '2025-12-11T15:00:00Z'
estimated_arrival: '2025-12-18T00:00:00Z'
```

**Table: `creator_revenue`**
```sql
user_id: 'uuid-123'
total_earned: 245.50
total_paid_out: 0.00
pending_balance: 145.50  -- Reduced by $100
```

### UI After Request

```
┌─────────────────────────────────────────┐
│ 💸 Request Payout                       │
├─────────────────────────────────────────┤
│ ✅ Payout of $100.00 requested!         │
│                                         │
│ Available Balance: $145.50              │
│ Pending Payouts: $100.00                │
│ Withdrawable: $45.50                    │
│                                         │
│ 📋 Recent Payouts                       │
│ ┌─────────────────────────────────────┐ │
│ │ $100.00  Pending  Dec 11, 2025      │ │
│ │ Estimated arrival: Dec 18, 2025     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Phase 5: Receiving Funds

### Stripe Processing Timeline

**Day 0 (Request):**
- Payout request submitted
- Status: `pending`
- Funds deducted from SoundBridge balance

**Day 0-1 (Stripe Processing):**
- Stripe validates account and balance
- Status changes to `in_transit`
- Webhook: `payout.updated`

**Day 2-7 (Bank Transfer):**
- Stripe transfers funds to bank
- ACH transfer takes 2-7 business days

**Day 7+ (Arrival):**
- Funds appear in bank account
- Webhook: `payout.paid`
- Status: `paid`

### Webhook Processing

**Event: `payout.updated`**
```typescript
case 'payout.updated': {
  const payout = event.data.object;

  await supabase
    .from('creator_payouts')
    .update({
      status: payout.status, // 'in_transit'
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);
}
```

**Event: `payout.paid`**
```typescript
case 'payout.paid': {
  const payout = event.data.object;

  // 1. Update payout record
  await supabase
    .from('creator_payouts')
    .update({
      status: 'paid',
      arrived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);

  // 2. Update revenue totals
  const { data: payoutRecord } = await supabase
    .from('creator_payouts')
    .select('amount, user_id')
    .eq('stripe_payout_id', payout.id)
    .single();

  await supabase
    .from('creator_revenue')
    .update({
      total_paid_out: supabase.raw(`total_paid_out + ${payoutRecord.amount}`),
      last_payout_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', payoutRecord.user_id);

  // 3. Send notification to user
  await sendNotification(payoutRecord.user_id, {
    type: 'payout_complete',
    amount: payoutRecord.amount,
    message: `Your payout of $${payoutRecord.amount} has arrived!`
  });
}
```

**Event: `payout.failed`**
```typescript
case 'payout.failed': {
  const payout = event.data.object;

  // 1. Update payout status
  await supabase
    .from('creator_payouts')
    .update({
      status: 'failed',
      failure_reason: payout.failure_message,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);

  // 2. Refund balance to user
  const { data: payoutRecord } = await supabase
    .from('creator_payouts')
    .select('amount, user_id')
    .eq('stripe_payout_id', payout.id)
    .single();

  await supabase
    .from('creator_revenue')
    .update({
      pending_balance: supabase.raw(`pending_balance + ${payoutRecord.amount}`),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', payoutRecord.user_id);

  // 3. Notify user
  await sendNotification(payoutRecord.user_id, {
    type: 'payout_failed',
    amount: payoutRecord.amount,
    reason: payout.failure_message,
    message: 'Your payout failed. The amount has been returned to your balance.'
  });
}
```

### Database State After Completion

**Table: `creator_payouts`**
```sql
id: 'payout-uuid-456'
stripe_payout_id: 'po_1234567890'
amount: 100.00
status: 'paid'              -- Updated!
requested_at: '2025-12-11T15:00:00Z'
arrived_at: '2025-12-18T09:30:00Z'  -- Updated!
```

**Table: `creator_revenue`**
```sql
total_earned: 245.50
total_paid_out: 100.00      -- Updated!
pending_balance: 145.50
last_payout_at: '2025-12-18T09:30:00Z'  -- Updated!
```

### UI After Completion

```
┌─────────────────────────────────────────┐
│ 💸 Payout History                       │
├─────────────────────────────────────────┤
│ 📋 Recent Payouts                       │
│ ┌─────────────────────────────────────┐ │
│ │ $100.00  ✅ Paid    Dec 18, 2025   │ │
│ │ Arrived in your bank account        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Total Withdrawn: $100.00                │
│ Available Balance: $145.50              │
└─────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      SOUNDBRIDGE PLATFORM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Frontend   │─────▶│   Next.js    │─────▶│ Supabase  │ │
│  │   (React)    │      │   API Routes │      │ Database  │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│                               │                              │
│                               │                              │
│                               ▼                              │
│                        ┌─────────────┐                       │
│                        │   Stripe    │                       │
│                        │   Connect   │                       │
│                        └─────────────┘                       │
│                               │                              │
│                               │                              │
│                               ▼                              │
│                        ┌─────────────┐                       │
│                        │  Webhooks   │                       │
│                        └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Setup Flow:**
```
User → Frontend → API → Stripe → Database → Frontend
```

**2. Earning Flow:**
```
Payment → Stripe → Webhook → Database → User Balance Update
```

**3. Payout Flow:**
```
User → Frontend → API → Stripe → Webhook → Database → Bank Account
```

---

## 🗄️ Database Flow

### Tables & Relationships

```sql
auth.users (Supabase Auth)
    ↓
profiles (User metadata)
    ↓
creator_bank_accounts (1:1 with users)
    ├── stripe_account_id
    ├── verification_status
    └── is_verified

creator_revenue (1:1 with users)
    ├── total_earned
    ├── total_paid_out
    └── pending_balance

creator_payouts (1:many with users)
    ├── stripe_payout_id
    ├── amount
    └── status
```

### State Machine: `creator_bank_accounts.verification_status`

```
    [null] ──setup──▶ [pending] ──verify──▶ [in_progress] ──approve──▶ [verified]
                                                   │
                                                   │
                                              [failed]
```

### State Machine: `creator_payouts.status`

```
    [pending] ──stripe_process──▶ [in_transit] ──bank_transfer──▶ [paid]
        │                                  │
        │                                  │
        └─────────────────────────────────▶ [failed]
```

---

## 🔌 API Endpoints

### Stripe Connect Setup

**POST /api/stripe/connect/create-account**
- **Purpose:** Create Stripe Connect account (deferred or immediate)
- **Auth:** Required
- **Body:** `{ country: string, setupMode: 'deferred' | 'immediate' }`
- **Response:** `{ success: boolean, accountId: string, skipOnboarding?: boolean, onboardingUrl?: string }`

### Payout Endpoints

**GET /api/payouts/eligibility**
- **Purpose:** Check if user can request payout
- **Auth:** Required
- **Response:** `{ eligible: boolean, availableBalance: number, message: string }`

**POST /api/payouts/request**
- **Purpose:** Request a payout
- **Auth:** Required
- **Body:** `{ amount: number, currency: string }`
- **Response:** `{ success: boolean, payoutId: string, estimatedArrival: string }`

**GET /api/payouts/history**
- **Purpose:** Get payout history
- **Auth:** Required
- **Response:** `{ payouts: Payout[], totalPaidOut: number, pendingAmount: number }`

### Revenue Endpoints

**GET /api/revenue/balance**
- **Purpose:** Get current revenue balance
- **Auth:** Required
- **Response:** `{ totalEarned: number, totalPaidOut: number, pendingBalance: number }`

**GET /api/revenue/transactions**
- **Purpose:** Get revenue transaction history
- **Auth:** Required
- **Response:** `{ transactions: Transaction[] }`

---

## 🔔 Webhook Processing

### Stripe Webhook Endpoint

**POST /api/webhooks/stripe**
- **Purpose:** Receive Stripe events
- **Auth:** Stripe signature verification
- **Events Handled:**
  - `account.updated` - Verification status changes
  - `payout.created` - Payout initiated
  - `payout.updated` - Payout status changed
  - `payout.paid` - Payout completed
  - `payout.failed` - Payout failed
  - `checkout.session.completed` - Payment received (tips, tickets, etc.)

### Webhook Security

```typescript
// Verify Stripe signature
const signature = request.headers.get('stripe-signature');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let event;
try {
  event = stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  );
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}

// Process event
switch (event.type) {
  case 'payout.paid':
    // Handle payout completion
    break;
  // ...
}
```

---

## 🚨 Error Handling

### Common Errors & Solutions

#### 1. Authentication Errors
**Error:** "Authentication required"
**Cause:** Session expired or invalid token
**Solution:** Refresh page, re-authenticate

**Code:**
```typescript
if (!user) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}
```

#### 2. Stripe Account Errors
**Error:** "Stripe Connect not enabled"
**Cause:** Stripe account not configured for Connect
**Solution:** Enable Connect in Stripe Dashboard

**Error:** "Platform profile setup required"
**Cause:** Stripe Connect platform settings incomplete
**Solution:** Complete platform profile at Stripe Dashboard

**Code:**
```typescript
if (error.message?.includes('platform-profile')) {
  return NextResponse.json({
    error: 'Platform profile setup required',
    action: 'setup_platform_profile',
    url: 'https://dashboard.stripe.com/settings/connect/platform-profile'
  }, { status: 400 });
}
```

#### 3. Payout Errors
**Error:** "Insufficient balance"
**Cause:** Requested amount > available balance
**Solution:** Reduce payout amount

**Error:** "Account verification required"
**Cause:** Trying to payout with unverified account
**Solution:** Complete Stripe verification

**Error:** "Minimum payout is $25.00"
**Cause:** Amount < $25
**Solution:** Increase payout amount or wait for more earnings

**Code:**
```typescript
if (amount < 25.00) {
  return NextResponse.json({
    error: 'Minimum payout amount is $25.00'
  }, { status: 400 });
}

if (verificationStatus !== 'verified') {
  return NextResponse.json({
    error: 'Account verification required',
    action: 'verify_account'
  }, { status: 400 });
}
```

#### 4. Database Errors
**Error:** "Duplicate key constraint violation"
**Cause:** Trying to insert record that already exists
**Solution:** Check for existing record first

**Code:**
```typescript
// Check if account exists
const { data: existing } = await supabase
  .from('creator_bank_accounts')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (existing) {
  // UPDATE instead of INSERT
  await supabase
    .from('creator_bank_accounts')
    .update({ stripe_account_id: account.id })
    .eq('user_id', user.id);
} else {
  // INSERT new record
  await supabase
    .from('creator_bank_accounts')
    .insert({ user_id: user.id, stripe_account_id: account.id });
}
```

---

## 🔐 Security & Compliance

### Authentication & Authorization

**1. User Authentication:**
- Supabase JWT tokens
- Session-based auth for web
- Bearer token auth for mobile
- Row Level Security (RLS) on all tables

**2. API Authorization:**
```typescript
// Every API route checks authentication
const { supabase, user, error } = await getSupabaseRouteClient(request, true);

if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**3. Database Security:**
```sql
-- RLS policy: Users can only see their own revenue
CREATE POLICY "Users can view own revenue"
  ON creator_revenue
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policy: Users can only request their own payouts
CREATE POLICY "Users can request own payouts"
  ON creator_payouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Data Protection

**1. No Sensitive Data Storage:**
- Bank account details stored by Stripe (not in our database)
- Only Stripe account ID stored
- PCI compliance handled by Stripe

**2. Encryption:**
- All API calls over HTTPS
- Database connections encrypted (Supabase)
- Stripe webhooks signed and verified

**3. Audit Trail:**
```typescript
// All payout requests logged
await supabase
  .from('creator_payouts')
  .insert({
    user_id: user.id,
    amount: amount,
    requested_at: new Date().toISOString(),
    // ... full audit trail
  });
```

### Compliance

**1. Stripe Connect Requirements:**
- Identity verification (KYC)
- Anti-money laundering (AML) checks
- Tax reporting (1099-K for US creators earning $600+)

**2. Platform Responsibilities:**
- Terms of Service agreement
- Privacy policy compliance
- GDPR compliance (data deletion, export)

**3. Financial Regulations:**
- Stripe handles PCI DSS compliance
- Stripe manages tax reporting
- Platform monitors for suspicious activity

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

**1. Setup Metrics:**
- Setup completion rate
- Time to first setup
- Verification completion rate
- Verification abandonment reasons

**2. Revenue Metrics:**
- Total platform revenue
- Average creator earnings
- Revenue by source (tips, events, services)
- Top earning creators

**3. Payout Metrics:**
- Payout request volume
- Average payout amount
- Payout failure rate
- Time to payout completion

**4. Health Metrics:**
- API response times
- Webhook processing times
- Error rates by endpoint
- Failed payout reasons

### Logging Best Practices

```typescript
// Log all critical events
console.log('[Stripe Connect] Account created:', {
  userId: user.id,
  accountId: account.id,
  timestamp: new Date().toISOString()
});

console.log('[Payout] Request submitted:', {
  userId: user.id,
  amount: amount,
  payoutId: payout.id,
  timestamp: new Date().toISOString()
});

console.error('[Payout] Request failed:', {
  userId: user.id,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

---

## 🧪 Testing Guide

### Test Scenarios

**1. Full End-to-End Test (Happy Path):**
```
1. Create new user account
2. Navigate to Revenue tab
3. Click "Complete Stripe Connect Setup"
4. Verify account created (deferred mode)
5. Manually add test balance to database
6. Click "Complete Verification Now"
7. Complete Stripe onboarding (test mode)
8. Verify status = "verified"
9. Request payout ($25-$100)
10. Verify payout status = "pending"
11. Trigger Stripe webhook: payout.paid
12. Verify status = "paid"
13. Verify balance updated correctly
```

**2. Error Scenarios:**
```
1. Try payout without verification → "Verification required"
2. Try payout with $10 → "Minimum $25"
3. Try payout with $1000 (balance $100) → "Insufficient balance"
4. Create duplicate account → Update existing record
5. Trigger payout.failed webhook → Balance refunded
```

### Test Data

```sql
-- Add test balance
UPDATE creator_revenue
SET pending_balance = 100.00
WHERE user_id = 'test-user-id';

-- Simulate payout
INSERT INTO creator_payouts (user_id, amount, status)
VALUES ('test-user-id', 50.00, 'pending');
```

---

## 🚀 Production Checklist

### Before Launch:

- [ ] Stripe Connect enabled in production Stripe account
- [ ] Platform profile completed in Stripe Dashboard
- [ ] Webhook endpoint configured with correct URL
- [ ] Webhook signing secret added to environment variables
- [ ] Database tables created with RLS policies
- [ ] Test end-to-end flow in production mode
- [ ] Monitor Stripe Dashboard for errors
- [ ] Set up error alerting (Sentry, etc.)
- [ ] Document support processes for payout issues
- [ ] Train support team on common issues

### Environment Variables:

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://www.soundbridge.live

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 📚 Additional Resources

### Documentation:
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Payouts Documentation](https://stripe.com/docs/payouts)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)

### Internal Docs:
- [STRIPE_CONNECT_DEFERRED_ONBOARDING.md](STRIPE_CONNECT_DEFERRED_ONBOARDING.md)
- [STRIPE_PAYOUT_SYSTEM_COMPLETE.md](STRIPE_PAYOUT_SYSTEM_COMPLETE.md)
- [SUBSCRIPTION_TAB_UPDATE_SUMMARY.md](SUBSCRIPTION_TAB_UPDATE_SUMMARY.md)

---

**Status:** ✅ Complete end-to-end Stripe Connect integration ready for production!
**Last Updated:** December 11, 2025
