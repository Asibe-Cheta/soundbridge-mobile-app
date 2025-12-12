# Stripe Connect Deferred Onboarding System

**Date:** December 11, 2025
**Status:** ✅ **IMPLEMENTED & ACTIVE**

---

## 🎯 Overview

SoundBridge implements a **deferred onboarding** pattern for Stripe Connect accounts, allowing users to start earning immediately without completing lengthy identity verification upfront. Users only need to verify their identity when they're ready to withdraw funds.

This approach significantly reduces friction and increases conversion rates compared to traditional immediate onboarding.

---

## 🚀 Why Deferred Onboarding?

### Traditional Onboarding Problems:
- ❌ **5-15 minute process** before user can start earning
- ❌ **High abandonment rates** - users leave during verification
- ❌ **Premature commitment** - users haven't experienced the platform yet
- ❌ **Poor mobile experience** - document uploads are cumbersome on mobile
- ❌ **Trust concerns** - users hesitant to provide documents to unfamiliar platform

### Deferred Onboarding Benefits:
- ✅ **Instant setup** - account created in seconds
- ✅ **Start earning immediately** - no barriers to entry
- ✅ **Verify when ready** - users only verify when they have money to withdraw
- ✅ **Higher motivation** - users more likely to complete verification when they have earnings
- ✅ **Better conversion** - used by successful platforms like Patreon, Ko-fi, Gumroad

---

## 📊 How It Works

### Phase 1: Instant Account Creation (Default)
When user clicks "Complete Stripe Connect Setup":

1. **Stripe Account Created** - Express Connect account created instantly
2. **Database Record Saved** - Account ID stored in `creator_bank_accounts` table
3. **User Redirected Back** - No onboarding flow shown
4. **Status: "Pending Verification"** - User can start earning immediately

**Time Required:** < 5 seconds

### Phase 2: Earning Phase
User accumulates earnings from:
- Tips from fans
- Event ticket sales
- Premium content purchases
- Service provider bookings

**Status:** Funds accumulate in Stripe account, available balance grows

### Phase 3: Verification (When User Wants to Withdraw)
User clicks "Complete Verification Now" or "Request Payout":

1. **Verification Required Check** - System detects unverified account
2. **Stripe Onboarding Flow** - User redirected to Stripe's hosted onboarding
3. **Identity Verification** - User provides documents, bank details
4. **Account Activated** - Account status changed to "verified"

**Time Required:** 5-15 minutes (but user is already motivated by earnings)

### Phase 4: Payout
Once verified:
- User can request payouts anytime
- Minimum payout: $25.00
- Funds transferred to bank account within 2-7 business days

---

## 🔧 Technical Implementation

### Endpoint: `/api/stripe/connect/create-account`

**Request Body:**
```json
{
  "country": "US",
  "setupMode": "deferred" // or "immediate"
}
```

**Deferred Mode Response:**
```json
{
  "success": true,
  "accountId": "acct_1234567890",
  "message": "Stripe Connect account created! You can start earning immediately. Complete verification when you want to withdraw.",
  "skipOnboarding": true
}
```

**Immediate Mode Response:**
```json
{
  "success": true,
  "accountId": "acct_1234567890",
  "onboardingUrl": "https://connect.stripe.com/setup/s/..."
}
```

### Code Flow (Deferred Mode)

**File:** [apps/web/app/api/stripe/connect/create-account/route.ts](apps/web/app/api/stripe/connect/create-account/route.ts)

```typescript
// 1. Parse setup mode from request
const body = await request.json().catch(() => ({}));
const setupMode = body.setupMode || 'deferred';
const requestCountry = body.country || 'US';

// 2. Create Stripe Connect account
const account = await stripe.accounts.create({
  type: 'express',
  country: requestCountry,
  email: user.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual',
  individual: {
    email: user.email,
  },
});

// 3. DEFERRED MODE: Save account ID and return immediately
if (setupMode === 'deferred') {
  // Get currency for country
  const currency = getCurrencyForCountry(requestCountry);

  // Check if bank account already exists
  const { data: existingAccount } = await supabase
    .from('creator_bank_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingAccount) {
    // UPDATE existing record
    await supabase
      .from('creator_bank_accounts')
      .update({
        stripe_account_id: account.id,
        verification_status: 'pending',
        is_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
  } else {
    // INSERT new record
    await supabase
      .from('creator_bank_accounts')
      .insert({
        user_id: user.id,
        stripe_account_id: account.id,
        verification_status: 'pending',
        is_verified: false,
        account_holder_name: user.user_metadata?.display_name || user.email,
        bank_name: 'Stripe Connect',
        account_number_encrypted: '',
        routing_number_encrypted: '',
        account_type: 'checking',
        currency: currency
      });
  }

  // Return success without onboarding URL
  return NextResponse.json({
    success: true,
    accountId: account.id,
    message: 'Stripe Connect account created! You can start earning immediately. Complete verification when you want to withdraw.',
    skipOnboarding: true
  }, { headers: corsHeaders });
}

// 4. IMMEDIATE MODE: Create onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/profile?tab=revenue&refresh=true`,
  return_url: `${baseUrl}/profile?tab=revenue&success=true`,
  type: 'account_onboarding',
});

return NextResponse.json({
  success: true,
  accountId: account.id,
  onboardingUrl: accountLink.url
}, { headers: corsHeaders });
```

### Frontend Implementation

**File:** [apps/web/src/components/revenue/BankAccountManager.tsx](apps/web/src/components/revenue/BankAccountManager.tsx)

```typescript
// Initial Setup (Deferred Mode)
const handleSetupStripeConnect = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/stripe/connect/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        country: userCountry,
        setupMode: 'deferred' // INSTANT SETUP
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      if (result.skipOnboarding) {
        // DEFERRED MODE: Show success and reload
        setSuccess(result.message);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // IMMEDIATE MODE: Redirect to onboarding
        window.location.href = result.onboardingUrl;
      }
    } else {
      setError(result.error || 'Failed to create Stripe Connect account');
    }
  } catch (err: any) {
    setError(err.message || 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};

// Complete Verification (Immediate Mode)
const handleCompleteVerification = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/stripe/connect/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        country: userCountry,
        setupMode: 'immediate' // COMPLETE VERIFICATION NOW
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Redirect to Stripe onboarding
      window.location.href = result.onboardingUrl;
    } else {
      setError(result.error || 'Failed to create verification link');
    }
  } catch (err: any) {
    setError(err.message || 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
```

---

## 🎨 User Interface States

### State 1: No Account Setup
**UI:**
```
┌─────────────────────────────────────────┐
│ 💳 Bank Account                         │
├─────────────────────────────────────────┤
│ Set up Stripe Connect to receive        │
│ payouts from tips, events, and sales.   │
│                                         │
│ [Complete Stripe Connect Setup]         │
└─────────────────────────────────────────┘
```

**Action:** Click "Complete Stripe Connect Setup" → Instant account creation (deferred mode)

### State 2: Account Created, Pending Verification
**UI:**
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

**Action:**
- User can start earning immediately
- Optional: Click "Complete Verification Now" → Stripe onboarding flow

### State 3: Verification In Progress
**UI:**
```
┌─────────────────────────────────────────┐
│ 💳 Bank Account                         │
├─────────────────────────────────────────┤
│ ✅ Stripe Connect: Connected            │
│ Status: Verification In Progress        │
│                                         │
│ ⏳ Your verification is being processed │
│ This usually takes 1-2 business days.   │
└─────────────────────────────────────────┘
```

### State 4: Fully Verified
**UI:**
```
┌─────────────────────────────────────────┐
│ 💳 Bank Account                         │
├─────────────────────────────────────────┤
│ ✅ Stripe Connect: Connected            │
│ Status: Verified ✓                      │
│                                         │
│ You can now request payouts!            │
│                                         │
│ [View Payout Options]                   │
└─────────────────────────────────────────┘
```

**Action:** User can request payouts (minimum $25.00)

---

## 🗄️ Database Schema

### Table: `creator_bank_accounts`

```sql
CREATE TABLE creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT UNIQUE,
  verification_status TEXT DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT false,
  account_holder_name TEXT,
  bank_name TEXT DEFAULT 'Stripe Connect',
  account_number_encrypted TEXT DEFAULT '',
  routing_number_encrypted TEXT DEFAULT '',
  account_type TEXT DEFAULT 'checking',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Verification Status Values:**
- `pending` - Account created, verification not started
- `in_progress` - Verification started, pending Stripe review
- `verified` - Fully verified, can receive payouts
- `failed` - Verification failed, needs resubmission

---

## 🌍 Supported Countries

SoundBridge supports Stripe Connect in 35+ countries:

**Americas:**
- United States (US)
- Canada (CA)

**Europe:**
- United Kingdom (GB)
- Germany (DE)
- France (FR)
- Spain (ES)
- Italy (IT)
- Netherlands (NL)
- Sweden (SE)
- Norway (NO)
- Denmark (DK)
- Finland (FI)
- Belgium (BE)
- Austria (AT)
- Switzerland (CH)
- Ireland (IE)
- Portugal (PT)
- Luxembourg (LU)
- Slovenia (SI)
- Slovakia (SK)
- Czech Republic (CZ)
- Poland (PL)
- Hungary (HU)
- Greece (GR)
- Cyprus (CY)
- Malta (MT)
- Estonia (EE)
- Latvia (LV)
- Lithuania (LT)

**Asia-Pacific:**
- Japan (JP)
- Singapore (SG)
- Hong Kong (HK)
- Malaysia (MY)
- Thailand (TH)
- Australia (AU)
- New Zealand (NZ)

**Currency Mapping:**
```typescript
const getCurrencyForCountry = (countryCode: string): string => {
  const currencyMap: Record<string, string> = {
    'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
    'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
    'JP': 'JPY', 'SG': 'SGD', 'HK': 'HKD', 'MY': 'MYR', 'TH': 'THB',
    'NZ': 'NZD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK'
  };
  return currencyMap[countryCode] || 'USD';
};
```

---

## 🔐 Security Considerations

### 1. Account Ownership Verification
- Stripe account ID is linked to authenticated user ID
- Row Level Security (RLS) on `creator_bank_accounts` table
- Only account owner can view/modify their bank account

### 2. Payout Protection
- Minimum payout threshold: $25.00
- Requires verified account before payout
- Stripe handles all fraud detection and compliance

### 3. Data Encryption
- Stripe account ID stored in database
- No sensitive bank details stored (handled by Stripe)
- All API calls authenticated with Supabase JWT

---

## 📈 Success Metrics

**Expected Improvements with Deferred Onboarding:**

- **Setup Completion Rate:** 95%+ (vs 40-60% with immediate onboarding)
- **Time to First Earning:** < 1 minute (vs 15+ minutes)
- **Verification Completion Rate:** 80%+ (motivated by earnings)
- **User Satisfaction:** Higher (less friction, better experience)

**Similar Platforms Using This Pattern:**
- Patreon
- Ko-fi
- Gumroad
- Substack
- OnlyFans

---

## 🧪 Testing Guide

### Test Scenario 1: Deferred Onboarding (Default)
1. Navigate to Revenue tab
2. Click "Complete Stripe Connect Setup"
3. **Expected:** Account created instantly, page reloads
4. **Verify:** Status shows "Pending Verification"
5. **Verify:** "Complete Verification Now" button visible

### Test Scenario 2: Early Verification
1. After deferred setup, click "Complete Verification Now"
2. **Expected:** Redirected to Stripe onboarding
3. Complete Stripe onboarding (test mode)
4. **Expected:** Redirected back to Revenue tab
5. **Verify:** Status shows "Verified"

### Test Scenario 3: Immediate Onboarding
1. Modify frontend to use `setupMode: 'immediate'`
2. Click "Complete Stripe Connect Setup"
3. **Expected:** Redirected to Stripe onboarding immediately
4. Complete onboarding
5. **Expected:** Redirected back, status "Verified"

### Test Scenario 4: Existing Account
1. Set up account once
2. Try to set up again
3. **Expected:** Updates existing record, doesn't create duplicate

---

## 🐛 Common Issues

### Issue 1: "Authentication required" error
**Cause:** Session expired or invalid token
**Fix:** Refresh page, re-authenticate

### Issue 2: Duplicate key constraint violation
**Cause:** Account already exists for user
**Fix:** Code now checks for existing account before insert/update

### Issue 3: "Stripe Connect not enabled"
**Cause:** Stripe account not configured for Connect
**Fix:** Enable Connect at https://dashboard.stripe.com/settings/connect

### Issue 4: "Platform profile setup required"
**Cause:** Stripe Connect platform profile incomplete
**Fix:** Complete setup at https://dashboard.stripe.com/settings/connect/platform-profile

---

## 🚀 Next Steps

1. **Monitor Conversion Rates:** Track setup completion and verification rates
2. **A/B Testing:** Compare deferred vs immediate onboarding performance
3. **User Feedback:** Collect feedback on verification process
4. **Optimize Messaging:** Improve prompts to encourage verification when earnings reach $25+

---

**Status:** ✅ Deferred onboarding is now the default for all new Stripe Connect setups!
**Last Updated:** December 11, 2025
