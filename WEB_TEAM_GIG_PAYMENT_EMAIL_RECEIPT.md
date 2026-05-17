# WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md

**Date:** 2026-02-28
**Priority:** MEDIUM
**For:** Backend team

---

## Context

When a gig is marked complete and the creator's internal wallet is credited (per `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md`), the creator currently receives only a push notification. There is no email confirmation for either party.

You already use **SendGrid** for subscription payment receipts on the web app. Extend that same infrastructure to cover gig payment events.

---

## Trigger Points

Send emails at **two** moments in the gig payment lifecycle:

| Event | Recipients | Email type |
|-------|-----------|------------|
| Gig marked complete → wallet credited | **Creator** | Earnings receipt |
| Gig marked complete → wallet credited | **Requester** | Payment confirmation |

Do **not** send an email at the point of Wise withdrawal — that flow is already handled separately. This spec covers only the gig-completion credit event.

---

## Email 1 — Creator Earnings Receipt

**Trigger:** `POST /api/gigs/:id/complete` → after `creator_wallets` is credited
**To:** Creator's email address (from `profiles.email`)
**Subject:** `You earned ${{amount}} on SoundBridge`

### Template Variables

```
{{creator_name}}         — display_name or username
{{gig_title}}            — opportunity_projects.title or gig description
{{requester_name}}       — requester's display_name or username
{{gross_amount}}         — full payment amount captured from Stripe (USD)
{{platform_fee}}         — 12% of gross_amount
{{creator_earnings}}     — gross_amount - platform_fee (this is what hit the wallet)
{{wallet_balance}}       — new wallet balance after this credit
{{currency}}             — 'USD' (always; Wise converts at withdrawal time)
{{gig_completed_at}}     — ISO timestamp of completion
{{withdrawal_cta_url}}   — deep link or web URL to wallet/withdrawal screen
```

### Email Body (plain-text equivalent)

```
Hi {{creator_name}},

Great news — you've been paid for your gig!

Gig: {{gig_title}}
Client: {{requester_name}}
Completed: {{gig_completed_at}}

---
Gross payment:        ${{gross_amount}} USD
Platform fee (12%):  -${{platform_fee}} USD
Your earnings:        ${{creator_earnings}} USD
---
New wallet balance:   ${{wallet_balance}} USD

Your earnings are now in your SoundBridge wallet. You can withdraw
to your bank account whenever you're ready — it takes 1–3 business
days via Wise (or minutes for Nigerian accounts once Phase 2 instant
transfers are enabled).

Withdraw your earnings →
{{withdrawal_cta_url}}

Thanks for using SoundBridge.
The SoundBridge Team
```

### Notes for African Creators

Add a contextual note below the withdrawal CTA for creators whose country is in the Wise countries list:

```
Note for Nigerian creators: When you withdraw, Wise converts your
USD balance to NGN at the live exchange rate before sending to your
bank account (typically 1–3 business days).
```

You can detect this by checking `profiles.country_code` against `WISE_COUNTRIES`.

---

## Email 2 — Requester Payment Confirmation

**Trigger:** Same gig completion event
**To:** Requester's email address
**Subject:** `Your gig payment to {{creator_name}} is confirmed`

### Template Variables

```
{{requester_name}}       — requester's display_name
{{creator_name}}         — creator's display_name
{{gig_title}}            — gig description
{{amount_charged}}       — total Stripe charge amount (USD or requester's currency)
{{gig_completed_at}}     — completion timestamp
{{stripe_receipt_url}}   — Stripe PaymentIntent receipt URL (already provided by Stripe)
{{gig_view_url}}         — link to the completed gig record
```

### Email Body (plain-text equivalent)

```
Hi {{requester_name}},

Your gig with {{creator_name}} is complete and your payment has been processed.

Gig: {{gig_title}}
Completed: {{gig_completed_at}}
Amount charged: ${{amount_charged}}

View Stripe receipt →
{{stripe_receipt_url}}

View your gig →
{{gig_view_url}}

Thanks for using SoundBridge.
The SoundBridge Team
```

---

## SendGrid Implementation

### Template IDs to Create

Create two new SendGrid Dynamic Templates:

| Template name | Purpose |
|--------------|---------|
| `gig_creator_payment_receipt` | Creator earnings confirmation |
| `gig_requester_payment_confirmation` | Requester payment confirmation |

### Sending Logic

Add to your gig completion handler, after the wallet credit:

```typescript
// After crediting wallet and sending push notification...

// Email to creator
await sendgrid.send({
  to: creator.email,
  from: 'payments@soundbridge.live',
  templateId: 'gig_creator_payment_receipt',
  dynamicTemplateData: {
    creator_name: creator.display_name || creator.username,
    gig_title: gig.title,
    requester_name: requester.display_name || requester.username,
    gross_amount: (gigAmount / 100).toFixed(2),      // Stripe stores in pence/cents
    platform_fee: (platformFee / 100).toFixed(2),
    creator_earnings: (creatorEarnings / 100).toFixed(2),
    wallet_balance: (newWalletBalance).toFixed(2),
    currency: 'USD',
    gig_completed_at: new Date().toLocaleDateString('en-GB', { dateStyle: 'long' }),
    withdrawal_cta_url: 'https://soundbridge.live/wallet',
    is_wise_country: WISE_COUNTRIES.includes(creator.country_code ?? ''),
  },
});

// Email to requester
await sendgrid.send({
  to: requester.email,
  from: 'payments@soundbridge.live',
  templateId: 'gig_requester_payment_confirmation',
  dynamicTemplateData: {
    requester_name: requester.display_name || requester.username,
    creator_name: creator.display_name || creator.username,
    gig_title: gig.title,
    amount_charged: (gigAmount / 100).toFixed(2),
    gig_completed_at: new Date().toLocaleDateString('en-GB', { dateStyle: 'long' }),
    stripe_receipt_url: paymentIntent.charges?.data[0]?.receipt_url ?? '',
    gig_view_url: `https://soundbridge.live/gigs/${gigId}`,
  },
});
```

### Error Handling

Wrap email sending in try/catch and **do not fail the gig completion** if email delivery fails. Log the error to your monitoring system but return a success response to the mobile app — the wallet credit is the critical step, the email is supplementary.

```typescript
try {
  await sendEmailReceipts(creatorId, requesterId, gigId, ...);
} catch (emailError) {
  console.error('[GigPayment] Email receipt failed — wallet credit succeeded', emailError);
  // Do not rethrow — gig completion was successful
}
```

---

## Email Sending Conditions

Only send emails when:

1. The gig's `payment_status` transitions to `'released'` (not on re-sends or retries)
2. Both `creator.email` and `requester.email` are verified (check `email_confirmed_at` in auth.users)
3. The user has not opted out of transactional emails (check `notification_preferences.email_payments` if that column exists; default to sending if preference not set)

---

## Related Documents

- `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md` — wallet credit trigger (this email fires from the same handler)
- `WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md` — push notification spec (separate channel, fires in parallel)
- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Stripe receipt URL retrieval

---

*Document created: 2026-02-28*
