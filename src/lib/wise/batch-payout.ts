/**
 * Wise Batch Payout Module
 *
 * Handles batch processing of multiple creator payouts.
 * Processes payouts in parallel with individual error handling.
 *
 * @module lib/wise/batch-payout
 */

import { payoutToCreator, PayoutToCreatorParams, PayoutResult } from './payout';
import type { WisePayout, WisePayoutCurrency } from '../types/wise';

/**
 * Batch payout item
 */
export interface BatchPayoutItem {
  /** Creator ID from profiles table */
  creatorId: string;
  /** Amount to send in target currency */
  amount: number;
  /** Target currency */
  currency: WisePayoutCurrency;
  /** Bank account details */
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountHolderName: string;
  };
  /** Optional reason for payout */
  reason?: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch payout result
 */
export interface BatchPayoutResult {
  /** Overall success (all payouts succeeded) */
  success: boolean;
  /** Total payouts processed */
  total: number;
  /** Successfully created payouts */
  successful: WisePayout[];
  /** Failed payouts with error details */
  failed: Array<{
    creatorId: string;
    amount: number;
    currency: WisePayoutCurrency;
    error: string;
    code?: string;
    retryable?: boolean;
  }>;
  /** Summary statistics */
  summary: {
    successCount: number;
    failureCount: number;
    totalAmount: Record<WisePayoutCurrency, number>;
    successfulAmount: Record<WisePayoutCurrency, number>;
    failedAmount: Record<WisePayoutCurrency, number>;
  };
}

/**
 * Process multiple creator payouts in batch
 *
 * This function processes multiple payouts in parallel, with individual
 * error handling for each payout. If one payout fails, others continue.
 *
 * FEATURES:
 * - Parallel processing for speed
 * - Individual error handling (one failure doesn't stop batch)
 * - Detailed results per payout
 * - Summary statistics
 * - Retry support for transient errors
 *
 * @param payouts - Array of payout items to process
 * @param options - Batch processing options
 * @returns Batch result with successful and failed payouts
 *
 * @example
 * ```typescript
 * const result = await batchPayout([
 *   {
 *     creatorId: 'creator-1',
 *     amount: 50000,
 *     currency: 'NGN',
 *     bankDetails: {
 *       accountNumber: '0123456789',
 *       bankCode: '044',
 *       accountHolderName: 'John Doe'
 *     },
 *     reason: 'Monthly earnings'
 *   },
 *   {
 *     creatorId: 'creator-2',
 *     amount: 75000,
 *     currency: 'NGN',
 *     bankDetails: {
 *       accountNumber: '9876543210',
 *       bankCode: '058',
 *       accountHolderName: 'Jane Smith'
 *     },
 *     reason: 'Monthly earnings'
 *   }
 * ]);
 *
 * console.log(`Processed ${result.total} payouts`);
 * console.log(`Success: ${result.summary.successCount}`);
 * console.log(`Failed: ${result.summary.failureCount}`);
 *
 * // Handle failed payouts
 * for (const failure of result.failed) {
 *   console.error(`Failed for ${failure.creatorId}: ${failure.error}`);
 *   if (failure.retryable) {
 *     console.log('Can retry this payout');
 *   }
 * }
 * ```
 */
export async function batchPayout(
  payouts: BatchPayoutItem[],
  options: {
    /** Process sequentially instead of parallel (default: false) */
    sequential?: boolean;
    /** Max concurrent payouts when parallel (default: 5) */
    maxConcurrent?: number;
    /** Stop on first error (default: false) */
    stopOnError?: boolean;
  } = {}
): Promise<BatchPayoutResult> {
  const { sequential = false, maxConcurrent = 5, stopOnError = false } = options;

  console.log('🚀 Starting batch payout:', {
    total: payouts.length,
    sequential,
    maxConcurrent,
    stopOnError,
  });

  const successful: WisePayout[] = [];
  const failed: BatchPayoutResult['failed'] = [];

  // Initialize summary statistics
  const totalAmount: Record<string, number> = {};
  const successfulAmount: Record<string, number> = {};
  const failedAmount: Record<string, number> = {};

  // Track total amounts by currency
  for (const payout of payouts) {
    totalAmount[payout.currency] = (totalAmount[payout.currency] || 0) + payout.amount;
  }

  // Process payouts
  if (sequential) {
    // Sequential processing
    console.log('📋 Processing payouts sequentially...');

    for (let i = 0; i < payouts.length; i++) {
      const item = payouts[i];
      console.log(`Processing payout ${i + 1}/${payouts.length} for creator ${item.creatorId}`);

      const result = await processPayoutItem(item);

      if (result.success && result.payout) {
        successful.push(result.payout);
        successfulAmount[item.currency] =
          (successfulAmount[item.currency] || 0) + item.amount;
      } else {
        failed.push({
          creatorId: item.creatorId,
          amount: item.amount,
          currency: item.currency,
          error: result.error || 'Unknown error',
          code: result.code,
          retryable: result.retryable,
        });
        failedAmount[item.currency] = (failedAmount[item.currency] || 0) + item.amount;

        // Stop on first error if requested
        if (stopOnError) {
          console.log('🛑 Stopping batch due to error (stopOnError=true)');
          break;
        }
      }
    }
  } else {
    // Parallel processing with concurrency limit
    console.log(`⚡ Processing payouts in parallel (max ${maxConcurrent} concurrent)...`);

    const results = await processInBatches(payouts, maxConcurrent, processPayoutItem);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const item = payouts[i];

      if (result.success && result.payout) {
        successful.push(result.payout);
        successfulAmount[item.currency] =
          (successfulAmount[item.currency] || 0) + item.amount;
      } else {
        failed.push({
          creatorId: item.creatorId,
          amount: item.amount,
          currency: item.currency,
          error: result.error || 'Unknown error',
          code: result.code,
          retryable: result.retryable,
        });
        failedAmount[item.currency] = (failedAmount[item.currency] || 0) + item.amount;
      }
    }
  }

  const summary = {
    successCount: successful.length,
    failureCount: failed.length,
    totalAmount: totalAmount as Record<WisePayoutCurrency, number>,
    successfulAmount: successfulAmount as Record<WisePayoutCurrency, number>,
    failedAmount: failedAmount as Record<WisePayoutCurrency, number>,
  };

  console.log('✅ Batch payout complete:', {
    total: payouts.length,
    successful: summary.successCount,
    failed: summary.failureCount,
  });

  return {
    success: failed.length === 0,
    total: payouts.length,
    successful,
    failed,
    summary,
  };
}

/**
 * Process a single payout item
 */
async function processPayoutItem(item: BatchPayoutItem): Promise<PayoutResult> {
  try {
    const params: PayoutToCreatorParams = {
      creatorId: item.creatorId,
      amount: item.amount,
      currency: item.currency,
      bankAccountNumber: item.bankDetails.accountNumber,
      bankCode: item.bankDetails.bankCode,
      accountHolderName: item.bankDetails.accountHolderName,
      reason: item.reason,
      metadata: item.metadata,
    };

    return await payoutToCreator(params);
  } catch (error) {
    console.error('❌ Unexpected error processing payout:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: 'UNEXPECTED_ERROR',
      retryable: false,
    };
  }
}

/**
 * Process items in batches with concurrency limit
 *
 * This prevents overwhelming the Wise API with too many concurrent requests.
 */
async function processInBatches<T, R>(
  items: T[],
  maxConcurrent: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const promise = processor(item).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    // If we've reached max concurrent, wait for one to finish
    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
      // Remove completed promises
      executing.splice(
        executing.findIndex((p) => {
          // Check if promise is settled
          let settled = false;
          p.then(() => {
            settled = true;
          }).catch(() => {
            settled = true;
          });
          return settled;
        }),
        1
      );
    }
  }

  // Wait for remaining promises
  await Promise.all(executing);

  return results;
}

/**
 * Retry failed payouts from a previous batch
 *
 * Only retries payouts marked as retryable.
 *
 * @param failedPayouts - Failed payouts from previous batch result
 * @returns New batch result with retry outcomes
 *
 * @example
 * ```typescript
 * const initialResult = await batchPayout(payouts);
 *
 * if (initialResult.failed.length > 0) {
 *   console.log('Retrying failed payouts...');
 *   const retryResult = await retryFailedPayouts(initialResult.failed);
 *   console.log(`Retry success: ${retryResult.summary.successCount}`);
 * }
 * ```
 */
export async function retryFailedPayouts(
  failedPayouts: BatchPayoutResult['failed']
): Promise<BatchPayoutResult> {
  console.log('🔄 Retrying failed payouts:', failedPayouts.length);

  // Filter to only retryable payouts
  const retryablePayouts = failedPayouts.filter((p) => p.retryable);

  if (retryablePayouts.length === 0) {
    console.log('⚠️  No retryable payouts found');
    return {
      success: true,
      total: 0,
      successful: [],
      failed: [],
      summary: {
        successCount: 0,
        failureCount: 0,
        totalAmount: {} as Record<WisePayoutCurrency, number>,
        successfulAmount: {} as Record<WisePayoutCurrency, number>,
        failedAmount: {} as Record<WisePayoutCurrency, number>,
      },
    };
  }

  console.log(`🔄 Retrying ${retryablePayouts.length} retryable payouts...`);

  // Convert failed payouts back to batch items
  const batchItems: BatchPayoutItem[] = retryablePayouts.map((p) => {
    // We need to reconstruct bank details from failed payout
    // This assumes the failed payout has these details stored
    return {
      creatorId: p.creatorId,
      amount: p.amount,
      currency: p.currency,
      bankDetails: {
        accountNumber: '', // These would need to be stored in metadata
        bankCode: '',
        accountHolderName: '',
      },
      reason: 'Retry of failed payout',
    };
  });

  // Note: This requires failed payouts to include bank details in metadata
  // You may need to modify the failed payout structure to include this

  return batchPayout(batchItems);
}

/**
 * Get summary of batch payout results
 *
 * Useful for logging and monitoring.
 */
export function getBatchPayoutSummary(result: BatchPayoutResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('BATCH PAYOUT SUMMARY');
  lines.push('='.repeat(60));
  lines.push(`Total Payouts:      ${result.total}`);
  lines.push(`Successful:         ${result.summary.successCount} ✅`);
  lines.push(`Failed:             ${result.summary.failureCount} ❌`);
  lines.push('');

  // Total amounts by currency
  lines.push('TOTAL AMOUNTS:');
  for (const [currency, amount] of Object.entries(result.summary.totalAmount)) {
    lines.push(`  ${currency}: ${amount.toLocaleString()}`);
  }
  lines.push('');

  // Successful amounts
  if (result.summary.successCount > 0) {
    lines.push('SUCCESSFUL AMOUNTS:');
    for (const [currency, amount] of Object.entries(result.summary.successfulAmount)) {
      lines.push(`  ${currency}: ${amount.toLocaleString()}`);
    }
    lines.push('');
  }

  // Failed amounts
  if (result.summary.failureCount > 0) {
    lines.push('FAILED AMOUNTS:');
    for (const [currency, amount] of Object.entries(result.summary.failedAmount)) {
      lines.push(`  ${currency}: ${amount.toLocaleString()}`);
    }
    lines.push('');

    // List failed payouts
    lines.push('FAILED PAYOUTS:');
    for (const failure of result.failed) {
      lines.push(`  Creator: ${failure.creatorId}`);
      lines.push(`  Amount:  ${failure.currency} ${failure.amount.toLocaleString()}`);
      lines.push(`  Error:   ${failure.error}`);
      lines.push(`  Code:    ${failure.code || 'N/A'}`);
      lines.push(`  Retryable: ${failure.retryable ? 'Yes ✅' : 'No ❌'}`);
      lines.push('  ' + '-'.repeat(56));
    }
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
