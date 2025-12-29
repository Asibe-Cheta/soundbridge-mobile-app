# WEB TEAM: Wise Integration Setup - ACTION REQUIRED

**Date:** 2025-12-29
**Priority:** HIGH
**From:** Mobile Team
**Status:** Ready for Implementation

---

## 🎯 What You Need to Do

The mobile team has completed the Wise payout implementation. We need you to:

1. Add environment variables to your backend
2. Ensure the webhook endpoint is deployed
3. Run the database migration
4. Create the webhook subscription

---

## 1️⃣ Add Environment Variables

Add these to your backend environment (Vercel/production):

```bash
# Wise API Configuration
WISE_API_TOKEN=9e0fac28-5fd2-419d-83fe-b647faf7a5c3
WISE_PROFILE_ID=81429203
WISE_ENVIRONMENT=live
WISE_API_URL=https://api.wise.com

# Generate this webhook secret (see below)
WISE_WEBHOOK_SECRET=<generate-a-random-32-char-string>
```

### Generate Webhook Secret

Run this command to generate a secure webhook secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it as `WISE_WEBHOOK_SECRET`.

---

## 2️⃣ Deploy Webhook Endpoint

Ensure this file exists and is deployed:

**File:** `app/api/webhooks/wise/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

/**
 * Wise webhook endpoint
 * Receives transfer status updates from Wise
 */

// Handle Wise webhook validation (GET request)
export async function GET(req: NextRequest) {
  console.log('Wise webhook validation GET request received');

  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

// Handle Wise webhook events (POST request)
export async function POST(req: NextRequest) {
  try {
    console.log('Wise webhook POST request received');

    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-sha256');

    if (!signature) {
      console.error('Missing signature header');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // TODO: Implement signature verification
    // See: WISE_WEBHOOK_SPECIFICATION.md for details

    const body = JSON.parse(rawBody);

    console.log('Wise webhook event:', {
      eventType: body.event_type,
      resourceId: body.data?.resource?.id,
      currentState: body.data?.current_state,
    });

    // TODO: Update wise_payouts table with new status
    // See: WISE_WEBHOOK_SPECIFICATION.md for implementation

    // CRITICAL: Always return 200 OK within 5 seconds
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Wise webhook error:', error);
    // Return 200 even on error to prevent Wise retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Signature-SHA256',
    },
  });
}
```

### Verify Deployment

After deploying, test the endpoint:

```bash
curl https://www.soundbridge.live/api/webhooks/wise
```

Expected response: `OK`

---

## 3️⃣ Run Database Migration

The mobile team has created the database schema. You need to run the migration in Supabase.

**File:** `migrations/update_wise_payouts_table.sql`

### How to Run:

1. Go to Supabase Dashboard → SQL Editor
2. Open the file `migrations/update_wise_payouts_table.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click "Run"

**Expected Output:**
```
All columns added successfully!
```

This migration:
- Adds missing columns to the `wise_payouts` table
- Creates triggers for status tracking
- Sets up views for reporting
- Adds helper functions

---

## 4️⃣ Create Webhook Subscription

**CRITICAL:** Wise dashboard webhook creation doesn't work. You MUST create it via API.

### Option A: Use the Script (Recommended)

We've created a script for you. Run this in your backend project:

```bash
node scripts/create-wise-webhook.js
```

This will:
- Create the webhook subscription via Wise API
- Return a subscription ID
- Display success message

**Save the subscription ID** and add it to your environment:

```bash
WISE_WEBHOOK_SUBSCRIPTION_ID=<id-from-response>
```

### Option B: Use curl Directly

If you prefer, run this curl command:

```bash
curl -X POST "https://api.wise.com/v3/profiles/81429203/subscriptions" \
  -H "Authorization: Bearer 9e0fac28-5fd2-419d-83fe-b647faf7a5c3" \
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

**Save the subscription ID** from the response.

---

## 5️⃣ Test the Webhook

After creating the webhook, test it:

```bash
node scripts/test-wise-webhook.js <subscription-id>
```

Or with curl:

```bash
curl -X POST "https://api.wise.com/v3/profiles/81429203/subscriptions/<subscription-id>/test-notifications" \
  -H "Authorization: Bearer 9e0fac28-5fd2-419d-83fe-b647faf7a5c3"
```

Then check your Vercel logs for:
```
Wise webhook POST request received
```

---

## 📋 Verification Checklist

Before marking this as complete, verify:

- [ ] All 5 environment variables added to production
- [ ] Webhook secret generated and added
- [ ] Webhook endpoint deployed at `/api/webhooks/wise`
- [ ] Endpoint returns "OK" when tested with curl
- [ ] Database migration run successfully in Supabase
- [ ] Webhook subscription created via API (not dashboard!)
- [ ] Subscription ID saved to environment variables
- [ ] Test notification sent successfully
- [ ] Test notification appears in Vercel logs

---

## 🆘 Troubleshooting

### Webhook endpoint returns 404
- Ensure `app/api/webhooks/wise/route.ts` exists
- Redeploy your backend
- Check Vercel deployment logs

### Database migration fails
- Check if `wise_payouts` table already exists
- If it exists, the migration will add missing columns
- Look for error messages in Supabase SQL editor

### Webhook creation fails
- Verify `WISE_API_TOKEN` is correct
- Verify `WISE_PROFILE_ID` is `81429203`
- Don't use the Wise dashboard (it won't work!)
- Use the API method instead

### Test notification not received
- Check Vercel logs in dashboard
- Verify webhook URL is correct
- Ensure endpoint is deployed
- Check for firewall/WAF blocks

---

## 📚 Documentation Reference

For detailed implementation guides, see:

1. **WISE_WEBHOOK_SPECIFICATION.md** - Complete webhook implementation guide
2. **WISE_WEBHOOK_API_CREATION_GUIDE.md** - How to create webhooks via API
3. **WISE_DATABASE_SCHEMA.md** - Database schema documentation
4. **WEB_TEAM_WISE_WEBHOOK_FIX.md** - Troubleshooting guide

---

## 🔐 Security Notes

- **NEVER commit** `WISE_API_TOKEN` to Git
- Store all credentials in environment variables only
- The webhook secret should be random and unique
- Implement signature verification in production (see docs)

---

## ⏱️ Timeline

**URGENT:** This is blocking the mobile app's payout functionality.

**Estimated Time:** 30-45 minutes

**Steps:**
1. Add environment variables (5 min)
2. Deploy webhook endpoint (10 min)
3. Run database migration (5 min)
4. Create webhook subscription (10 min)
5. Test and verify (10 min)

---

## ✅ When Complete

Reply with:
- ✅ Environment variables added
- ✅ Webhook endpoint deployed and tested
- ✅ Database migration completed
- ✅ Webhook subscription created
- ✅ Webhook subscription ID: `<the-id>`
- ✅ Test notification received in logs

---

## 💬 Questions?

If you encounter any issues or have questions:

1. Check the documentation files listed above
2. Review the troubleshooting section
3. Contact the mobile team
4. Or reach out in Slack

---

**Priority:** HIGH
**Blocking:** Mobile app payout functionality
**Deadline:** ASAP

---

## Summary

You need to:
1. ✅ Add 5 environment variables
2. ✅ Deploy webhook endpoint code
3. ✅ Run SQL migration in Supabase
4. ✅ Create webhook via API (don't use dashboard!)
5. ✅ Test and verify

**Start with Step 1** and work through each step. The entire process should take about 30-45 minutes.

Let us know when complete! 🚀
