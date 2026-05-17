# Payment Integration Guide - Stripe & Wise Pay

**Date:** January 14, 2026
**Status:** Documentation for Implementation
**Priority:** CRITICAL - Required for Paid Content Feature

---

## Overview

SoundBridge mobile app supports two payment methods for content purchases and payouts:

1. **Stripe** - Primary payment processor for content purchases
2. **Wise Pay** - Alternative payout method for international creators

---

## Current Stripe Integration Status

### ✅ Already Configured

The Stripe SDK is **already integrated** in the mobile app:

**File:** [App.tsx](App.tsx)

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

// In App component:
<StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
  {/* App content */}
</StripeProvider>
```

**Environment Variables:**
- `STRIPE_PUBLISHABLE_KEY` is configured in `.env`
- Backend has Stripe secret key for server-side operations

---

## Payment Flow Architecture

### 1. Content Purchase Flow (User Buying Content)

**Payment Method:** Stripe Payment Intents API

**Flow:**
```
1. User taps "Purchase" on TrackDetailsScreen
   ↓
2. PurchaseModal opens with content preview
   ↓
3. User confirms purchase
   ↓
4. Frontend: Call backend API to create Payment Intent
   POST /api/payments/create-intent
   Body: { content_id, content_type, price, currency }
   ↓
5. Backend:
   - Creates Stripe Payment Intent
   - Returns client_secret to frontend
   ↓
6. Frontend: Use Stripe SDK to confirm payment
   stripe.confirmPayment(client_secret, payment_method)
   ↓
7. Stripe: Processes payment securely
   ↓
8. Backend Webhook: Receives payment_intent.succeeded event
   - Creates content_purchases record
   - Updates creator's wallet balance
   - Sends email notifications
   ↓
9. Frontend: Shows success message
   - Updates UI to show owned content
   - Allows immediate playback
```

**Key Components:**
- **Frontend:** PurchaseModal component (already exists)
- **Backend API:** `/api/payments/create-intent` endpoint
- **Stripe SDK:** `@stripe/stripe-react-native` (already installed)

---

### 2. Creator Payout Flow (Creator Withdrawing Earnings)

**Payment Methods:** Stripe Connect (default) OR Wise Pay (international)

#### Option A: Stripe Connect (Recommended for Most Creators)

**Flow:**
```
1. Creator navigates to Digital Wallet screen
   ↓
2. Creator taps "Withdraw Funds"
   ↓
3. Check minimum balance:
   - Premium: £20 minimum
   - Unlimited: £10 minimum
   ↓
4. Creator selects payout method: "Bank Account (Stripe)"
   ↓
5. If first time:
   - Create Stripe Connect Account
   - Complete onboarding (bank details, ID verification)
   ↓
6. Frontend: Call backend API to create payout
   POST /api/payouts/create
   Body: { amount, currency, method: 'stripe' }
   ↓
7. Backend:
   - Creates Stripe Transfer to creator's Connect account
   - Updates wallet balance
   - Creates payout record in DB
   ↓
8. Stripe: Transfers funds to creator's bank (2-7 days)
   ↓
9. Backend Webhook: Receives transfer.paid event
   - Updates payout status to 'completed'
   - Sends confirmation email
```

#### Option B: Wise Pay (For International Creators)

**When to Use:**
- Creator is located outside Stripe-supported countries
- Creator prefers lower international transfer fees
- Creator already has Wise account

**Flow:**
```
1. Creator navigates to Digital Wallet screen
   ↓
2. Creator taps "Withdraw Funds"
   ↓
3. Check minimum balance (same as Stripe)
   ↓
4. Creator selects payout method: "International Transfer (Wise)"
   ↓
5. If first time:
   - Creator enters Wise account email
   - Backend validates Wise account via API
   ↓
6. Frontend: Call backend API to create payout
   POST /api/payouts/create
   Body: { amount, currency, method: 'wise', wise_email }
   ↓
7. Backend:
   - Creates Wise transfer via Wise API
   - Updates wallet balance
   - Creates payout record in DB
   ↓
8. Wise: Transfers funds to creator's Wise account (1-2 days)
   ↓
9. Backend: Polls Wise API for transfer status
   - Updates payout status to 'completed'
   - Sends confirmation email
```

---

## Implementation Checklist

### Phase 1: Content Purchase (Stripe) ✅ PRIORITY

- [x] Stripe SDK already integrated in App.tsx
- [ ] **Backend API Endpoints:**
  - [ ] `POST /api/payments/create-intent` - Create payment intent
  - [ ] `POST /api/payments/webhook` - Handle Stripe webhooks
  - [ ] `GET /api/purchases/verify/:content_id` - Verify ownership (already exists)

- [ ] **Frontend Components:**
  - [ ] PurchaseModal - Add Stripe payment confirmation
  - [ ] Update contentPurchaseService.ts with Stripe logic

- [ ] **Database:**
  - [ ] Ensure `content_purchases` table has payment_intent_id field
  - [ ] Add index on payment_intent_id for webhook lookups

- [ ] **Testing:**
  - [ ] Test with Stripe test cards (4242 4242 4242 4242)
  - [ ] Test failed payments
  - [ ] Test webhook delivery
  - [ ] Test ownership verification after purchase

### Phase 2: Creator Payouts (Stripe Connect)

- [ ] **Backend API Endpoints:**
  - [ ] `POST /api/payouts/create` - Create payout request
  - [ ] `GET /api/payouts/history` - Get payout history
  - [ ] `POST /api/stripe/onboard` - Create Stripe Connect account
  - [ ] `GET /api/stripe/account-status` - Check onboarding status

- [ ] **Frontend Components:**
  - [ ] Update WalletScreen with withdraw button
  - [ ] Create StripeOnboardingScreen
  - [ ] Create PayoutHistoryScreen

- [ ] **Testing:**
  - [ ] Test Stripe Connect onboarding
  - [ ] Test payouts in test mode
  - [ ] Test minimum balance enforcement

### Phase 3: Wise Pay Integration (Optional - Future)

- [ ] **Backend Setup:**
  - [ ] Sign up for Wise Business Account
  - [ ] Get Wise API credentials
  - [ ] Store API key securely

- [ ] **Backend API Endpoints:**
  - [ ] `POST /api/wise/validate-account` - Validate Wise email
  - [ ] `POST /api/wise/create-transfer` - Create Wise transfer

- [ ] **Frontend Components:**
  - [ ] Add Wise option to payout method selector
  - [ ] Create WiseAccountSetupScreen

- [ ] **Testing:**
  - [ ] Test Wise API integration in sandbox
  - [ ] Test international transfers

---

## API Endpoint Specifications

### POST /api/payments/create-intent

**Purpose:** Create a Stripe Payment Intent for content purchase

**Request:**
```json
{
  "content_id": "uuid",
  "content_type": "track" | "album" | "podcast",
  "price": 2.99,
  "currency": "GBP"
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 299,
  "currency": "gbp"
}
```

**Backend Logic:**
1. Validate content exists and is paid
2. Verify price matches database
3. Create Stripe Payment Intent
4. Return client_secret to frontend

---

### POST /api/payments/webhook

**Purpose:** Handle Stripe webhook events

**Events to Handle:**
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `transfer.paid` - Payout completed (for Stripe Connect)

**Logic for payment_intent.succeeded:**
```javascript
1. Extract payment_intent_id from event
2. Retrieve metadata (content_id, buyer_id, creator_id)
3. Create content_purchases record:
   - buyer_id
   - content_id
   - content_type
   - amount_paid
   - currency
   - payment_intent_id
   - purchased_at
4. Update creator's wallet balance (amount * 0.9)
5. Send email to buyer: "Purchase Confirmed"
6. Send email to creator: "New Sale - £X earned"
7. Return 200 OK to Stripe
```

---

### POST /api/payouts/create

**Purpose:** Create a payout request for creator

**Request:**
```json
{
  "amount": 50.00,
  "currency": "GBP",
  "method": "stripe" | "wise",
  "wise_email": "creator@wise.com" // only if method=wise
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
1. Verify user has sufficient balance
2. Check minimum balance (Premium: £20, Unlimited: £10)
3. If method=stripe:
   - Create Stripe Transfer to Connect account
4. If method=wise:
   - Create Wise transfer via API
5. Deduct amount from wallet balance
6. Create payout record in DB
7. Send confirmation email

---

## Revenue Split Model

**Platform Fee:** 10%
**Creator Earnings:** 90%

**Example:**
- User buys track for £2.99
- Stripe fee: ~£0.09 (3%)
- Platform keeps: £0.30 (10%)
- Creator receives: £2.69 (90%)

**Implementation:**
```javascript
const salePrice = 2.99;
const platformFee = salePrice * 0.10; // £0.29
const creatorEarnings = salePrice * 0.90; // £2.70

// In webhook handler:
await updateCreatorWallet(creator_id, creatorEarnings);
```

---

## Security Best Practices

### 1. Never Store Card Details
- ✅ Use Stripe Elements/SDK for card input
- ✅ Card details go directly to Stripe
- ❌ Never send card details to backend

### 2. Validate Webhooks
```javascript
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

### 3. Idempotency
- Store `payment_intent_id` in database
- Check for duplicates before creating purchase record
- Prevents double-charging on webhook retries

### 4. Amount Validation
- Always verify price on backend
- Never trust frontend-submitted prices
- Check against database price before creating Payment Intent

---

## Testing Strategy

### Stripe Test Cards

**Successful Payment:**
- Card: 4242 4242 4242 4242
- Expiry: Any future date
- CVC: Any 3 digits

**Failed Payment:**
- Card: 4000 0000 0000 0002
- Triggers card_declined error

**3D Secure Authentication:**
- Card: 4000 0025 0000 3155
- Requires authentication

### Webhook Testing

Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
stripe trigger payment_intent.succeeded
```

---

## Environment Variables

### Frontend (.env)
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Backend (.env)
```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
WISE_API_KEY=xxx // for Wise integration
```

---

## Current Implementation Status

### ✅ Completed
1. Stripe SDK integrated in App.tsx
2. PricingControls component with price validation
3. AudioPlayerContext ownership checks
4. ContentPurchaseService with checkOwnership method
5. PurchaseModal component (basic structure exists)
6. Sales Analytics dashboard
7. Purchased Content library screen

### ⏳ Pending (Backend Work Required)
1. Backend API endpoints for payment intents
2. Stripe webhook handler
3. Payment confirmation in PurchaseModal
4. Stripe Connect onboarding for creators
5. Payout functionality in WalletScreen

### 🔮 Future Enhancements
1. Wise Pay integration
2. Apple Pay / Google Pay support
3. Subscription bundles (buy 10 tracks, get 1 free)
4. Gift cards

---

## Integration with Existing Code

### PurchaseModal Integration

**Current File:** `src/components/PurchaseModal.tsx` (assumed to exist)

**Add Stripe Payment:**
```typescript
import { useStripe } from '@stripe/stripe-react-native';

export default function PurchaseModal({ content, onClose }) {
  const { confirmPayment } = useStripe();

  const handlePurchase = async () => {
    try {
      // 1. Create Payment Intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: content.id,
          content_type: content.type,
          price: content.price,
          currency: content.currency,
        }),
      });

      const { client_secret } = await response.json();

      // 2. Confirm Payment with Stripe
      const { error, paymentIntent } = await confirmPayment(client_secret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
        return;
      }

      // 3. Payment succeeded
      Alert.alert('Success', 'Purchase complete! You can now play this content.');
      onClose();

      // 4. Refresh purchased content list
      // (handled by AudioPlayerContext ownership check)

    } catch (error) {
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  return (
    // ... modal UI with "Confirm Purchase" button
    <Button onPress={handlePurchase} title="Confirm Purchase" />
  );
}
```

---

## Error Handling

### Common Errors & Solutions

**1. Insufficient Funds**
- Error: `card_declined`
- Message: "Your card was declined. Please try a different payment method."

**2. Authentication Required**
- Error: `authentication_required`
- Action: Stripe SDK automatically handles 3D Secure flow

**3. Webhook Signature Verification Failed**
- Cause: Wrong webhook secret
- Solution: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

**4. Duplicate Purchase**
- Check: Query `content_purchases` table for existing purchase
- Action: Return early from webhook handler if duplicate found

**5. Minimum Balance Not Met**
- Error: `insufficient_balance`
- Message: "Minimum withdrawal is £20 for Premium users."

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Conversion Rate:** Browse → Purchase
2. **Failed Payment Rate:** By error type
3. **Average Transaction Value**
4. **Revenue by Currency**
5. **Payout Processing Time**
6. **Webhook Delivery Success Rate**

### Logging

**Purchase Events:**
```javascript
logger.info('Payment Intent Created', {
  content_id,
  amount,
  currency,
  user_id,
});

logger.info('Purchase Completed', {
  payment_intent_id,
  content_id,
  buyer_id,
  creator_id,
  amount,
});
```

**Payout Events:**
```javascript
logger.info('Payout Requested', {
  creator_id,
  amount,
  method,
});

logger.info('Payout Completed', {
  payout_id,
  creator_id,
  amount,
});
```

---

## Support & Documentation

### Stripe Resources
- **Stripe Docs:** https://stripe.com/docs/payments/accept-a-payment
- **React Native SDK:** https://stripe.com/docs/stripe-react-native
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **Connect Guide:** https://stripe.com/docs/connect

### Wise Resources
- **Wise API Docs:** https://api-docs.wise.com/
- **Transfer Flow:** https://api-docs.wise.com/api-reference/transfer

---

## Rollout Plan

### Phase 1: MVP (Current Sprint)
1. Implement Stripe payment for content purchases
2. Test end-to-end purchase flow
3. Deploy webhook handler to production
4. Enable paid content feature for beta testers

### Phase 2: Creator Payouts
1. Implement Stripe Connect onboarding
2. Add payout functionality to WalletScreen
3. Test payouts with creators
4. Launch payout feature

### Phase 3: International Support
1. Integrate Wise Pay for international creators
2. Add multi-currency support
3. Optimize for lower fees

---

## Questions for Backend Team

1. **Webhook Endpoint:** Is `/api/payments/webhook` the correct endpoint?
2. **Authentication:** How should `/api/payments/create-intent` authenticate users?
3. **Database Schema:** Does `content_purchases` table have all required fields?
4. **Email Service:** Which service is used for email notifications?
5. **Wise Account:** Has the platform signed up for Wise Business yet?

---

**Last Updated:** January 14, 2026
**Status:** 📋 **DOCUMENTATION COMPLETE** - Ready for Backend Implementation

---

## Summary

This document outlines the complete payment integration strategy for SoundBridge mobile app:

- ✅ **Stripe SDK** already integrated
- 🎯 **Next Step:** Implement backend API endpoints for payment intents
- 💡 **Key Insight:** Use Stripe for purchases, offer Stripe Connect + Wise for payouts
- 🔐 **Security:** Never store card details, always validate webhooks
- 📊 **Revenue Model:** 90% creator, 10% platform

All mobile app components are ready. Backend implementation is the final step to launch paid content feature.
