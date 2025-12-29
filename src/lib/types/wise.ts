/**
 * Wise Payout Database Types
 *
 * TypeScript type definitions for Wise payout records stored in Supabase.
 * These types match the database schema defined in migrations/create_wise_payouts_table.sql
 *
 * @module lib/types/wise
 */

/**
 * Wise payout status enum
 *
 * Tracks the lifecycle of a payout from creation to completion or failure.
 */
export enum WisePayoutStatus {
  /** Payout created but not yet sent to Wise */
  PENDING = 'pending',
  /** Payout is being processed by Wise */
  PROCESSING = 'processing',
  /** Payout successfully completed */
  COMPLETED = 'completed',
  /** Payout failed (error occurred) */
  FAILED = 'failed',
  /** Payout was cancelled */
  CANCELLED = 'cancelled',
  /** Payout was refunded */
  REFUNDED = 'refunded',
}

/**
 * Wise transfer status (from Wise API)
 *
 * These are the actual statuses returned by Wise API webhooks.
 */
export enum WiseTransferStatus {
  INCOMING_PAYMENT_WAITING = 'incoming_payment_waiting',
  PROCESSING = 'processing',
  FUNDS_CONVERTED = 'funds_converted',
  OUTGOING_PAYMENT_SENT = 'outgoing_payment_sent',
  BOUNCED_BACK = 'bounced_back',
  FUNDS_REFUNDED = 'funds_refunded',
  CHARGED_BACK = 'charged_back',
  CANCELLED = 'cancelled',
}

/**
 * Currency codes supported for Wise payouts
 */
export type WisePayoutCurrency = 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR' | 'GBP';

/**
 * Status history entry
 */
export interface WisePayoutStatusHistory {
  /** New status */
  status: WisePayoutStatus;
  /** When status changed */
  timestamp: string;
  /** Previous status */
  from_status?: WisePayoutStatus | null;
  /** Error message if applicable */
  error_message?: string | null;
}

/**
 * Wise Payout database record
 *
 * Matches the wise_payouts table schema in Supabase.
 */
export interface WisePayout {
  // Primary key
  id: string;

  // Creator reference
  creator_id: string;

  // Payout amount details
  amount: number;
  currency: WisePayoutCurrency;

  // Wise API identifiers
  wise_transfer_id: string | null;
  wise_recipient_id: string | null;
  wise_quote_id: string | null;

  // Status
  status: WisePayoutStatus;

  // Recipient bank account details
  recipient_account_number: string;
  recipient_account_name: string;
  recipient_bank_code: string;
  recipient_bank_name: string | null;

  // Reference and tracking
  reference: string;
  customer_transaction_id: string | null;

  // Exchange rate and fees
  exchange_rate: number | null;
  source_amount: number | null;
  source_currency: string | null;
  wise_fee: number | null;

  // Error tracking
  error_message: string | null;
  error_code: string | null;

  // Wise API responses (JSONB)
  wise_response: WiseAPIResponse | null;
  wise_status_history: WisePayoutStatusHistory[];

  // Metadata (flexible JSONB field)
  metadata: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
  deleted_at: string | null;
}

/**
 * Full Wise API response (stored in wise_response JSONB column)
 */
export interface WiseAPIResponse {
  /** Transfer details */
  transfer?: {
    id: number;
    status: string;
    sourceCurrency: string;
    sourceValue: number;
    targetCurrency: string;
    targetValue: number;
    rate: number;
    reference: string;
    created: string;
    [key: string]: any;
  };
  /** Quote details */
  quote?: {
    id: string;
    rate: number;
    fee: number;
    sourceAmount: number;
    targetAmount: number;
    [key: string]: any;
  };
  /** Recipient details */
  recipient?: {
    id: number;
    accountHolderName: string;
    currency: string;
    [key: string]: any;
  };
  /** Any other data */
  [key: string]: any;
}

/**
 * Wise webhook event payload
 *
 * This is the structure of webhook events sent by Wise to your endpoint.
 */
export interface WiseWebhookPayload {
  /** Event subscription ID */
  subscriptionId: string;
  /** Event ID (unique) */
  eventId: string;
  /** Profile ID */
  profileId: number;
  /** Event type */
  eventType: 'transfers#state-change' | 'transfers#active-cases' | 'balances#credit';
  /** Resource type */
  resourceType: 'transfers' | 'balances';
  /** Resource ID */
  resourceId: number;
  /** When event occurred */
  occurredAt: string;
  /** Event data */
  data: {
    /** Resource details */
    resource: {
      id: number;
      type: string;
      [key: string]: any;
    };
    /** Current state */
    current_state: WiseTransferStatus;
    /** Previous state */
    previous_state?: WiseTransferStatus;
    [key: string]: any;
  };
}

/**
 * Webhook signature verification
 */
export interface WiseWebhookHeaders {
  /** Webhook signature for verification */
  'x-signature': string;
  /** Delivery ID */
  'x-delivery-id'?: string;
  /** Event type */
  'x-event-type'?: string;
}

/**
 * Parameters for creating a payout record
 */
export interface CreatePayoutParams {
  creator_id: string;
  amount: number;
  currency: WisePayoutCurrency;
  recipient_account_number: string;
  recipient_account_name: string;
  recipient_bank_code: string;
  recipient_bank_name?: string;
  reference: string;
  customer_transaction_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating payout status
 */
export interface UpdatePayoutStatusParams {
  payout_id: string;
  status: WisePayoutStatus;
  wise_transfer_id?: string;
  wise_recipient_id?: string;
  wise_quote_id?: string;
  exchange_rate?: number;
  source_amount?: number;
  source_currency?: string;
  wise_fee?: number;
  error_message?: string;
  error_code?: string;
  wise_response?: WiseAPIResponse;
  completed_at?: string;
  failed_at?: string;
}

/**
 * Filters for querying creator payouts
 */
export interface GetCreatorPayoutsFilters {
  creator_id: string;
  status?: WisePayoutStatus;
  currency?: WisePayoutCurrency;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Payout summary statistics
 */
export interface PayoutSummary {
  total_payouts: number;
  successful_payouts: number;
  failed_payouts: number;
  pending_payouts: number;
  total_paid_out: number;
  currency: WisePayoutCurrency;
  last_payout_at: string | null;
}

/**
 * Pending payouts summary (by currency)
 */
export interface PendingPayoutsSummary {
  currency: WisePayoutCurrency;
  pending_count: number;
  total_amount: number;
  oldest_pending: string;
  newest_pending: string;
}

/**
 * Database response for payout operations
 */
export interface PayoutOperationResult<T = WisePayout> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Batch payout operation result
 */
export interface BatchPayoutResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    payout_id: string;
    error: string;
  }>;
}

/**
 * Payout with creator details (joined query result)
 */
export interface PayoutWithCreator extends WisePayout {
  creator?: {
    id: string;
    username?: string;
    display_name?: string;
  };
}

/**
 * Type guard to check if payout is pending
 */
export function isPayoutPending(payout: WisePayout): boolean {
  return payout.status === WisePayoutStatus.PENDING;
}

/**
 * Type guard to check if payout is completed
 */
export function isPayoutCompleted(payout: WisePayout): boolean {
  return payout.status === WisePayoutStatus.COMPLETED;
}

/**
 * Type guard to check if payout is failed
 */
export function isPayoutFailed(payout: WisePayout): boolean {
  return payout.status === WisePayoutStatus.FAILED;
}

/**
 * Type guard to check if payout is in a final state (completed, failed, or cancelled)
 */
export function isPayoutFinal(payout: WisePayout): boolean {
  return [
    WisePayoutStatus.COMPLETED,
    WisePayoutStatus.FAILED,
    WisePayoutStatus.CANCELLED,
    WisePayoutStatus.REFUNDED,
  ].includes(payout.status);
}

/**
 * Map Wise transfer status to our payout status
 */
export function mapWiseStatusToPayoutStatus(
  wiseStatus: WiseTransferStatus
): WisePayoutStatus {
  switch (wiseStatus) {
    case WiseTransferStatus.INCOMING_PAYMENT_WAITING:
    case WiseTransferStatus.PROCESSING:
    case WiseTransferStatus.FUNDS_CONVERTED:
      return WisePayoutStatus.PROCESSING;

    case WiseTransferStatus.OUTGOING_PAYMENT_SENT:
      return WisePayoutStatus.COMPLETED;

    case WiseTransferStatus.BOUNCED_BACK:
    case WiseTransferStatus.FUNDS_REFUNDED:
      return WisePayoutStatus.FAILED;

    case WiseTransferStatus.CHARGED_BACK:
      return WisePayoutStatus.REFUNDED;

    case WiseTransferStatus.CANCELLED:
      return WisePayoutStatus.CANCELLED;

    default:
      return WisePayoutStatus.PENDING;
  }
}

/**
 * Get human-readable status message
 */
export function getPayoutStatusMessage(status: WisePayoutStatus): string {
  const messages: Record<WisePayoutStatus, string> = {
    [WisePayoutStatus.PENDING]: 'Payout is waiting to be processed',
    [WisePayoutStatus.PROCESSING]: 'Payout is being processed by Wise',
    [WisePayoutStatus.COMPLETED]: 'Payout completed successfully',
    [WisePayoutStatus.FAILED]: 'Payout failed',
    [WisePayoutStatus.CANCELLED]: 'Payout was cancelled',
    [WisePayoutStatus.REFUNDED]: 'Payout was refunded',
  };

  return messages[status] || 'Unknown status';
}

/**
 * Format payout amount with currency symbol
 */
export function formatPayoutAmount(amount: number, currency: WisePayoutCurrency): string {
  const symbols: Record<WisePayoutCurrency, string> = {
    NGN: '₦',
    GHS: 'GH₵',
    KES: 'KES',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
