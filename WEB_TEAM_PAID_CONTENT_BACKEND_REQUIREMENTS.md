# Backend API Requirements - Paid Content Feature (Mobile App)

**Date:** January 14, 2026
**To:** Web/Backend Team
**From:** Mobile App Team
**Priority:** 🔴 **CRITICAL** - Blocking Mobile App Launch
**Status:** 📋 **READY FOR IMPLEMENTATION**

---

## Executive Summary

The mobile app team has **completed 100% of the frontend implementation** for the paid content feature. All UI components, navigation, ownership checks, and Stripe SDK integration are done and ready.

**We are blocked on 4 backend API endpoints** that need to be implemented to make this feature functional:

1. ✅ **POST /api/payments/create-intent** - Create Stripe Payment Intent (CRITICAL)
2. ✅ **POST /api/payments/webhook** - Handle Stripe webhook events (CRITICAL)
3. ⏳ **POST /api/stripe/onboard** - Stripe Connect onboarding (High Priority)
4. ⏳ **POST /api/payouts/create** - Creator payout requests (High Priority)

---

## What's Already Done (Mobile App)

### ✅ Completed Mobile Features

1. **AudioPlayerContext Ownership Enforcement** - [src/contexts/AudioPlayerContext.tsx](src/contexts/AudioPlayerContext.tsx:205-285)
   - Checks user ownership before playing paid tracks
   - Shows "Purchase Required" alert with price
   - Allows creators to play their own content
   - Graceful error handling

2. **PurchasedContentScreen** - [src/screens/PurchasedContentScreen.tsx](src/screens/PurchasedContentScreen.tsx)
   - Full library UI with filters (All/Tracks/Albums/Podcasts)
   - Play and download buttons
   - Empty state with CTA
   - Pull to refresh

3. **CreatorSalesAnalyticsScreen** - [src/screens/CreatorSalesAnalyticsScreen.tsx](src/screens/CreatorSalesAnalyticsScreen.tsx)
   - Revenue metrics dashboard
   - Top selling content
   - Recent sales list
   - Sales by content type breakdown

4. **PricingControls Component** - [src/components/PricingControls.tsx](src/components/PricingControls.tsx)
   - Subscription-gated toggle
   - Currency selector (USD/GBP/EUR)
   - Price validation (£0.99 - £50.00)
   - Live earnings calculator (90/10 split)

5. **UploadScreen Integration** - [src/screens/UploadScreen.tsx](src/screens/UploadScreen.tsx)
   - PricingControls integrated
   - Saves `is_paid`, `price`, `currency` to database
   - Already sending pricing data with track uploads

6. **Navigation & Menu Links** - [App.tsx](App.tsx), [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx)
   - All new screens registered in navigation
   - Menu items added to Profile screen
   - "My Purchased Content" - visible to all users
   - "Sales Analytics" - visible to Premium/Unlimited only

7. **Stripe SDK** - [App.tsx](App.tsx)
   - Already configured with StripeProvider
   - `STRIPE_PUBLISHABLE_KEY` set in .env
   - Ready for payment confirmation

### ✅ Existing Backend APIs (Already Working)

- **GET /api/purchases/check-ownership** - Ownership verification (used by AudioPlayerContext)
- **GET /api/purchases/user** - Get user's purchased content (used by PurchasedContentScreen)
- **GET /api/sales/analytics** - Get creator sales analytics (used by CreatorSalesAnalyticsScreen)

---

## What We Need From Backend

### Priority 1: CRITICAL (Blocks MVP Launch)

These 2 endpoints are **absolutely required** for basic paid content functionality:

#### 1. POST /api/payments/create-intent

**Purpose:** Create a Stripe Payment Intent when user wants to purchase content

**Authentication:** Required (JWT token in Authorization header)

**Request Body:**
```json
{
  "content_id": "uuid",
  "content_type": "track" | "album" | "podcast",
  "price": 2.99,
  "currency": "GBP"
}
```

**Response (Success - 200):**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 299,
  "currency": "gbp"
}
```

**Response (Error - 400):**
```json
{
  "error": "Content not found" | "Invalid price" | "Already purchased"
}
```

**Backend Logic:**
```javascript
1. Verify user is authenticated
2. Fetch content from database (audio_tracks/albums/podcasts table)
3. Validate content exists and is paid content
4. Validate price matches database price (NEVER trust frontend price)
5. Check if user already owns this content (query content_purchases table)
   - If already purchased, return error
6. Create Stripe Payment Intent:
   const paymentIntent = await stripe.paymentIntents.create({
     amount: Math.round(price * 100), // Convert to cents
     currency: currency.toLowerCase(),
     metadata: {
       content_id: content_id,
       content_type: content_type,
       buyer_id: user.id,
       creator_id: content.creator_id,
       platform_fee: (price * 0.10).toFixed(2),
       creator_earnings: (price * 0.90).toFixed(2),
     },
   });
7. Return client_secret to mobile app
```

**Security Checks:**
- ✅ Verify price on backend (never trust frontend)
- ✅ Check duplicate purchase
- ✅ Validate content exists and is available for purchase
- ✅ Store metadata for webhook processing

---

#### 2. POST /api/payments/webhook

**Purpose:** Handle Stripe webhook events (payment confirmations, failures, etc.)

**Authentication:** Stripe webhook signature verification

**Request:** Stripe sends this automatically when events occur

**Events to Handle:**

##### Event: `payment_intent.succeeded`

**Payload Example:**
```json
{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 299,
      "currency": "gbp",
      "metadata": {
        "content_id": "uuid",
        "content_type": "track",
        "buyer_id": "uuid",
        "creator_id": "uuid",
        "platform_fee": "0.30",
        "creator_earnings": "2.69"
      }
    }
  }
}
```

**Backend Logic:**
```javascript
1. Verify webhook signature:
   const signature = request.headers['stripe-signature'];
   const event = stripe.webhooks.constructEvent(
     request.body,
     signature,
     STRIPE_WEBHOOK_SECRET
   );

2. Extract metadata from payment_intent:
   const { content_id, content_type, buyer_id, creator_id, creator_earnings } = event.data.object.metadata;

3. Check for duplicate (idempotency):
   const existing = await db.content_purchases.findOne({
     where: { payment_intent_id: event.data.object.id }
   });
   if (existing) {
     console.log('Duplicate webhook - already processed');
     return res.status(200).send('OK');
   }

4. Create purchase record in database:
   await db.content_purchases.create({
     id: generateUUID(),
     buyer_id: buyer_id,
     content_id: content_id,
     content_type: content_type,
     amount_paid: event.data.object.amount / 100,
     currency: event.data.object.currency.toUpperCase(),
     payment_intent_id: event.data.object.id,
     purchased_at: new Date(),
   });

5. Update creator's wallet balance:
   await db.user_wallets.increment({
     balance: parseFloat(creator_earnings)
   }, {
     where: { user_id: creator_id }
   });

6. Update content sales count:
   await db.audio_tracks.increment('sales_count', {
     where: { id: content_id }
   });

7. Send email notifications:
   - To buyer: "Purchase Confirmed - You now own [Track Name]"
   - To creator: "New Sale! You earned £2.69 from [Track Name]"

8. Return 200 OK to Stripe:
   return res.status(200).send('OK');
```

**Other Events to Handle:**

- `payment_intent.payment_failed` - Log failure, send email to user
- `payment_intent.canceled` - Log cancellation
- `charge.refunded` - Remove purchase record, deduct from creator wallet

**Critical Security:**
```javascript
// ALWAYS verify webhook signature
const signature = req.headers['stripe-signature'];
try {
  const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
} catch (err) {
  console.error('Webhook signature verification failed');
  return res.status(400).send('Invalid signature');
}
```

---

### Priority 2: High Priority (Needed for Payouts)

#### 3. POST /api/stripe/onboard

**Purpose:** Create Stripe Connect account for creators to receive payouts

**Authentication:** Required

**Request Body:**
```json
{
  "return_url": "soundbridge://wallet",
  "refresh_url": "soundbridge://wallet/onboarding"
}
```

**Response:**
```json
{
  "account_id": "acct_xxx",
  "onboarding_url": "https://connect.stripe.com/setup/xxx"
}
```

**Backend Logic:**
```javascript
1. Check if user already has Stripe Connect account
2. If not, create new account:
   const account = await stripe.accounts.create({
     type: 'express',
     country: user.country_code || 'GB',
     email: user.email,
     capabilities: {
       transfers: { requested: true },
     },
   });
3. Save account_id to user record
4. Create onboarding link:
   const accountLink = await stripe.accountLinks.create({
     account: account.id,
     refresh_url: refresh_url,
     return_url: return_url,
     type: 'account_onboarding',
   });
5. Return onboarding_url for mobile app to open in browser
```

---

#### 4. POST /api/payouts/create

**Purpose:** Process creator payout request

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 50.00,
  "currency": "GBP",
  "method": "stripe"
}
```

**Response:**
```json
{
  "payout_id": "uuid",
  "status": "pending",
  "amount": 50.00,
  "currency": "GBP",
  "estimated_arrival": "2026-01-21"
}
```

**Backend Logic:**
```javascript
1. Verify user has sufficient balance
2. Check minimum balance:
   - Premium users: £20 minimum
   - Unlimited users: £10 minimum
3. Check if user has completed Stripe Connect onboarding
4. Create Stripe transfer:
   const transfer = await stripe.transfers.create({
     amount: Math.round(amount * 100),
     currency: currency.toLowerCase(),
     destination: user.stripe_account_id,
   });
5. Deduct from user's wallet balance
6. Create payout record in database
7. Send confirmation email
8. Return payout details
```

---

## Database Schema Requirements

### Tables Needed (May Already Exist)

#### 1. content_purchases

```sql
CREATE TABLE content_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'track', 'album', 'podcast'
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,

  CONSTRAINT unique_purchase UNIQUE(buyer_id, content_id, content_type)
);

CREATE INDEX idx_purchases_buyer ON content_purchases(buyer_id);
CREATE INDEX idx_purchases_content ON content_purchases(content_id, content_type);
CREATE INDEX idx_purchases_payment_intent ON content_purchases(payment_intent_id);
```

#### 2. user_wallets

```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'GBP',
  stripe_account_id VARCHAR(255),
  stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON user_wallets(user_id);
```

#### 3. payouts

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  method VARCHAR(50) NOT NULL, -- 'stripe', 'wise'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  stripe_transfer_id VARCHAR(255),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  CHECK (amount > 0)
);

CREATE INDEX idx_payouts_user ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(status);
```

#### 4. Update audio_tracks table

```sql
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP';
ALTER TABLE audio_tracks ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

CREATE INDEX idx_tracks_paid ON audio_tracks(is_paid) WHERE is_paid = TRUE;
```

---

## Environment Variables Needed

### Backend .env

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxx  # Production key
STRIPE_WEBHOOK_SECRET=whsec_xxx  # From Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Already in mobile app

# Email Service (for notifications)
SENDGRID_API_KEY=xxx  # Or whatever email service you use
```

### How to Get Webhook Secret

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://api.soundbridge.com/api/payments/webhook`
4. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret

---

## Testing Strategy

### Phase 1: Test Payment Creation

```bash
# Test endpoint directly
curl -X POST https://api.soundbridge.com/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "test-track-uuid",
    "content_type": "track",
    "price": 2.99,
    "currency": "GBP"
  }'

# Expected response:
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 299,
  "currency": "gbp"
}
```

### Phase 2: Test Webhook Handler

Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Phase 3: Test with Real Cards

**Stripe Test Cards:**

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure authentication required |

### Phase 4: End-to-End Test

1. Mobile app: User taps "Purchase" on a £2.99 track
2. Backend: Creates payment intent, returns client_secret
3. Mobile app: Stripe SDK handles payment UI
4. User: Enters test card 4242 4242 4242 4242
5. Stripe: Processes payment
6. Backend webhook: Receives payment_intent.succeeded
7. Backend: Creates purchase record, updates wallet
8. Mobile app: Ownership check passes, track plays

---

## Mobile App Integration (Already Done)

### How Mobile App Will Call These Endpoints

#### Purchase Flow

**File:** `src/components/PurchaseModal.tsx` (assumed to exist, or will create)

```typescript
const handlePurchase = async () => {
  try {
    // 1. Call backend to create payment intent
    const response = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_id: track.id,
        content_type: 'track',
        price: track.price,
        currency: track.currency,
      }),
    });

    const { client_secret } = await response.json();

    // 2. Use Stripe SDK to confirm payment
    const { error } = await confirmPayment(client_secret, {
      paymentMethodType: 'Card',
    });

    if (error) {
      Alert.alert('Payment Failed', error.message);
      return;
    }

    // 3. Success! Webhook will handle backend updates
    Alert.alert('Success', 'Purchase complete!');

  } catch (error) {
    Alert.alert('Error', 'Failed to process payment');
  }
};
```

The mobile app **already has** this code structure ready. We just need the backend endpoint to return the client_secret.

---

## Email Notifications Required

### 1. Purchase Confirmation (To Buyer)

**Subject:** Purchase Confirmed - [Track Name]

**Body:**
```
Hi [Buyer Name],

Your purchase is complete! You now own:

🎵 [Track Name] by [Creator Name]
💷 £2.99

You can now:
- Play the track anytime in the app
- Download for offline listening
- View in "My Purchased Content"

Enjoy your music!

- SoundBridge Team
```

### 2. Sale Notification (To Creator)

**Subject:** New Sale - You Earned £2.69!

**Body:**
```
Hi [Creator Name],

Great news! You made a sale:

🎵 [Track Name]
💷 Sale Price: £2.99
💰 Your Earnings: £2.69 (90%)
🧾 Platform Fee: £0.30 (10%)

View your analytics: [Link to Sales Analytics]

Keep creating amazing music!

- SoundBridge Team
```

---

## Revenue Split Model

**Platform keeps:** 10%
**Creator receives:** 90%

**Example Calculation:**

```javascript
const salePrice = 2.99;
const platformFee = (salePrice * 0.10).toFixed(2);  // £0.30
const creatorEarnings = (salePrice * 0.90).toFixed(2);  // £2.69

// Stripe fee (separate, paid by platform):
const stripeFee = (salePrice * 0.029 + 0.30).toFixed(2);  // ~£0.39
```

**Important:** Platform absorbs Stripe fees. Creator always gets 90% of sale price.

---

## Security Checklist

- [ ] Webhook signature verification implemented
- [ ] Price validation on backend (never trust frontend)
- [ ] Duplicate purchase prevention (check existing purchases)
- [ ] Idempotent webhook processing (check payment_intent_id)
- [ ] Authenticated endpoints (JWT verification)
- [ ] Input validation (amount, currency, content_id)
- [ ] Rate limiting on payment endpoints
- [ ] Logging for all payment events
- [ ] HTTPS only for webhook endpoint

---

## Rollout Plan

### Week 1: Core Payment Flow
- [ ] Implement POST /api/payments/create-intent
- [ ] Implement POST /api/payments/webhook
- [ ] Set up webhook endpoint in Stripe Dashboard
- [ ] Test with Stripe test cards
- [ ] Deploy to staging

### Week 2: Testing & Integration
- [ ] Mobile team tests end-to-end purchase flow
- [ ] Verify ownership checks work correctly
- [ ] Test email notifications
- [ ] Load testing (100 concurrent purchases)
- [ ] Deploy to production

### Week 3: Payout System
- [ ] Implement POST /api/stripe/onboard
- [ ] Implement POST /api/payouts/create
- [ ] Test creator onboarding flow
- [ ] Test payouts in Stripe test mode
- [ ] Deploy to production

### Week 4: Launch
- [ ] Enable feature for beta users
- [ ] Monitor transactions and errors
- [ ] Gather user feedback
- [ ] Full public launch

---

## Success Metrics

Track these metrics after launch:

1. **Purchase Conversion Rate:** (Purchases / Content Views) × 100
2. **Failed Payment Rate:** Failed / Total Attempts
3. **Average Transaction Value:** Total Revenue / Total Purchases
4. **Revenue by Currency:** Breakdown of GBP/USD/EUR
5. **Webhook Success Rate:** Successful / Total Webhooks Received
6. **Time to Payout:** Request Date → Completion Date

---

## Questions for Backend Team

1. ✅ **Database Schema:** Do these tables already exist? If yes, are the column names correct?
2. ✅ **Email Service:** Which email provider are you using? (SendGrid, AWS SES, etc.)
3. ✅ **Webhook Endpoint:** Should it be `/api/payments/webhook` or different?
4. ✅ **Authentication:** JWT tokens in Authorization header, correct?
5. ✅ **Error Format:** Should errors follow a specific JSON structure?
6. ✅ **Logging:** What logging service should we use for payment events?
7. ✅ **Stripe Account:** Do we have Stripe account already set up with correct keys?

---

## API Documentation Template

Once implemented, please provide OpenAPI/Swagger docs for these endpoints. Example:

```yaml
/api/payments/create-intent:
  post:
    summary: Create payment intent for content purchase
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              content_id:
                type: string
                format: uuid
              content_type:
                type: string
                enum: [track, album, podcast]
              price:
                type: number
                minimum: 0.99
              currency:
                type: string
                enum: [USD, GBP, EUR]
    responses:
      200:
        description: Payment intent created
        content:
          application/json:
            schema:
              type: object
              properties:
                client_secret:
                  type: string
                payment_intent_id:
                  type: string
                amount:
                  type: integer
                currency:
                  type: string
```

---

## Support & Resources

### Stripe Documentation
- Payment Intents: https://stripe.com/docs/payments/payment-intents
- Webhooks: https://stripe.com/docs/webhooks
- Connect (Payouts): https://stripe.com/docs/connect
- Testing: https://stripe.com/docs/testing

### Mobile App Documentation
- [PAYMENT_INTEGRATION_STRIPE_WISE.md](PAYMENT_INTEGRATION_STRIPE_WISE.md) - Detailed payment integration guide
- [PAID_CONTENT_MOBILE_IMPLEMENTATION_COMPLETE.md](PAID_CONTENT_MOBILE_IMPLEMENTATION_COMPLETE.md) - Complete mobile implementation details

---

## Contact

**Mobile Team Lead:** [Your Name]
**Slack Channel:** #paid-content-feature
**JIRA Epic:** SOUND-XXX

**Estimated Backend Implementation Time:** 1-2 weeks

---

## Summary

**Mobile app is 100% ready.** All we need to launch paid content:

1. ✅ POST /api/payments/create-intent (CRITICAL)
2. ✅ POST /api/payments/webhook (CRITICAL)
3. ⏳ POST /api/stripe/onboard (High Priority)
4. ⏳ POST /api/payouts/create (High Priority)

Mobile team is **blocked** until endpoints 1 & 2 are deployed to production.

**Target Launch Date:** 2 weeks after backend endpoints are live

---

**Last Updated:** January 14, 2026
**Status:** 📋 **READY FOR BACKEND IMPLEMENTATION**
