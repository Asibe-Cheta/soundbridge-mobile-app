# WEB_TEAM_GIG_PAYMENT_ADMIN_MONITORING.md

**Date:** 2026-02-28
**Priority:** HIGH
**For:** Backend + web team

---

## Context

There is currently no admin tooling for gig payment monitoring anywhere in the platform — not in the mobile app, not in the web app admin area (which only covers content moderation and verification). This means:

- No one can see which gigs are stuck in escrow
- No one can detect when a Wise transfer fails silently
- Platform fee revenue from gigs is invisible to the business
- Disputes cannot be tracked or escalated efficiently

This document specifies the minimum admin monitoring system needed for gig payments.

---

## Admin Dashboard — Gig Payments

Build a new section in the existing web admin panel: **Payments → Gig Payments**

### 1. Summary Cards (top of page)

| Card | Metric | Source |
|------|--------|--------|
| Escrowed today | SUM of escrowed gig amounts (awaiting completion) | `opportunity_projects` WHERE `payment_status = 'escrowed'` |
| Released today | SUM of amounts released to creator wallets | `wallet_transactions` WHERE `transaction_type = 'gig_payment'` AND `created_at >= today` |
| Platform fees (MTD) | 12% × all released gig amounts this month | Derived from `wallet_transactions` |
| Pending Wise transfers | COUNT of `wise_payouts` WHERE `status = 'processing'` | `wise_payouts` table |
| Failed payouts | COUNT of `wise_payouts` WHERE `status = 'failed'` | `wise_payouts` table |
| Open disputes | COUNT of `opportunity_projects` WHERE `payment_status = 'disputed'` | `opportunity_projects` table |

---

### 2. Gig Payments Table

Main data table with the following columns:

| Column | Source | Notes |
|--------|--------|-------|
| Gig ID | `opportunity_projects.id` | Clickable → gig detail view |
| Gig title | `opportunity_projects.title` | |
| Requester | `profiles.username` (requester_id) | |
| Creator | `profiles.username` (creator_id) | |
| Creator country | `profiles.country_code` | Show flag + code |
| Payout provider | Derived | Stripe Connect or Wise based on country |
| Gross amount | `opportunity_projects.budget` | In USD |
| Platform fee | 12% of gross | Calculated |
| Creator earnings | Gross − fee | |
| Payment status | `opportunity_projects.payment_status` | Colour-coded badge |
| Escrow date | `opportunity_projects.escrowed_at` | |
| Completion date | `opportunity_projects.completed_at` | |
| Wallet credited | `wallet_transactions.created_at` WHERE `reference_id = gig.id` | |
| Wise status | `wise_payouts.status` | If withdrawal initiated |

**Colour coding for payment_status:**

| Status | Colour |
|--------|--------|
| `pending` | Grey |
| `escrowed` | Amber |
| `released` | Green |
| `disputed` | Red |
| `refunded` | Purple |

---

### 3. Filters

Provide filter controls for:

- **Date range** — date picker (default: last 30 days)
- **Payment status** — multi-select: all / escrowed / released / disputed / refunded
- **Payout provider** — All / Stripe Connect / Wise
- **Creator country** — dropdown of all countries in the data
- **Minimum amount** — text input (USD)
- **Search** — by gig title, creator username, or requester username

---

### 4. Gig Detail View

When admin clicks a gig row, show a detail panel:

```
Gig: [title]
Status: [badge]

PARTIES
Requester: [name] ([email])
Creator:   [name] ([email]) — [country flag] [country]

PAYMENT TIMELINE
[ ] Stripe PaymentIntent created    [timestamp]
[ ] Funds escrowed                  [timestamp]
[ ] Gig completed                   [timestamp]
[ ] Wallet credited                 [timestamp]   ← $X.XX
[ ] Creator withdrew                [timestamp]   ← If applicable
[ ] Wise transfer created           [timestamp]   ← wise_transfer_id: [id]
[ ] Wise transfer completed         [timestamp]

AMOUNTS
Gross:          $X.XX USD
Platform fee:   $X.XX USD (12%)
Creator net:    $X.XX USD

STRIPE
PaymentIntent ID:  pi_xxxxxx  [link to Stripe dashboard]
Charge ID:         ch_xxxxxx
Receipt URL:       [link]

WISE (if applicable)
Transfer ID:        [wise_transfer_id]
Status:             [processing / completed / failed]
Target currency:    NGN / GHS / KES / etc.
Target amount:      ₦X,XXX.XX
Exchange rate:      1 USD = X.XX NGN
Wise fee:           $X.XX

DISPUTES (if any)
[dispute details and timeline]

ADMIN ACTIONS
[Release escrow manually]   — only for stuck escrowed gigs
[Refund requester]          — marks refunded + triggers Stripe refund
[View in Stripe →]
[View Wise transfer →]
```

---

### 5. Stuck Escrow Alert

Flag gigs that have been in `escrowed` status for more than **7 days** without progressing to `released` or `disputed`. Show these prominently:

- Red banner at the top of the Gig Payments page: "⚠️ 3 gigs have been escrowed for more than 7 days"
- Separate "Stuck Escrow" tab/filter for quick access

---

### 6. Failed Wise Transfer Alert

When a Wise webhook delivers a `transfer_cancelled` or `transfer_failed` event, the admin panel should:

1. Mark the `wise_payouts` record as `failed`
2. Create an admin alert (visible in the Gig Payments dashboard as a red card)
3. The alert should show: creator name, country, amount, Wise error reason
4. Admin can either: retry the transfer, or manually credit the wallet (if wallet was already debited)

---

### 7. Platform Revenue Report

Add a "Revenue" sub-tab under Gig Payments:

| Period | Gig count | Gross processed | Platform fees | Creator payouts |
|--------|-----------|-----------------|---------------|-----------------|
| Today  | X | $X.XX | $X.XX | $X.XX |
| This week | X | $X.XX | $X.XX | $X.XX |
| This month | X | $X.XX | $X.XX | $X.XX |
| All time | X | $X.XX | $X.XX | $X.XX |

Breakdown by country (top 10):

| Country | Gig count | Gross | Provider |
|---------|-----------|-------|----------|
| Nigeria | X | $X.XX | Wise |
| United Kingdom | X | $X.XX | Stripe Connect |
| ... | | | |

---

## Backend API Endpoints Required

The admin panel will need these endpoints (all protected by admin auth middleware):

```
GET  /admin/gig-payments
     Query params: status, provider, country, date_from, date_to, min_amount, search, page, limit
     Response: { gigs: [...], total: N, summary: { escrowed_total, released_today, ... } }

GET  /admin/gig-payments/:id
     Response: full gig detail with payment timeline, Stripe + Wise data

GET  /admin/gig-payments/revenue
     Query params: period (today|week|month|all), group_by (country|provider)
     Response: revenue summary table

POST /admin/gig-payments/:id/release-escrow
     Body: { reason: string }
     Action: manually release a stuck escrow — use with caution, requires two-factor admin auth

POST /admin/gig-payments/:id/refund
     Body: { reason: string }
     Action: Stripe refund + update payment_status to 'refunded' + debit creator wallet if already credited

GET  /admin/gig-payments/alerts
     Response: { stuck_escrow: [...], failed_wise: [...], open_disputes: [...] }
```

---

## Database Queries

### Stuck escrow query
```sql
SELECT op.*, p_req.username as requester_name, p_cr.username as creator_name
FROM opportunity_projects op
JOIN profiles p_req ON p_req.id = op.requester_id
JOIN profiles p_cr  ON p_cr.id  = op.creator_id
WHERE op.payment_status = 'escrowed'
  AND op.escrowed_at < NOW() - INTERVAL '7 days'
ORDER BY op.escrowed_at ASC;
```

### Platform fee MTD
```sql
SELECT
  COUNT(*) as gig_count,
  SUM(amount) as creator_earnings_total,
  SUM(amount * 0.12 / 0.88) as platform_fees_total   -- reverse-calculate gross
FROM wallet_transactions
WHERE transaction_type = 'gig_payment'
  AND status = 'completed'
  AND created_at >= DATE_TRUNC('month', NOW());
```

### Revenue by country
```sql
SELECT
  p.country_code,
  COUNT(wt.id) as gig_count,
  SUM(wt.amount) as creator_earnings,
  SUM(wt.amount * 0.12 / 0.88) as platform_fees
FROM wallet_transactions wt
JOIN profiles p ON p.id = wt.user_id
WHERE wt.transaction_type = 'gig_payment'
  AND wt.status = 'completed'
GROUP BY p.country_code
ORDER BY creator_earnings DESC
LIMIT 10;
```

---

## Mobile — No Changes Required

The mobile app has no admin functionality and this is intentional. Admin tooling is web-only. The mobile wallet screen and `TransactionHistoryScreen` (which already shows `gig_payment` transactions as of this session) are sufficient for creator-facing transparency.

---

## Related Documents

- `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md` — wallet credit logic (data source for this dashboard)
- `WEB_TEAM_GIG_PAYMENT_EMAIL_RECEIPT.md` — email receipts spec
- `WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md` — notification infrastructure
- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Stripe + Wise integration details

---

*Document created: 2026-02-28*
