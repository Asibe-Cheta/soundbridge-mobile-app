/**
 * Wise Transfers Module
 *
 * Handles creation and management of Wise transfers (payouts).
 * Includes account verification, recipient creation, quote generation,
 * and transfer execution.
 *
 * @module lib/wise/transfers
 */

import { wiseClient, WiseAPIError } from './client';
import { wiseConfig } from './config';
import type {
  CreateTransferParams,
  CreateRecipientParams,
  ResolveAccountParams,
  ResolveAccountResponse,
  GetTransferStatusParams,
  TransferStatusResponse,
  WiseTransfer,
  WiseRecipient,
  WiseQuote,
  CreateQuoteParams,
  TransferStatus,
  WiseCurrency,
  FundTransferParams,
} from './types';

/**
 * Resolve/verify a bank account before sending money
 *
 * This function verifies that a bank account exists and returns the
 * account holder's name for verification.
 *
 * NOTE: Wise doesn't have a direct account validation endpoint for all
 * currencies. For Nigerian accounts, we use the recipient creation with
 * validation. For other currencies, we validate format only.
 *
 * @param params - Account details to verify
 * @returns Account verification result with holder name
 *
 * @example
 * ```typescript
 * const result = await resolveAccount({
 *   accountNumber: '0123456789',
 *   bankCode: '044', // Access Bank Nigeria
 *   currency: 'NGN'
 * });
 *
 * if (result.success) {
 *   console.log('Account belongs to:', result.accountHolderName);
 * }
 * ```
 */
export async function resolveAccount(
  params: ResolveAccountParams
): Promise<ResolveAccountResponse> {
  try {
    const { accountNumber, bankCode, currency } = params;

    // Validate inputs
    if (!accountNumber || !bankCode || !currency) {
      throw new Error('Missing required parameters: accountNumber, bankCode, currency');
    }

    // For Nigerian accounts, Wise validates account on recipient creation
    // We'll use the recipient requirements endpoint to validate format
    if (currency === 'NGN') {
      // Nigerian account validation via Wise
      // Wise validates Nigerian accounts when creating recipients
      // We can use the account validation endpoint if available

      // Get recipient requirements to validate account format
      const requirements = await wiseClient.post<any>(
        '/v1/quotes/recipient-requirements',
        {
          sourceCurrency: 'USD',
          targetCurrency: currency,
          sourceAmount: 1,
        }
      );

      // For now, we'll validate format and return success
      // Real validation happens when creating recipient or transfer
      if (accountNumber.length !== 10) {
        return {
          success: false,
          accountNumber,
          error: 'Nigerian account numbers must be exactly 10 digits',
        };
      }

      // We cannot get the actual account holder name without creating a recipient
      // So we return a placeholder response indicating format is valid
      return {
        success: true,
        accountNumber,
        accountHolderName: undefined, // Will be verified during recipient creation
        bankName: getBankName(bankCode, currency),
      };
    }

    // For other currencies (GHS, KES), validate format
    if (currency === 'GHS') {
      // Ghanaian account numbers vary by bank (typically 13 digits)
      if (accountNumber.length < 10) {
        return {
          success: false,
          accountNumber,
          error: 'Ghanaian account number appears invalid',
        };
      }
    }

    if (currency === 'KES') {
      // Kenyan account numbers vary by bank (typically 12-13 digits)
      if (accountNumber.length < 10) {
        return {
          success: false,
          accountNumber,
          error: 'Kenyan account number appears invalid',
        };
      }
    }

    return {
      success: true,
      accountNumber,
      accountHolderName: undefined,
      bankName: getBankName(bankCode, currency),
    };
  } catch (error) {
    if (error instanceof WiseAPIError) {
      return {
        success: false,
        accountNumber: params.accountNumber,
        error: error.message,
      };
    }

    return {
      success: false,
      accountNumber: params.accountNumber,
      error: error instanceof Error ? error.message : 'Account verification failed',
    };
  }
}

/**
 * Get bank name from bank code and currency
 */
function getBankName(bankCode: string, currency: WiseCurrency): string {
  // Nigerian banks
  if (currency === 'NGN') {
    const nigerianBanks: Record<string, string> = {
      '044': 'Access Bank',
      '058': 'GTBank',
      '057': 'Zenith Bank',
      '011': 'First Bank',
      '033': 'UBA',
      '050': 'Ecobank',
      '214': 'FCMB',
      '070': 'Fidelity Bank',
      '221': 'Stanbic IBTC',
      '232': 'Sterling Bank',
      '032': 'Union Bank',
      '035': 'Wema Bank',
      '082': 'Keystone Bank',
      '076': 'Polaris Bank',
      '030': 'Heritage Bank',
      '023': 'Citibank',
      '101': 'Providus Bank',
      '090267': 'Kuda Bank',
    };
    return nigerianBanks[bankCode] || `Bank ${bankCode}`;
  }

  // Ghanaian banks
  if (currency === 'GHS') {
    const ghanaianBanks: Record<string, string> = {
      '280100': 'Access Bank Ghana',
      '130100': 'Ecobank Ghana',
      '240100': 'Fidelity Bank Ghana',
      '170100': 'First Atlantic Bank',
      '040100': 'GCB Bank',
      '230100': 'GTBank Ghana',
      '020100': 'Standard Chartered Ghana',
      '190100': 'Stanbic Bank Ghana',
      '120100': 'Zenith Bank Ghana',
    };
    return ghanaianBanks[bankCode] || `Bank ${bankCode}`;
  }

  // Kenyan banks
  if (currency === 'KES') {
    const kenyanBanks: Record<string, string> = {
      '68': 'Equity Bank',
      '01': 'KCB Bank',
      '11': 'Co-operative Bank',
      '03': 'Absa Bank Kenya',
      '02': 'Standard Chartered Kenya',
      '07': 'NCBA Bank',
      '63': 'Diamond Trust Bank',
      '31': 'Stanbic Bank Kenya',
      '70': 'Family Bank',
      '72': 'Gulf African Bank',
    };
    return kenyanBanks[bankCode] || `Bank ${bankCode}`;
  }

  return `Bank ${bankCode}`;
}

/**
 * Create a recipient in Wise
 *
 * Recipients are reusable - once created, you can send multiple transfers
 * to the same recipient using their recipientId.
 *
 * @param params - Recipient details
 * @returns Created recipient with ID
 *
 * @example
 * ```typescript
 * const recipient = await createRecipient({
 *   currency: 'NGN',
 *   accountHolderName: 'John Doe',
 *   details: {
 *     accountNumber: '0123456789',
 *     bankCode: '044',
 *     accountType: 'checking'
 *   }
 * });
 *
 * console.log('Recipient ID:', recipient.id);
 * ```
 */
export async function createRecipient(
  params: CreateRecipientParams
): Promise<WiseRecipient> {
  try {
    const { currency, accountHolderName, details } = params;

    // Validate required parameters
    if (!currency || !accountHolderName || !details?.accountNumber || !details?.bankCode) {
      throw new Error(
        'Missing required parameters: currency, accountHolderName, accountNumber, bankCode'
      );
    }

    // Determine recipient type based on currency
    let recipientType: string;
    const recipientDetails: any = {
      accountNumber: details.accountNumber,
      bankCode: details.bankCode,
    };

    if (currency === 'NGN') {
      recipientType = 'nigerian_bank_account';
      recipientDetails.legalType = params.legalType || 'PRIVATE';
      recipientDetails.accountType = details.accountType || 'checking';
    } else if (currency === 'GHS') {
      recipientType = 'ghanaian_bank_account';
      recipientDetails.accountType = details.accountType || 'checking';
    } else if (currency === 'KES') {
      recipientType = 'kenyan_bank_account';
      recipientDetails.accountType = details.accountType || 'checking';
    } else {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const profileId = params.profileId || parseInt(wiseConfig.profileId);

    const recipientPayload = {
      currency,
      type: recipientType,
      profile: profileId,
      accountHolderName,
      ownedByCustomer: false,
      details: recipientDetails,
    };

    console.log('📤 Creating Wise recipient:', {
      currency,
      type: recipientType,
      accountHolderName,
      accountNumber: details.accountNumber.slice(0, 3) + '***',
    });

    const recipient = await wiseClient.post<WiseRecipient>(
      '/v1/accounts',
      recipientPayload
    );

    console.log('✅ Recipient created successfully:', {
      id: recipient.id,
      currency: recipient.currency,
      accountHolderName: recipient.accountHolderName,
    });

    return recipient;
  } catch (error) {
    console.error('❌ Failed to create recipient:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Wise recipient creation failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Create a quote for a transfer
 *
 * Quotes lock in an exchange rate and fees for a transfer.
 * They expire after a certain time (typically 30 minutes).
 *
 * @param params - Quote parameters
 * @returns Quote with exchange rate and fees
 */
export async function createQuote(params: CreateQuoteParams): Promise<WiseQuote> {
  try {
    const profileId = params.profileId || parseInt(wiseConfig.profileId);

    const quotePayload: any = {
      profile: profileId,
      sourceCurrency: params.sourceCurrency || 'USD',
      targetCurrency: params.targetCurrency,
      paymentOption: params.paymentOption || 'BALANCE',
    };

    // Either sourceAmount or targetAmount must be specified
    if (params.targetAmount) {
      quotePayload.targetAmount = params.targetAmount;
    } else if (params.sourceAmount) {
      quotePayload.sourceAmount = params.sourceAmount;
    } else {
      throw new Error('Either sourceAmount or targetAmount must be specified');
    }

    console.log('📊 Creating quote:', {
      sourceCurrency: quotePayload.sourceCurrency,
      targetCurrency: quotePayload.targetCurrency,
      targetAmount: params.targetAmount,
      sourceAmount: params.sourceAmount,
    });

    const quote = await wiseClient.post<WiseQuote>('/v2/quotes', quotePayload);

    console.log('✅ Quote created:', {
      id: quote.id,
      rate: quote.rate,
      fee: quote.fee,
      sourceAmount: quote.sourceAmount,
      targetAmount: quote.targetAmount,
    });

    return quote;
  } catch (error) {
    console.error('❌ Failed to create quote:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Wise quote creation failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Create a transfer (payout)
 *
 * This creates a transfer to send money to a recipient's bank account.
 * The transfer must be funded (via balance or card) to be executed.
 *
 * @param params - Transfer parameters
 * @returns Created transfer with ID and status
 *
 * @example
 * ```typescript
 * // Create transfer to existing recipient
 * const transfer = await createTransfer({
 *   targetCurrency: 'NGN',
 *   targetAmount: 50000,
 *   recipientId: 12345678,
 *   reference: 'Payout for user 123'
 * });
 *
 * // Or create with inline recipient
 * const transfer = await createTransfer({
 *   targetCurrency: 'NGN',
 *   targetAmount: 50000,
 *   reference: 'Payout for user 123',
 *   recipientDetails: {
 *     accountHolderName: 'John Doe',
 *     accountNumber: '0123456789',
 *     bankCode: '044',
 *     currency: 'NGN'
 *   }
 * });
 * ```
 */
export async function createTransfer(
  params: CreateTransferParams
): Promise<WiseTransfer> {
  try {
    const { targetCurrency, targetAmount, recipientId, reference, recipientDetails } = params;

    // Validate required parameters
    if (!targetCurrency || !targetAmount || !reference) {
      throw new Error('Missing required parameters: targetCurrency, targetAmount, reference');
    }

    if (!recipientId && !recipientDetails) {
      throw new Error('Either recipientId or recipientDetails must be provided');
    }

    let finalRecipientId = recipientId;

    // Create recipient if details provided and no recipientId
    if (!recipientId && recipientDetails) {
      console.log('📝 Creating inline recipient...');
      const recipient = await createRecipient({
        currency: recipientDetails.currency,
        accountHolderName: recipientDetails.accountHolderName,
        details: {
          accountNumber: recipientDetails.accountNumber,
          bankCode: recipientDetails.bankCode,
        },
      });
      finalRecipientId = recipient.id;
    }

    if (!finalRecipientId) {
      throw new Error('Failed to determine recipient ID');
    }

    // Create quote first (required for transfer)
    let quote: WiseQuote;
    if (params.quoteId) {
      // If quote ID provided, fetch the quote
      quote = await wiseClient.get<WiseQuote>(`/v2/quotes/${params.quoteId}`);
    } else {
      // Create new quote
      quote = await createQuote({
        sourceCurrency: 'USD', // Assuming USD as source
        targetCurrency,
        targetAmount,
      });
    }

    // Create transfer
    const transferPayload = {
      targetAccount: finalRecipientId,
      quoteUuid: quote.id,
      customerTransactionId: params.customerTransactionId || reference,
      details: {
        reference,
      },
    };

    console.log('💸 Creating transfer:', {
      targetCurrency,
      targetAmount,
      recipientId: finalRecipientId,
      reference,
      quoteId: quote.id,
    });

    const transfer = await wiseClient.post<WiseTransfer>(
      '/v1/transfers',
      transferPayload
    );

    console.log('✅ Transfer created:', {
      id: transfer.id,
      status: transfer.status,
      targetAmount: transfer.targetValue,
      targetCurrency: transfer.targetCurrency,
    });

    // Auto-fund from balance if in production
    if (wiseConfig.environment === 'live') {
      console.log('💰 Auto-funding transfer from balance...');
      await fundTransfer({
        transferId: transfer.id,
        type: 'BALANCE',
      });
    }

    return transfer;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Wise transfer creation failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Fund a transfer from Wise balance
 *
 * After creating a transfer, it must be funded to be executed.
 * This function funds the transfer from your Wise balance.
 *
 * @param params - Funding parameters
 */
export async function fundTransfer(params: FundTransferParams): Promise<void> {
  try {
    const { transferId, type } = params;

    console.log('💰 Funding transfer:', { transferId, type });

    await wiseClient.post(`/v3/profiles/${wiseConfig.profileId}/transfers/${transferId}/payments`, {
      type,
    });

    console.log('✅ Transfer funded successfully');
  } catch (error) {
    console.error('❌ Failed to fund transfer:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Wise transfer funding failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Get transfer status
 *
 * Check the current status of a transfer.
 *
 * @param params - Contains transferId
 * @returns Transfer status details
 *
 * @example
 * ```typescript
 * const status = await getTransferStatus({ transferId: 12345678 });
 *
 * if (status.isComplete) {
 *   console.log('Transfer completed!');
 * } else if (status.isFailed) {
 *   console.log('Transfer failed:', status.statusMessage);
 * } else {
 *   console.log('Transfer pending:', status.status);
 * }
 * ```
 */
export async function getTransferStatus(
  params: GetTransferStatusParams
): Promise<TransferStatusResponse> {
  try {
    const { transferId } = params;

    if (!transferId) {
      throw new Error('Missing required parameter: transferId');
    }

    console.log('🔍 Fetching transfer status:', transferId);

    const transfer = await wiseClient.get<WiseTransfer>(`/v1/transfers/${transferId}`);

    const isComplete = transfer.status === 'outgoing_payment_sent';
    const isFailed =
      transfer.status === 'bounced_back' ||
      transfer.status === 'funds_refunded' ||
      transfer.status === 'cancelled' ||
      transfer.status === 'charged_back';

    const statusResponse: TransferStatusResponse = {
      id: transfer.id,
      status: transfer.status,
      isComplete,
      isFailed,
      sourceAmount: transfer.sourceValue,
      targetAmount: transfer.targetValue,
      rate: transfer.rate,
      createdAt: transfer.created,
      statusMessage: getStatusMessage(transfer.status),
    };

    console.log('✅ Transfer status:', {
      id: transfer.id,
      status: transfer.status,
      isComplete,
      isFailed,
    });

    return statusResponse;
  } catch (error) {
    console.error('❌ Failed to get transfer status:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Failed to get transfer status: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Get human-readable status message
 */
function getStatusMessage(status: TransferStatus): string {
  const messages: Record<TransferStatus, string> = {
    incoming_payment_waiting: 'Waiting for funds to arrive',
    processing: 'Transfer is being processed',
    funds_converted: 'Funds have been converted',
    outgoing_payment_sent: 'Payment has been sent to recipient',
    bounced_back: 'Transfer failed and funds bounced back',
    funds_refunded: 'Funds have been refunded',
    charged_back: 'Transfer was charged back',
    cancelled: 'Transfer was cancelled',
  };

  return messages[status] || status;
}

/**
 * Cancel a transfer
 *
 * Cancels a transfer that hasn't been sent yet.
 * Only transfers in certain statuses can be cancelled.
 *
 * @param transferId - Transfer ID to cancel
 */
export async function cancelTransfer(transferId: number): Promise<void> {
  try {
    console.log('🚫 Cancelling transfer:', transferId);

    await wiseClient.put(`/v1/transfers/${transferId}/cancel`);

    console.log('✅ Transfer cancelled successfully');
  } catch (error) {
    console.error('❌ Failed to cancel transfer:', error);

    if (error instanceof WiseAPIError) {
      throw new Error(`Failed to cancel transfer: ${error.message}`);
    }

    throw error;
  }
}
