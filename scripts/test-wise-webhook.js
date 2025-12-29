#!/usr/bin/env node
/**
 * Test Wise Webhook
 *
 * Sends a test notification to verify your webhook is working.
 *
 * Usage:
 *   node scripts/test-wise-webhook.js <subscription-id>
 */

require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;

async function testWiseWebhook(subscriptionId) {
  console.log('🧪 Testing Wise webhook...\n');

  if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
    console.error('❌ Error: WISE_API_TOKEN or WISE_PROFILE_ID not found in .env');
    process.exit(1);
  }

  if (!subscriptionId) {
    console.error('❌ Error: Subscription ID is required\n');
    console.log('Usage:');
    console.log('  node scripts/test-wise-webhook.js <subscription-id>\n');
    console.log('Or use the ID from .env:');
    console.log('  node scripts/test-wise-webhook.js $WISE_WEBHOOK_SUBSCRIPTION_ID\n');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('  Profile ID:', WISE_PROFILE_ID);
  console.log('  Subscription ID:', subscriptionId);
  console.log('');

  try {
    console.log('📡 Sending test notification...');

    const response = await fetch(
      `https://api.wise.com/v3/profiles/${WISE_PROFILE_ID}/subscriptions/${subscriptionId}/test-notifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Failed to send test notification\n');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));

      if (response.status === 404) {
        console.log('\n💡 Tip: Subscription ID may be incorrect');
        console.log('   Run: node scripts/list-wise-webhooks.js');
      }

      process.exit(1);
    }

    console.log('\n✅ Test notification sent successfully!\n');
    console.log('═'.repeat(60));
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('═'.repeat(60));

    console.log('\n🔍 Next Steps:');
    console.log('  1. Check your backend logs at:');
    console.log('     https://vercel.com/your-project/logs');
    console.log('  2. Look for log message:');
    console.log('     "Wise webhook POST request received"');
    console.log('  3. Verify the webhook event data is logged correctly\n');

    console.log('💡 If you don\'t see the webhook event:');
    console.log('  - Verify your webhook URL is correct');
    console.log('  - Check that the endpoint is deployed');
    console.log('  - Ensure there are no firewall/WAF blocks\n');

  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
    process.exit(1);
  }
}

// Get subscription ID from command line argument or .env
const subscriptionId = process.argv[2] || process.env.WISE_WEBHOOK_SUBSCRIPTION_ID;

// Run the script
testWiseWebhook(subscriptionId);
