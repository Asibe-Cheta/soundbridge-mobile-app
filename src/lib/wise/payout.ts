/**
 * Wise Payout Module
 *
 * Main function for sending money to creators via Wise.
 * Handles the complete payout flow: validation, account verification,
 * recipient creation/lookup, transfer creation, and database tracking.
 *
 * @module lib/wise/payout
 */

import { supabase } from '../supabase';
import { resolveAccount, createRecipient, createTransfer } from './transfers';
import { createPayoutRecord, updatePayoutStatus } from './database';
import { WiseAPIError } from './client';
import type {
  WisePayout,
  WisePayoutCurrency,
  WiseRecipient,
  WiseTransfer,
} from '../types/wise';

/**
 * Payout parameters
 */
export interface PayoutToCreatorParams {
  /** Creator ID from profiles table */
  creatorId: string;
  /** Amount to send in target currency */
  amount: number;
  /** Target currency (NGN, GHS, KES, etc.) */
  currency: WisePayoutCurrency;
  /** Bank account number */
  bankAccountNumber: string;
  /** Bank code (e.g., '044' for Access Bank Nigeria) */
  bankCode: string;
  /** Account holder name (will be verified) */
  accountHolderName: string;
  /** Optional reason/description for payout */
  reason?: string;
  /** Optional metadata to store with payout */
  metadata?: Record<string, any>;
}

/**
 * Payout result
 */
export interface PayoutResult {
  /** Whether payout was successful */
  success: boolean;
  /** Payout database record */
  payout?: WisePayout;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  code?: string;
  /** Whether error is retryable */
  retryable?: boolean;
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Send money to a creator via Wise
 *
 * This is the main entry point for creator payouts. It handles the complete
 * flow from validation to transfer creation and database tracking.
 *
 * FLOW:
 * 1. Validate inputs
 * 2. Check creator exists
 * 3. Verify bank account
 * 4. Create database record
 * 5. Create or get Wise recipient
 * 6. Create Wise transfer
 * 7. Update database with transfer details
 *
 * @param params - Payout parameters
 * @returns Payout result with success status and data
 *
 * @example
 * ```typescript
 * const result = await payoutToCreator({
 *   creatorId: 'uuid-here',
 *   amount: 50000,
 *   currency: 'NGN',
 *   bankAccountNumber: '0123456789',
 *   bankCode: '044',
 *   accountHolderName: 'John Doe',
 *   reason: 'Monthly earnings payout'
 * });
 *
 * if (result.success) {
 *   console.log('Payout created:', result.payout?.id);
 *   console.log('Wise transfer ID:', result.payout?.wise_transfer_id);
 * } else {
 *   console.error('Payout failed:', result.error);
 *   if (result.retryable) {
 *     console.log('Error is retryable - please try again');
 *   }
 * }
 * ```
 */
export async function payoutToCreator(
  params: PayoutToCreatorParams
): Promise<PayoutResult> {
  const {
    creatorId,
    amount,
    currency,
    bankAccountNumber,
    bankCode,
    accountHolderName,
    reason,
    metadata = {},
  } = params;

  console.log('🚀 Starting payout to creator:', {
    creatorId,
    amount,
    currency,
    bankCode,
  });

  // ============================================================================
  // STEP 1: Validate inputs
  // ============================================================================

  // Validate required parameters
  if (!creatorId || !amount || !currency || !bankAccountNumber || !bankCode || !accountHolderName) {
    return {
      success: false,
      error: 'Missing required parameters',
      code: 'MISSING_PARAMS',
      retryable: false,
    };
  }

  // Validate amount is positive
  if (amount <= 0) {
    return {
      success: false,
      error: 'Amount must be greater than 0',
      code: 'INVALID_AMOUNT',
      retryable: false,
    };
  }

  // Validate currency is supported
  const supportedCurrencies: WisePayoutCurrency[] = ['NGN', 'GHS', 'KES', 'USD', 'EUR', 'GBP'];
  if (!supportedCurrencies.includes(currency)) {
    return {
      success: false,
      error: `Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`,
      code: 'UNSUPPORTED_CURRENCY',
      retryable: false,
    };
  }

  // ============================================================================
  // STEP 2: Verify creator exists
  // ============================================================================

  console.log('👤 Verifying creator exists...');

  const { data: creator, error: creatorError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', creatorId)
    .single();

  if (creatorError || !creator) {
    return {
      success: false,
      error: 'Creator not found',
      code: 'CREATOR_NOT_FOUND',
      retryable: false,
    };
  }

  console.log('✅ Creator verified:', creator.username);

  // ============================================================================
  // STEP 3: Resolve/verify bank account
  // ============================================================================

  console.log('🏦 Verifying bank account...');

  const accountVerification = await resolveAccount({
    accountNumber: bankAccountNumber,
    bankCode,
    currency,
  });

  if (!accountVerification.success) {
    return {
      success: false,
      error: accountVerification.error || 'Invalid bank account',
      code: 'INVALID_BANK_ACCOUNT',
      retryable: false,
    };
  }

  console.log('✅ Bank account verified:', {
    accountNumber: bankAccountNumber,
    bankName: accountVerification.bankName,
  });

  // ============================================================================
  // STEP 4: Create database record (status: pending)
  // ============================================================================

  const reference = `payout_${creatorId}_${Date.now()}`;
  const customerTransactionId = `soundbridge_${creatorId}_${Date.now()}`;

  console.log('💾 Creating payout record in database...');

  const dbResult = await createPayoutRecord({
    creator_id: creatorId,
    amount,
    currency,
    recipient_account_number: bankAccountNumber,
    recipient_account_name: accountHolderName,
    recipient_bank_code: bankCode,
    recipient_bank_name: accountVerification.bankName,
    reference,
    customer_transaction_id: customerTransactionId,
    metadata: {
      ...metadata,
      reason,
      creator_username: creator.username,
      creator_display_name: creator.display_name,
    },
  });

  if (!dbResult.success || !dbResult.data) {
    return {
      success: false,
      error: dbResult.error || 'Failed to create payout record',
      code: dbResult.code || 'DB_ERROR',
      retryable: dbResult.code === 'DUPLICATE_REFERENCE' ? false : true,
    };
  }

  const payoutId = dbResult.data.id;
  console.log('✅ Payout record created:', payoutId);

  // ============================================================================
  // STEP 5: Create or get Wise recipient
  // ============================================================================

  let recipientId: number;

  try {
    console.log('👥 Checking for existing recipient...');

    // Check if we already have a recipient for this creator + account combination
    const existingRecipient = await findExistingRecipient(creatorId, bankAccountNumber, currency);

    if (existingRecipient) {
      recipientId = existingRecipient.wise_recipient_id;
      console.log('✅ Using existing recipient:', recipientId);
    } else {
      console.log('📝 Creating new Wise recipient...');

      const recipient = await retryWithBackoff(
        () =>
          createRecipient({
            currency,
            accountHolderName,
            details: {
              accountNumber: bankAccountNumber,
              bankCode,
            },
          }),
        'createRecipient'
      );

      recipientId = recipient.id;
      console.log('✅ New recipient created:', recipientId);

      // Update payout record with recipient ID
      await updatePayoutStatus({
        payout_id: payoutId,
        status: 'pending',
        wise_recipient_id: recipientId.toString(),
      });
    }
  } catch (error) {
    console.error('❌ Failed to create/get recipient:', error);

    // Update payout record with error
    await updatePayoutStatus({
      payout_id: payoutId,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Failed to create recipient',
      error_code: 'RECIPIENT_CREATION_FAILED',
      failed_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recipient',
      code: 'RECIPIENT_CREATION_FAILED',
      retryable: isRetryableError(error),
    };
  }

  // ============================================================================
  // STEP 6: Create Wise transfer
  // ============================================================================

  let transfer: WiseTransfer;

  try {
    console.log('💸 Creating Wise transfer...');

    transfer = await retryWithBackoff(
      () =>
        createTransfer({
          targetCurrency: currency,
          targetAmount: amount,
          recipientId,
          reference: reason || `Payout to ${accountHolderName}`,
          customerTransactionId,
        }),
      'createTransfer'
    );

    console.log('✅ Wise transfer created:', {
      id: transfer.id,
      status: transfer.status,
      targetAmount: transfer.targetValue,
    });
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);

    // Update payout record with error
    await updatePayoutStatus({
      payout_id: payoutId,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Failed to create transfer',
      error_code: getErrorCode(error),
      failed_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transfer',
      code: getErrorCode(error),
      retryable: isRetryableError(error),
    };
  }

  // ============================================================================
  // STEP 7: Update database with transfer details
  // ============================================================================

  console.log('💾 Updating payout record with transfer details...');

  const updateResult = await updatePayoutStatus({
    payout_id: payoutId,
    status: 'processing',
    wise_transfer_id: transfer.id.toString(),
    wise_recipient_id: recipientId.toString(),
    wise_quote_id: transfer.quoteUuid,
    exchange_rate: transfer.rate,
    source_amount: transfer.sourceValue,
    source_currency: transfer.sourceCurrency,
    wise_fee: transfer.fee,
    wise_response: transfer as any,
  });

  if (!updateResult.success) {
    console.warn('⚠️  Failed to update payout record, but transfer was created:', updateResult.error);
  }

  // Get final payout record
  const finalPayout = updateResult.success ? updateResult.data : dbResult.data;

  console.log('🎉 Payout completed successfully!', {
    payoutId,
    transferId: transfer.id,
    amount,
    currency,
  });

  return {
    success: true,
    payout: finalPayout,
  };
}

/**
 * Find existing recipient for creator + account combination
 *
 * This prevents creating duplicate recipients in Wise.
 */
async function findExistingRecipient(
  creatorId: string,
  accountNumber: string,
  currency: WisePayoutCurrency
): Promise<{ wise_recipient_id: number } | null> {
  const { data } = await supabase
    .from('wise_payouts')
    .select('wise_recipient_id')
    .eq('creator_id', creatorId)
    .eq('recipient_account_number', accountNumber)
    .eq('currency', currency)
    .not('wise_recipient_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data && data.wise_recipient_id) {
    return {
      wise_recipient_id: parseInt(data.wise_recipient_id),
    };
  }

  return null;
}

/**
 * Retry a function with exponential backoff
 *
 * Used for transient errors like network timeouts or rate limits.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string,
  attempt: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Don't retry if error is not retryable
    if (!isRetryableError(error)) {
      throw error;
    }

    // Don't retry if max retries exceeded
    if (attempt >= RETRY_CONFIG.maxRetries) {
      console.error(`❌ Max retries (${RETRY_CONFIG.maxRetries}) exceeded for ${operation}`);
      throw error;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelayMs
    );

    console.log(`⏳ Retry ${attempt}/${RETRY_CONFIG.maxRetries} for ${operation} after ${delay}ms...`);

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Retry
    return retryWithBackoff(fn, operation, attempt + 1);
  }
}

/**
 * Check if error is retryable (network, timeout, rate limit)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof WiseAPIError) {
    // Rate limit errors (429)
    if (error.statusCode === 429) {
      return true;
    }

    // Server errors (5xx)
    if (error.statusCode && error.statusCode >= 500) {
      return true;
    }

    // Check error message for retryable patterns
    const retryablePatterns = [
      'timeout',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate limit',
      'too many requests',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern.toLowerCase()));
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('etimedout')
    );
  }

  return false;
}

/**
 * Get error code from error object
 */
function getErrorCode(error: unknown): string {
  if (error instanceof WiseAPIError) {
    // Map HTTP status codes to error codes
    if (error.statusCode === 400) {
      // Check for specific error types in message
      if (error.message.includes('balance')) {
        return 'INSUFFICIENT_BALANCE';
      }
      if (error.message.includes('account')) {
        return 'INVALID_ACCOUNT';
      }
      return 'INVALID_REQUEST';
    }

    if (error.statusCode === 401) {
      return 'UNAUTHORIZED';
    }

    if (error.statusCode === 403) {
      return 'FORBIDDEN';
    }

    if (error.statusCode === 429) {
      return 'RATE_LIMIT_EXCEEDED';
    }

    if (error.statusCode && error.statusCode >= 500) {
      return 'SERVER_ERROR';
    }

    return 'WISE_API_ERROR';
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (error.message.includes('network')) {
      return 'NETWORK_ERROR';
    }
  }

  return 'UNKNOWN_ERROR';
}
