# Critical Fixes Applied to Creator Payout Implementation

**Date:** December 29, 2025
**Status:** CORRECTED
**Reference:** MOBILE_TEAM_IMPLEMENTATION_CORRECTIONS.md

---

## Summary of Corrections Applied

All critical fixes from MOBILE_TEAM_IMPLEMENTATION_CORRECTIONS.md have been applied to CREATOR_PAYOUT_AUTOMATION_IMPLEMENTATION.md:

### ✅ Fixed Issues

1. **Supabase Client Import** - Changed from `@/lib/supabase/server` to `@/src/lib/supabase`
2. **Database Field Names** - Changed `creator_id` to `user_id` for `creator_revenue` and `creator_bank_accounts`
3. **Profiles Table** - Uses `id` field (not `creator_id`)
4. **API Authentication** - Uses `getSupabaseRouteClient` from `@/src/lib/api-auth`
5. **Service Client** - Added `createServiceClient()` for database queries
6. **Null Checks** - Added comprehensive null/undefined checks
7. **Decryption Placeholder** - Updated with proper TODO comments

### ⚠️ Remaining Critical Issues

These issues require additional code that wasn't in the original implementation guide:

#### 1. **Quote/Currency Conversion Helper** (CRITICAL)

**Problem:** `payoutToCreator()` expects amount in target currency (NGN), but we're passing source currency amount (USD).

**Solution:** Add this helper function to `apps/web/src/lib/wise/payout.ts`:

```typescript
/**
 * Get currency conversion quote
 * Use this to preview exchange rate before creating payout
 */
export async function getConversionQuote(
  sourceCurrency: 'USD' | 'GBP' | 'EUR',
  targetCurrency: 'NGN' | 'GHS' | 'KES',
  sourceAmount: number
): Promise<{
  targetAmount: number;
  rate: number;
  sourceAmount: number;
  fee: number;
}> {
  const response = await fetch(
    `https://api.wise.com/v2/quotes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        profile: parseInt(process.env.WISE_PROFILE_ID || '0'),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get quote: ${response.status}`);
  }

  const quote = await response.json();

  return {
    targetAmount: quote.targetAmount,
    rate: quote.rate,
    sourceAmount: quote.sourceAmount,
    fee: quote.fee,
  };
}
```

**Then update the payout request API:**

```typescript
// After detecting country and fetching bank account...

// Get quote to determine target amount
import { getConversionQuote } from '@/src/lib/wise/payout';

const quote = await getConversionQuote(
  actualSourceCurrency as 'USD' | 'GBP' | 'EUR',
  countryInfo.currency as 'NGN' | 'GHS' | 'KES',
  amount
);

// Now call payoutToCreator with TARGET amount
const payout = await payoutToCreator({
  creatorId,
  amount: quote.targetAmount,  // ✅ Target currency amount (NGN)
  currency: countryInfo.currency,
  bankAccountNumber: bankAccount.accountNumber,
  bankCode: bankAccount.bankCode,
  accountHolderName: bankAccount.accountHolderName,
  sourceCurrency: actualSourceCurrency as 'GBP' | 'USD' | 'EUR',
  reason: 'Creator payout request',
});
```

---

#### 2. **PayoutToCreator Return Type** (CRITICAL)

**Problem:** The guide assumes `payoutToCreator()` returns `PayoutResult` with `success` field, but it actually returns `WisePayout` directly or throws an error.

**Solution:** Wrap in try-catch block:

```typescript
// ❌ WRONG (in original guide)
const payoutResult = await payoutToCreator({...});
if (!payoutResult.success) {
  return NextResponse.json({ error: payoutResult.error }, { status: 500 });
}

// ✅ CORRECT
try {
  const payout = await payoutToCreator({
    creatorId,
    amount: quote.targetAmount,  // Target currency
    currency: countryInfo.currency,
    bankAccountNumber: bankAccount.accountNumber,
    bankCode: bankAccount.bankCode,
    accountHolderName: bankAccount.accountHolderName,
    sourceCurrency: actualSourceCurrency as 'GBP' | 'USD' | 'EUR',
    reason: 'Creator payout request',
  });

  // Success - payout was created
  // Continue with balance update...

} catch (error: any) {
  console.error('Payout creation error:', error);
  return NextResponse.json(
    {
      error: 'Payout failed',
      message: error.message || 'Unknown error',
    },
    { status: 500 }
  );
}
```

---

#### 3. **Balance Update Query** (CRITICAL)

**Fix the balance update to use `user_id`:**

```typescript
// Deduct from creator balance
const { error: updateError } = await serviceSupabase
  .from('creator_revenue')
  .update({
    available_balance: revenue.available_balance - amount,
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', creatorId);  // ✅ CORRECTED: uses 'user_id'
```

---

## Complete Corrected Payout Request API

Here's the fully corrected version:

```typescript
// apps/web/app/api/creator/payouts/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { payoutToCreator, getConversionQuote } from '@/src/lib/wise/payout';
import { detectCreatorCountry } from '@/src/lib/wise/country-detection';
import { getCreatorBankAccount } from '@/src/lib/wise/bank-account-fetcher';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorId = user.id;

    // 2. Parse request
    const body = await req.json();
    const { amount, sourceCurrency } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 3. Check balance
    const serviceSupabase = createServiceClient();

    const { data: revenue, error: revenueError } = await serviceSupabase
      .from('creator_revenue')
      .select('available_balance, currency')
      .eq('user_id', creatorId)
      .single();

    if (revenueError || !revenue) {
      return NextResponse.json({ error: 'Revenue record not found' }, { status: 404 });
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

    // 4. Detect country
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

    // 5. Fetch bank account
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

    // 6. Get conversion quote
    const actualSourceCurrency = sourceCurrency || revenue.currency || 'USD';

    const quote = await getConversionQuote(
      actualSourceCurrency as 'USD' | 'GBP' | 'EUR',
      countryInfo.currency as 'NGN' | 'GHS' | 'KES',
      amount
    );

    // 7. Create payout
    try {
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

      // 8. Update balance
      const { error: updateError } = await serviceSupabase
        .from('creator_revenue')
        .update({
          available_balance: revenue.available_balance - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', creatorId);

      if (updateError) {
        console.error('Failed to update balance:', updateError);
        // Payout created but balance not updated - needs reconciliation
      }

      // 9. Return success
      return NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          sourceAmount: amount,
          sourceCurrency: actualSourceCurrency,
          exchangeRate: quote.rate,
          status: payout.status,
          wiseTransferId: payout.wise_transfer_id,
          bankAccount: {
            accountNumber: '****' + bankAccount.accountNumber.slice(-4),
            accountHolderName: bankAccount.accountHolderName,
          },
        },
      });

    } catch (error: any) {
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
    console.error('Request error:', error);
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

---

## Other API Routes - Similar Fixes

Apply same pattern to other API routes:

### GET /api/creator/payouts/[id]

```typescript
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: payout, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('id', params.id)
    .eq('creator_id', user.id)  // ✅ wise_payouts uses 'creator_id' (correct)
    .single();

  // ... rest
}
```

### GET /api/creator/payouts/history

```typescript
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(req: NextRequest) {
  const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: payouts, error } = await supabase
    .from('wise_payouts')
    .select('*')
    .eq('creator_id', user.id)  // ✅ wise_payouts uses 'creator_id' (correct)
    .order('created_at', { ascending: false })
    .limit(20);

  // ... rest
}
```

### GET /api/creator/balance

```typescript
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(req: NextRequest) {
  const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceSupabase = createServiceClient();

  const { data: revenue, error } = await serviceSupabase
    .from('creator_revenue')
    .select('available_balance, pending_balance, currency, total_earnings')
    .eq('user_id', user.id)  // ✅ creator_revenue uses 'user_id'
    .single();

  // ... rest
}
```

---

## Implementation Checklist

Before implementing, ensure:

- [ ] Add `getConversionQuote()` helper to `apps/web/src/lib/wise/payout.ts`
- [ ] All imports use correct paths (`@/src/lib/...`)
- [ ] All auth uses `getSupabaseRouteClient`
- [ ] Database queries use `createServiceClient()`
- [ ] `creator_revenue` queries use `user_id`
- [ ] `creator_bank_accounts` queries use `user_id`
- [ ] `wise_payouts` queries use `creator_id` (this is correct!)
- [ ] `profiles` queries use `id`
- [ ] `payoutToCreator()` wrapped in try-catch
- [ ] Amount conversion happens before calling `payoutToCreator()`
- [ ] All null checks in place

---

**Status:** All critical corrections documented
**Next:** Implement with corrections applied
**Last Updated:** December 29, 2025
