# Mobile Team Implementation Corrections

**Date:** December 29, 2025  
**Status:** Critical Fixes Required  
**Reference:** `CREATOR_PAYOUT_AUTOMATION_IMPLEMENTATION.md`

---

## Overview

The mobile team's implementation guide is excellent, but there are several critical issues that need to be fixed before implementation. This document provides the necessary corrections.

---

## 🔴 Critical Fixes

### 1. Supabase Client Import - **MUST FIX**

**Problem:**
```typescript
// ❌ WRONG - This path doesn't exist
const { createClient } = await import('@/lib/supabase/server');
const supabase = createClient();
```

**Fix:**
```typescript
// ✅ CORRECT - Use existing service client
import { createServiceClient } from '@/src/lib/supabase';
const supabase = createServiceClient();
```

**Files to fix:**
- `apps/web/src/lib/wise/country-detection.ts` (line 91-92)
- `apps/web/src/lib/wise/bank-account-fetcher.ts` (line 212-213)
- `apps/web/app/api/creator/payouts/request/route.ts` (line 317)
- All other new API route files

---

### 2. Database Field Names - **MUST FIX**

**Problem:** The document uses `creator_id` but the actual database uses `user_id`.

**Tables Affected:**
- `creator_revenue` → uses `user_id` (NOT `creator_id`)
- `creator_bank_accounts` → uses `user_id` (NOT `creator_id`)
- `wise_payouts` → uses `creator_id` (this is CORRECT)

**Fixes Required:**

#### In `country-detection.ts`:
```typescript
// ❌ WRONG
.eq('creator_id', creatorId)

// ✅ CORRECT  
.eq('id', creatorId)  // profiles table uses 'id'
```

```typescript
// ❌ WRONG
.eq('creator_id', creatorId)

// ✅ CORRECT
.eq('user_id', creatorId)  // creator_bank_accounts uses 'user_id'
```

#### In `bank-account-fetcher.ts`:
```typescript
// ❌ WRONG
.eq('creator_id', creatorId)

// ✅ CORRECT
.eq('user_id', creatorId)  // creator_bank_accounts uses 'user_id'
```

#### In `payout request API`:
```typescript
// ❌ WRONG
.eq('creator_id', creatorId)

// ✅ CORRECT
.eq('user_id', creatorId)  // creator_revenue uses 'user_id'
```

---

### 3. payoutToCreator Return Type - **MUST FIX**

**Problem:** The document assumes `payoutToCreator()` returns `PayoutResult` with `success` field, but it actually returns `WisePayout` directly (or throws an error).

**Current Implementation:**
```typescript
// apps/web/src/lib/wise/payout.ts
export async function payoutToCreator(
  params: PayoutToCreatorParams
): Promise<WisePayout> {  // Returns WisePayout directly, not PayoutResult
  // ... implementation
  return payout;  // Returns WisePayout
}
```

**Fix in `payout request API`:**
```typescript
// ❌ WRONG
const payoutResult = await payoutToCreator({...});
if (!payoutResult.success) {  // This field doesn't exist!
  return NextResponse.json({ error: payoutResult.error }, { status: 500 });
}

// ✅ CORRECT
try {
  const payout = await payoutToCreator({
    creatorId,
    amount: targetAmount,
    currency: targetCurrency,
    bankAccountNumber: bankAccount.accountNumber,
    bankCode: bankAccount.bankCode,
    accountHolderName: bankAccount.accountHolderName,
    sourceCurrency: actualSourceCurrency,
    reason: 'Creator payout request',
  });
  
  // Success - payout was created
  return NextResponse.json({
    success: true,
    payout: {
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      // ... rest of payout data
    },
  });
} catch (error: any) {
  // Handle error
  return NextResponse.json({
    error: 'Payout failed',
    message: error.message || 'Unknown error',
  }, { status: 500 });
}
```

---

### 4. Quote Creation - **MUST FIX**

**Problem:** The document references `createQuote()` function which doesn't exist. Quotes are created inside `createTransfer()`.

**Current Wise Implementation:**
- `createTransfer()` creates the quote internally
- No separate `createQuote()` function exists
- To get quote details, you need to extract from the transfer response

**Fix Options:**

**Option A: Remove quote pre-calculation (Recommended)**
```typescript
// ❌ WRONG - createQuote doesn't exist
const { createQuote } = await import('@/lib/wise/transfers');
const quote = await createQuote({...});

// ✅ CORRECT - Let createTransfer handle it
// Just call payoutToCreator, it handles everything including quotes
const payout = await payoutToCreator({...});
// Exchange rate info is in payout.wise_response or you can query transfer status
```

**Option B: Create quote helper function (if needed)**
If you need to show estimated exchange rate before payout, you could create a helper, but it's not necessary for MVP.

---

### 5. API Route Authentication - **MUST FIX**

**Problem:** The document uses incorrect authentication method for API routes.

**Fix:**
```typescript
// ❌ WRONG
import { createClient } from '@/lib/supabase/server';
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

// ✅ CORRECT - Use getSupabaseRouteClient for API routes
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(req: NextRequest) {
  const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const creatorId = user.id;
  // ... rest of code
}
```

**Why:** `getSupabaseRouteClient` handles both Bearer tokens (mobile) and cookies (web), making it compatible with both clients.

---

### 6. Currency Field Mismatch - **CHECK**

**Problem:** Need to verify if `creator_revenue` table has a `currency` field.

**Check Required:**
- Some schemas show `currency` field, some don't
- Verify actual database schema

**Fix (if currency field doesn't exist):**
```typescript
// Assume USD if currency not stored
const sourceCurrency = sourceCurrency || 'USD';  // Default to USD
```

---

## 🟡 Important Fixes

### 7. Bank Account Decryption

**Problem:** The document has placeholder decryption logic.

**Current Code:**
```typescript
async function decryptField(encryptedValue: string): Promise<string> {
  // TODO: Implement based on your encryption method
  return encryptedValue; // Placeholder
}
```

**Reality Check:**
Based on the bank account API (`apps/web/app/api/user/revenue/bank-account/route.ts`), it appears bank accounts might NOT be encrypted yet (see TODO comments). 

**Fix:**
```typescript
// Check if encryption is actually implemented
// If not encrypted, just return the value as-is for now
async function decryptField(encryptedValue: string): Promise<string> {
  // TODO: Implement proper decryption when encryption is added
  // For now, if values are stored unencrypted, return as-is
  return encryptedValue;
}
```

**Note:** This needs to be confirmed with the actual implementation. If encryption exists, implement proper decryption.

---

### 8. Identifier Type Handling

**Problem:** The document assumes we know what type of identifier is in `routing_number_encrypted`.

**Current Approach:**
The document suggests inferring from currency:
- `NGN` → `bank_code`
- `GHS`, `KES` → `swift_code`
- `ZAR` → `branch_code`

**This is correct**, but the actual field name mapping needs to match what `payoutToCreator` expects:

```typescript
// payoutToCreator expects 'bankCode' parameter
// For Nigeria: bankCode = routing_number_encrypted (which contains bank code)
// For Ghana/Kenya: bankCode = routing_number_encrypted (which contains SWIFT code)
// So the field name is consistent, just the content differs by country
```

**Fix in `bank-account-fetcher.ts`:**
```typescript
// The routing_number_encrypted field stores different things:
// - Nigeria: bank code (e.g., "044")
// - Ghana/Kenya: SWIFT code (e.g., "GTBIGHAC")
// - South Africa: branch code (e.g., "123456")

// But payoutToCreator expects 'bankCode' parameter for all of them
// So we can just pass routingIdentifier as bankCode
return {
  accountNumber,
  bankCode: routingIdentifier,  // Works for all countries
  accountHolderName: bankAccount.account_holder_name,
  currency: bankAccount.currency,
  country: getCountryFromCurrency(bankAccount.currency),
};
```

---

### 9. Error Handling for Missing Fields

**Problem:** The code doesn't handle cases where fields might be null/undefined.

**Fixes Needed:**

#### In `country-detection.ts`:
```typescript
// Add null checks
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('country_code')
  .eq('id', creatorId)
  .single();

if (profileError || !profile) {
  // Continue to next detection method
}
```

#### In `bank-account-fetcher.ts`:
```typescript
// Handle missing account_number_encrypted
if (!bankAccount.account_number_encrypted) {
  return null;
}

// Handle missing routing_number_encrypted  
if (!bankAccount.routing_number_encrypted) {
  return null;
}
```

---

## 📝 Corrected Code Snippets

### Corrected Country Detection

```typescript
// apps/web/src/lib/wise/country-detection.ts
import { createServiceClient } from '@/src/lib/supabase';

export async function detectCreatorCountry(
  creatorId: string
): Promise<CountryInfo> {
  const supabase = createServiceClient();

  // Try 1: Check profiles.country_code
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('country_code')
    .eq('id', creatorId)  // ✅ Fixed: profiles uses 'id', not 'creator_id'
    .single();

  if (!profileError && profile?.country_code) {
    const payoutMethod = WISE_COUNTRIES.includes(profile.country_code)
      ? 'wise'
      : 'stripe_connect';

    return {
      countryCode: profile.country_code,
      currency: getCurrencyForCountry(profile.country_code),
      payoutMethod,
    };
  }

  // Try 2: Infer from bank account currency
  const { data: bankAccount, error: bankError } = await supabase
    .from('creator_bank_accounts')
    .select('currency, routing_number_encrypted')
    .eq('user_id', creatorId)  // ✅ Fixed: uses 'user_id', not 'creator_id'
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bankError && bankAccount?.currency) {
    const countryCode = CURRENCY_TO_COUNTRY[bankAccount.currency] || 'US';
    const payoutMethod = WISE_COUNTRIES.includes(countryCode)
      ? 'wise'
      : 'stripe_connect';

    return {
      countryCode,
      currency: bankAccount.currency,
      payoutMethod,
    };
  }

  // Default
  return {
    countryCode: 'US',
    currency: 'USD',
    payoutMethod: 'stripe_connect',
  };
}
```

---

### Corrected Bank Account Fetcher

```typescript
// apps/web/src/lib/wise/bank-account-fetcher.ts
import { createServiceClient } from '@/src/lib/supabase';

export async function getCreatorBankAccount(
  creatorId: string
): Promise<CreatorBankAccount | null> {
  const supabase = createServiceClient();

  // Fetch verified bank account
  const { data: bankAccount, error } = await supabase
    .from('creator_bank_accounts')
    .select('*')
    .eq('user_id', creatorId)  // ✅ Fixed: uses 'user_id'
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !bankAccount) {
    return null;
  }

  // Decrypt fields (or use as-is if not encrypted)
  const accountNumber = await decryptField(
    bankAccount.account_number_encrypted || ''
  );
  const routingIdentifier = await decryptField(
    bankAccount.routing_number_encrypted || ''
  );

  if (!accountNumber || !routingIdentifier) {
    return null;
  }

  return {
    accountNumber,
    bankCode: routingIdentifier,  // Works for all countries (bank_code, swift_code, branch_code)
    accountHolderName: bankAccount.account_holder_name || '',
    currency: bankAccount.currency || 'USD',
    country: getCountryFromCurrency(bankAccount.currency || 'USD'),
  };
}

async function decryptField(encryptedValue: string): Promise<string> {
  // TODO: Implement proper decryption when encryption is added
  // For now, return as-is (may not be encrypted yet)
  return encryptedValue;
}
```

---

### Corrected Payout Request API

```typescript
// apps/web/app/api/creator/payouts/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { payoutToCreator } from '@/src/lib/wise/payout';
import { detectCreatorCountry } from '@/src/lib/wise/country-detection';
import { getCreatorBankAccount } from '@/src/lib/wise/bank-account-fetcher';

export async function POST(req: NextRequest) {
  try {
    // ✅ Fixed: Use getSupabaseRouteClient for authentication
    const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorId = user.id;

    // Parse request body
    const body = await req.json();
    const { amount, sourceCurrency } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // ✅ Fixed: Use service client for queries
    const serviceSupabase = createServiceClient();

    // Check creator balance
    const { data: revenue, error: revenueError } = await serviceSupabase
      .from('creator_revenue')
      .select('available_balance, currency')
      .eq('user_id', creatorId)  // ✅ Fixed: uses 'user_id'
      .single();

    if (revenueError || !revenue) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    if (revenue.available_balance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          available: revenue.available_balance,
          requested: amount,
        },
        { status: 400 }
      );
    }

    // Detect country and payout method
    const countryInfo = await detectCreatorCountry(creatorId);

    if (countryInfo.payoutMethod !== 'wise') {
      return NextResponse.json(
        {
          error: 'Payout method not supported',
          country: countryInfo.countryCode,
          message: 'Currently only supporting payouts to Nigeria, Ghana, and Kenya',
        },
        { status: 400 }
      );
    }

    // Fetch bank account
    const bankAccount = await getCreatorBankAccount(creatorId);

    if (!bankAccount) {
      return NextResponse.json(
        {
          error: 'No verified bank account found',
          message: 'Please add and verify your bank account first',
        },
        { status: 400 }
      );
    }

    // Determine source currency
    const actualSourceCurrency = sourceCurrency || revenue.currency || 'USD';

    // ✅ Fixed: payoutToCreator returns WisePayout directly, not PayoutResult
    try {
      const payout = await payoutToCreator({
        creatorId,
        amount: amount,  // Pass source amount - Wise will convert
        currency: countryInfo.currency,  // Target currency (NGN, GHS, KES)
        bankAccountNumber: bankAccount.accountNumber,
        bankCode: bankAccount.bankCode,
        accountHolderName: bankAccount.accountHolderName,
        sourceCurrency: actualSourceCurrency as 'GBP' | 'USD' | 'EUR',
        reason: 'Creator payout request',
      });

      // Deduct from creator balance
      const { error: updateError } = await serviceSupabase
        .from('creator_revenue')
        .update({
          available_balance: revenue.available_balance - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', creatorId);  // ✅ Fixed: uses 'user_id'

      if (updateError) {
        console.error('Failed to update creator balance:', updateError);
        // Note: Payout was created but balance not updated - needs reconciliation
      }

      // Return success
      return NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          sourceAmount: payout.source_amount || amount,
          sourceCurrency: payout.source_currency || actualSourceCurrency,
          exchangeRate: payout.exchange_rate,
          status: payout.status,
          wiseTransferId: payout.wise_transfer_id,
          bankAccount: {
            accountNumber: '****' + bankAccount.accountNumber.slice(-4),
            accountHolderName: bankAccount.accountHolderName,
          },
        },
      });

    } catch (error: any) {
      // ✅ Fixed: Handle errors from payoutToCreator
      console.error('Payout creation error:', error);
      return NextResponse.json(
        {
          error: 'Payout failed',
          message: error.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Creator payout request error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Note:** There's a critical issue here - `payoutToCreator` expects `amount` in target currency (NGN/GHS/KES), but we're passing source currency amount (USD/GBP). We need to handle this conversion. See Issue #10 below.

---

### 10. Amount Conversion Issue - **CRITICAL**

**Problem:** `payoutToCreator` expects amount in **target currency** (NGN), but we're passing source currency amount (USD).

**Current `payoutToCreator` signature:**
```typescript
export async function payoutToCreator(params: PayoutToCreatorParams): Promise<WisePayout> {
  // params.amount is in target currency (NGN, GHS, KES)
  // params.sourceCurrency is source currency (USD, GBP, EUR)
  // Wise creates quote internally to convert
}
```

**Two Approaches:**

**Option A: Pass source amount, let Wise convert (Recommended)**
We need to modify `payoutToCreator` to accept source amount OR create a new wrapper function.

**Option B: Get quote first, then pass target amount**
Create quote to get target amount, then call `payoutToCreator` with target amount.

**Recommended Fix:** Create a helper function that gets quote first:

```typescript
// Add to apps/web/src/lib/wise/payout.ts or create new helper

/**
 * Get quote for currency conversion (for preview/estimation)
 */
export async function getConversionQuote(
  sourceCurrency: 'USD' | 'GBP' | 'EUR',
  targetCurrency: 'NGN' | 'GHS' | 'KES',
  sourceAmount: number
): Promise<{ targetAmount: number; rate: number; sourceAmount: number }> {
  const client = getWiseClient();
  
  const quote = await client.post<{
    sourceAmount: number;
    targetAmount: number;
    rate: number;
  }>('/v2/quotes', {
    sourceCurrency,
    targetCurrency,
    sourceAmount,
  });
  
  return {
    targetAmount: quote.targetAmount,
    rate: quote.rate,
    sourceAmount: quote.sourceAmount,
  };
}
```

Then in the payout request API:
```typescript
// Get quote to determine target amount
const { getConversionQuote } = await import('@/src/lib/wise/payout');
const quote = await getConversionQuote(
  actualSourceCurrency as 'USD' | 'GBP' | 'EUR',
  countryInfo.currency as 'NGN' | 'GHS' | 'KES',
  amount
);

// Now call payoutToCreator with target amount
const payout = await payoutToCreator({
  creatorId,
  amount: quote.targetAmount,  // ✅ Target currency amount
  currency: countryInfo.currency,
  bankAccountNumber: bankAccount.accountNumber,
  bankCode: bankAccount.bankCode,
  accountHolderName: bankAccount.accountHolderName,
  sourceCurrency: actualSourceCurrency as 'GBP' | 'USD' | 'EUR',
  reason: 'Creator payout request',
});
```

---

## 📋 Summary of All Fixes

| Issue | File | Line/Function | Fix Required |
|-------|------|---------------|--------------|
| Supabase import | All new files | Import statement | Use `createServiceClient` from `@/src/lib/supabase` |
| Field name: creator_id → user_id | country-detection.ts | `detectCreatorCountry` | Change to `user_id` for `creator_bank_accounts` and `creator_revenue` |
| Field name: id (not creator_id) | country-detection.ts | `detectCreatorCountry` | Use `id` for `profiles` table |
| payoutToCreator return type | payout request API | `POST` handler | Handle `WisePayout` directly, not `PayoutResult` |
| createQuote doesn't exist | payout request API | Quote creation | Create `getConversionQuote` helper or modify approach |
| API auth method | All API routes | Authentication | Use `getSupabaseRouteClient` instead of `createClient` |
| Currency field | payout request API | Balance check | Handle case where `currency` field might not exist |
| Decryption placeholder | bank-account-fetcher.ts | `decryptField` | Confirm if encryption exists, implement if needed |
| Amount conversion | payout request API | Payout call | Need to convert source amount to target amount before calling `payoutToCreator` |

---

## ✅ Corrected File Structure

```
apps/web/
├── src/lib/wise/
│   ├── country-detection.ts (NEW - with fixes)
│   ├── bank-account-fetcher.ts (NEW - with fixes)
│   └── payout.ts (existing - may need getConversionQuote helper)
│
└── app/api/creator/
    ├── payouts/
    │   ├── request/
    │   │   └── route.ts (NEW - with fixes)
    │   ├── [id]/
    │   │   └── route.ts (NEW - with fixes)
    │   └── history/
    │       └── route.ts (NEW - with fixes)
    └── balance/
        └── route.ts (NEW - with fixes)
```

---

## 🧪 Testing Checklist (After Fixes)

- [ ] Test country detection with profile.country_code
- [ ] Test country detection with bank account currency
- [ ] Test bank account fetching with Nigerian account
- [ ] Test bank account fetching with Ghanaian account
- [ ] Test bank account fetching with Kenyan account
- [ ] Test payout request with sufficient balance
- [ ] Test payout request with insufficient balance
- [ ] Test payout request without bank account
- [ ] Test payout request with unverified bank account
- [ ] Verify balance is deducted after payout
- [ ] Verify payout record is created in `wise_payouts` table
- [ ] Test payout status endpoint
- [ ] Test payout history endpoint
- [ ] Test balance endpoint

---

## 📝 Additional Notes

1. **Currency Storage:** The `creator_revenue.currency` field may or may not exist. Check your actual schema and handle accordingly.

2. **Encryption:** Bank account encryption may not be implemented yet. Check the actual implementation in `apps/web/app/api/user/revenue/bank-account/route.ts` to confirm.

3. **Error Messages:** Make sure error messages are user-friendly and don't expose internal details.

4. **CORS Headers:** Don't forget to add CORS headers for mobile app requests:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

5. **Logging:** Add appropriate logging for debugging:
```typescript
console.log(`💰 Creator ${creatorId} requesting payout: ${amount} ${actualSourceCurrency}`);
```

---

**Last Updated:** December 29, 2025  
**Status:** Ready for Implementation (after fixes applied)

