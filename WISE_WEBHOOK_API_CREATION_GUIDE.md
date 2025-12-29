# Wise Webhook Creation via API - Complete Guide

**Date:** 2025-12-29
**Solution:** Create webhook programmatically instead of using Wise dashboard

---

## 🎯 The Problem & Solution

**Problem:** Wise dashboard has strict URL validation that rejects valid endpoints
**Solution:** Create webhooks via Wise API - bypasses dashboard validation issues

---

## Step 1: Get Your Profile ID

Run this command to get your Wise profile ID:

```bash
curl https://api.wise.com/v1/profiles \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

**Replace `YOUR_WISE_API_TOKEN`** with your actual Wise API token from `.env` file.

**Expected Response:**
```json
[
  {
    "id": 12345678,
    "type": "business",
    "details": {
      "name": "SoundBridge"
    }
  }
]
```

**Save the `id` value** - you'll need it for the next step.

---

## Step 2: Create Webhook Subscription

### Option A: Using curl (Terminal)

```bash
curl -X POST "https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions" \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SoundBridge Transfer Updates",
    "trigger_on": "transfers#state-change",
    "delivery": {
      "version": "2.0.0",
      "url": "https://www.soundbridge.live/api/webhooks/wise"
    }
  }'
```

**Replace:**
- `YOUR_PROFILE_ID` with the ID from Step 1
- `YOUR_WISE_API_TOKEN` with your API token

### Option B: Using Node.js Script

Create a file `scripts/create-wise-webhook.js`:

```javascript
// scripts/create-wise-webhook.js
require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
const WEBHOOK_URL = 'https://www.soundbridge.live/api/webhooks/wise';

async function createWiseWebhook() {
  console.log('🚀 Creating Wise webhook subscription...\n');

  try {
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
      console.error('❌ Failed to create webhook:', data);
      process.exit(1);
    }

    console.log('✅ Webhook created successfully!\n');
    console.log('Subscription Details:');
    console.log('  ID:', data.id);
    console.log('  Name:', data.name);
    console.log('  URL:', data.delivery.url);
    console.log('  Trigger:', data.trigger_on);
    console.log('  Created:', data.created_at);
    console.log('\n💾 Save this subscription ID:', data.id);
    console.log('   Add to .env as: WISE_WEBHOOK_SUBSCRIPTION_ID=' + data.id);

  } catch (error) {
    console.error('❌ Error creating webhook:', error);
    process.exit(1);
  }
}

createWiseWebhook();
```

**Run the script:**
```bash
node scripts/create-wise-webhook.js
```

---

## Step 3: Test Your Webhook

After creating the webhook, test it to ensure it's working:

```bash
curl -X POST "https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions/SUBSCRIPTION_ID/test-notifications" \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

**Replace:**
- `YOUR_PROFILE_ID` with your profile ID
- `SUBSCRIPTION_ID` with the ID returned in Step 2
- `YOUR_WISE_API_TOKEN` with your API token

**Expected Response:**
```json
{
  "success": true
}
```

**Check your backend logs** - you should see the test notification received.

---

## Step 4: Verify Webhook is Active

List all your webhooks to confirm it was created:

```bash
curl https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "subscription-uuid",
    "name": "SoundBridge Transfer Updates",
    "trigger_on": "transfers#state-change",
    "delivery": {
      "version": "2.0.0",
      "url": "https://www.soundbridge.live/api/webhooks/wise"
    },
    "created_at": "2025-12-29T...",
    "status": "ACTIVE"
  }
]
```

---

## Step 5: Update Environment Variables

Add the webhook subscription ID to your `.env` file:

```bash
# Add this line
WISE_WEBHOOK_SUBSCRIPTION_ID=your-subscription-id-here
```

This is useful for managing/deleting the webhook later.

---

## Managing Webhooks via API

### List All Webhooks

```bash
curl https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

### Get Webhook Details

```bash
curl https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions/SUBSCRIPTION_ID \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

### Delete Webhook

```bash
curl -X DELETE "https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions/SUBSCRIPTION_ID" \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

### Update Webhook URL

```bash
curl -X PATCH "https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions/SUBSCRIPTION_ID" \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery": {
      "version": "2.0.0",
      "url": "https://www.soundbridge.live/api/webhooks/wise-new"
    }
  }'
```

---

## Webhook Event Types

You can create webhooks for different event types:

| Event Type | Description |
|------------|-------------|
| `transfers#state-change` | Transfer status changes (recommended) |
| `transfers#active-cases` | Issues requiring attention |
| `balances#credit` | Balance deposits |

---

## Complete Script with Error Handling

Create `scripts/manage-wise-webhook.js`:

```javascript
// scripts/manage-wise-webhook.js
require('dotenv').config();

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
const WEBHOOK_URL = 'https://www.soundbridge.live/api/webhooks/wise';

class WiseWebhookManager {
  constructor(apiToken, profileId) {
    this.apiToken = apiToken;
    this.profileId = profileId;
    this.baseUrl = 'https://api.wise.com/v3';
  }

  async request(method, path, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async listWebhooks() {
    console.log('📋 Listing all webhooks...\n');
    const webhooks = await this.request('GET', `/profiles/${this.profileId}/subscriptions`);

    if (webhooks.length === 0) {
      console.log('No webhooks found.');
      return [];
    }

    webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. ${webhook.name}`);
      console.log(`   ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.delivery.url}`);
      console.log(`   Trigger: ${webhook.trigger_on}`);
      console.log(`   Status: ${webhook.status || 'ACTIVE'}`);
      console.log('');
    });

    return webhooks;
  }

  async createWebhook(name, triggerOn, url) {
    console.log(`🚀 Creating webhook: ${name}\n`);

    const webhook = await this.request('POST', `/profiles/${this.profileId}/subscriptions`, {
      name,
      trigger_on: triggerOn,
      delivery: {
        version: '2.0.0',
        url,
      },
    });

    console.log('✅ Webhook created successfully!');
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.delivery.url}`);
    console.log(`\n💾 Add to .env: WISE_WEBHOOK_SUBSCRIPTION_ID=${webhook.id}\n`);

    return webhook;
  }

  async testWebhook(subscriptionId) {
    console.log(`🧪 Testing webhook: ${subscriptionId}\n`);

    const result = await this.request(
      'POST',
      `/profiles/${this.profileId}/subscriptions/${subscriptionId}/test-notifications`
    );

    console.log('✅ Test notification sent!');
    console.log('   Check your backend logs for the webhook event.\n');

    return result;
  }

  async deleteWebhook(subscriptionId) {
    console.log(`🗑️  Deleting webhook: ${subscriptionId}\n`);

    await this.request('DELETE', `/profiles/${this.profileId}/subscriptions/${subscriptionId}`);

    console.log('✅ Webhook deleted successfully!\n');
  }
}

// Main execution
async function main() {
  const manager = new WiseWebhookManager(WISE_API_TOKEN, WISE_PROFILE_ID);

  const command = process.argv[2];

  try {
    switch (command) {
      case 'list':
        await manager.listWebhooks();
        break;

      case 'create':
        await manager.createWebhook(
          'SoundBridge Transfer Updates',
          'transfers#state-change',
          WEBHOOK_URL
        );
        break;

      case 'test':
        const subscriptionId = process.argv[3];
        if (!subscriptionId) {
          console.error('Usage: node manage-wise-webhook.js test <subscription_id>');
          process.exit(1);
        }
        await manager.testWebhook(subscriptionId);
        break;

      case 'delete':
        const deleteId = process.argv[3];
        if (!deleteId) {
          console.error('Usage: node manage-wise-webhook.js delete <subscription_id>');
          process.exit(1);
        }
        await manager.deleteWebhook(deleteId);
        break;

      default:
        console.log('Wise Webhook Manager\n');
        console.log('Usage:');
        console.log('  node manage-wise-webhook.js list');
        console.log('  node manage-wise-webhook.js create');
        console.log('  node manage-wise-webhook.js test <subscription_id>');
        console.log('  node manage-wise-webhook.js delete <subscription_id>');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
```

**Usage:**
```bash
# List all webhooks
node scripts/manage-wise-webhook.js list

# Create new webhook
node scripts/manage-wise-webhook.js create

# Test webhook
node scripts/manage-wise-webhook.js test <subscription-id>

# Delete webhook
node scripts/manage-wise-webhook.js delete <subscription-id>
```

---

## Troubleshooting

### Error: "Invalid token"
- Check that your `WISE_API_TOKEN` in `.env` is correct
- Ensure it's a LIVE token (not sandbox)

### Error: "Profile not found"
- Verify `WISE_PROFILE_ID` is correct
- Run the profile list command to get the correct ID

### Webhook created but not receiving events
- Test the webhook using the test notification command
- Check your backend logs for errors
- Verify the webhook URL is accessible from the internet

### How to check if webhook is working
1. Create a test transfer
2. Check your backend logs for webhook events
3. Or use the test notification command

---

## Next Steps

After creating the webhook:

1. ✅ Webhook will start receiving transfer status updates automatically
2. ✅ Your backend endpoint will be called when transfers change status
3. ✅ Implement the database update logic in your webhook handler
4. ✅ Monitor logs to ensure events are being processed

---

## Quick Reference

**Create webhook:**
```bash
node scripts/manage-wise-webhook.js create
```

**Test webhook:**
```bash
node scripts/manage-wise-webhook.js test <subscription-id>
```

**List webhooks:**
```bash
node scripts/manage-wise-webhook.js list
```

---

**Documentation:**
- Wise Webhook API: https://docs.wise.com/api-docs/api-reference/webhook
- Event Types: https://docs.wise.com/guides/developer/webhooks/event-types

**Status:** Ready to implement - bypass dashboard and use API instead!
