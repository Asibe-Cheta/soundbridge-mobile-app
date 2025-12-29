#!/usr/bin/env node
/**
 * Create Wise Webhook via API
 *
 * This script creates a Wise webhook subscription programmatically,
 * bypassing the dashboard's strict validation.
 *
 * Usage:
 *   node scripts/create-wise-webhook.js
 */

require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
const WEBHOOK_URL = 'https://www.soundbridge.live/api/webhooks/wise';

async function createWiseWebhook() {
  console.log('🚀 Creating Wise webhook subscription...\n');

  // Validate environment variables
  if (!WISE_API_TOKEN) {
    console.error('❌ Error: WISE_API_TOKEN not found in .env file');
    console.log('\nPlease add your Wise API token to .env:');
    console.log('  WISE_API_TOKEN=your_live_wise_api_token_here\n');
    process.exit(1);
  }

  if (!WISE_PROFILE_ID) {
    console.error('❌ Error: WISE_PROFILE_ID not found in .env file');
    console.log('\nPlease add your Wise Profile ID to .env:');
    console.log('  WISE_PROFILE_ID=your_wise_profile_id_here\n');
    console.log('To get your Profile ID, run:');
    console.log('  curl https://api.wise.com/v1/profiles \\');
    console.log('    -H "Authorization: Bearer YOUR_WISE_API_TOKEN"\n');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('  Profile ID:', WISE_PROFILE_ID);
  console.log('  Webhook URL:', WEBHOOK_URL);
  console.log('  Event Type: transfers#state-change\n');

  try {
    console.log('📡 Sending request to Wise API...');

    const response = await fetch(
      `https://api.wise.com/v3/profiles/${WISE_PROFILE_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'SoundBridge Transfer Updates',
          trigger_on: 'transfers#state-change',
          delivery: {
            version: '2.0.0',
            url: WEBHOOK_URL,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Failed to create webhook\n');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));

      if (response.status === 401) {
        console.log('\n💡 Tip: Check that your WISE_API_TOKEN is correct and has not expired');
      } else if (response.status === 404) {
        console.log('\n💡 Tip: Check that your WISE_PROFILE_ID is correct');
      } else if (response.status === 409) {
        console.log('\n💡 A webhook with this configuration may already exist');
        console.log('   Run: node scripts/manage-wise-webhook.js list');
      }

      process.exit(1);
    }

    console.log('\n✅ Webhook created successfully!\n');
    console.log('═'.repeat(60));
    console.log('Subscription Details:');
    console.log('═'.repeat(60));
    console.log('  ID:        ', data.id);
    console.log('  Name:      ', data.name);
    console.log('  URL:       ', data.delivery.url);
    console.log('  Trigger:   ', data.trigger_on);
    console.log('  Version:   ', data.delivery.version);
    console.log('  Created:   ', data.created_at);
    console.log('═'.repeat(60));

    console.log('\n💾 IMPORTANT: Save this subscription ID to your .env file:\n');
    console.log(`  WISE_WEBHOOK_SUBSCRIPTION_ID=${data.id}\n`);

    console.log('✅ Next Steps:');
    console.log('  1. Add the subscription ID to your .env file');
    console.log('  2. Test the webhook:');
    console.log(`     node scripts/test-wise-webhook.js ${data.id}`);
    console.log('  3. Monitor your backend logs for incoming webhook events\n');

  } catch (error) {
    console.error('\n❌ Error creating webhook:', error.message);

    if (error.message.includes('fetch')) {
      console.log('\n💡 Tip: Check your internet connection');
    }

    process.exit(1);
  }
}

// Run the script
createWiseWebhook();
