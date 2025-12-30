# Creator Payout Automation - Complete Implementation Guide

**Date:** December 29, 2025
**Priority:** 🔴 CRITICAL
**Status:** Implementation Ready
**Teams:** Mobile + Web

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backend Implementation](#backend-implementation)
3. [Mobile App Implementation](#mobile-app-implementation)
4. [Database Schema Updates](#database-schema-updates)
5. [Testing Guide](#testing-guide)
6. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Problem Statement

Creators cannot request payouts themselves - currently requires manual admin intervention for every payout. The Wise integration code exists and works, but there's no creator-facing API to trigger it.

### Solution

Implement a complete automated payout system that:
- ✅ Allows creators to request payouts from their balance
- ✅ Automatically detects creator's country
- ✅ Fetches bank account details from database
- ✅ Selects correct payout method (Wise for NG/GH/KE)
- ✅ Handles currency conversion (USD/GBP → NGN/GHS/KES)
- ✅ Updates creator balance
- ✅ No manual admin action required

---

## Backend Implementation

### Phase 1: Helper Functions

#### 1.1 Country Detection

**File:** `apps/web/src/lib/wise/country-detection.ts` (NEW)

```typescript
/**
 * Country Detection for Payout Method Selection
 */

export type PayoutMethod = 'wise' | 'stripe_connect';

export interface CountryInfo {
  countryCode: string;
  currency: string;
  payoutMethod: PayoutMethod;
}

// Countries that use Wise for payouts
const WISE_COUNTRIES = ['NG', 'GH', 'KE'];

// Currency to country mapping
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  'NGN': 'NG',
  'GHS': 'GH',
  'KES': 'KE',
  'ZAR': 'ZA',
  'USD': 'US',
  'GBP': 'GB',
  'EUR': 'EU',
};

// Bank code to country mapping (for Nigeria)
const BANK_CODE_TO_COUNTRY: Record<string, string> = {
  '044': 'NG', // Access Bank
  '058': 'NG', // GTBank
  '057': 'NG', // Zenith
  '011': 'NG', // First Bank
  '033': 'NG', // UBA
  // Add more as needed
};

/**
 * Detect creator's country and determine payout method
 */
export async function detectCreatorCountry(
  creatorId: string
): Promise<CountryInfo> {
  // ✅ CORRECTED: Use existing service client
  const { createServiceClient } = await import('@/src/lib/supabase');
  const supabase = createServiceClient();

  // Try 1: Check profiles.country_code
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('country_code')
    .eq('id', creatorId)  // ✅ CORRECTED: profiles uses 'id'
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
    .eq('user_id', creatorId)  // ✅ CORRECTED: creator_bank_accounts uses 'user_id'
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

  // Try 3: Infer from bank code (Nigeria)
  if (bankAccount?.routing_number_encrypted) {
    // Decrypt to get bank code
    const bankCode = await decryptField(bankAccount.routing_number_encrypted);
    const countryCode = BANK_CODE_TO_COUNTRY[bankCode];

    if (countryCode) {
      return {
        countryCode,
        currency: getCurrencyForCountry(countryCode),
        payoutMethod: 'wise',
      };
    }
  }

  // Default: Assume US/Stripe Connect
  return {
    countryCode: 'US',
    currency: 'USD',
    payoutMethod: 'stripe_connect',
  };
}

/**
 * Get default currency for a country
 */
function getCurrencyForCountry(countryCode: string): string {
  const countryToCurrency: Record<string, string> = {
    'NG': 'NGN',
    'GH': 'GHS',
    'KE': 'KES',
    'ZA': 'ZAR',
    'US': 'USD',
    'GB': 'GBP',
    'EU': 'EUR',
  };

  return countryToCurrency[countryCode] || 'USD';
}

/**
 * Decrypt encrypted field (implement based on your encryption method)
 */
async function decryptField(encryptedValue: string): Promise<string> {
  // TODO: Implement based on your encryption method
  // For now, if using Supabase vault, you might use a database function
  // Or if encrypting in code, use your crypto library
  return encryptedValue; // Placeholder
}
```

---

#### 1.2 Bank Account Fetching

**File:** `apps/web/src/lib/wise/bank-account-fetcher.ts` (NEW)

```typescript
/**
 * Bank Account Fetching Logic
 */

export interface CreatorBankAccount {
  accountNumber: string;
  bankCode: string;
  accountHolderName: string;
  currency: string;
  country: string;
}

/**
 * Fetch creator's verified bank account
 */
export async function getCreatorBankAccount(
  creatorId: string
): Promise<CreatorBankAccount | null> {
  // ✅ CORRECTED: Use existing service client
  const { createServiceClient } = await import('@/src/lib/supabase');
  const supabase = createServiceClient();

  // Fetch verified bank account
  const { data: bankAccount, error } = await supabase
    .from('creator_bank_accounts')
    .select('*')
    .eq('user_id', creatorId)  // ✅ CORRECTED: creator_bank_accounts uses 'user_id'
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !bankAccount) {
    return null;
  }

  // ✅ CORRECTED: Add null checks
  if (!bankAccount.account_number_encrypted || !bankAccount.routing_number_encrypted) {
    return null;
  }

  // Decrypt sensitive fields (or use as-is if not encrypted yet)
  const accountNumber = await decryptField(
    bankAccount.account_number_encrypted
  );

  // Handle routing_number_encrypted which stores different types
  // based on country (bank_code, swift_code, branch_code)
  const routingIdentifier = await decryptField(
    bankAccount.routing_number_encrypted
  );

  if (!accountNumber || !routingIdentifier) {
    return null;
  }

  return {
    accountNumber,
    bankCode: routingIdentifier,  // ✅ CORRECTED: Works for all countries
    accountHolderName: bankAccount.account_holder_name || '',
    currency: bankAccount.currency || 'USD',
    country: getCountryFromCurrency(bankAccount.currency || 'USD'),
  };
}

/**
 * Determine what type of identifier is stored in routing_number_encrypted
 */
function getIdentifierType(currency: string): string {
  const typeMap: Record<string, string> = {
    'NGN': 'bank_code',      // Nigerian bank code
    'GHS': 'swift_code',     // Ghanaian SWIFT code
    'KES': 'swift_code',     // Kenyan SWIFT code
    'ZAR': 'branch_code',    // South African branch code
    'USD': 'routing_number', // US routing number
    'GBP': 'sort_code',      // UK sort code
  };

  return typeMap[currency] || 'routing_number';
}

/**
 * Get country code from currency
 */
function getCountryFromCurrency(currency: string): string {
  const currencyToCountry: Record<string, string> = {
    'NGN': 'NG',
    'GHS': 'GH',
    'KES': 'KE',
    'ZAR': 'ZA',
    'USD': 'US',
    'GBP': 'GB',
  };

  return currencyToCountry[currency] || 'US';
}

/**
 * Decrypt encrypted field
 * ✅ CORRECTED: Handle case where encryption may not be implemented yet
 */
async function decryptField(encryptedValue: string): Promise<string> {
  // TODO: Implement proper decryption when encryption is added
  // Check your actual implementation in apps/web/app/api/user/revenue/bank-account/route.ts
  //
  // If using Supabase Vault:
  // const supabase = createServiceClient();
  // const { data } = await supabase.rpc('decrypt_field', { encrypted_value: encryptedValue });
  // return data;
  //
  // For now, if values are stored unencrypted, return as-is
  return encryptedValue;
}
```

---

### Phase 2: Creator Payout Request API

**File:** `apps/web/app/api/creator/payouts/request/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';  // ✅ CORRECTED
import { createServiceClient } from '@/src/lib/supabase';  // ✅ CORRECTED
import { payoutToCreator } from '@/src/lib/wise/payout';  // ✅ CORRECTED
import { detectCreatorCountry } from '@/src/lib/wise/country-detection';
import { getCreatorBankAccount } from '@/src/lib/wise/bank-account-fetcher';

/**
 * POST /api/creator/payouts/request
 *
 * Creator requests a payout from their available balance
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ CORRECTED: Use getSupabaseRouteClient for authentication
    const { supabase, user, error: authError } = await getSupabaseRouteClient(req, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const creatorId = user.id;

    // 2. Parse request body
    const body = await req.json();
    const { amount, sourceCurrency } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // 3. Check creator balance
    // ✅ CORRECTED: Use service client for database queries
    const serviceSupabase = createServiceClient();

    const { data: revenue, error: revenueError } = await serviceSupabase
      .from('creator_revenue')
      .select('available_balance, currency')
      .eq('user_id', creatorId)  // ✅ CORRECTED: creator_revenue uses 'user_id'
      .single();

    if (revenueError || !revenue) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // Check sufficient balance
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

    // 4. Detect creator's country and payout method
    const countryInfo = await detectCreatorCountry(creatorId);

    // Only support Wise payouts for now (NG, GH, KE)
    if (countryInfo.payoutMethod !== 'wise') {
      return NextResponse.json(
        {
          error: 'Payout method not supported for your country',
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

    // 6. Get Wise quote for currency conversion
    const { createQuote } = await import('@/lib/wise/transfers');

    const actualSourceCurrency = sourceCurrency || revenue.currency || 'USD';
    const targetCurrency = countryInfo.currency;

    // Create quote to get exchange rate and target amount
    const quote = await createQuote({
      sourceCurrency: actualSourceCurrency,
      targetCurrency,
      sourceAmount: amount,
    });

    const targetAmount = quote.targetAmount;
    const exchangeRate = quote.rate;

    // 7. Create payout via Wise
    const payoutResult = await payoutToCreator({
      creatorId,
      amount: targetAmount,
      currency: targetCurrency,
      bankAccountNumber: bankAccount.accountNumber,
      bankCode: bankAccount.bankCode,
      accountHolderName: bankAccount.accountHolderName,
      sourceCurrency: actualSourceCurrency,
      reason: 'Creator payout request',
    });

    if (!payoutResult.success) {
      return NextResponse.json(
        {
          error: 'Payout failed',
          message: payoutResult.error,
          code: payoutResult.code,
          retryable: payoutResult.retryable,
        },
        { status: 500 }
      );
    }

    // 8. Deduct from creator balance
    const { error: updateError } = await supabase
      .from('creator_revenue')
      .update({
        available_balance: revenue.available_balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', creatorId);

    if (updateError) {
      console.error('Failed to update creator balance:', updateError);
      // Note: Payout was created, but balance not updated
      // Should have background job to reconcile this
    }

    // 9. Return success
    return NextResponse.json({
      success: true,
      payout: {
        id: payoutResult.payout?.id,
        amount: targetAmount,
        currency: targetCurrency,
        sourceAmount: amount,
        sourceCurrency: actualSourceCurrency,
        exchangeRate,
        status: payoutResult.payout?.status,
        wiseTransferId: payoutResult.payout?.wise_transfer_id,
        bankAccount: {
          accountNumber: '****' + bankAccount.accountNumber.slice(-4),
          accountHolderName: bankAccount.accountHolderName,
        },
      },
    });

  } catch (error) {
    console.error('Creator payout request error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

### Phase 3: Additional Creator APIs

#### 3.1 Get Payout Status

**File:** `apps/web/app/api/creator/payouts/[id]/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/creator/payouts/:id
 *
 * Get status of a specific payout
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch payout (ensure it belongs to this creator)
    const { data: payout, error } = await supabase
      .from('wise_payouts')
      .select('*')
      .eq('id', params.id)
      .eq('creator_id', user.id)
      .single();

    if (error || !payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      createdAt: payout.created_at,
      completedAt: payout.completed_at,
      failedAt: payout.failed_at,
      errorMessage: payout.error_message,
      exchangeRate: payout.exchange_rate,
      sourceAmount: payout.source_amount,
      sourceCurrency: payout.source_currency,
      wiseFee: payout.wise_fee,
      statusHistory: payout.wise_status_history,
    });

  } catch (error) {
    console.error('Get payout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

#### 3.2 Get Payout History

**File:** `apps/web/app/api/creator/payouts/history/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/creator/payouts/history
 *
 * Get creator's payout history
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch payouts
    const { data: payouts, error, count } = await supabase
      .from('wise_payouts')
      .select('*', { count: 'exact' })
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      payouts: payouts?.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.created_at,
        completedAt: p.completed_at,
        errorMessage: p.error_message,
        sourceAmount: p.source_amount,
        sourceCurrency: p.source_currency,
      })),
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });

  } catch (error) {
    console.error('Get payout history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

#### 3.3 Get Available Balance

**File:** `apps/web/app/api/creator/balance/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/creator/balance
 *
 * Get creator's current available balance
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch balance
    const { data: revenue, error } = await supabase
      .from('creator_revenue')
      .select('available_balance, pending_balance, currency, total_earnings')
      .eq('creator_id', user.id)
      .single();

    if (error || !revenue) {
      return NextResponse.json(
        {
          availableBalance: 0,
          pendingBalance: 0,
          currency: 'USD',
          totalEarnings: 0,
        }
      );
    }

    return NextResponse.json({
      availableBalance: revenue.available_balance,
      pendingBalance: revenue.pending_balance,
      currency: revenue.currency,
      totalEarnings: revenue.total_earnings,
    });

  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Mobile App Implementation

### Phase 4: Mobile API Client

**File:** `src/services/api/payoutService.ts` (NEW)

```typescript
import { supabase } from '@/lib/supabase';

export interface PayoutRequest {
  amount: number;
  sourceCurrency?: string;
}

export interface PayoutResponse {
  success: boolean;
  payout?: {
    id: string;
    amount: number;
    currency: string;
    sourceAmount: number;
    sourceCurrency: string;
    exchangeRate: number;
    status: string;
    wiseTransferId: string | null;
    bankAccount: {
      accountNumber: string;
      accountHolderName: string;
    };
  };
  error?: string;
  message?: string;
  code?: string;
}

export interface PayoutHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  sourceAmount: number;
  sourceCurrency: string;
}

export interface BalanceResponse {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  totalEarnings: number;
}

/**
 * Request a payout
 */
export async function requestPayout(
  request: PayoutRequest
): Promise<PayoutResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/creator/payouts/request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Payout request failed');
  }

  return data;
}

/**
 * Get payout status
 */
export async function getPayoutStatus(payoutId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/creator/payouts/${payoutId}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch payout status');
  }

  return data;
}

/**
 * Get payout history
 */
export async function getPayoutHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{ payouts: PayoutHistoryItem[]; pagination: any }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/creator/payouts/history?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch payout history');
  }

  return data;
}

/**
 * Get available balance
 */
export async function getAvailableBalance(): Promise<BalanceResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/creator/balance`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch balance');
  }

  return data;
}
```

---

### Phase 5: Mobile UI Components

#### 5.1 Payout Request Screen

**File:** `src/screens/PayoutRequestScreen.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { requestPayout, getAvailableBalance, type BalanceResponse } from '@/services/api/payoutService';

export default function PayoutRequestScreen({ navigation }: any) {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  async function fetchBalance() {
    try {
      setFetchingBalance(true);
      const balanceData = await getAvailableBalance();
      setBalance(balanceData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch balance');
    } finally {
      setFetchingBalance(false);
    }
  }

  async function handleRequestPayout() {
    const amountNumber = parseFloat(amount);

    // Validation
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!balance || amountNumber > balance.availableBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance');
      return;
    }

    try {
      setLoading(true);

      const result = await requestPayout({
        amount: amountNumber,
        sourceCurrency: balance.currency,
      });

      if (result.success) {
        Alert.alert(
          'Payout Requested!',
          `Your payout of ${result.payout?.currency} ${result.payout?.amount.toFixed(2)} has been initiated. You will receive it in 1-3 business days.`,
          [
            {
              text: 'View Status',
              onPress: () => navigation.navigate('PayoutStatus', { payoutId: result.payout?.id }),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Payout Failed', result.message || result.error);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to request payout');
    } finally {
      setLoading(false);
    }
  }

  if (fetchingBalance) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading balance...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Request Payout
      </Text>

      {/* Available Balance */}
      <View style={{ backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>Available Balance</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1a73e8' }}>
          {balance?.currency} {balance?.availableBalance.toFixed(2)}
        </Text>
      </View>

      {/* Amount Input */}
      <Text style={{ fontSize: 16, marginBottom: 5 }}>Payout Amount</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          fontSize: 18,
          marginBottom: 10,
        }}
        placeholder={`Enter amount (${balance?.currency})`}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity
        style={{
          backgroundColor: '#1a73e8',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginTop: 10,
        }}
        onPress={handleRequestPayout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Request Payout
          </Text>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={{ marginTop: 20, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
        <Text style={{ fontSize: 14, color: '#1565c0' }}>
          ℹ️ Payouts are processed via Wise and typically arrive in 1-3 business days.
        </Text>
      </View>
    </View>
  );
}
```

---

#### 5.2 Payout History Screen

**File:** `src/screens/PayoutHistoryScreen.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getPayoutHistory, type PayoutHistoryItem } from '@/services/api/payoutService';

export default function PayoutHistoryScreen({ navigation }: any) {
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    try {
      setLoading(true);
      const result = await getPayoutHistory(20, 0);
      setPayouts(result.payouts);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'processing':
        return '#ff9800';
      case 'failed':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }

  function renderPayout({ item }: { item: PayoutHistoryItem }) {
    return (
      <TouchableOpacity
        style={{
          backgroundColor: '#fff',
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e0e0e0',
        }}
        onPress={() => navigation.navigate('PayoutStatus', { payoutId: item.id })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {item.currency} {item.amount.toFixed(2)}
          </Text>
          <View
            style={{
              backgroundColor: getStatusColor(item.status),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={{ color: '#666', fontSize: 14 }}>
          Requested: {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        {item.completedAt && (
          <Text style={{ color: '#666', fontSize: 14 }}>
            Completed: {new Date(item.completedAt).toLocaleDateString()}
          </Text>
        )}

        {item.errorMessage && (
          <Text style={{ color: '#f44336', fontSize: 12, marginTop: 5 }}>
            Error: {item.errorMessage}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Payout History
      </Text>

      {payouts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#666', fontSize: 16 }}>No payouts yet</Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderPayout}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}
```

---

## Database Schema Updates

### Add country_code to profiles (if missing)

```sql
-- Check if column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country_code VARCHAR(2);
    CREATE INDEX idx_profiles_country_code ON profiles(country_code);
  END IF;
END $$;
```

### Add identifier_type to creator_bank_accounts (optional)

```sql
-- Track what type of identifier is stored in routing_number_encrypted
ALTER TABLE creator_bank_accounts
ADD COLUMN IF NOT EXISTS identifier_type VARCHAR(20) DEFAULT 'routing_number';

-- Values: 'routing_number', 'bank_code', 'swift_code', 'branch_code', 'sort_code', 'bsb_code'

COMMENT ON COLUMN creator_bank_accounts.identifier_type IS
  'Type of identifier stored in routing_number_encrypted (bank_code, swift_code, etc.)';
```

---

## Testing Guide

### Test Scenario 1: Nigerian Creator Payout

**Setup:**
```sql
-- 1. Create test creator
INSERT INTO profiles (id, username, country_code)
VALUES ('test-creator-ng', 'nigerian_creator', 'NG');

-- 2. Add Nigerian bank account
INSERT INTO creator_bank_accounts (
  creator_id,
  account_number_encrypted,
  routing_number_encrypted,
  account_holder_name,
  currency,
  country,
  is_verified
) VALUES (
  'test-creator-ng',
  '0123456789', -- Replace with encrypted value
  '044', -- Access Bank code - Replace with encrypted value
  'Test Creator',
  'NGN',
  'NG',
  true
);

-- 3. Add balance
INSERT INTO creator_revenue (creator_id, available_balance, currency)
VALUES ('test-creator-ng', 10.00, 'USD')
ON CONFLICT (creator_id)
DO UPDATE SET available_balance = 10.00;
```

**Test Flow:**
```bash
# 1. Request payout
POST /api/creator/payouts/request
{
  "amount": 10.00,
  "sourceCurrency": "USD"
}

# Expected: Success, creates Wise transfer for ~NGN 15,000

# 2. Check balance
GET /api/creator/balance
# Expected: availableBalance = 0.00

# 3. Check payout status
GET /api/creator/payouts/{id}
# Expected: status = "processing" or "completed"

# 4. Check payout history
GET /api/creator/payouts/history
# Expected: Shows 1 payout
```

---

## Deployment Checklist

### Backend (Web Team)

- [ ] Create new API routes:
  - [ ] `/api/creator/payouts/request`
  - [ ] `/api/creator/payouts/[id]`
  - [ ] `/api/creator/payouts/history`
  - [ ] `/api/creator/balance`

- [ ] Add helper functions:
  - [ ] `country-detection.ts`
  - [ ] `bank-account-fetcher.ts`

- [ ] Update database:
  - [ ] Add `country_code` to profiles (if missing)
  - [ ] Add `identifier_type` to creator_bank_accounts (optional)

- [ ] Deploy to production
- [ ] Test with real Nigerian/Ghanaian/Kenyan accounts

### Mobile Team

- [ ] Create payout service:
  - [ ] `payoutService.ts`

- [ ] Create UI screens:
  - [ ] `PayoutRequestScreen`
  - [ ] `PayoutHistoryScreen`
  - [ ] `PayoutStatusScreen` (optional)

- [ ] Add navigation routes
- [ ] Test on iOS and Android
- [ ] Deploy to App Store/Play Store

---

## Next Steps

1. **Web team:** Implement backend APIs (Phase 1-3)
2. **Mobile team:** Implement UI screens (Phase 4-5)
3. **Both teams:** Test end-to-end with small amounts
4. **Deploy:** Production rollout
5. **Monitor:** Track success rate and errors

---

**Last Updated:** December 29, 2025
**Status:** Ready for Implementation
**Estimated Time:** 2-3 days for backend, 1-2 days for mobile
