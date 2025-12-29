# Wise Payout Usage Examples

**Purpose:** Code examples for using the Wise payout functions
**Date:** 2025-12-29
**Status:** Ready for Use

---

## Table of Contents

1. [Single Payout](#single-payout)
2. [Batch Payout](#batch-payout)
3. [Error Handling](#error-handling)
4. [Retry Failed Payouts](#retry-failed-payouts)
5. [Database Queries](#database-queries)
6. [Common Patterns](#common-patterns)

---

## Single Payout

### Basic Single Payout

```typescript
import { payoutToCreator } from '@/lib/wise';

async function sendPayoutToCreator() {
  const result = await payoutToCreator({
    creatorId: 'uuid-of-creator',
    amount: 50000,
    currency: 'NGN',
    bankAccountNumber: '0123456789',
    bankCode: '044', // Access Bank
    accountHolderName: 'John Doe',
    reason: 'Monthly earnings payout - December 2025'
  });

  if (result.success && result.payout) {
    console.log('✅ Payout successful!');
    console.log('Payout ID:', result.payout.id);
    console.log('Wise Transfer ID:', result.payout.wise_transfer_id);
    console.log('Status:', result.payout.status); // 'processing'

    // Show success message to user
    alert(`Payout of ₦${result.payout.amount.toLocaleString()} sent successfully!`);
  } else {
    console.error('❌ Payout failed:', result.error);
    console.error('Error code:', result.code);

    // Handle specific errors
    if (result.code === 'INSUFFICIENT_BALANCE') {
      alert('Insufficient Wise balance. Please top up your account.');
    } else if (result.code === 'INVALID_BANK_ACCOUNT') {
      alert('Invalid bank account details. Please verify and try again.');
    } else if (result.retryable) {
      alert('A temporary error occurred. Please try again in a moment.');
    } else {
      alert(`Payout failed: ${result.error}`);
    }
  }
}
```

### Payout with Metadata

```typescript
import { payoutToCreator } from '@/lib/wise';

async function payoutWithMetadata(creatorId: string, earnings: number) {
  const result = await payoutToCreator({
    creatorId,
    amount: earnings,
    currency: 'NGN',
    bankAccountNumber: '0123456789',
    bankCode: '044',
    accountHolderName: 'John Doe',
    reason: 'Monthly earnings',
    metadata: {
      // Add custom metadata for tracking
      period: 'December 2025',
      type: 'monthly_earnings',
      breakdown: {
        streams: 30000,
        tips: 15000,
        collaborations: 5000
      },
      initiated_from: 'admin_dashboard',
      admin_notes: 'Regular scheduled payout'
    }
  });

  return result;
}
```

### Multiple Currency Support

```typescript
import { payoutToCreator } from '@/lib/wise';
import type { WisePayoutCurrency } from '@/lib/types/wise';

async function payoutInLocalCurrency(
  creatorId: string,
  amount: number,
  country: 'NG' | 'GH' | 'KE'
) {
  // Map country to currency and bank details
  const currencyMap: Record<string, WisePayoutCurrency> = {
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES'
  };

  const currency = currencyMap[country];

  // Get creator's saved bank details from database
  const { data: bankDetails } = await supabase
    .from('creator_bank_accounts')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('currency', currency)
    .single();

  if (!bankDetails) {
    throw new Error('No bank account found for this currency');
  }

  const result = await payoutToCreator({
    creatorId,
    amount,
    currency,
    bankAccountNumber: bankDetails.account_number,
    bankCode: bankDetails.bank_code,
    accountHolderName: bankDetails.account_holder_name,
    reason: `Payout in ${currency}`
  });

  return result;
}
```

---

## Batch Payout

### Basic Batch Payout

```typescript
import { batchPayout } from '@/lib/wise';

async function payoutMultipleCreators() {
  const result = await batchPayout([
    {
      creatorId: 'creator-1-uuid',
      amount: 50000,
      currency: 'NGN',
      bankDetails: {
        accountNumber: '0123456789',
        bankCode: '044',
        accountHolderName: 'John Doe'
      },
      reason: 'Monthly earnings - December 2025'
    },
    {
      creatorId: 'creator-2-uuid',
      amount: 75000,
      currency: 'NGN',
      bankDetails: {
        accountNumber: '9876543210',
        bankCode: '058',
        accountHolderName: 'Jane Smith'
      },
      reason: 'Monthly earnings - December 2025'
    },
    {
      creatorId: 'creator-3-uuid',
      amount: 100000,
      currency: 'NGN',
      bankDetails: {
        accountNumber: '5555555555',
        bankCode: '057',
        accountHolderName: 'Bob Johnson'
      },
      reason: 'Monthly earnings - December 2025'
    }
  ]);

  console.log('📊 Batch Payout Results:');
  console.log(`Total processed: ${result.total}`);
  console.log(`Successful: ${result.summary.successCount} ✅`);
  console.log(`Failed: ${result.summary.failureCount} ❌`);

  // Show detailed results
  if (result.successful.length > 0) {
    console.log('\n✅ Successful Payouts:');
    result.successful.forEach(payout => {
      console.log(`  - ${payout.recipient_account_name}: ₦${payout.amount.toLocaleString()}`);
    });
  }

  if (result.failed.length > 0) {
    console.log('\n❌ Failed Payouts:');
    result.failed.forEach(failure => {
      console.log(`  - Creator ${failure.creatorId}: ${failure.error}`);
      if (failure.retryable) {
        console.log(`    → Can retry`);
      }
    });
  }

  return result;
}
```

### Batch Payout with Options

```typescript
import { batchPayout } from '@/lib/wise';

async function batchPayoutWithOptions() {
  const result = await batchPayout(
    [
      // ... payout items
    ],
    {
      // Process sequentially (one at a time)
      sequential: false,

      // Max 10 concurrent payouts
      maxConcurrent: 10,

      // Don't stop on first error (continue processing)
      stopOnError: false
    }
  );

  return result;
}
```

### Batch Payout from Database Query

```typescript
import { batchPayout } from '@/lib/wise';
import { supabase } from '@/lib/supabase';

async function payoutEligibleCreators() {
  // 1. Get all creators eligible for payout (e.g., earnings > minimum threshold)
  const { data: eligibleCreators } = await supabase
    .from('creator_earnings')
    .select(`
      creator_id,
      total_earnings,
      currency,
      profiles!inner(id, username),
      creator_bank_accounts!inner(account_number, bank_code, account_holder_name)
    `)
    .gte('total_earnings', 10000) // Minimum ₦10,000
    .eq('payout_status', 'pending');

  if (!eligibleCreators || eligibleCreators.length === 0) {
    console.log('No eligible creators for payout');
    return;
  }

  // 2. Transform to batch payout format
  const payouts = eligibleCreators.map(creator => ({
    creatorId: creator.creator_id,
    amount: creator.total_earnings,
    currency: creator.currency,
    bankDetails: {
      accountNumber: creator.creator_bank_accounts.account_number,
      bankCode: creator.creator_bank_accounts.bank_code,
      accountHolderName: creator.creator_bank_accounts.account_holder_name
    },
    reason: 'Scheduled monthly payout',
    metadata: {
      username: creator.profiles.username,
      payout_date: new Date().toISOString()
    }
  }));

  // 3. Process batch payout
  console.log(`Processing payouts for ${payouts.length} creators...`);

  const result = await batchPayout(payouts, {
    maxConcurrent: 5, // Process 5 at a time
    stopOnError: false // Continue even if some fail
  });

  // 4. Update database with results
  for (const payout of result.successful) {
    await supabase
      .from('creator_earnings')
      .update({
        payout_status: 'completed',
        payout_id: payout.id,
        paid_at: new Date().toISOString()
      })
      .eq('creator_id', payout.creator_id);
  }

  for (const failure of result.failed) {
    await supabase
      .from('creator_earnings')
      .update({
        payout_status: 'failed',
        payout_error: failure.error
      })
      .eq('creator_id', failure.creatorId);
  }

  console.log('Batch payout complete!');
  return result;
}
```

### Batch Payout Summary

```typescript
import { batchPayout, getBatchPayoutSummary } from '@/lib/wise';

async function runBatchAndShowSummary() {
  const result = await batchPayout([
    // ... payout items
  ]);

  // Get formatted summary
  const summary = getBatchPayoutSummary(result);
  console.log(summary);

  // Output:
  // ============================================================
  // BATCH PAYOUT SUMMARY
  // ============================================================
  // Total Payouts:      10
  // Successful:         8 ✅
  // Failed:             2 ❌
  //
  // TOTAL AMOUNTS:
  //   NGN: 500,000
  //
  // SUCCESSFUL AMOUNTS:
  //   NGN: 400,000
  //
  // FAILED AMOUNTS:
  //   NGN: 100,000
  //
  // FAILED PAYOUTS:
  //   Creator: creator-9-uuid
  //   Amount:  NGN 50,000
  //   Error:   Invalid bank account
  //   Code:    INVALID_BANK_ACCOUNT
  //   Retryable: No ❌
  // ============================================================
}
```

---

## Error Handling

### Handling Specific Errors

```typescript
import { payoutToCreator } from '@/lib/wise';

async function payoutWithErrorHandling(creatorId: string, amount: number) {
  const result = await payoutToCreator({
    creatorId,
    amount,
    currency: 'NGN',
    bankAccountNumber: '0123456789',
    bankCode: '044',
    accountHolderName: 'John Doe',
    reason: 'Payout'
  });

  if (result.success) {
    return { success: true, payoutId: result.payout?.id };
  }

  // Handle specific error codes
  switch (result.code) {
    case 'INSUFFICIENT_BALANCE':
      // Critical error - notify admin
      await notifyAdmin('Wise balance is low', {
        error: result.error,
        requiredAmount: amount
      });
      return {
        success: false,
        userMessage: 'Unable to process payout at this time. Our team has been notified.'
      };

    case 'INVALID_BANK_ACCOUNT':
      // User error - ask them to update bank details
      return {
        success: false,
        userMessage: 'Invalid bank account details. Please update your bank information and try again.'
      };

    case 'RATE_LIMIT_EXCEEDED':
      // Temporary error - suggest retry
      return {
        success: false,
        userMessage: 'Too many requests. Please try again in a few minutes.',
        retryAfter: 60 // seconds
      };

    case 'TIMEOUT':
    case 'NETWORK_ERROR':
    case 'SERVER_ERROR':
      // Retryable errors - can retry automatically
      if (result.retryable) {
        console.log('Retrying after temporary error...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return payoutWithErrorHandling(creatorId, amount); // Recursive retry
      }
      return {
        success: false,
        userMessage: 'A temporary error occurred. Please try again.'
      };

    case 'CREATOR_NOT_FOUND':
      // Data integrity error
      console.error('Creator not found:', creatorId);
      return {
        success: false,
        userMessage: 'Creator account not found. Please contact support.'
      };

    default:
      // Unknown error
      console.error('Unknown payout error:', result);
      return {
        success: false,
        userMessage: `Payout failed: ${result.error}`
      };
  }
}

async function notifyAdmin(subject: string, details: any) {
  // Send email/notification to admin
  console.log(`ADMIN ALERT: ${subject}`, details);
}
```

### Retry with Exponential Backoff (Manual)

```typescript
import { payoutToCreator, PayoutResult } from '@/lib/wise';

async function payoutWithManualRetry(
  params: PayoutToCreatorParams,
  maxRetries: number = 3
): Promise<PayoutResult> {
  let lastError: PayoutResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Payout attempt ${attempt}/${maxRetries}...`);

    const result = await payoutToCreator(params);

    if (result.success) {
      if (attempt > 1) {
        console.log(`✅ Payout succeeded on attempt ${attempt}`);
      }
      return result;
    }

    lastError = result;

    // Don't retry if error is not retryable
    if (!result.retryable) {
      console.log(`❌ Error is not retryable: ${result.code}`);
      break;
    }

    // Don't wait after last attempt
    if (attempt < maxRetries) {
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`❌ Payout failed after ${maxRetries} attempts`);
  return lastError!;
}
```

---

## Retry Failed Payouts

### Retry Failed Batch Payouts

```typescript
import { batchPayout, retryFailedPayouts } from '@/lib/wise';

async function runBatchWithRetry() {
  // 1. Run initial batch
  console.log('Running initial batch payout...');
  const initialResult = await batchPayout([
    // ... payout items
  ]);

  console.log(`Initial batch: ${initialResult.summary.successCount} succeeded, ${initialResult.summary.failureCount} failed`);

  // 2. Check for retryable failures
  const retryableFailures = initialResult.failed.filter(f => f.retryable);

  if (retryableFailures.length > 0) {
    console.log(`Retrying ${retryableFailures.length} retryable failures...`);

    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Retry failed payouts
    const retryResult = await retryFailedPayouts(initialResult.failed);

    console.log(`Retry batch: ${retryResult.summary.successCount} succeeded, ${retryResult.summary.failureCount} failed`);

    // 4. Combine results
    return {
      totalAttempted: initialResult.total,
      finalSuccessCount: initialResult.summary.successCount + retryResult.summary.successCount,
      finalFailureCount: retryResult.summary.failureCount,
      successful: [...initialResult.successful, ...retryResult.successful],
      permanentFailures: retryResult.failed.filter(f => !f.retryable)
    };
  }

  return {
    totalAttempted: initialResult.total,
    finalSuccessCount: initialResult.summary.successCount,
    finalFailureCount: initialResult.summary.failureCount,
    successful: initialResult.successful,
    permanentFailures: initialResult.failed
  };
}
```

---

## Database Queries

### Check Payout Status

```typescript
import { getPayoutById } from '@/lib/wise';

async function checkPayoutStatus(payoutId: string) {
  const result = await getPayoutById(payoutId);

  if (result.success && result.data) {
    const payout = result.data;

    console.log('Payout Status:', payout.status);
    console.log('Amount:', payout.amount, payout.currency);
    console.log('Created:', new Date(payout.created_at).toLocaleString());

    // Check status history
    if (payout.wise_status_history) {
      console.log('\nStatus History:');
      payout.wise_status_history.forEach(entry => {
        console.log(`  ${entry.timestamp}: ${entry.from_status} → ${entry.status}`);
        if (entry.error_message) {
          console.log(`    Error: ${entry.error_message}`);
        }
      });
    }

    return payout;
  } else {
    console.error('Payout not found:', result.error);
    return null;
  }
}
```

### Get Creator Payout History

```typescript
import { getCreatorPayouts } from '@/lib/wise';

async function getCreatorPayoutHistory(creatorId: string) {
  const result = await getCreatorPayouts({
    creator_id: creatorId,
    limit: 50,
    offset: 0
  });

  if (result.success && result.data) {
    console.log(`Found ${result.data.length} payouts for creator`);

    result.data.forEach(payout => {
      console.log(`${payout.created_at}: ${payout.currency} ${payout.amount} - ${payout.status}`);
    });

    return result.data;
  }

  return [];
}
```

### Get Creator Stats

```typescript
import { getCreatorPayoutStats } from '@/lib/wise';

async function showCreatorStats(creatorId: string) {
  const result = await getCreatorPayoutStats(creatorId);

  if (result.success && result.data) {
    console.log('Creator Payout Statistics:');

    result.data.forEach(stats => {
      console.log(`\n${stats.currency}:`);
      console.log(`  Total Payouts: ${stats.total_payouts}`);
      console.log(`  Successful: ${stats.successful_payouts}`);
      console.log(`  Failed: ${stats.failed_payouts}`);
      console.log(`  Pending: ${stats.pending_payouts}`);
      console.log(`  Total Paid Out: ${stats.currency} ${stats.total_paid_out?.toLocaleString() || 0}`);
      console.log(`  Last Payout: ${stats.last_payout_at ? new Date(stats.last_payout_at).toLocaleDateString() : 'Never'}`);
    });
  }
}
```

---

## Common Patterns

### Scheduled Monthly Payouts

```typescript
import { batchPayout } from '@/lib/wise';
import { supabase } from '@/lib/supabase';

/**
 * Run monthly payouts for all eligible creators
 * Schedule this to run on the 1st of every month
 */
async function runMonthlyPayouts() {
  console.log('🗓️  Starting monthly payout process...');

  // 1. Get all creators with pending earnings
  const { data: creators } = await supabase
    .rpc('get_creators_for_monthly_payout', {
      minimum_amount: 10000 // Minimum ₦10,000 to payout
    });

  if (!creators || creators.length === 0) {
    console.log('No creators eligible for payout this month');
    return;
  }

  console.log(`Found ${creators.length} creators eligible for payout`);

  // 2. Prepare batch payout
  const payouts = creators.map(creator => ({
    creatorId: creator.id,
    amount: creator.pending_earnings,
    currency: creator.currency,
    bankDetails: {
      accountNumber: creator.account_number,
      bankCode: creator.bank_code,
      accountHolderName: creator.account_holder_name
    },
    reason: `Monthly earnings - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    metadata: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      payout_type: 'scheduled_monthly'
    }
  }));

  // 3. Process batch with rate limiting
  const result = await batchPayout(payouts, {
    maxConcurrent: 5, // Don't overwhelm Wise API
    stopOnError: false
  });

  // 4. Log results
  console.log(`✅ Successfully paid out to ${result.summary.successCount} creators`);
  console.log(`❌ Failed payouts: ${result.summary.failureCount}`);

  // 5. Send email summary to admin
  await sendAdminEmail('Monthly Payout Summary', {
    total: result.total,
    successful: result.summary.successCount,
    failed: result.summary.failureCount,
    totalAmount: result.summary.totalAmount,
    failedPayouts: result.failed
  });

  return result;
}
```

### Payout with Balance Check

```typescript
import { payoutToCreator } from '@/lib/wise';
import { wiseClient } from '@/lib/wise';

async function payoutWithBalanceCheck(
  creatorId: string,
  amount: number,
  currency: 'NGN' | 'GHS' | 'KES'
) {
  // 1. Check Wise balance first
  const balances = await wiseClient.get('/v1/borderless-accounts/balances');
  const balanceInUSD = balances.find((b: any) => b.currency === 'USD')?.amount || 0;

  // Estimate required USD (rough conversion)
  const conversionRates: Record<string, number> = {
    NGN: 1600, // 1 USD = 1600 NGN (approximate)
    GHS: 12,   // 1 USD = 12 GHS
    KES: 130   // 1 USD = 130 KES
  };

  const requiredUSD = amount / conversionRates[currency];

  if (balanceInUSD < requiredUSD) {
    console.error('❌ Insufficient Wise balance');
    return {
      success: false,
      error: 'Insufficient balance in Wise account',
      code: 'INSUFFICIENT_BALANCE',
      retryable: false,
      details: {
        currentBalance: balanceInUSD,
        required: requiredUSD,
        deficit: requiredUSD - balanceInUSD
      }
    };
  }

  // 2. Proceed with payout
  return payoutToCreator({
    creatorId,
    amount,
    currency,
    // ... other params
  });
}
```

---

## Best Practices

1. **Always handle errors:** Check `result.success` before accessing `result.payout`
2. **Use metadata:** Store additional context for debugging and auditing
3. **Implement retries:** For retryable errors (`result.retryable === true`)
4. **Log everything:** Payouts are financial transactions - log all attempts
5. **Batch when possible:** Use `batchPayout` for multiple creators
6. **Monitor balance:** Check Wise balance before large batches
7. **Rate limiting:** Don't exceed Wise API limits (use `maxConcurrent`)
8. **Audit trail:** Store payout records in database for compliance

---

## Questions?

Refer to:
- [src/lib/wise/payout.ts](src/lib/wise/payout.ts) - Main payout function
- [src/lib/wise/batch-payout.ts](src/lib/wise/batch-payout.ts) - Batch payout function
- [WISE_ADMIN_PAYOUT_API_SPECIFICATION.md](WISE_ADMIN_PAYOUT_API_SPECIFICATION.md) - Backend API spec
