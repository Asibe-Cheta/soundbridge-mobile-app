# Wise API Usage Examples

**Date:** 2025-12-29
**Status:** ✅ Ready for Use
**Environment:** Production (Live)

---

## Overview

This document provides practical examples of using the Wise API integration in the SoundBridge mobile app.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Account Verification](#account-verification)
3. [Creating Recipients](#creating-recipients)
4. [Creating Transfers](#creating-transfers)
5. [Checking Transfer Status](#checking-transfer-status)
6. [Error Handling](#error-handling)
7. [Complete Payout Flow](#complete-payout-flow)

---

## Basic Setup

### Import Wise Functions

```typescript
// Import all functions
import * as Wise from '@/lib/wise';

// Or import specific functions
import {
  resolveAccount,
  createRecipient,
  createTransfer,
  getTransferStatus,
} from '@/lib/wise';

// Import types
import type {
  WiseTransfer,
  CreateTransferParams,
  ResolveAccountResponse,
} from '@/lib/wise';
```

### Check Configuration

```typescript
import { isWiseConfigured, isWiseProduction } from '@/lib/wise';

if (!isWiseConfigured()) {
  console.error('Wise API not configured. Check .env.local');
  return;
}

if (isWiseProduction()) {
  console.warn('⚠️  Using PRODUCTION Wise API - real transfers!');
}
```

---

## Account Verification

### Verify Nigerian Bank Account

```typescript
import { resolveAccount } from '@/lib/wise';

async function verifyNigerianAccount() {
  const result = await resolveAccount({
    accountNumber: '0123456789',
    bankCode: '044', // Access Bank
    currency: 'NGN',
  });

  if (result.success) {
    console.log('✅ Account verified!');
    console.log('Bank:', result.bankName);
    console.log('Account Number:', result.accountNumber);
    // Note: accountHolderName may be undefined for format-only validation
  } else {
    console.error('❌ Account verification failed:', result.error);
  }
}
```

### Verify Ghanaian Bank Account

```typescript
import { resolveAccount } from '@/lib/wise';

async function verifyGhanaianAccount() {
  const result = await resolveAccount({
    accountNumber: '1234567890123',
    bankCode: '280100', // Access Bank Ghana
    currency: 'GHS',
  });

  if (result.success) {
    console.log('✅ Account format valid!');
    console.log('Bank:', result.bankName);
  } else {
    console.error('❌ Invalid account format:', result.error);
  }
}
```

### Verify Kenyan Bank Account

```typescript
import { resolveAccount } from '@/lib/wise';

async function verifyKenyanAccount() {
  const result = await resolveAccount({
    accountNumber: '1234567890123',
    bankCode: '01', // KCB Bank
    currency: 'KES',
  });

  if (result.success) {
    console.log('✅ Account format valid!');
    console.log('Bank:', result.bankName);
  } else {
    console.error('❌ Invalid account format:', result.error);
  }
}
```

---

## Creating Recipients

### Create Nigerian Recipient

```typescript
import { createRecipient } from '@/lib/wise';

async function createNigerianRecipient() {
  try {
    const recipient = await createRecipient({
      currency: 'NGN',
      accountHolderName: 'Chukwuemeka Okonkwo',
      legalType: 'PRIVATE',
      details: {
        accountNumber: '0123456789',
        bankCode: '044', // Access Bank
        accountType: 'checking',
      },
    });

    console.log('✅ Recipient created!');
    console.log('Recipient ID:', recipient.id);
    console.log('Account Holder:', recipient.accountHolderName);
    console.log('Currency:', recipient.currency);

    // Save recipient.id to database for future transfers
    return recipient;
  } catch (error) {
    console.error('❌ Failed to create recipient:', error);
    throw error;
  }
}
```

### Create Ghanaian Recipient

```typescript
import { createRecipient } from '@/lib/wise';

async function createGhanaianRecipient() {
  try {
    const recipient = await createRecipient({
      currency: 'GHS',
      accountHolderName: 'Kwame Mensah',
      details: {
        accountNumber: '1234567890123',
        bankCode: '280100', // Access Bank Ghana
        accountType: 'savings',
      },
    });

    console.log('✅ Ghanaian recipient created!');
    console.log('Recipient ID:', recipient.id);

    return recipient;
  } catch (error) {
    console.error('❌ Failed to create recipient:', error);
    throw error;
  }
}
```

### Create Kenyan Recipient

```typescript
import { createRecipient } from '@/lib/wise';

async function createKenyanRecipient() {
  try {
    const recipient = await createRecipient({
      currency: 'KES',
      accountHolderName: 'Jane Wanjiku',
      details: {
        accountNumber: '1234567890123',
        bankCode: '01', // KCB Bank
        accountType: 'checking',
      },
    });

    console.log('✅ Kenyan recipient created!');
    console.log('Recipient ID:', recipient.id);

    return recipient;
  } catch (error) {
    console.error('❌ Failed to create recipient:', error);
    throw error;
  }
}
```

---

## Creating Transfers

### Transfer to Existing Recipient

```typescript
import { createTransfer } from '@/lib/wise';

async function transferToExistingRecipient(recipientId: number) {
  try {
    const transfer = await createTransfer({
      targetCurrency: 'NGN',
      targetAmount: 50000, // ₦50,000
      recipientId: recipientId,
      reference: `Payout for user ${userId} - ${Date.now()}`,
      customerTransactionId: `soundbridge_${userId}_${Date.now()}`,
    });

    console.log('✅ Transfer created!');
    console.log('Transfer ID:', transfer.id);
    console.log('Status:', transfer.status);
    console.log('Amount:', transfer.targetValue, transfer.targetCurrency);

    return transfer;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);
    throw error;
  }
}
```

### Transfer with Inline Recipient Creation

```typescript
import { createTransfer } from '@/lib/wise';

async function transferWithInlineRecipient() {
  try {
    const transfer = await createTransfer({
      targetCurrency: 'NGN',
      targetAmount: 100000, // ₦100,000
      reference: `Payout-${Date.now()}`,
      recipientDetails: {
        accountHolderName: 'Ngozi Adeyemi',
        accountNumber: '0123456789',
        bankCode: '058', // GTBank
        currency: 'NGN',
      },
    });

    console.log('✅ Transfer created with inline recipient!');
    console.log('Transfer ID:', transfer.id);
    console.log('Recipient ID:', transfer.targetAccount);

    return transfer;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);
    throw error;
  }
}
```

### Transfer to Ghana

```typescript
import { createTransfer } from '@/lib/wise';

async function transferToGhana() {
  try {
    const transfer = await createTransfer({
      targetCurrency: 'GHS',
      targetAmount: 5000, // GH₵ 5,000
      reference: `Ghana-Payout-${Date.now()}`,
      recipientDetails: {
        accountHolderName: 'Ama Serwaa',
        accountNumber: '1234567890123',
        bankCode: '230100', // GTBank Ghana
        currency: 'GHS',
      },
    });

    console.log('✅ Transfer to Ghana created!');
    console.log('Transfer ID:', transfer.id);

    return transfer;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);
    throw error;
  }
}
```

### Transfer to Kenya

```typescript
import { createTransfer } from '@/lib/wise';

async function transferToKenya() {
  try {
    const transfer = await createTransfer({
      targetCurrency: 'KES',
      targetAmount: 50000, // KES 50,000
      reference: `Kenya-Payout-${Date.now()}`,
      recipientDetails: {
        accountHolderName: 'John Kamau',
        accountNumber: '1234567890123',
        bankCode: '68', // Equity Bank
        currency: 'KES',
      },
    });

    console.log('✅ Transfer to Kenya created!');
    console.log('Transfer ID:', transfer.id);

    return transfer;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);
    throw error;
  }
}
```

---

## Checking Transfer Status

### Get Current Status

```typescript
import { getTransferStatus } from '@/lib/wise';

async function checkTransferStatus(transferId: number) {
  try {
    const status = await getTransferStatus({ transferId });

    console.log('Transfer Status:', status.status);
    console.log('Is Complete:', status.isComplete);
    console.log('Is Failed:', status.isFailed);
    console.log('Message:', status.statusMessage);

    if (status.isComplete) {
      console.log('✅ Transfer completed successfully!');
      console.log('Completed at:', status.completedAt);
    } else if (status.isFailed) {
      console.log('❌ Transfer failed!');
    } else {
      console.log('⏳ Transfer pending...');
    }

    return status;
  } catch (error) {
    console.error('❌ Failed to get transfer status:', error);
    throw error;
  }
}
```

### Poll Transfer Until Complete

```typescript
import { getTransferStatus } from '@/lib/wise';

async function waitForTransferCompletion(
  transferId: number,
  maxWaitMs: number = 300000 // 5 minutes
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await getTransferStatus({ transferId });

      if (status.isComplete) {
        console.log('✅ Transfer completed!');
        return true;
      }

      if (status.isFailed) {
        console.log('❌ Transfer failed!');
        return false;
      }

      console.log(`⏳ Transfer status: ${status.status}. Checking again in ${pollInterval / 1000}s...`);

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('Error checking transfer status:', error);
      // Continue polling despite errors
    }
  }

  console.warn('⚠️  Transfer did not complete within timeout');
  return false;
}
```

---

## Error Handling

### Handle API Errors

```typescript
import { createTransfer, WiseAPIError } from '@/lib/wise';

async function createTransferWithErrorHandling() {
  try {
    const transfer = await createTransfer({
      targetCurrency: 'NGN',
      targetAmount: 50000,
      recipientId: 12345678,
      reference: 'Test transfer',
    });

    return { success: true, transfer };
  } catch (error) {
    if (error instanceof WiseAPIError) {
      console.error('Wise API Error:', {
        message: error.message,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        details: error.details,
      });

      // Handle specific error codes
      if (error.statusCode === 401) {
        return { success: false, error: 'Invalid API credentials' };
      } else if (error.statusCode === 403) {
        return { success: false, error: 'Insufficient permissions' };
      } else if (error.statusCode === 404) {
        return { success: false, error: 'Recipient not found' };
      } else if (error.statusCode === 422) {
        return { success: false, error: 'Invalid transfer parameters' };
      }

      return { success: false, error: error.message };
    }

    // Generic error
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Retry with Exponential Backoff

```typescript
import { createTransfer } from '@/lib/wise';

async function createTransferWithRetry(
  params: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transfer = await createTransfer(params);
      console.log(`✅ Transfer created on attempt ${attempt}`);
      return transfer;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️  Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}
```

---

## Complete Payout Flow

### Full Creator Payout Example

```typescript
import {
  resolveAccount,
  createRecipient,
  createTransfer,
  getTransferStatus,
} from '@/lib/wise';

interface PayoutParams {
  userId: string;
  amount: number;
  currency: 'NGN' | 'GHS' | 'KES';
  accountNumber: string;
  bankCode: string;
  accountHolderName: string;
}

async function executeCreatorPayout(params: PayoutParams) {
  const {
    userId,
    amount,
    currency,
    accountNumber,
    bankCode,
    accountHolderName,
  } = params;

  console.log('🚀 Starting payout process for user:', userId);

  try {
    // Step 1: Verify account
    console.log('📝 Step 1: Verifying bank account...');
    const verification = await resolveAccount({
      accountNumber,
      bankCode,
      currency,
    });

    if (!verification.success) {
      throw new Error(`Account verification failed: ${verification.error}`);
    }

    console.log('✅ Account verified:', verification.bankName);

    // Step 2: Check if recipient already exists in database
    console.log('📝 Step 2: Creating recipient...');
    // In real app, check if recipient exists first to reuse it
    const recipient = await createRecipient({
      currency,
      accountHolderName,
      details: {
        accountNumber,
        bankCode,
        accountType: 'checking',
      },
    });

    console.log('✅ Recipient created:', recipient.id);

    // Step 3: Create transfer
    console.log('📝 Step 3: Creating transfer...');
    const transfer = await createTransfer({
      targetCurrency: currency,
      targetAmount: amount,
      recipientId: recipient.id,
      reference: `SoundBridge payout for user ${userId}`,
      customerTransactionId: `soundbridge_${userId}_${Date.now()}`,
    });

    console.log('✅ Transfer created:', transfer.id);

    // Step 4: Monitor transfer status
    console.log('📝 Step 4: Monitoring transfer status...');
    const finalStatus = await getTransferStatus({ transferId: transfer.id });

    console.log('✅ Transfer status:', finalStatus.status);

    // Step 5: Update database
    console.log('📝 Step 5: Updating database...');
    // TODO: Update your database with transfer details
    // await updatePayoutInDatabase({
    //   userId,
    //   transferId: transfer.id,
    //   recipientId: recipient.id,
    //   amount: transfer.targetValue,
    //   currency: transfer.targetCurrency,
    //   status: transfer.status,
    // });

    console.log('🎉 Payout process completed successfully!');

    return {
      success: true,
      transferId: transfer.id,
      recipientId: recipient.id,
      status: transfer.status,
      amount: transfer.targetValue,
      currency: transfer.targetCurrency,
    };
  } catch (error) {
    console.error('❌ Payout failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Usage
const result = await executeCreatorPayout({
  userId: '12345',
  amount: 50000,
  currency: 'NGN',
  accountNumber: '0123456789',
  bankCode: '044',
  accountHolderName: 'John Doe',
});

if (result.success) {
  console.log('Payout successful! Transfer ID:', result.transferId);
} else {
  console.error('Payout failed:', result.error);
}
```

---

## Bank Codes Reference

### Nigerian Banks

```typescript
import { NIGERIAN_BANK_CODES } from '@/lib/wise';

// Use predefined bank codes
const accessBankCode = NIGERIAN_BANK_CODES.ACCESS_BANK; // '044'
const gtbCode = NIGERIAN_BANK_CODES.GTB; // '058'
const zenithCode = NIGERIAN_BANK_CODES.ZENITH; // '057'
```

### Ghanaian Banks

```typescript
import { GHANAIAN_BANK_CODES } from '@/lib/wise';

const accessBankCode = GHANAIAN_BANK_CODES.ACCESS_BANK; // '280100'
const gtbCode = GHANAIAN_BANK_CODES.GTB; // '230100'
```

### Kenyan Banks

```typescript
import { KENYAN_BANK_CODES } from '@/lib/wise';

const equityCode = KENYAN_BANK_CODES.EQUITY; // '68'
const kcbCode = KENYAN_BANK_CODES.KCB; // '01'
```

---

## Testing Checklist

Before going live, test:

- [ ] ✅ Account verification for all supported currencies (NGN, GHS, KES)
- [ ] ✅ Recipient creation with valid account details
- [ ] ✅ Transfer creation with existing recipient
- [ ] ✅ Transfer creation with inline recipient
- [ ] ✅ Transfer status checking
- [ ] ✅ Error handling for invalid accounts
- [ ] ✅ Error handling for insufficient balance
- [ ] ✅ Idempotency (same customerTransactionId doesn't create duplicate)

---

## Production Checklist

Before deploying:

- [ ] ✅ Environment variables set in production `.env.local`
- [ ] ✅ Wise API token has correct permissions
- [ ] ✅ Wise balance funded for payouts
- [ ] ✅ Webhook endpoint configured and tested
- [ ] ✅ Database schema for storing transfer IDs
- [ ] ✅ Error monitoring and alerting set up
- [ ] ✅ Rate limiting implemented
- [ ] ✅ Retry logic for failed transfers

---

**Last Updated:** 2025-12-29

**Status:** ✅ Ready for Integration

---

**END OF USAGE EXAMPLES**
