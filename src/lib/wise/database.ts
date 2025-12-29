/**
 * Wise Payouts Database Functions
 *
 * Helper functions for CRUD operations on the wise_payouts table in Supabase.
 * These functions provide a clean API for creating, updating, and querying
 * Wise payout records.
 *
 * @module lib/wise/database
 */

import { supabase } from '../supabase';
import type {
  WisePayout,
  CreatePayoutParams,
  UpdatePayoutStatusParams,
  GetCreatorPayoutsFilters,
  PayoutOperationResult,
  PayoutWithCreator,
  PendingPayoutsSummary,
  PayoutSummary,
  WisePayoutStatus,
} from '../types/wise';

/**
 * Create a new payout record in the database
 *
 * This should be called BEFORE making the Wise API call, to track the
 * payout attempt. Update the record after the Wise API call with the
 * transfer ID and status.
 *
 * @param params - Payout creation parameters
 * @returns Operation result with created payout data
 *
 * @example
 * ```typescript
 * const result = await createPayoutRecord({
 *   creator_id: 'uuid-here',
 *   amount: 50000,
 *   currency: 'NGN',
 *   recipient_account_number: '0123456789',
 *   recipient_account_name: 'John Doe',
 *   recipient_bank_code: '044',
 *   recipient_bank_name: 'Access Bank',
 *   reference: `PAYOUT_${Date.now()}`,
 * });
 *
 * if (result.success) {
 *   console.log('Payout record created:', result.data.id);
 * }
 * ```
 */
export async function createPayoutRecord(
  params: CreatePayoutParams
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    const {
      creator_id,
      amount,
      currency,
      recipient_account_number,
      recipient_account_name,
      recipient_bank_code,
      recipient_bank_name,
      reference,
      customer_transaction_id,
      metadata = {},
    } = params;

    // Validate required parameters
    if (!creator_id || !amount || !currency || !recipient_account_number ||
        !recipient_account_name || !recipient_bank_code || !reference) {
      return {
        success: false,
        error: 'Missing required parameters',
        code: 'MISSING_PARAMS',
      };
    }

    // Validate amount is positive
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
        code: 'INVALID_AMOUNT',
      };
    }

    console.log('💾 Creating payout record:', {
      creator_id,
      amount,
      currency,
      reference,
    });

    const { data, error } = await supabase
      .from('wise_payouts')
      .insert({
        creator_id,
        amount,
        currency,
        recipient_account_number,
        recipient_account_name,
        recipient_bank_code,
        recipient_bank_name,
        reference,
        customer_transaction_id,
        metadata,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create payout record:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Payout with this reference already exists',
          code: 'DUPLICATE_REFERENCE',
        };
      }

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log('✅ Payout record created successfully:', data.id);

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error creating payout record:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Update payout status and related fields
 *
 * Called after Wise API responses to update the payout record with
 * transfer ID, status, and other details.
 *
 * @param params - Update parameters
 * @returns Operation result with updated payout data
 *
 * @example
 * ```typescript
 * // After successful Wise transfer creation
 * const result = await updatePayoutStatus({
 *   payout_id: 'uuid-here',
 *   status: 'processing',
 *   wise_transfer_id: '12345678',
 *   wise_recipient_id: '87654321',
 *   wise_quote_id: 'quote-uuid',
 *   exchange_rate: 1580.50,
 *   source_amount: 31.65,
 *   source_currency: 'USD',
 *   wise_fee: 1.65,
 *   wise_response: { ... },
 * });
 * ```
 */
export async function updatePayoutStatus(
  params: UpdatePayoutStatusParams
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    const {
      payout_id,
      status,
      wise_transfer_id,
      wise_recipient_id,
      wise_quote_id,
      exchange_rate,
      source_amount,
      source_currency,
      wise_fee,
      error_message,
      error_code,
      wise_response,
      completed_at,
      failed_at,
    } = params;

    if (!payout_id || !status) {
      return {
        success: false,
        error: 'Missing required parameters: payout_id and status',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('💾 Updating payout status:', {
      payout_id,
      status,
      wise_transfer_id,
    });

    // Build update object with only provided fields
    const updateData: any = {
      status,
    };

    if (wise_transfer_id !== undefined) updateData.wise_transfer_id = wise_transfer_id;
    if (wise_recipient_id !== undefined) updateData.wise_recipient_id = wise_recipient_id;
    if (wise_quote_id !== undefined) updateData.wise_quote_id = wise_quote_id;
    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate;
    if (source_amount !== undefined) updateData.source_amount = source_amount;
    if (source_currency !== undefined) updateData.source_currency = source_currency;
    if (wise_fee !== undefined) updateData.wise_fee = wise_fee;
    if (error_message !== undefined) updateData.error_message = error_message;
    if (error_code !== undefined) updateData.error_code = error_code;
    if (wise_response !== undefined) updateData.wise_response = wise_response;
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    if (failed_at !== undefined) updateData.failed_at = failed_at;

    const { data, error } = await supabase
      .from('wise_payouts')
      .update(updateData)
      .eq('id', payout_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update payout status:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Payout not found',
        code: 'NOT_FOUND',
      };
    }

    console.log('✅ Payout status updated successfully:', {
      id: data.id,
      status: data.status,
    });

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error updating payout status:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get payouts for a specific creator with optional filters
 *
 * @param filters - Query filters
 * @returns Operation result with array of payouts
 *
 * @example
 * ```typescript
 * // Get all payouts for creator
 * const result = await getCreatorPayouts({
 *   creator_id: 'uuid-here',
 * });
 *
 * // Get pending NGN payouts
 * const result = await getCreatorPayouts({
 *   creator_id: 'uuid-here',
 *   status: 'pending',
 *   currency: 'NGN',
 *   limit: 10,
 * });
 * ```
 */
export async function getCreatorPayouts(
  filters: GetCreatorPayoutsFilters
): Promise<PayoutOperationResult<WisePayout[]>> {
  try {
    const {
      creator_id,
      status,
      currency,
      limit = 50,
      offset = 0,
      start_date,
      end_date,
    } = filters;

    if (!creator_id) {
      return {
        success: false,
        error: 'creator_id is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('🔍 Fetching creator payouts:', {
      creator_id,
      status,
      currency,
      limit,
    });

    let query = supabase
      .from('wise_payouts')
      .select('*')
      .eq('creator_id', creator_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (currency) {
      query = query.eq('currency', currency);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch creator payouts:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log(`✅ Found ${data.length} payouts for creator`);

    return {
      success: true,
      data: data as WisePayout[],
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching creator payouts:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get all pending payouts (for processing/monitoring)
 *
 * This is typically used by backend services to process pending payouts.
 *
 * @param limit - Maximum number of payouts to return
 * @returns Operation result with array of pending payouts
 *
 * @example
 * ```typescript
 * const result = await getPendingPayouts(100);
 *
 * if (result.success && result.data) {
 *   for (const payout of result.data) {
 *     // Process pending payout
 *   }
 * }
 * ```
 */
export async function getPendingPayouts(
  limit: number = 100
): Promise<PayoutOperationResult<WisePayout[]>> {
  try {
    console.log('🔍 Fetching pending payouts...');

    const { data, error } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to fetch pending payouts:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log(`✅ Found ${data.length} pending payouts`);

    return {
      success: true,
      data: data as WisePayout[],
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching pending payouts:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get a single payout by ID
 *
 * @param payout_id - Payout ID
 * @returns Operation result with payout data
 */
export async function getPayoutById(
  payout_id: string
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    if (!payout_id) {
      return {
        success: false,
        error: 'payout_id is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('🔍 Fetching payout by ID:', payout_id);

    const { data, error } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (error) {
      console.error('❌ Failed to fetch payout:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Payout not found',
        code: 'NOT_FOUND',
      };
    }

    console.log('✅ Payout found:', data.id);

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching payout:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get payout by Wise transfer ID
 *
 * Useful for webhook processing when you receive a transfer ID from Wise.
 *
 * @param wise_transfer_id - Wise transfer ID
 * @returns Operation result with payout data
 */
export async function getPayoutByWiseTransferId(
  wise_transfer_id: string
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    if (!wise_transfer_id) {
      return {
        success: false,
        error: 'wise_transfer_id is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('🔍 Fetching payout by Wise transfer ID:', wise_transfer_id);

    const { data, error } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('wise_transfer_id', wise_transfer_id)
      .single();

    if (error) {
      console.error('❌ Failed to fetch payout:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Payout not found',
        code: 'NOT_FOUND',
      };
    }

    console.log('✅ Payout found:', data.id);

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching payout:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get payout by reference
 *
 * @param reference - Internal payout reference
 * @returns Operation result with payout data
 */
export async function getPayoutByReference(
  reference: string
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    if (!reference) {
      return {
        success: false,
        error: 'reference is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('🔍 Fetching payout by reference:', reference);

    const { data, error } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error) {
      console.error('❌ Failed to fetch payout:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Payout not found',
        code: 'NOT_FOUND',
      };
    }

    console.log('✅ Payout found:', data.id);

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching payout:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get creator payout statistics
 *
 * @param creator_id - Creator ID
 * @returns Operation result with payout summary
 */
export async function getCreatorPayoutStats(
  creator_id: string
): Promise<PayoutOperationResult<PayoutSummary[]>> {
  try {
    if (!creator_id) {
      return {
        success: false,
        error: 'creator_id is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('📊 Fetching creator payout stats:', creator_id);

    const { data, error } = await supabase
      .from('wise_creator_payout_stats')
      .select('*')
      .eq('creator_id', creator_id);

    if (error) {
      console.error('❌ Failed to fetch payout stats:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log(`✅ Found stats for ${data.length} currencies`);

    return {
      success: true,
      data: data as PayoutSummary[],
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching payout stats:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Get pending payouts summary (by currency)
 *
 * Useful for dashboards and monitoring.
 *
 * @returns Operation result with pending payouts summary
 */
export async function getPendingPayoutsSummary(): Promise<
  PayoutOperationResult<PendingPayoutsSummary[]>
> {
  try {
    console.log('📊 Fetching pending payouts summary...');

    const { data, error } = await supabase
      .from('wise_payouts_pending_summary')
      .select('*');

    if (error) {
      console.error('❌ Failed to fetch pending payouts summary:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log(`✅ Found pending summary for ${data.length} currencies`);

    return {
      success: true,
      data: data as PendingPayoutsSummary[],
    };
  } catch (error) {
    console.error('❌ Unexpected error fetching pending summary:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Soft delete a payout (sets deleted_at timestamp)
 *
 * @param payout_id - Payout ID to delete
 * @returns Operation result
 */
export async function deletePayoutRecord(
  payout_id: string
): Promise<PayoutOperationResult<WisePayout>> {
  try {
    if (!payout_id) {
      return {
        success: false,
        error: 'payout_id is required',
        code: 'MISSING_PARAMS',
      };
    }

    console.log('🗑️  Soft deleting payout:', payout_id);

    const { data, error } = await supabase
      .from('wise_payouts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payout_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to delete payout:', error);

      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.log('✅ Payout soft deleted successfully');

    return {
      success: true,
      data: data as WisePayout,
    };
  } catch (error) {
    console.error('❌ Unexpected error deleting payout:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNEXPECTED_ERROR',
    };
  }
}
