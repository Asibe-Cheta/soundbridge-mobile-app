# CRITICAL + REQUIRED: Platform Fee Fix & Email Receipts with PDF

Two separate workstreams. Both required for production.

---

## Part 1 — CRITICAL: `application_fee_amount` Missing from PaymentIntents

### The Problem

Every PaymentIntent created by SoundBridge must include `application_fee_amount` so Stripe
automatically routes the platform's cut to the SoundBridge Stripe balance.

**Current state:** The payment breakdown for `pi_3TBl5W0Bt6mXrdye0xGkcwHx` (£25 gig payment)
shows no "Application fee" line — only Stripe's own processing fee. This means:
- The 12% platform fee is tracked only in the database
- It is NOT being collected via Stripe
- Stripe's "Collected fees" tab will be empty or understated

### Required Fix

Wherever a PaymentIntent is created, add `application_fee_amount`:

```js
// Gig / opportunity project payments (12%)
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInPence,         // e.g. 2500 for £25.00
  currency: 'gbp',
  capture_method: 'manual',      // escrow
  application_fee_amount: Math.round(amountInPence * 0.12),  // 12% = 300 pence = £3.00
  // ...
});

// Event ticket purchases (5%)
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInPence,
  currency: 'gbp',
  application_fee_amount: Math.round(amountInPence * 0.05),  // 5% = 125 pence for £25
  // ...
});

// Audio/content purchases (5%)
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInPence,
  currency: 'gbp',
  application_fee_amount: Math.round(amountInPence * 0.05),
  // ...
});

// Tips (5% standard, 3% Unlimited tier)
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInPence,
  currency: 'gbp',
  application_fee_amount: Math.round(amountInPence * feeRate),  // 0.05 or 0.03
  // ...
});
```

### Platform Fee Summary

| Transaction Type       | Platform Fee | Notes |
|------------------------|-------------|-------|
| Gig / opportunity      | 12%         | Captured on delivery confirmation |
| Event ticket           | 5%          | Captured immediately |
| Audio/content purchase | 5%          | Captured immediately |
| Tips (standard)        | 5%          | Captured immediately |
| Tips (Unlimited tier)  | 3%          | Reduced rate |

### Verification

After deploying:
1. Stripe Dashboard → Transactions → **Collected fees** tab
2. Each payment should show an "Application fee" line in the payment breakdown
3. The two existing succeeded payments (pi_3TBl5W0Bt6mXrdye0xGkcwHx £25, pi_3T6GcG0Bt6mXrdye10HwRyaF £10)
   cannot be retroactively corrected — forward-only fix

---

## Part 2 — Email Receipts with Downloadable PDFs

### Overview

Every financial transaction must automatically trigger an email receipt to the payer
with a PDF attachment. The mobile app can also call on-demand endpoints to re-send
or retrieve receipts.

### PDF Content Requirements

Every receipt PDF must include the following so support can look up any transaction:

| Field | Purpose |
|-------|---------|
| SoundBridge Receipt # (transaction ID) | Internal reference |
| Stripe Payment Intent ID | Look up in Stripe dashboard |
| Date & Time (UTC) | Dispute resolution |
| Transaction type | Tip / Gig / Ticket / Content |
| Amount + currency | |
| Platform fee breakdown | Transparency |
| Payer name / email | |
| Recipient name (if applicable) | |
| Item description | What was purchased |
| Payment method (last 4 digits) | From Stripe PI metadata |
| Status | succeeded / pending / failed |
| SoundBridge support email | |

### Required Endpoints

#### 1. `POST /api/wallet/transactions/:id/send-receipt`

Re-sends (or sends for the first time) a receipt email with PDF to the authenticated user.

**Auth:** Required (JWT)
**Guard:** `transaction.user_id === req.user.id`
**Response:** `{ success: true, email: "user@example.com" }`

```js
// Logic
const transaction = await db.wallet_transactions.findOne(id);
if (transaction.user_id !== req.user.id) return 403;

const pdfBuffer = await generateReceiptPDF({
  receiptNumber: transaction.id,
  stripePaymentIntentId: transaction.stripe_payment_intent_id, // add this field if missing
  date: transaction.created_at,
  type: transaction.transaction_type,
  amount: transaction.amount,
  currency: transaction.currency,
  description: transaction.description,
  userName: req.user.full_name,
  userEmail: req.user.email,
  referenceId: transaction.reference_id,
  referenceType: transaction.reference_type,
  status: transaction.status,
});

await sendEmail({
  to: req.user.email,
  subject: `SoundBridge Receipt — ${formatCurrency(transaction.amount, transaction.currency)}`,
  template: 'transaction-receipt',
  pdfAttachment: {
    filename: `soundbridge-receipt-${transaction.id}.pdf`,
    content: pdfBuffer,
  },
});
```

#### 2. `POST /api/event-tickets/:id/send-receipt`

Sends a ticket receipt PDF to the ticket holder.

**Auth:** Required
**Guard:** `ticket.user_id === req.user.id`
**Response:** `{ success: true, email: "user@example.com" }`

```js
// Logic
const ticket = await db.event_tickets.findOne(id);
if (ticket.user_id !== req.user.id) return 403;

const event = await db.events.findOne(ticket.event_id);

const pdfBuffer = await generateTicketReceiptPDF({
  ticketCode: ticket.ticket_code,
  ticketId: ticket.id,
  stripePaymentIntentId: ticket.payment_intent_id,
  purchaseDate: ticket.purchase_date,
  eventTitle: event.title,
  eventDate: event.date,
  eventLocation: event.location,
  eventVenue: event.venue,
  quantity: ticket.quantity,
  amountPaid: ticket.amount_paid,
  currency: ticket.currency,
  buyerName: req.user.full_name,
  buyerEmail: req.user.email,
  status: ticket.status,
});

await sendEmail({
  to: req.user.email,
  subject: `Your ticket for ${event.title} — SoundBridge`,
  template: 'event-ticket-receipt',
  pdfAttachment: {
    filename: `ticket-${ticket.ticket_code}.pdf`,
    content: pdfBuffer,
  },
});
```

### Automatic Email Triggers (Webhook / Post-Payment)

These should fire automatically — no mobile action required:

| Event | Trigger | Template |
|-------|---------|----------|
| Ticket purchased | After `confirmTicketPurchase` succeeds | Ticket receipt + PDF |
| Content purchased | After payment capture | Content purchase receipt + PDF |
| Tip sent | After tip payment confirmed | Tip confirmation (payer) + PDF |
| Tip received | After tip credited | Tip received notification (no PDF required) |
| Gig payment escrow | After `payment_intent.amount_capturable_updated` | "Payment secured" confirmation |
| Gig completed | After `confirm-delivery` and capture | Final gig receipt + PDF (both parties) |
| Withdrawal processed | After Wise payout completes | Payout receipt + PDF |

### Email Service

Use the **existing SendGrid service** at `apps/web/src/lib/sendgrid-service.ts` (same one used by `SubscriptionEmailService.ts`).
Add the PDF as a SendGrid attachment:

```js
await sgMail.send({
  to: user.email,
  from: 'receipts@soundbridge.live',
  subject: `SoundBridge Receipt — ${formattedAmount}`,
  html: receiptHtml,
  attachments: [
    {
      content: pdfBuffer.toString('base64'),
      filename: `soundbridge-receipt-${transactionId}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ],
});
```

### PDF Generation Options

Recommended: **Puppeteer** (server-side HTML → PDF) or **@react-pdf/renderer** (Node)

```js
// Example with Puppeteer
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(receiptHtmlTemplate(data));
const pdf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
return pdf;
```

### Receipt HTML Template — Key Design Requirements

- SoundBridge logo at top
- Clean white background (printable)
- All fields from the PDF Content Requirements table above
- Dashed separator line between sections
- Footer: "SoundBridge Ltd | support@soundbridge.live | soundbridge.live"
- Page size: A4

### Database Change Required

Add `stripe_payment_intent_id` column to `wallet_transactions` if not already present:

```sql
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
```

Populate it when creating wallet transactions from Stripe webhook events.

---

## Priority

| Item | Priority |
|------|---------|
| Add `application_fee_amount` to all PaymentIntents | **P0 — Critical** |
| Auto-send ticket receipt email on purchase | **P1** |
| `POST /api/wallet/transactions/:id/send-receipt` endpoint | **P1** |
| `POST /api/event-tickets/:id/send-receipt` endpoint | **P1** |
| Auto-send receipt for tips, content purchases | **P2** |
| Auto-send receipt for gig completion | **P2** |
| Withdrawal/payout receipt | **P3** |
