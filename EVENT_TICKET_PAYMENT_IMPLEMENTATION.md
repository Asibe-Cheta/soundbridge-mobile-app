# Event Ticket Payment Implementation - Web Team Guide

## Overview

The mobile app now supports paid event tickets using Stripe payment processing. This document outlines the backend API endpoints needed to complete the implementation.

**Important**: SoundBridge takes a **5% platform fee** on all ticket sales. This fee stays in the SoundBridge Stripe account.

## 🎯 Key Points

### ✅ Integration with Existing Systems

**Event ticket payments integrate seamlessly with SoundBridge's existing infrastructure:**

1. **Stripe Connect** - Event organizers use the SAME Stripe Connect accounts already set up for tips/payouts
   - No new onboarding flow needed
   - Uses existing `creator_bank_accounts` table
   - Deferred onboarding system already in place (see [STRIPE_CONNECT_DEFERRED_ONBOARDING.md](STRIPE_CONNECT_DEFERRED_ONBOARDING.md))

2. **Revenue Tracking** - Ticket sales are added to organizer's existing revenue balance
   - Uses existing `creator_revenue` table
   - Same withdrawal system (minimum $25 payout)
   - Tracked alongside tips and other earnings

3. **Payment Flow** - Follows the same pattern as live tipping
   - Stripe Payment Intent with `application_fee_amount`
   - Automatic transfer to organizer's Stripe Connect account
   - Platform fee retained in SoundBridge account

### 💰 Platform Fee Structure (5%)

- **Customer pays**: £20.00 (full ticket price)
- **Platform retains**: £1.00 (5% - stays in SoundBridge Stripe account)
- **Organizer receives**: £19.00 (95% - transferred to their Stripe Connect account)
- **Organizer can withdraw**: When their total balance (including tickets, tips, etc.) ≥ $25

### 📱 Mobile Implementation Status

**✅ COMPLETE** - The mobile app already has:
- EventTicketService.ts - Handles Stripe payment flow
- EventDetailsScreen.tsx - "Buy Ticket" button and payment sheet integration
- CreateEventScreen.tsx - Geocoding for event coordinates

**Required from Web Team**: 3 API endpoints (detailed below)

---

## Mobile Implementation Summary

### Files Created/Modified

1. **`src/services/EventTicketService.ts`** (NEW)
   - Handles Stripe payment flow for ticket purchases
   - Manages ticket retrieval and validation
   - Generates QR code data for tickets

2. **`src/screens/EventDetailsScreen.tsx`** (MODIFIED)
   - Added "Buy Ticket" button for paid events
   - Integrated Stripe payment sheet
   - Shows purchased ticket status
   - Handles payment confirmation flow

3. **`src/screens/CreateEventScreen.tsx`** (MODIFIED)
   - Added geocoding functionality for event coordinates
   - Captures `latitude`, `longitude`, and `country` for proximity features

---

## Required Backend API Endpoints

### 1. Create Ticket Payment Intent

**Endpoint**: `POST /api/events/create-ticket-payment-intent`

**Purpose**: Create a Stripe Payment Intent for ticket purchase with 5% platform fee.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "eventId": "uuid",
  "quantity": 1,
  "priceGbp": 20,
  "priceNgn": null,
  "currency": "GBP"
}
```

**Important - Platform Fee Calculation**:
- **Platform fee**: 5% of ticket price
- **Event organizer receives**: 95% of ticket price
- **SoundBridge retains**: 5% platform fee

**Example Calculation**:
- Ticket price: £20
- Platform fee (5%): £1.00
- Organizer receives: £19.00
- Total charged to customer: £20.00

**Stripe Implementation**:
```javascript
// 1. Get event organizer's Stripe account ID
const { data: event } = await supabase
  .from('events')
  .select('organizer_id')
  .eq('id', eventId)
  .single();

const { data: bankAccount } = await supabase
  .from('creator_bank_accounts')
  .select('stripe_account_id, verification_status')
  .eq('user_id', event.organizer_id)
  .single();

if (!bankAccount?.stripe_account_id) {
  throw new Error('Event organizer has not set up Stripe Connect');
}

if (bankAccount.verification_status !== 'verified') {
  throw new Error('Event organizer account is not verified');
}

// 2. Calculate amounts
const totalAmount = priceGbp || priceNgn; // £20.00
const platformFeeAmount = Math.round(totalAmount * 100 * 0.05); // £1.00 (100 pence)
const organizerAmount = Math.round(totalAmount * 100) - platformFeeAmount; // £19.00 (1900 pence)

// 3. Create Payment Intent with application_fee_amount
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100), // £20.00 = 2000 pence
  currency: currency.toLowerCase(),
  application_fee_amount: platformFeeAmount, // 5% = 100 pence (stays in SoundBridge account)
  transfer_data: {
    destination: bankAccount.stripe_account_id, // Event organizer's Stripe Connect account
  },
  metadata: {
    eventId: eventId,
    userId: userId,
    quantity: quantity,
    platformFeePercentage: '5',
    organizerId: event.organizer_id,
    organizerAmount: organizerAmount,
  },
});
```

**Response**:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxxxxxxxxxxxx",
  "amount": 2000,
  "currency": "gbp"
}
```

**Error Responses**:
- `400`: Invalid request parameters
- `401`: Unauthorized
- `404`: Event not found
- `500`: Payment intent creation failed

---

### 2. Confirm Ticket Purchase

**Endpoint**: `POST /api/events/confirm-ticket-purchase`

**Purpose**: Confirm ticket purchase after successful Stripe payment and create ticket record.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "paymentIntentId": "pi_xxxxxxxxxxxxx",
  "eventId": "uuid",
  "quantity": 1,
  "amount": 2000,
  "currency": "gbp"
}
```

**Processing Steps**:

1. **Verify Payment Intent** with Stripe:
   ```javascript
   const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

   if (paymentIntent.status !== 'succeeded') {
     throw new Error('Payment not confirmed');
   }
   ```

2. **Generate Unique Ticket Code**:
   ```javascript
   // Format: EVT-XXXXXX (6 random alphanumeric characters)
   const ticketCode = 'EVT-' + generateRandomCode(6);
   ```

3. **Create Ticket Record** in `event_tickets` table:
   ```sql
   INSERT INTO event_tickets (
     id,
     event_id,
     user_id,
     ticket_code,
     quantity,
     amount_paid,
     currency,
     payment_intent_id,
     purchase_date,
     status,
     platform_fee_amount,
     organizer_amount
   ) VALUES (
     gen_random_uuid(),
     $eventId,
     $userId,
     $ticketCode,
     $quantity,
     $amount,
     $currency,
     $paymentIntentId,
     NOW(),
     'active',
     $amount * 0.05,  -- 5% platform fee
     $amount * 0.95   -- 95% to organizer
   );
   ```

4. **Update Organizer's Revenue** (CRITICAL - integrates with existing revenue system):
   ```javascript
   // Get event organizer
   const { data: event } = await supabase
     .from('events')
     .select('organizer_id')
     .eq('id', eventId)
     .single();

   // Calculate organizer's earning (95% of ticket price)
   const organizerAmount = parseFloat((amount * 0.95).toFixed(2));

   // Check if organizer has revenue record
   const { data: existingRevenue } = await supabase
     .from('creator_revenue')
     .select('*')
     .eq('user_id', event.organizer_id)
     .single();

   if (existingRevenue) {
     // UPDATE existing revenue
     await supabase
       .from('creator_revenue')
       .update({
         total_earned: existingRevenue.total_earned + organizerAmount,
         pending_balance: existingRevenue.pending_balance + organizerAmount,
         updated_at: new Date().toISOString()
       })
       .eq('user_id', event.organizer_id);
   } else {
     // INSERT new revenue record
     await supabase
       .from('creator_revenue')
       .insert({
         user_id: event.organizer_id,
         total_earned: organizerAmount,
         pending_balance: organizerAmount,
         total_paid_out: 0,
         payout_threshold: 50.00,
       });
   }

   console.log('💰 Organizer revenue updated:', {
     organizerId: event.organizer_id,
     ticketSale: organizerAmount,
     newBalance: (existingRevenue?.pending_balance || 0) + organizerAmount
   });
   ```

5. **Send Confirmation Email** (optional but recommended):
   - Ticket code
   - Event details
   - QR code image
   - Amount paid breakdown (ticket price, platform fee)

**Response**:
```json
{
  "id": "ticket-uuid",
  "event_id": "event-uuid",
  "user_id": "user-uuid",
  "ticket_code": "EVT-A1B2C3",
  "quantity": 1,
  "amount_paid": 2000,
  "currency": "gbp",
  "payment_intent_id": "pi_xxxxxxxxxxxxx",
  "purchase_date": "2024-01-15T10:30:00Z",
  "status": "active",
  "platform_fee_amount": 100,
  "organizer_amount": 1900
}
```

**Error Responses**:
- `400`: Invalid request or payment not completed
- `401`: Unauthorized
- `404`: Event not found
- `409`: Ticket already created for this payment intent
- `500`: Server error

---

### 3. Validate Ticket

**Endpoint**: `POST /api/events/validate-ticket`

**Purpose**: Validate a ticket code for event entry (used by event organizers/door staff).

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "ticketCode": "EVT-A1B2C3"
}
```

**Processing Steps**:

1. **Lookup Ticket** by code:
   ```sql
   SELECT * FROM event_tickets
   WHERE ticket_code = $ticketCode
   AND status IN ('active', 'used');
   ```

2. **Validate Ticket**:
   - Check if ticket exists
   - Check if ticket is active (not refunded)
   - Check if event date is valid
   - Optionally mark as 'used' if first-time scan

3. **Authorization Check**:
   - Only event organizer or authorized staff can validate tickets
   - Check if requesting user is the event organizer

**Response - Valid Ticket**:
```json
{
  "valid": true,
  "ticket": {
    "id": "ticket-uuid",
    "event_id": "event-uuid",
    "ticket_code": "EVT-A1B2C3",
    "quantity": 1,
    "status": "active",
    "purchase_date": "2024-01-15T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "display_name": "John Doe",
      "email": "john@example.com"
    },
    "event": {
      "title": "Summer Music Festival",
      "event_date": "2024-06-20T18:00:00Z",
      "location": "London, UK"
    }
  },
  "message": "Valid ticket"
}
```

**Response - Invalid Ticket**:
```json
{
  "valid": false,
  "message": "Invalid ticket code"
}
```

**Response - Already Used**:
```json
{
  "valid": true,
  "ticket": { /* ticket details */ },
  "message": "Ticket already scanned at 2024-06-20T17:45:00Z"
}
```

**Error Responses**:
- `400`: Missing ticket code
- `401`: Unauthorized
- `403`: Not authorized to validate tickets for this event
- `500`: Server error

---

## Database Schema Requirements

### `event_tickets` Table

```sql
CREATE TABLE event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_code VARCHAR(20) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_paid INTEGER NOT NULL, -- Amount in smallest currency unit (pence, kobo)
  currency VARCHAR(3) NOT NULL, -- 'GBP' or 'NGN'
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'used', 'refunded'
  platform_fee_amount INTEGER NOT NULL, -- 5% platform fee
  organizer_amount INTEGER NOT NULL, -- 95% to organizer
  used_at TIMESTAMP WITH TIME ZONE, -- When ticket was scanned/used
  validated_by UUID REFERENCES profiles(id), -- Who validated the ticket
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_event_tickets_event_id ON event_tickets(event_id);
CREATE INDEX idx_event_tickets_user_id ON event_tickets(user_id);
CREATE INDEX idx_event_tickets_ticket_code ON event_tickets(ticket_code);
CREATE INDEX idx_event_tickets_payment_intent ON event_tickets(payment_intent_id);
CREATE INDEX idx_event_tickets_status ON event_tickets(status);
```

### Update `events` Table

Ensure the events table has these columns:

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Index for proximity queries
CREATE INDEX idx_events_coordinates ON events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## Stripe Connect Requirements

### Event Organizer Onboarding

**IMPORTANT**: Event organizers use the **EXISTING** Stripe Connect system already implemented for creator payouts.

**No new implementation needed!** The system described in these documents is already in place:
- [STRIPE_CONNECT_COMPLETE_FLOW.md](STRIPE_CONNECT_COMPLETE_FLOW.md)
- [STRIPE_CONNECT_DEFERRED_ONBOARDING.md](STRIPE_CONNECT_DEFERRED_ONBOARDING.md)
- [STRIPE_PAYOUT_SYSTEM_COMPLETE.md](STRIPE_PAYOUT_SYSTEM_COMPLETE.md)

### How It Works:

1. **Stripe Connect Account**:
   - Event organizers already have Stripe Connect accounts via the deferred onboarding system
   - Accounts stored in `creator_bank_accounts` table with `stripe_account_id`
   - Same account used for tips, event tickets, and all revenue

2. **Payout Flow**:
   - Platform (SoundBridge) receives full ticket amount (£20.00)
   - 5% platform fee automatically retained (£1.00)
   - 95% transferred to organizer's Stripe Connect account (£19.00)
   - Use `transfer_data.destination` in Payment Intent pointing to organizer's `stripe_account_id`

3. **Revenue Tracking**:
   - Event ticket earnings added to organizer's `creator_revenue.pending_balance`
   - Organizer can withdraw via existing payout system (minimum $25)
   - All earnings tracked in existing `creator_revenue` table

4. **Database Integration**:
   ```sql
   -- NO SCHEMA CHANGES NEEDED
   -- Use existing tables:
   -- - creator_bank_accounts (stripe_account_id, verification_status)
   -- - creator_revenue (total_earned, pending_balance, total_paid_out)
   -- - creator_payouts (payout history)
   ```

### Event Ticket Revenue Flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EVENT TICKET SALE                               │
└─────────────────────────────────────────────────────────────────────┘

1. Customer buys £20 ticket
   ↓
2. Stripe Payment Intent created:
   - amount: £20.00 (2000 pence)
   - application_fee_amount: £1.00 (100 pence) [5%]
   - transfer_data.destination: organizer's stripe_account_id (from creator_bank_accounts)
   ↓
3. Customer completes payment
   ↓
4. Stripe automatically:
   - Charges customer: £20.00
   - Keeps platform fee: £1.00 (stays in SoundBridge Stripe account)
   - Transfers to organizer: £19.00 (to organizer's Stripe Connect account)
   ↓
5. Backend webhook (checkout.session.completed):
   - Update creator_revenue.total_earned += 19.00
   - Update creator_revenue.pending_balance += 19.00
   ↓
6. Organizer can withdraw via existing payout system when balance ≥ $25
```

---

## Payment Flow Diagram

```
┌─────────────┐
│   Mobile    │
│     App     │
└──────┬──────┘
       │
       │ 1. Create Payment Intent
       ▼
┌─────────────────────────────────────────┐
│  Backend API                            │
│  POST /create-ticket-payment-intent     │
│                                         │
│  - Calculate 5% platform fee            │
│  - Create Stripe Payment Intent         │
│  - application_fee_amount = 5%          │
│  - transfer_data.destination = organizer│
└──────┬──────────────────────────────────┘
       │
       │ 2. Return clientSecret
       ▼
┌─────────────┐
│   Mobile    │
│  Presents   │
│   Stripe    │
│   Payment   │
│    Sheet    │
└──────┬──────┘
       │
       │ 3. User Completes Payment
       ▼
┌─────────────────────────────────────────┐
│  Stripe                                 │
│  - Charges customer: £20.00             │
│  - Platform fee: £1.00 (stays with you) │
│  - Transfers: £19.00 to organizer       │
└──────┬──────────────────────────────────┘
       │
       │ 4. Payment Confirmed
       ▼
┌─────────────┐
│   Mobile    │
│     App     │
└──────┬──────┘
       │
       │ 5. Confirm Purchase
       ▼
┌─────────────────────────────────────────┐
│  Backend API                            │
│  POST /confirm-ticket-purchase          │
│                                         │
│  - Verify payment with Stripe           │
│  - Generate ticket code                 │
│  - Create ticket record                 │
│  - Send confirmation email              │
└──────┬──────────────────────────────────┘
       │
       │ 6. Return Ticket
       ▼
┌─────────────┐
│   Mobile    │
│     App     │
│   Shows     │
│   Ticket    │
└─────────────┘
```

---

## Platform Fee Configuration

### Current Implementation (Hardcoded)
- Platform fee: **5%**
- Organizer receives: **95%**

### Recommended: Make Configurable

Create a platform settings table:

```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('ticket_platform_fee_percentage', '5', 'Platform fee percentage for ticket sales');
```

This allows you to adjust the platform fee without code changes.

---

## Testing Checklist

### Backend Testing

- [ ] Create payment intent with correct platform fee calculation
- [ ] Verify Stripe Connect transfer to organizer account
- [ ] Confirm ticket creation after successful payment
- [ ] Generate unique ticket codes (no duplicates)
- [ ] Validate existing ticket codes
- [ ] Handle payment failures gracefully
- [ ] Test with both GBP and NGN currencies
- [ ] Verify platform fee is exactly 5%
- [ ] Test refund flow (if implemented)

### Mobile App Testing (Already Implemented)

- [x] Buy ticket button appears for paid events
- [x] Free events show "Attend Event" button
- [x] Stripe payment sheet presents correctly
- [x] Payment cancellation handled
- [x] Successful purchase shows ticket purchased status
- [x] Ticket count displays correctly
- [x] Loading states during purchase

---

## Security Considerations

1. **Payment Intent Verification**:
   - Always verify payment intent status with Stripe before confirming purchase
   - Never trust client-side payment confirmation alone

2. **Ticket Code Generation**:
   - Use cryptographically secure random generation
   - Check for duplicates before insertion

3. **Authorization**:
   - Only authenticated users can purchase tickets
   - Only event organizers can validate tickets
   - Verify event ownership before validation

4. **Idempotency**:
   - Use `payment_intent_id` as unique constraint
   - Prevent duplicate ticket creation for same payment

5. **Amount Verification**:
   - Verify ticket amount matches event price
   - Prevent price manipulation from client

---

## Future Enhancements (Not Required Now)

1. **QR Code Generation**: Generate QR codes for tickets (mobile app can do this client-side)
2. **Ticket Transfers**: Allow users to transfer tickets to others
3. **Refund System**: Handle ticket refunds and cancellations
4. **Bulk Purchases**: Support buying multiple tickets in one transaction
5. **Ticket Scanner App**: Dedicated app for event organizers to scan tickets
6. **Analytics Dashboard**: Show ticket sales analytics to organizers
7. **Early Bird Pricing**: Support multiple ticket price tiers
8. **Promo Codes**: Discount codes for ticket purchases

---

## Support & Questions

For questions about this implementation, contact the mobile development team or refer to:
- Mobile ticket service: `src/services/EventTicketService.ts`
- Event details screen: `src/screens/EventDetailsScreen.tsx`
- Stripe documentation: https://stripe.com/docs/connect/charges

---

**Document Version**: 1.0
**Date**: 2024-01-15
**Mobile Implementation**: Complete
**Backend Implementation**: Required
