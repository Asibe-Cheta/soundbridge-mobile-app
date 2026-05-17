# Web Team: Tipping Endpoints Verification Required

## Status: ACTION REQUIRED - Please confirm endpoints are working

---

## Background

The mobile app tipping feature is failing in TestFlight. The Stripe publishable key has been configured on both mobile `.env` and Expo.dev environment variables:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Rq1Oj...
```

Now we need to verify the backend endpoints are properly set up.

---

## Required Endpoints

### 1. Create Tip Payment Intent

**Endpoint:** `POST /api/payments/create-tip`

**Request Body:**
```json
{
  "creatorId": "uuid-of-creator",
  "amount": 5.00,
  "currency": "USD",
  "message": "Great content!",
  "isAnonymous": false,
  "userTier": "free",
  "paymentMethod": "card"
}
```

**Expected Response:**
```json
{
  "success": true,
  "paymentIntentId": "pi_xxxxx",
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "tipId": "uuid-of-tip-record",
  "platformFee": 0.50,
  "creatorEarnings": 4.50,
  "message": "Payment intent created"
}
```

**What this endpoint should do:**
1. Validate the creator exists
2. Calculate platform fee (10% for free users, 8% for premium/unlimited)
3. Create a Stripe PaymentIntent with the amount
4. Store a provisional tip record in the database
5. Return the `clientSecret` for the mobile app to complete payment

---

### 2. Confirm Tip Payment

**Endpoint:** `POST /api/payments/confirm-tip`

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxxxx"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tip sent successfully!"
}
```

**What this endpoint should do:**
1. Verify the PaymentIntent succeeded with Stripe
2. Mark the tip record as completed
3. Credit the creator's wallet with their earnings
4. Record the transaction in revenue tracking

---

## Authentication

Both endpoints require the `Authorization: Bearer {token}` header with the user's Supabase JWT token.

---

## Testing

You can test these endpoints with curl:

```bash
# Test create-tip
curl -X POST https://www.soundbridge.live/api/payments/create-tip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "creatorId": "d8b347cc-1800-496f-b895-fb489ceff5bd",
    "amount": 1.00,
    "currency": "USD",
    "message": "Test tip",
    "isAnonymous": false,
    "userTier": "free",
    "paymentMethod": "card"
  }'
```

---

## Questions for Web Team

1. **Are these endpoints deployed and working?**
   - `POST /api/payments/create-tip`
   - `POST /api/payments/confirm-tip`

2. **Is the Stripe secret key configured on the backend?**
   - The backend needs `STRIPE_SECRET_KEY` to create PaymentIntents

3. **Is Stripe Connect set up for creator payouts?**
   - Each creator needs a connected Stripe account to receive tips

4. **Are there any error logs from recent tip attempts?**
   - Mobile is sending tips but getting failures

---

## Mobile App Flow

```
1. User opens TipModal
2. User enters amount and card details
3. User taps "Send $X Tip"
4. Mobile calls POST /api/payments/create-tip
5. Backend returns clientSecret
6. Mobile uses Stripe SDK to confirm payment with clientSecret
7. Mobile calls POST /api/payments/confirm-tip
8. Backend marks tip as complete and credits creator
9. Mobile shows success message
```

---

## Current Error

**UPDATE: We tested and got this specific error:**

```
API Error (500): {"error": "Failed to create tip record"}
```

**Analysis:**
- The endpoint `/api/payments/create-tip` **exists and is reachable**
- Authentication is working (request passed auth checks)
- The failure occurs when **inserting the tip record into the database**

**Likely causes:**
1. **Missing `tips` table** - The table might not exist in the database
2. **Missing columns** - The table exists but is missing required columns
3. **Foreign key constraint failure** - Creator ID or user ID doesn't exist in profiles
4. **RLS policy blocking insert** - Row Level Security preventing the insert
5. **Stripe API error** - PaymentIntent creation failed before database insert

**To debug, please check:**
1. Does the `tips` table exist?
2. Run: `SELECT * FROM information_schema.columns WHERE table_name = 'tips';`
3. Check if RLS policies allow authenticated users to insert
4. Check server logs for the full error stack trace

**Expected `tips` table schema:**
```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  payment_intent_id TEXT,
  platform_fee DECIMAL,
  creator_earnings DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert tips" ON tips
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own tips" ON tips
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
```

---

## Priority

**HIGH** - Tipping is a core monetization feature that users expect to work.

---

## UPDATE: January 18, 2026 - 500 Error Still Occurring

**Status: ISSUE NOT RESOLVED**

After the web team's update (adding 400 validation for non-creator recipients), we tested tipping again in Expo Go and the **500 error is still occurring**:

```
TipModal.tsx:179 ❌ Error sending tip: Error: Server error. Please try again later.
```

This is the same underlying issue - the backend is returning a **500 Internal Server Error** when attempting to create the tip.

### What Was Fixed vs What's Still Broken

| Item | Status |
|------|--------|
| Non-creator recipient validation (400 error) | ✅ Fixed |
| Tip record creation (500 error) | ❌ Still broken |

### The Core Issue

The `POST /api/payments/create-tip` endpoint is **still failing with a 500 error** when trying to insert the tip record. The earlier error message was:

```json
{"error": "Failed to create tip record"}
```

This suggests the database operation is failing. Please check:

1. **Does the `tips` table exist?**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_name = 'tips'
   );
   ```

2. **What columns does it have?**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'tips';
   ```

3. **Are RLS policies configured correctly?**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tips';
   ```

4. **Check server logs** for the full error stack trace when this endpoint is called

### Test Case

We are testing with:
- A logged-in user (valid JWT token)
- Tipping a user with `role = 'creator'`
- Amount: $5.00
- Valid card details entered

The request never gets to the Stripe payment confirmation step because it fails at `create-tip`.

---

## UPDATE: January 18, 2026 - RESOLVED + New Requirement

**Status: ✅ TIPPING NOW WORKS**

Web team identified the issue: `tip_analytics` table's `tipper_tier` constraint only allowed `free | pro | enterprise`, but mobile sends `premium / unlimited`. This caused a DB constraint violation.

**Fix deployed:**
- Tier normalization: `premium` / `unlimited` now map to `pro` for `tip_analytics`
- Non-blocking analytics: if `tip_analytics` insert fails, it logs and continues

**Tested and confirmed working!** 🎉

---

## NEW REQUIREMENT: Instant Tip Notifications

**Status: ✅ IMPLEMENTED**

Creators need to receive **instant push notifications** when they receive a tip - not batched every 5 minutes, but **immediately**.

### Current Behavior (Expected)
When a tip is successfully processed, the backend should:
1. Insert the tip record ✅
2. **Immediately send a push notification to the creator** ⚠️ (verify this is happening)

### Push Notification Payload

The mobile app expects this notification format:

```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "title": "You received a tip! 🎉",
  "body": "@username sent you a $5.00 tip",
  "data": {
    "type": "tip",
    "tipId": "uuid-of-tip",
    "amount": 500,
    "currency": "USD",
    "senderId": "uuid-of-sender",
    "senderUsername": "username",
    "message": "Great track!",
    "deepLink": "soundbridge://wallet/tips"
  },
  "sound": "default",
  "priority": "high",
  "channelId": "tips"
}
```

### Where to Get Creator's Push Token

The creator's Expo push token is stored in the `profiles` table:
```sql
SELECT expo_push_token FROM profiles WHERE id = :creator_id;
```

### Implementation Location

In `POST /api/payments/confirm-tip` (or wherever the tip is finalized), add:

```javascript
// After tip is confirmed successful
const creatorProfile = await supabase
  .from('profiles')
  .select('expo_push_token, username')
  .eq('id', creatorId)
  .single();

if (creatorProfile?.expo_push_token) {
  await sendPushNotification({
    to: creatorProfile.expo_push_token,
    title: "You received a tip! 🎉",
    body: `@${senderUsername} sent you a $${amount.toFixed(2)} tip`,
    data: {
      type: "tip",
      tipId: tipId,
      amount: amountInCents,
      currency: "USD",
      senderId: senderId,
      senderUsername: senderUsername,
      message: tipMessage || null,
      deepLink: "soundbridge://wallet/tips"
    },
    sound: "default",
    priority: "high",
    channelId: "tips"
  });
}
```

### Sending Expo Push Notifications

Use the Expo Push API:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxx]",
    "title": "You received a tip! 🎉",
    "body": "@username sent you a $5.00 tip",
    "data": { "type": "tip", "tipId": "..." },
    "sound": "default",
    "priority": "high"
  }'
```

### Priority

**HIGH** - Creators expect immediate feedback when they receive tips. This is crucial for engagement and monetization experience.

---

## UPDATE: January 18, 2026 - Instant Notifications Implemented

**Status: ✅ COMPLETE**

Web team implemented instant tip notifications in `POST /api/payments/confirm-tip` (commit `ffb3e5d`).

**What's now working:**
- After confirming and recording the tip, backend fetches `profiles.expo_push_token` and sends immediate push via Expo
- Payload matches mobile spec (`type: "tip"`, `deepLink: "soundbridge://wallet/tips"`, `channelId: "tips"`)
- Anonymous tips show "Someone" and set `senderUsername: null`
- Non-blocking: if push fails, the tip still completes

**Regarding `user_push_tokens` fallback:**
Yes, please add the fallback to read from `user_push_tokens` if `profiles.expo_push_token` is empty. This provides redundancy in case tokens get out of sync.

---

## Summary: All Tipping Issues Resolved

| Feature | Status |
|---------|--------|
| `POST /api/payments/create-tip` endpoint | ✅ Working |
| `POST /api/payments/confirm-tip` endpoint | ✅ Working |
| Non-creator recipient validation (400) | ✅ Working |
| Tier normalization (`premium`/`unlimited` → `pro`) | ✅ Working |
| Instant push notifications to creators | ✅ Working |
| Anonymous tip handling | ✅ Working |

**Tipping is fully functional!** 🎉

---

*Document updated: January 18, 2026*
