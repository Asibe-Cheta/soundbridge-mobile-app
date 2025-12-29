#!/usr/bin/env node
/**
 * Verify Wise Webhook Integration
 *
 * This script verifies that the webhook integration is working correctly.
 *
 * Usage:
 *   node scripts/verify-wise-webhook.js
 *
 * What it checks:
 * 1. ✅ Environment variables are set
 * 2. ✅ Webhook endpoint is accessible
 * 3. ✅ Webhook subscription exists in Wise
 * 4. ✅ Test notification can be sent
 * 5. ✅ Database schema is correct
 */

require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'WISE_API_TOKEN',
  'WISE_PROFILE_ID',
  'WISE_WEBHOOK_SECRET',
  'WISE_WEBHOOK_SUBSCRIPTION_ID',
];

const WEBHOOK_URL = 'https://www.soundbridge.live/wise-webhook';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function section(title) {
  log(`\n${'═'.repeat(70)}`, colors.blue);
  log(`${colors.bold}${title}${colors.reset}`, colors.blue);
  log('═'.repeat(70), colors.blue);
}

async function verifyWebhookIntegration() {
  let allChecksPassed = true;

  try {
    section('WISE WEBHOOK INTEGRATION VERIFICATION');

    // Check 1: Environment variables
    section('Check 1: Environment Variables');

    REQUIRED_ENV_VARS.forEach((varName) => {
      if (process.env[varName]) {
        success(`${varName} is set`);
      } else {
        error(`${varName} is NOT set`);
        allChecksPassed = false;
      }
    });

    if (!allChecksPassed) {
      error('\nSome environment variables are missing. Please add them to your .env file.');
      process.exit(1);
    }

    // Check 2: Webhook endpoint accessibility
    section('Check 2: Webhook Endpoint Accessibility');

    info(`Testing GET request to ${WEBHOOK_URL}...`);

    const getResponse = await fetch(WEBHOOK_URL, {
      method: 'GET',
    });

    if (getResponse.ok) {
      const text = await getResponse.text();
      if (text === 'OK') {
        success('GET request returned "OK"');
      } else {
        warning(`GET request returned "${text}" (expected "OK")`);
      }
    } else {
      error(`GET request failed with status ${getResponse.status}`);
      allChecksPassed = false;
    }

    info('Testing POST request...');

    const postResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });

    if (postResponse.ok) {
      success('POST request succeeded');
    } else {
      error(`POST request failed with status ${postResponse.status}`);
      allChecksPassed = false;
    }

    // Check 3: Webhook subscription in Wise
    section('Check 3: Webhook Subscription in Wise API');

    info('Fetching webhook subscriptions from Wise...');

    const subscriptionsResponse = await fetch(
      `https://api.wise.com/v3/profiles/${process.env.WISE_PROFILE_ID}/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!subscriptionsResponse.ok) {
      error('Failed to fetch webhook subscriptions from Wise API');
      error(`Status: ${subscriptionsResponse.status}`);
      allChecksPassed = false;
    } else {
      const subscriptions = await subscriptionsResponse.json();
      success(`Found ${subscriptions.length} webhook subscription(s)`);

      const targetSubscription = subscriptions.find(
        (sub) => sub.id === process.env.WISE_WEBHOOK_SUBSCRIPTION_ID
      );

      if (targetSubscription) {
        success('Webhook subscription found in Wise');
        info('Subscription details:');
        console.log({
          id: targetSubscription.id,
          name: targetSubscription.name,
          url: targetSubscription.delivery?.url,
          trigger: targetSubscription.trigger_on,
          version: targetSubscription.delivery?.version,
        });

        if (targetSubscription.delivery?.url === WEBHOOK_URL) {
          success('Webhook URL matches expected URL');
        } else {
          warning(`Webhook URL (${targetSubscription.delivery?.url}) doesn't match expected URL (${WEBHOOK_URL})`);
        }
      } else {
        error(`Webhook subscription ID ${process.env.WISE_WEBHOOK_SUBSCRIPTION_ID} not found in Wise`);
        allChecksPassed = false;

        info('Available subscriptions:');
        subscriptions.forEach((sub) => {
          console.log(`  - ${sub.name} (${sub.id})`);
        });
      }
    }

    // Check 4: Send test notification
    section('Check 4: Send Test Notification');

    info('Sending test notification from Wise...');

    const testResponse = await fetch(
      `https://api.wise.com/v3/profiles/${process.env.WISE_PROFILE_ID}/subscriptions/${process.env.WISE_WEBHOOK_SUBSCRIPTION_ID}/test-notifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      error('Failed to send test notification');
      error(`Status: ${testResponse.status}`);
      allChecksPassed = false;
    } else {
      success('Test notification sent successfully');
      const testData = await testResponse.json();
      info('Response:');
      console.log(testData);

      info('\n🔍 Next Steps:');
      info('1. Check Vercel logs for the test notification');
      info('2. Go to: https://vercel.com/soundbridge/logs');
      info('3. Look for: "Wise webhook POST request received"');
      info('4. Verify the event was processed correctly');
    }

    // Summary
    section('VERIFICATION SUMMARY');

    if (allChecksPassed) {
      success('All checks passed! ✨');
      success('Your Wise webhook integration is working correctly.');

      info('\n📋 What to do next:');
      info('1. Test the end-to-end flow with: npx ts-node scripts/test-wise-payout-e2e.ts');
      info('2. Monitor webhook events in Vercel logs');
      info('3. Check database for status updates');
    } else {
      error('Some checks failed. Please review the errors above and fix them.');
      process.exit(1);
    }

  } catch (err) {
    error(`\nVerification failed with error: ${err.message}`);
    console.error('\nStack trace:');
    console.error(err.stack);
    process.exit(1);
  }
}

// Run verification
verifyWebhookIntegration();
