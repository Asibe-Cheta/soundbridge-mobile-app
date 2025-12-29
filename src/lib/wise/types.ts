/**
 * Wise API TypeScript Type Definitions
 *
 * This module provides comprehensive type definitions for Wise API
 * requests, responses, and domain objects.
 *
 * @module lib/wise/types
 */

/**
 * Supported currencies for Wise transfers
 */
export type WiseCurrency = 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR' | 'GBP';

/**
 * Transfer status types
 */
export type TransferStatus =
  | 'incoming_payment_waiting'  // Waiting for funds to arrive
  | 'processing'                // Transfer is being processed
  | 'funds_converted'           // Funds have been converted
  | 'outgoing_payment_sent'     // Payment has been sent
  | 'bounced_back'              // Transfer failed and bounced back
  | 'funds_refunded'            // Funds have been refunded
  | 'charged_back'              // Transfer was charged back
  | 'cancelled';                // Transfer was cancelled

/**
 * Account type for bank accounts
 */
export type AccountType = 'checking' | 'savings';

/**
 * Nigerian bank codes
 */
export const NIGERIAN_BANK_CODES = {
  ACCESS_BANK: '044',
  GTB: '058',
  ZENITH: '057',
  FIRST_BANK: '011',
  UBA: '033',
  ECOBANK: '050',
  FCMB: '214',
  FIDELITY: '070',
  STANBIC_IBTC: '221',
  STERLING: '232',
  UNION: '032',
  WEMA: '035',
  KEYSTONE: '082',
  POLARIS: '076',
  HERITAGE: '030',
  CITIBANK: '023',
  PROVIDUS: '101',
  KUDA: '090267',
} as const;

/**
 * Ghanaian bank codes
 */
export const GHANAIAN_BANK_CODES = {
  ACCESS_BANK: '280100',
  ECOBANK: '130100',
  FIDELITY: '240100',
  FIRST_ATLANTIC: '170100',
  GCB: '040100',
  GTB: '230100',
  STANDARD_CHARTERED: '020100',
  STANBIC: '190100',
  ZENITH: '120100',
} as const;

/**
 * Kenyan bank codes
 */
export const KENYAN_BANK_CODES = {
  EQUITY: '68',
  KCB: '01',
  COOPERATIVE: '11',
  ABSA: '03',
  STANDARD_CHARTERED: '02',
  NCBA: '07',
  DTB: '63',
  STANBIC: '31',
  FAMILY: '70',
  GULF_AFRICAN: '72',
} as const;

/**
 * Wise API Error Response
 */
export interface WiseErrorResponse {
  /** Error identifier */
  error: string;
  /** HTTP status code */
  status: number;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  errors?: Array<{
    code: string;
    message: string;
    path?: string;
  }>;
}

/**
 * Wise Profile (Business Account)
 */
export interface WiseProfile {
  /** Profile ID */
  id: number;
  /** Profile type */
  type: 'personal' | 'business';
  /** Business or personal details */
  details: {
    name?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  };
}

/**
 * Wise Balance
 */
export interface WiseBalance {
  /** Balance ID */
  id: number;
  /** Profile ID this balance belongs to */
  profileId: number;
  /** Currency code */
  currency: WiseCurrency;
  /** Available amount */
  amount: {
    value: number;
    currency: WiseCurrency;
  };
}

/**
 * Parameters for resolving/verifying a bank account
 */
export interface ResolveAccountParams {
  /** Account number to verify */
  accountNumber: string;
  /** Bank code (e.g., '044' for Access Bank Nigeria) */
  bankCode: string;
  /** Currency/country (NGN, GHS, KES) */
  currency: WiseCurrency;
}

/**
 * Response from account verification
 */
export interface ResolveAccountResponse {
  /** Whether account was successfully verified */
  success: boolean;
  /** Account holder name (if verified) */
  accountHolderName?: string;
  /** Account number (echoed back) */
  accountNumber: string;
  /** Bank name */
  bankName?: string;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Parameters for creating a recipient
 */
export interface CreateRecipientParams {
  /** Recipient currency */
  currency: WiseCurrency;
  /** Recipient type (e.g., 'nigerian_bank_account') */
  type?: string;
  /** Profile ID (uses default if not specified) */
  profileId?: number;
  /** Account holder name */
  accountHolderName: string;
  /** Legal type */
  legalType?: 'PRIVATE' | 'BUSINESS';
  /** Account details */
  details: {
    /** Account number */
    accountNumber: string;
    /** Bank code */
    bankCode: string;
    /** Account type */
    accountType?: AccountType;
  };
}

/**
 * Wise Recipient
 */
export interface WiseRecipient {
  /** Recipient ID */
  id: number;
  /** Profile ID */
  profileId: number;
  /** Account holder name */
  accountHolderName: string;
  /** Currency */
  currency: WiseCurrency;
  /** Recipient type */
  type: string;
  /** Account details */
  details: {
    accountNumber: string;
    bankCode: string;
    [key: string]: any;
  };
}

/**
 * Parameters for creating a quote
 */
export interface CreateQuoteParams {
  /** Profile ID */
  profileId?: number;
  /** Source currency (what you're sending) */
  sourceCurrency: WiseCurrency;
  /** Target currency (what recipient receives) */
  targetCurrency: WiseCurrency;
  /** Source amount (if sending fixed amount) */
  sourceAmount?: number;
  /** Target amount (if recipient should receive fixed amount) */
  targetAmount?: number;
  /** Payment option (default: 'BALANCE') */
  paymentOption?: 'BALANCE' | 'CARD' | 'BANK_TRANSFER';
}

/**
 * Wise Quote (Exchange Rate Quote)
 */
export interface WiseQuote {
  /** Quote ID */
  id: string;
  /** Source currency */
  sourceCurrency: WiseCurrency;
  /** Target currency */
  targetCurrency: WiseCurrency;
  /** Source amount */
  sourceAmount: number;
  /** Target amount */
  targetAmount: number;
  /** Exchange rate */
  rate: number;
  /** Fee amount */
  fee: number;
  /** When quote expires */
  expirationTime: string;
  /** Payment option */
  paymentOption: string;
}

/**
 * Parameters for creating a transfer
 */
export interface CreateTransferParams {
  /** Target currency (what recipient receives) */
  targetCurrency: WiseCurrency;
  /** Target amount (what recipient receives) */
  targetAmount: number;
  /** Recipient ID (existing recipient) */
  recipientId?: number;
  /** Quote ID (for exchange rate) */
  quoteId?: string;
  /** Transfer reference (unique identifier) */
  reference: string;
  /** Customer transaction ID (optional, for idempotency) */
  customerTransactionId?: string;
  /** Recipient details (if creating inline recipient) */
  recipientDetails?: {
    accountHolderName: string;
    accountNumber: string;
    bankCode: string;
    currency: WiseCurrency;
  };
}

/**
 * Wise Transfer
 */
export interface WiseTransfer {
  /** Transfer ID */
  id: number;
  /** User who created transfer */
  user: number;
  /** Target account (recipient) */
  targetAccount: number;
  /** Source account (your balance) */
  sourceAccount?: number;
  /** Quote used for this transfer */
  quote: string;
  /** Quote UUID */
  quoteUuid: string;
  /** Current status */
  status: TransferStatus;
  /** Transfer reference */
  reference: string;
  /** Exchange rate */
  rate: number;
  /** Created timestamp */
  created: string;
  /** Business profile ID */
  business?: number;
  /** Transfer details */
  details: {
    reference: string;
  };
  /** Whether funds have been converted */
  hasActiveIssues: boolean;
  /** Source amount */
  sourceCurrency: WiseCurrency;
  /** Source value */
  sourceValue: number;
  /** Target currency */
  targetCurrency: WiseCurrency;
  /** Target value */
  targetValue: number;
  /** Customer transaction ID */
  customerTransactionId?: string;
}

/**
 * Parameters for getting transfer status
 */
export interface GetTransferStatusParams {
  /** Transfer ID */
  transferId: number;
}

/**
 * Transfer status response
 */
export interface TransferStatusResponse {
  /** Transfer ID */
  id: number;
  /** Current status */
  status: TransferStatus;
  /** Status message */
  statusMessage?: string;
  /** Whether transfer is complete */
  isComplete: boolean;
  /** Whether transfer failed */
  isFailed: boolean;
  /** Source amount */
  sourceAmount: number;
  /** Target amount */
  targetAmount: number;
  /** Exchange rate */
  rate: number;
  /** Created timestamp */
  createdAt: string;
  /** Completed timestamp (if complete) */
  completedAt?: string;
}

/**
 * Parameters for funding a transfer
 */
export interface FundTransferParams {
  /** Transfer ID */
  transferId: number;
  /** Funding type */
  type: 'BALANCE' | 'CARD' | 'BANK_TRANSFER';
}

/**
 * Wise API client configuration
 */
export interface WiseClientConfig {
  /** API token */
  apiToken: string;
  /** API base URL */
  apiUrl: string;
  /** Profile ID */
  profileId: string;
}

/**
 * Helper type for bank code mapping
 */
export type BankCodeMap = {
  [key: string]: string;
};

/**
 * Bank information
 */
export interface BankInfo {
  /** Bank code */
  code: string;
  /** Bank name */
  name: string;
  /** Country/Currency */
  currency: WiseCurrency;
}
