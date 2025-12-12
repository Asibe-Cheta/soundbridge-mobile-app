# Stripe Payout System - Complete Guide

**Date:** December 11, 2025
**Status:** ✅ **FULLY OPERATIONAL**

---

## 🎯 Overview

SoundBridge's payout system allows creators to withdraw earnings from tips, event ticket sales, and other revenue sources. The system integrates with Stripe Connect to handle payouts to creators' bank accounts.

---

## 💰 Payout Requirements

### Minimum Payout Amount
**$25.00 USD** (or equivalent in local currency)

### Account Requirements
1. ✅ **Stripe Connect Account Created** - Account ID stored in database
2. ✅ **Account Verified** - Identity verification completed with Stripe
3. ✅ **Sufficient Balance** - Available balance ≥ $25.00
4. ✅ **No Pending Payouts** - Previous payout requests processed

---

## 🔄 Payout Flow

### Step 1: Check Eligibility
**Endpoint:** `GET /api/payouts/eligibility`

**Response:**
```json
{
  "eligible": true,
  "availableBalance": 150.75,
  "pendingPayouts": 0,
  "minimumPayout": 25.00,
  "verificationStatus": "verified",
  "currency": "USD",
  "message": "You can request a payout!"
}
```

**Eligibility Criteria:**
- Available balance ≥ $25.00
- Account is verified (`verification_status = 'verified'`)
- No more than 3 pending payout requests
- Stripe account ID exists

### Step 2: Request Payout
**Endpoint:** `POST /api/payouts/request`

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "payoutId": "payout_1234567890",
  "amount": 100.00,
  "currency": "USD",
  "status": "pending",
  "estimatedArrival": "2025-12-18T00:00:00Z"
}
```

### Step 3: Track Payout Status
**Endpoint:** `GET /api/payouts/history`

**Response:**
```json
{
  "payouts": [
    {
      "id": "payout_1234567890",
      "amount": 100.00,
      "currency": "USD",
      "status": "in_transit",
      "requestedAt": "2025-12-11T10:30:00Z",
      "processedAt": "2025-12-11T10:35:00Z",
      "estimatedArrival": "2025-12-18T00:00:00Z"
    },
    {
      "id": "payout_0987654321",
      "amount": 50.00,
      "currency": "USD",
      "status": "paid",
      "requestedAt": "2025-12-01T14:20:00Z",
      "processedAt": "2025-12-01T14:25:00Z",
      "arrivedAt": "2025-12-08T09:15:00Z"
    }
  ],
  "totalPaidOut": 150.00,
  "pendingAmount": 100.00
}
```

---

## 📊 Payout Status Values

| Status | Description | Timeline |
|--------|-------------|----------|
| `pending` | Payout request submitted, awaiting processing | 0-24 hours |
| `in_transit` | Payout approved, funds being transferred | 2-7 business days |
| `paid` | Payout completed, funds in bank account | Complete |
| `failed` | Payout failed (insufficient funds, account issue) | - |
| `cancelled` | Payout cancelled by user or system | - |

---

## 🗄️ Database Schema

### Table: `creator_payouts`

```sql
CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payout_id TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_amount CHECK (amount >= 25.00)
);

CREATE INDEX idx_creator_payouts_user_id ON creator_payouts(user_id);
CREATE INDEX idx_creator_payouts_status ON creator_payouts(status);
```

### Table: `creator_revenue`

```sql
CREATE TABLE creator_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_earned DECIMAL(10, 2) DEFAULT 0,
  total_paid_out DECIMAL(10, 2) DEFAULT 0,
  pending_balance DECIMAL(10, 2) DEFAULT 0,
  last_payout_at TIMESTAMP WITH TIME ZONE,
  payout_threshold DECIMAL(10, 2) DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `total_earned` - Lifetime earnings from all sources
- `total_paid_out` - Total amount withdrawn via payouts
- `pending_balance` - Currently available for withdrawal
- `last_payout_at` - Date of last successful payout
- `payout_threshold` - Minimum balance before user can request payout (default $50)

---

## 💡 Revenue Sources

Creators earn money from:

1. **Tips** - Fans can tip creators on their profile or tracks
2. **Event Tickets** - Revenue from event ticket sales
3. **Premium Content** - Sales of premium tracks or content
4. **Service Provider Bookings** - Earnings from service bookings

All revenue is tracked in the `creator_revenue` table and available for payout once verified.

---

## 🎨 User Interface

### Payout Request Component

**File:** [apps/web/src/components/revenue/PayoutRequest.tsx](apps/web/src/components/revenue/PayoutRequest.tsx)

**Features:**
- Shows available balance
- Shows pending payout requests
- Shows withdrawable amount (available - pending)
- Input field for payout amount
- Validation (minimum $25, maximum available balance)
- Payout history table with status tracking

**UI States:**

#### State 1: Account Not Verified
```
┌─────────────────────────────────────────┐
│ 💸 Request Payout                       │
├─────────────────────────────────────────┤
│ ⚠️ Verification Required                │
│                                         │
│ Complete Stripe verification to request │
│ payouts.                                │
│                                         │
│ [Complete Verification]                 │
└─────────────────────────────────────────┘
```

#### State 2: Insufficient Balance
```
┌─────────────────────────────────────────┐
│ 💸 Request Payout                       │
├─────────────────────────────────────────┤
│ Available Balance: $18.50               │
│ Minimum Payout: $25.00                  │
│                                         │
│ ℹ️ You need $6.50 more to request a    │
│    payout.                              │
└─────────────────────────────────────────┘
```

#### State 3: Eligible for Payout
```
┌─────────────────────────────────────────┐
│ 💸 Request Payout                       │
├─────────────────────────────────────────┤
│ Available Balance: $150.75              │
│ Pending Payouts: $50.00                 │
│ Withdrawable: $100.75                   │
│                                         │
│ Amount to Withdraw:                     │
│ ┌─────────────────────────────────────┐ │
│ │ $[___________]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Request Payout]                        │
│                                         │
│ 📋 Recent Payouts                       │
│ ┌─────────────────────────────────────┐ │
│ │ $100.00  In Transit  Dec 11, 2025  │ │
│ │ $50.00   Paid        Dec 1, 2025   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔧 API Implementation

### Eligibility Check

**File:** [apps/web/app/api/payouts/eligibility/route.ts](apps/web/app/api/payouts/eligibility/route.ts)

```typescript
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bank account info
    const { data: bankAccount } = await supabase
      .from('creator_bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!bankAccount || !bankAccount.stripe_account_id) {
      return NextResponse.json({
        eligible: false,
        message: 'Stripe Connect account not set up',
        requiresAction: 'setup_stripe'
      });
    }

    if (bankAccount.verification_status !== 'verified') {
      return NextResponse.json({
        eligible: false,
        message: 'Account verification required',
        requiresAction: 'verify_account',
        verificationStatus: bankAccount.verification_status
      });
    }

    // Get revenue info
    const { data: revenue } = await supabase
      .from('creator_revenue')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const availableBalance = revenue?.pending_balance || 0;
    const minimumPayout = 25.00;

    // Count pending payouts
    const { count: pendingCount } = await supabase
      .from('creator_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_transit']);

    const pendingPayouts = pendingCount || 0;

    // Check eligibility
    const eligible = availableBalance >= minimumPayout && pendingPayouts < 3;

    return NextResponse.json({
      eligible,
      availableBalance,
      pendingPayouts,
      minimumPayout,
      verificationStatus: bankAccount.verification_status,
      currency: bankAccount.currency || 'USD',
      message: eligible ? 'You can request a payout!' : 'Not eligible for payout yet'
    });

  } catch (error: any) {
    console.error('Eligibility check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Request Payout

**File:** [apps/web/app/api/payouts/request/route.ts](apps/web/app/api/payouts/request/route.ts)

```typescript
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency = 'USD' } = await request.json();

    // Validate amount
    if (!amount || amount < 25.00) {
      return NextResponse.json({
        error: 'Minimum payout amount is $25.00'
      }, { status: 400 });
    }

    // Get bank account
    const { data: bankAccount } = await supabase
      .from('creator_bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!bankAccount?.stripe_account_id) {
      return NextResponse.json({
        error: 'Stripe Connect account not set up'
      }, { status: 400 });
    }

    if (bankAccount.verification_status !== 'verified') {
      return NextResponse.json({
        error: 'Account verification required'
      }, { status: 400 });
    }

    // Get revenue
    const { data: revenue } = await supabase
      .from('creator_revenue')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!revenue || revenue.pending_balance < amount) {
      return NextResponse.json({
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    // Create Stripe payout
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        statement_descriptor: 'SoundBridge Payout',
      },
      {
        stripeAccount: bankAccount.stripe_account_id,
      }
    );

    // Calculate estimated arrival (7 business days)
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 7);

    // Save payout record
    const { data: payoutRecord, error: insertError } = await supabase
      .from('creator_payouts')
      .insert({
        user_id: user.id,
        stripe_payout_id: payout.id,
        amount,
        currency,
        status: 'pending',
        requested_at: new Date().toISOString(),
        estimated_arrival: estimatedArrival.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving payout:', insertError);
      return NextResponse.json({
        error: 'Failed to save payout record'
      }, { status: 500 });
    }

    // Update revenue balance
    await supabase
      .from('creator_revenue')
      .update({
        pending_balance: revenue.pending_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      amount,
      currency,
      status: 'pending',
      estimatedArrival: estimatedArrival.toISOString()
    });

  } catch (error: any) {
    console.error('Payout request error:', error);
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
```

### Payout History

**File:** [apps/web/app/api/payouts/history/route.ts](apps/web/app/api/payouts/history/route.ts)

```typescript
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all payouts for user
    const { data: payouts, error } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
    }

    // Calculate totals
    const totalPaidOut = payouts
      ?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    const pendingAmount = payouts
      ?.filter(p => ['pending', 'in_transit'].includes(p.status))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    return NextResponse.json({
      payouts: payouts || [],
      totalPaidOut,
      pendingAmount
    });

  } catch (error: any) {
    console.error('Payout history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 🔔 Webhook Handling

### Stripe Webhook Events

**File:** [apps/web/app/api/webhooks/stripe/route.ts](apps/web/app/api/webhooks/stripe/route.ts)

**Payout Events:**
- `payout.paid` - Payout successfully arrived in bank account
- `payout.failed` - Payout failed (insufficient funds, account issue)
- `payout.canceled` - Payout was cancelled
- `payout.updated` - Payout status changed

**Example Handler:**
```typescript
case 'payout.paid': {
  const payout = event.data.object;

  // Update payout status in database
  await supabase
    .from('creator_payouts')
    .update({
      status: 'paid',
      arrived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);

  // Update revenue record
  await supabase
    .from('creator_revenue')
    .update({
      total_paid_out: supabase.rpc('increment', {
        column: 'total_paid_out',
        amount: payout.amount / 100
      }),
      last_payout_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  break;
}

case 'payout.failed': {
  const payout = event.data.object;

  // Update payout status
  await supabase
    .from('creator_payouts')
    .update({
      status: 'failed',
      failure_reason: payout.failure_message || 'Unknown error',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payout_id', payout.id);

  // Refund balance to user
  const { data: payoutRecord } = await supabase
    .from('creator_payouts')
    .select('amount, user_id')
    .eq('stripe_payout_id', payout.id)
    .single();

  if (payoutRecord) {
    await supabase
      .from('creator_revenue')
      .update({
        pending_balance: supabase.rpc('increment', {
          column: 'pending_balance',
          amount: payoutRecord.amount
        }),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payoutRecord.user_id);
  }

  break;
}
```

---

## 💳 Currency Support

SoundBridge supports payouts in multiple currencies based on country:

| Country | Currency | Min Payout |
|---------|----------|------------|
| United States | USD | $25.00 |
| United Kingdom | GBP | £20.00 |
| Eurozone | EUR | €22.00 |
| Canada | CAD | $30.00 |
| Australia | AUD | $35.00 |
| Japan | JPY | ¥2,800 |
| Singapore | SGD | $35.00 |
| Hong Kong | HKD | $195.00 |

**Conversion Handling:**
- All amounts stored in local currency
- Stripe handles currency conversion
- Exchange rates applied at payout time

---

## 🧪 Testing

### Test Payout Flow (Stripe Test Mode)

1. **Create Test Stripe Account:**
   - Use test mode Stripe keys
   - Create Express Connect account

2. **Add Test Balance:**
   ```sql
   UPDATE creator_revenue
   SET pending_balance = 100.00
   WHERE user_id = 'your-user-id';
   ```

3. **Request Test Payout:**
   - Navigate to Revenue tab
   - Click "Request Payout"
   - Enter amount ($25-$100)
   - Submit request

4. **Verify Payout Created:**
   - Check Stripe Dashboard → Connect → Payouts
   - Verify payout appears with status "pending"

5. **Simulate Payout Success:**
   - In Stripe test mode, payouts auto-complete
   - Or manually trigger webhook: `payout.paid`

6. **Verify Database Updated:**
   ```sql
   SELECT * FROM creator_payouts WHERE user_id = 'your-user-id';
   ```

---

## 🐛 Common Issues

### Issue 1: "Insufficient balance" error
**Cause:** `pending_balance` < requested amount
**Fix:** Verify revenue balance is accurate

### Issue 2: "Account verification required"
**Cause:** `verification_status` != 'verified'
**Fix:** Complete Stripe verification

### Issue 3: Payout stuck in "pending"
**Cause:** Stripe hasn't processed yet (can take 24 hours)
**Fix:** Wait for Stripe webhook, or check Stripe Dashboard

### Issue 4: Payout failed
**Cause:** Bank account invalid, insufficient Stripe balance
**Fix:** Check `failure_reason` in database, update bank details

---

## 📊 Analytics & Reporting

### Creator Revenue Dashboard

Creators can view:
- **Total Earnings** - Lifetime revenue from all sources
- **Available Balance** - Amount available for withdrawal
- **Pending Payouts** - Payouts in transit
- **Total Withdrawn** - Historical payout total
- **Payout History** - List of all payouts with statuses

### Admin Analytics

Platform admins can track:
- Total payouts processed
- Average payout amount
- Payout failure rate
- Time to payout completion
- Revenue by source (tips, events, etc.)

---

## 🚀 Best Practices

### For Users:
1. **Verify account early** - Don't wait until you need to withdraw
2. **Withdraw regularly** - Don't let balance accumulate unnecessarily
3. **Keep bank details updated** - Ensure payouts go to correct account
4. **Monitor payout status** - Check history for any issues

### For Developers:
1. **Always validate amounts** - Check minimum/maximum limits
2. **Handle failures gracefully** - Refund balance on payout failure
3. **Log all transactions** - Maintain audit trail
4. **Test webhooks thoroughly** - Ensure status updates work
5. **Monitor Stripe errors** - Set up alerts for failed payouts

---

## 📈 Future Enhancements

### Planned Features:
- **Instant Payouts** - Same-day payouts for verified accounts (Stripe feature)
- **Scheduled Payouts** - Auto-withdraw weekly/monthly
- **Payout Preferences** - Set custom thresholds and schedules
- **Multi-Currency Support** - More currencies and automatic conversion
- **Payout Notifications** - Email/SMS alerts for payout status changes

---

**Status:** ✅ Payout system fully operational and ready for production!
**Last Updated:** December 11, 2025
