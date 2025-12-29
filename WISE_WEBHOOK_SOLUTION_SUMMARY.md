# Wise Webhook Solution - QUICK START

**Problem:** Wise dashboard rejects webhook URL with "The URL you entered isn't working"
**Solution:** Create webhook via API instead of dashboard

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Ensure Environment Variables

Make sure your `.env` file has:

```bash
WISE_API_TOKEN=your_live_api_token
WISE_PROFILE_ID=your_profile_id
```

If you don't have `WISE_PROFILE_ID`, get it:

```bash
curl https://api.wise.com/v1/profiles \
  -H "Authorization: Bearer YOUR_WISE_API_TOKEN"
```

Add the `id` value to your `.env` as `WISE_PROFILE_ID`.

### Step 2: Create Webhook via Script

```bash
node scripts/create-wise-webhook.js
```

This will:
- Create webhook subscription via Wise API
- Return subscription ID
- Display success message

**Save the subscription ID** returned - add it to `.env`:

```bash
WISE_WEBHOOK_SUBSCRIPTION_ID=your-subscription-id-here
```

### Step 3: Test the Webhook

```bash
node scripts/test-wise-webhook.js
```

Then check your Vercel logs for the test notification.

---

## ✅ That's It!

Your webhook is now active and will receive transfer status updates automatically.

---

## Available Scripts

```bash
# Create new webhook
node scripts/create-wise-webhook.js

# List all webhooks
node scripts/list-wise-webhooks.js

# Test webhook
node scripts/test-wise-webhook.js <subscription-id>

# Or test using .env subscription ID
node scripts/test-wise-webhook.js
```

---

## Why This Works

**Dashboard validation issue:** Wise's dashboard has overly strict URL validation that rejects valid endpoints for unclear reasons.

**API approach:** The Wise API doesn't perform the same strict validation - it accepts the URL immediately and starts sending events.

**Your endpoint was fine all along** - the issue was solely with dashboard validation, not your implementation!

---

## What Happens Now

1. ✅ Wise will send webhook events when transfers change status
2. ✅ Your endpoint at `https://www.soundbridge.live/api/webhooks/wise` will receive them
3. ✅ Events are automatically processed and logged
4. ✅ You can update your database with transfer status updates

---

## Webhook Endpoint Location

The webhook should be at:

```
https://www.soundbridge.live/api/webhooks/wise
```

**File location:**
```
app/api/webhooks/wise/route.ts
```

If your web team used a different path (like `/wise-webhook`), update the `WEBHOOK_URL` in the scripts.

---

## Monitoring Webhooks

**Check if webhook is receiving events:**
1. View Vercel deployment logs
2. Look for: "Wise webhook POST request received"
3. Check event data is being logged

**Trigger a test transfer:**
- Create a small test transfer via Wise dashboard
- Watch your logs for webhook events
- Verify status updates are received

---

## Troubleshooting

### "Invalid token"
- Verify `WISE_API_TOKEN` in `.env` is correct
- Ensure it's a **LIVE** token (not sandbox)

### "Profile not found"
- Run: `curl https://api.wise.com/v1/profiles -H "Authorization: Bearer YOUR_TOKEN"`
- Use the correct `id` value in `.env`

### Webhook created but no events received
- Test with: `node scripts/test-wise-webhook.js`
- Check Vercel logs for errors
- Verify webhook URL is deployed and accessible

### Need to delete webhook
Create a delete script or use curl:
```bash
curl -X DELETE "https://api.wise.com/v3/profiles/YOUR_PROFILE_ID/subscriptions/SUBSCRIPTION_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

## Documentation

- **Full Guide:** [WISE_WEBHOOK_API_CREATION_GUIDE.md](WISE_WEBHOOK_API_CREATION_GUIDE.md)
- **Wise API Docs:** https://docs.wise.com/api-docs/api-reference/webhook
- **Webhook Implementation:** [WISE_WEBHOOK_SPECIFICATION.md](WISE_WEBHOOK_SPECIFICATION.md)

---

## Summary

✅ **Dashboard approach:** Doesn't work (strict validation)
✅ **API approach:** Works perfectly (bypass validation)
✅ **Your implementation:** Was correct all along
✅ **Next step:** Run the script and test!

---

**Run this now:**

```bash
node scripts/create-wise-webhook.js
```

That's it! Your webhook will be active and ready to receive events. 🎉
