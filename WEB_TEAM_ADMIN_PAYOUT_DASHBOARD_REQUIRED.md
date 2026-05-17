# Web Team: Admin Payout Dashboard — Critical Pre-Launch Requirement

## Priority: P0 — Creators Cannot Be Paid Without This

When a creator requests a payout, the backend only inserts a row into `payout_requests`. **No money moves automatically.** There is currently no admin interface to see these requests or action them. This means payout requests silently queue in the DB indefinitely — creators never get paid.

This must be live before public launch.

---

## How Payouts Currently Work (Confirmed by Web Team)

```
Creator taps "Request Payout"
  → POST /api/payouts/request
  → Inserts row into payout_requests table
  → NOTHING ELSE HAPPENS

Admin must manually call:
  → POST /api/admin/payouts/initiate
  → Wise API fires → money sent to creator
```

The admin endpoint exists. What's missing is the **UI to trigger it** and **visibility into pending requests**.

---

## Payout Routing Logic

Route based on the creator's bank account country:

| Region | Payment Rail | Endpoint |
|---|---|---|
| Africa (NG, GH, KE, ZA, etc.) | **Wise** | `POST /api/admin/payouts/initiate` → `payoutToCreator()` via Wise |
| UK, EU, US, Canada, Australia | **Stripe Connect** | `POST /api/payouts/create` → `stripe.transfers.create()` |

If a creator has a Stripe Connect account → use Stripe. Otherwise → use Wise.

---

## What to Build: Admin Payout Dashboard

### Page: `/admin/payouts`

#### 1. Pending Requests Table

Show all rows from `payout_requests` where `status = 'pending'`, with columns:

| Column | Source |
|---|---|
| Creator name | Join `profiles.display_name` on `creator_id` |
| Creator email | Join `profiles.email` or `auth.users.email` |
| Amount | `payout_requests.amount` + `currency` |
| Requested at | `payout_requests.created_at` |
| Bank account | Join `creator_bank_accounts` — show bank name, account number (masked), country |
| Payment rail | Derive from bank country: "Wise" or "Stripe Connect" |
| Action | **[Approve & Send]** button + **[Reject]** button |

#### 2. Approve & Send Flow

On click **[Approve & Send]**:

1. Show confirmation modal: "Send £X to [Creator Name] via [Wise/Stripe]?"
2. On confirm → call appropriate endpoint:
   - **Wise:** `POST /api/admin/payouts/initiate` with `{ payout_request_id }`
   - **Stripe:** `POST /api/payouts/create` with `{ creator_id, amount, currency }`
3. Update `payout_requests.status` → `'processing'` then `'completed'`
4. Deduct from creator's wallet balance
5. Send email to creator (see spec below)
6. Show success/failure in dashboard

#### 3. Payout History Tab

Show completed and failed payouts with:
- Date processed
- Amount
- Rail used (Wise / Stripe)
- Wise transfer ID or Stripe transfer ID
- Status

---

## Admin Notifications (Email)

When a new payout request is created, **email the admin** immediately:

- **To:** `contact@soundbridge.live`
- **Subject:** `New payout request — £X from [Creator Name]`
- **Body:** Creator name, amount, currency, bank country, link to `/admin/payouts`

This ensures no request goes unnoticed.

---

## Creator Notification on Payout Sent

When admin approves and money is sent, email the creator:

- **Subject:** `Your SoundBridge payout of £X has been sent`
- **Body:**
  - Amount sent
  - Destination bank (masked account number)
  - Estimated arrival: "2–5 business days" (Wise) / "1–3 business days" (Stripe)
  - Transaction reference (Wise transfer ID or Stripe transfer ID)
  - Support: `contact@soundbridge.live`

---

## Minimum Viable Version (Ship First)

If a full dashboard takes time, implement these two things immediately:

1. **Admin email alert** on every new `payout_requests` insert (Supabase webhook → SendGrid)
2. **Simple admin page** — a table of pending requests with an Approve button that calls `POST /api/admin/payouts/initiate`

This unblocks creator payouts without a polished UI.

---

## Security Requirements

- `/admin/payouts` must be protected by admin role check (not accessible to regular users)
- `POST /api/admin/payouts/initiate` must verify admin JWT — do not expose to creators
- Log every payout action with admin user ID, timestamp, and outcome

---

## Summary Checklist

- [ ] Admin email alert when new payout request is created
- [ ] `/admin/payouts` page showing pending requests
- [ ] Approve & Send button → routes to Wise (Africa) or Stripe Connect (UK/EU/US/CA)
- [ ] Reject button with reason field
- [ ] Creator email notification when payout is sent (with transfer reference)
- [ ] `payout_requests.status` updated correctly through lifecycle
- [ ] Creator wallet balance deducted on payout initiation
- [ ] Payout history tab
- [ ] Admin role gate on all admin endpoints and pages
