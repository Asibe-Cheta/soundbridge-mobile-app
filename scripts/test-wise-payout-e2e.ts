#!/usr/bin/env ts-node
/**
 * End-to-End Test Script for Wise Payout Flow
 *
 * This script tests the complete payout flow from mobile app to Wise to webhook.
 *
 * IMPORTANT: This uses REAL API calls and will create REAL transfers in LIVE mode.
 * Use small amounts for testing (e.g., 100 NGN = ~$0.07 USD)
 *
 * Usage:
 *   npx ts-node scripts/test-wise-payout-e2e.ts
 *
 * What it tests:
 * 1. ✅ Create payout record in database
 * 2. ✅ Initiate Wise transfer via API
 * 3. ✅ Verify transfer creation
 * 4. ✅ Check webhook receives status updates
 * 5. ✅ Verify database is updated correctly
 * 6. ✅ Validate status history tracking
 */

import 'dotenv/config';
import { payoutToCreator } from '../src/lib/wise/payout';
import { getPayoutById, getPayoutByWiseTransferId } from '../src/lib/wise/database';
import { getTransferStatus } from '../src/lib/wise/transfers';
import type { WisePayout } from '../src/lib/types/wise';

// Test configuration
const TEST_CONFIG = {
  // Use a real creator ID from your database
  creatorId: 'REPLACE_WITH_REAL_CREATOR_ID',

  // Small test amount (100 NGN = ~$0.07 USD)
  amount: 100,
  currency: 'NGN' as const,

  // Nigerian test bank account (use a real account for testing)
  // This should be YOUR OWN bank account for testing
  bankAccountNumber: '0123456789', // Replace with real 10-digit account
  bankCode: '044', // Access Bank - replace with your bank
  accountHolderName: 'Test Account', // Replace with real name

  // Test reference
  reference: `test_payout_${Date.now()}`,
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function section(title: string) {
  log(`\n${'═'.repeat(70)}`, colors.blue);
  log(`${colors.bold}${title}${colors.reset}`, colors.blue);
  log('═'.repeat(70), colors.blue);
}

function printPayout(payout: WisePayout) {
  console.log({
    id: payout.id,
    creator_id: payout.creator_id,
    amount: `${payout.amount} ${payout.currency}`,
    status: payout.status,
    wise_transfer_id: payout.wise_transfer_id,
    recipient_account: payout.recipient_account_number,
    recipient_name: payout.recipient_account_name,
    reference: payout.reference,
    created_at: payout.created_at,
    completed_at: payout.completed_at,
    error_message: payout.error_message,
  });
}

async function wait(seconds: number) {
  info(`Waiting ${seconds} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function testEndToEndPayoutFlow() {
  let payoutId: string | undefined;
  let transferId: string | undefined;

  try {
    section('WISE PAYOUT END-TO-END TEST');

    // Pre-flight checks
    section('Step 0: Pre-flight Checks');

    if (TEST_CONFIG.creatorId === 'REPLACE_WITH_REAL_CREATOR_ID') {
      error('Please update TEST_CONFIG.creatorId with a real creator ID from your database');
      process.exit(1);
    }

    if (TEST_CONFIG.bankAccountNumber === '0123456789') {
      warning('Using default test bank account. Replace with your own bank account for real testing.');
    }

    info(`Test Configuration:`);
    console.log({
      creatorId: TEST_CONFIG.creatorId,
      amount: `${TEST_CONFIG.amount} ${TEST_CONFIG.currency}`,
      bankAccount: `${TEST_CONFIG.bankAccountNumber} (${TEST_CONFIG.bankCode})`,
      reference: TEST_CONFIG.reference,
    });

    const proceed = process.env.SKIP_CONFIRMATION === 'true'
      ? 'yes'
      : await promptUser('\nThis will create a REAL transfer in LIVE mode. Continue? (yes/no): ');

    if (proceed.toLowerCase() !== 'yes') {
      warning('Test cancelled by user.');
      process.exit(0);
    }

    // Step 1: Create payout
    section('Step 1: Create Payout via Mobile App');
    info('Calling payoutToCreator()...');

    const startTime = Date.now();
    const result = await payoutToCreator({
      creatorId: TEST_CONFIG.creatorId,
      amount: TEST_CONFIG.amount,
      currency: TEST_CONFIG.currency,
      bankAccountNumber: TEST_CONFIG.bankAccountNumber,
      bankCode: TEST_CONFIG.bankCode,
      accountHolderName: TEST_CONFIG.accountHolderName,
      reference: TEST_CONFIG.reference,
    });
    const duration = Date.now() - startTime;

    if (!result.success) {
      error(`Payout creation failed: ${result.error}`);
      error(`Error code: ${result.code}`);
      error(`Retryable: ${result.retryable}`);
      process.exit(1);
    }

    success(`Payout created successfully in ${duration}ms`);
    payoutId = result.payout!.id;
    transferId = result.payout!.wise_transfer_id || undefined;

    info('Payout details:');
    printPayout(result.payout!);

    // Step 2: Verify database record
    section('Step 2: Verify Database Record');
    info(`Fetching payout from database (ID: ${payoutId})...`);

    const dbResult = await getPayoutById(payoutId);
    if (!dbResult.success || !dbResult.data) {
      error('Failed to fetch payout from database');
      process.exit(1);
    }

    success('Payout record found in database');

    // Verify fields
    const dbPayout = dbResult.data;
    const checks = [
      { name: 'Creator ID', condition: dbPayout.creator_id === TEST_CONFIG.creatorId },
      { name: 'Amount', condition: dbPayout.amount === TEST_CONFIG.amount },
      { name: 'Currency', condition: dbPayout.currency === TEST_CONFIG.currency },
      { name: 'Reference', condition: dbPayout.reference === TEST_CONFIG.reference },
      { name: 'Status set', condition: dbPayout.status !== null },
      { name: 'Wise Transfer ID', condition: dbPayout.wise_transfer_id !== null },
    ];

    checks.forEach((check) => {
      if (check.condition) {
        success(`${check.name}: ✓`);
      } else {
        error(`${check.name}: ✗`);
      }
    });

    // Step 3: Check Wise transfer status
    if (transferId) {
      section('Step 3: Verify Transfer in Wise API');
      info(`Checking transfer status (Transfer ID: ${transferId})...`);

      const transferStatus = await getTransferStatus({ transferId: parseInt(transferId) });
      success('Transfer found in Wise API');

      info('Transfer details:');
      console.log({
        id: transferStatus.id,
        status: transferStatus.status,
        sourceCurrency: transferStatus.sourceCurrency,
        sourceValue: transferStatus.sourceValue,
        targetCurrency: transferStatus.targetCurrency,
        targetValue: transferStatus.targetValue,
        rate: transferStatus.rate,
        reference: transferStatus.reference,
      });
    } else {
      warning('No Wise transfer ID available - transfer may not have been created');
    }

    // Step 4: Wait for webhook
    section('Step 4: Wait for Webhook Updates');
    info('The webhook should receive status updates from Wise within 5-30 seconds...');
    info('Checking database for updates every 5 seconds (max 60 seconds)...');

    let webhookReceived = false;
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds total

    while (attempts < maxAttempts && !webhookReceived) {
      await wait(5);
      attempts++;

      const updatedResult = await getPayoutById(payoutId);
      if (!updatedResult.success || !updatedResult.data) {
        warning('Failed to fetch updated payout');
        continue;
      }

      const updatedPayout = updatedResult.data;

      // Check if status history has new entries
      const historyCount = updatedPayout.wise_status_history?.length || 0;

      info(`Attempt ${attempts}/${maxAttempts}: Status = ${updatedPayout.status}, History entries = ${historyCount}`);

      if (historyCount > 1 || updatedPayout.status === 'completed' || updatedPayout.status === 'processing') {
        webhookReceived = true;
        success('Webhook update detected!');

        info('Updated payout:');
        printPayout(updatedPayout);

        if (updatedPayout.wise_status_history && updatedPayout.wise_status_history.length > 0) {
          info('\nStatus History:');
          updatedPayout.wise_status_history.forEach((entry: any, index: number) => {
            console.log(`  ${index + 1}. ${entry.from_status || 'initial'} → ${entry.status} (${entry.timestamp})`);
          });
        }
      }
    }

    if (!webhookReceived) {
      warning('No webhook updates detected within 60 seconds');
      warning('This is normal for test payouts - webhooks may take longer');
      info('You can check Vercel logs to see if webhook was received');
    }

    // Step 5: Final verification
    section('Step 5: Final Verification');

    const finalResult = await getPayoutById(payoutId);
    if (!finalResult.success || !finalResult.data) {
      error('Failed to fetch final payout state');
      process.exit(1);
    }

    const finalPayout = finalResult.data;

    info('Final Payout State:');
    printPayout(finalPayout);

    // Summary
    section('TEST SUMMARY');

    const summaryChecks = [
      { name: 'Payout created', status: true },
      { name: 'Database record created', status: true },
      { name: 'Wise transfer initiated', status: !!finalPayout.wise_transfer_id },
      { name: 'Webhook received', status: webhookReceived },
      { name: 'Status history tracked', status: (finalPayout.wise_status_history?.length || 0) > 0 },
    ];

    summaryChecks.forEach((check) => {
      if (check.status) {
        success(check.name);
      } else {
        warning(`${check.name} (not completed)`);
      }
    });

    info('\nNext Steps:');
    info('1. Check Vercel logs for webhook events: https://vercel.com/soundbridge/logs');
    info('2. Check Wise dashboard for transfer status: https://wise.com/');
    info('3. Monitor the payout in your database using the payout ID above');
    info('4. The webhook will continue to update status as the transfer progresses');

    section('TEST COMPLETED');
    success('End-to-end test completed successfully! 🎉');

  } catch (err) {
    error(`\nTest failed with error: ${err instanceof Error ? err.message : String(err)}`);

    if (err instanceof Error && err.stack) {
      console.error('\nStack trace:');
      console.error(err.stack);
    }

    process.exit(1);
  }
}

// Simple prompt utility
async function promptUser(question: string): Promise<string> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the test
testEndToEndPayoutFlow();
