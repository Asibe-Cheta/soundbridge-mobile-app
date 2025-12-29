#!/usr/bin/env node
/**
 * List Wise Webhooks
 *
 * Lists all webhook subscriptions for your Wise profile.
 *
 * Usage:
 *   node scripts/list-wise-webhooks.js
 */

require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;

async function listWiseWebhooks() {
  console.log('📋 Listing Wise webhooks...\n');

  if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
    console.error('❌ Error: WISE_API_TOKEN or WISE_PROFILE_ID not found in .env');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('  Profile ID:', WISE_PROFILE_ID);
  console.log('');

  try {
    console.log('📡 Fetching webhooks from Wise API...');

    const response = await fetch(
      `https://api.wise.com/v3/profiles/${WISE_PROFILE_ID}/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const webhooks = await response.json();

    if (!response.ok) {
      console.error('\n❌ Failed to fetch webhooks\n');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(webhooks, null, 2));
      process.exit(1);
    }

    if (!Array.isArray(webhooks) || webhooks.length === 0) {
      console.log('\n📭 No webhooks found\n');
      console.log('To create a webhook, run:');
      console.log('  node scripts/create-wise-webhook.js\n');
      return;
    }

    console.log(`\n✅ Found ${webhooks.length} webhook(s):\n`);
    console.log('═'.repeat(80));

    webhooks.forEach((webhook, index) => {
      console.log(`\n${index + 1}. ${webhook.name}`);
      console.log('   '.repeat(1) + '─'.repeat(76));
      console.log('   ID:         ', webhook.id);
      console.log('   URL:        ', webhook.delivery?.url || 'N/A');
      console.log('   Trigger:    ', webhook.trigger_on);
      console.log('   Version:    ', webhook.delivery?.version || 'N/A');
      console.log('   Created:    ', webhook.created_at || 'N/A');
      console.log('   Status:     ', webhook.status || 'ACTIVE');
    });

    console.log('\n' + '═'.repeat(80));

    console.log('\n💡 To test a webhook:');
    console.log('  node scripts/test-wise-webhook.js <subscription-id>\n');

    console.log('💡 To delete a webhook:');
    console.log('  node scripts/delete-wise-webhook.js <subscription-id>\n');

    // Show which one is in .env (if any)
    const envSubscriptionId = process.env.WISE_WEBHOOK_SUBSCRIPTION_ID;
    if (envSubscriptionId) {
      const matchingWebhook = webhooks.find(w => w.id === envSubscriptionId);
      if (matchingWebhook) {
        console.log(`✅ Webhook in .env file found: ${matchingWebhook.name}`);
      } else {
        console.log(`⚠️  Webhook ID in .env file (${envSubscriptionId}) not found in list`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error listing webhooks:', error.message);
    process.exit(1);
  }
}

// Run the script
listWiseWebhooks();
