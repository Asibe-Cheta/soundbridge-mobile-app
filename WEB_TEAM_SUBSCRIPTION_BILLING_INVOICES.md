# Web Team: Subscription Billing Invoice Emails (UK Compliant)

## Priority: P1 — Legal Requirement

UK law (Consumer Rights Act + GDPR) requires payment confirmations for every recurring charge.
Invoices must also meet HMRC standards. This must be live before public launch.

---

## Company & Legal Details (use on every invoice)

| Field | Value |
|---|---|
| Registered Name | SoundBridge Live Ltd |
| UK Company Number | 16854928 |
| Contact Email | contact@soundbridge.live |
| Website | soundbridge.live |
| Registered Address | 4 Whitlock House, 2 Cedar Grove, Wokingham, United Kingdom |
| VAT | State **"VAT not applicable — below £90,000 registration threshold"** until registered. If/when VAT-registered, charge 20% UK standard rate and include VAT number. |

---

## Stripe Events to Handle

| Event | Email to Send |
|---|---|
| `invoice.payment_succeeded` | Invoice receipt (see spec below) |
| `invoice.payment_failed` | Failed payment alert with retry date and link to update card |
| `customer.subscription.deleted` | Cancellation confirmation with access end date |
| `customer.subscription.updated` | Plan change confirmation (only if tier/price changed) |

---

## Invoice Email Spec (`invoice.payment_succeeded`)

### From / Subject
- **From:** `SoundBridge Live Ltd <contact@soundbridge.live>`
- **Subject:** `Invoice #INV-XXXXX — Your SoundBridge Live subscription`

---

### Section 1 — Invoice Identity
| Field | Source |
|---|---|
| Invoice Number | Sequential — e.g. `INV-00001`. Store and increment in DB. Do **not** use Stripe's invoice ID as the public number. |
| Invoice Date | `invoice.created` (Unix → formatted date) |
| Payment Collected | `invoice.status_transitions.paid_at` (Unix → formatted date) |
| Due Date | "Payment collected on [date]" (auto-billing, so always collected immediately) |

---

### Section 2 — Customer Details
| Field | Source |
|---|---|
| Full Name | `customer.name` or user profile `display_name` |
| Email | `customer.email` |
| Billing Address | `customer.address` from Stripe (populated at checkout) — required for VAT purposes |

> **Note:** If billing address is not yet collected at checkout, add an address field to the upgrade/payment flow and save it to the Stripe customer object.

---

### Section 3 — Subscription Details
| Field | Source |
|---|---|
| Plan Name | `invoice.lines.data[0].description` (e.g. "Starter Plan – Monthly") |
| Billing Period | `invoice.period_start` → `invoice.period_end` (both Unix → formatted) |
| Billing Cycle | Derived from price interval: `price.recurring.interval` → "Monthly" or "Annual" |
| Unit Price | `invoice.lines.data[0].amount / 100` formatted in GBP |
| Quantity | `invoice.lines.data[0].quantity` (always 1 for subscriptions) |

---

### Section 4 — Financial Breakdown
| Line | Value |
|---|---|
| Subtotal | `invoice.subtotal / 100` |
| Discount | `invoice.discount` if present (show code + amount off) |
| VAT | **"VAT not applicable — SoundBridge Live Ltd is not currently VAT registered"** (until threshold crossed) |
| **Total Charged** | `invoice.amount_paid / 100` in GBP (bold) |
| Payment Method | Retrieve via `invoice.default_payment_method` or `customer.invoice_settings.default_payment_method` → show "Card ending XXXX" |
| Transaction Reference | `invoice.payment_intent` (Stripe PI ID) |

---

### Section 5 — Email Footer
- "Thank you for subscribing to SoundBridge Live."
- Link: **Manage or cancel your subscription** → `[app URL]/billing`
- "For support, contact contact@soundbridge.live"
- `SoundBridge Live Ltd · Company No. 16854928 · 4 Whitlock House, 2 Cedar Grove, Wokingham, United Kingdom · soundbridge.live`

---

## Email HTML Template Requirements

Match the branded receipt PDF style used on mobile:

- **Logo** top-right, ~110px height (use CDN-hosted `logo-trans-lockup.png`)
- **"INVOICE"** in large bold headline top-left
- Invoice number and date beneath headline
- Large red amount (brand red `#C0392B`)
- Green **"PAID"** badge
- Customer details block
- Subscription details table
- Financial breakdown table with subtotal / VAT line / total
- Footer with company legal details, manage link, support email

---

## Invoice Number Implementation

Store a sequential counter in your DB:

```sql
CREATE TABLE invoice_sequences (
  id SERIAL PRIMARY KEY,
  prefix TEXT NOT NULL DEFAULT 'INV',
  last_number INTEGER NOT NULL DEFAULT 0
);

-- On each invoice:
UPDATE invoice_sequences SET last_number = last_number + 1 WHERE prefix = 'INV'
RETURNING LPAD(last_number::TEXT, 5, '0'); -- → '00001', '00042', etc.
```

Format as `INV-00001`. Store the generated number on the `subscriptions` or a new `invoices` table alongside `stripe_invoice_id`.

---

## Billing Address — Action Required

If you are not currently collecting a billing address at checkout, add it to the Stripe PaymentElement options:

```ts
const paymentElement = elements.create('payment', {
  fields: {
    billingDetails: {
      address: 'auto', // collects full address
    },
  },
});
```

Stripe will save it to the customer object automatically.

---

## Failed Payment Email Spec (`invoice.payment_failed`)

- **Subject:** `Action required: Payment failed for your SoundBridge Live subscription`
- **Body:**
  - Amount that failed
  - Reason (if available from `invoice.last_finalization_error`)
  - Next automatic retry date (`invoice.next_payment_attempt` Unix → formatted)
  - CTA button: **Update Payment Method** → `[app URL]/billing`
  - If no more retries: warn that subscription will be cancelled

---

## Cancellation Email Spec (`customer.subscription.deleted`)

- **Subject:** `Your SoundBridge Live subscription has been cancelled`
- **Body:**
  - Confirmation of cancellation
  - Access end date (`subscription.current_period_end` Unix → formatted)
  - CTA: **Resubscribe** → `[app URL]/upgrade`
  - Support contact

---

## Summary Checklist

- [ ] Sequential invoice numbers stored in DB
- [ ] `invoice.payment_succeeded` webhook handler → SendGrid email
- [ ] `invoice.payment_failed` webhook handler → alert email
- [ ] `customer.subscription.deleted` handler → cancellation email
- [ ] Billing address collected at checkout and saved to Stripe customer
- [ ] VAT line clearly states "not applicable" (until VAT-registered)
- [ ] Company No. 16854928 in every invoice footer
- [x] Registered address: 4 Whitlock House, 2 Cedar Grove, Wokingham, United Kingdom
- [ ] Invoice emails sent from `contact@soundbridge.live`
- [ ] "Manage subscription" link in every invoice email
