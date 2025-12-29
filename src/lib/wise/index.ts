/**
 * Wise API Integration
 *
 * Main entry point for Wise API functionality.
 * Exports all transfer, recipient, and account verification functions.
 *
 * @module lib/wise
 *
 * @example
 * ```typescript
 * // Import everything
 * import * as Wise from '@/lib/wise';
 *
 * // Or import specific functions
 * import { createTransfer, getTransferStatus, resolveAccount } from '@/lib/wise';
 * ```
 */

// Export configuration
export {
  wiseConfig,
  isWiseConfigured,
  getWiseHeaders,
  getWiseEndpoint,
  isWiseProduction,
  isWiseSandbox,
  WISE_API_TOKEN,
  WISE_ENVIRONMENT,
  WISE_API_URL,
  WISE_WEBHOOK_SECRET,
  WISE_PROFILE_ID,
} from './config';

// Export client
export { WiseClient, wiseClient, WiseAPIError } from './client';

// Export transfer functions
export {
  createTransfer,
  getTransferStatus,
  createRecipient,
  resolveAccount,
  createQuote,
  fundTransfer,
  cancelTransfer,
} from './transfers';

// Export payout functions
export { payoutToCreator } from './payout';
export type { PayoutToCreatorParams, PayoutResult } from './payout';

// Export batch payout functions
export { batchPayout, retryFailedPayouts, getBatchPayoutSummary } from './batch-payout';
export type { BatchPayoutItem, BatchPayoutResult } from './batch-payout';

// Export database functions
export {
  createPayoutRecord,
  updatePayoutStatus,
  getCreatorPayouts,
  getPendingPayouts,
  getPayoutById,
  getPayoutByWiseTransferId,
  getPayoutByReference,
  getCreatorPayoutStats,
  getPendingPayoutsSummary,
  deletePayoutRecord,
} from './database';

// Export all types
export type {
  WiseCurrency,
  TransferStatus,
  AccountType,
  WiseErrorResponse,
  WiseProfile,
  WiseBalance,
  ResolveAccountParams,
  ResolveAccountResponse,
  CreateRecipientParams,
  WiseRecipient,
  CreateQuoteParams,
  WiseQuote,
  CreateTransferParams,
  WiseTransfer,
  GetTransferStatusParams,
  TransferStatusResponse,
  FundTransferParams,
  WiseClientConfig,
  BankCodeMap,
  BankInfo,
} from './types';

// Export bank codes
export { NIGERIAN_BANK_CODES, GHANAIAN_BANK_CODES, KENYAN_BANK_CODES } from './types';
