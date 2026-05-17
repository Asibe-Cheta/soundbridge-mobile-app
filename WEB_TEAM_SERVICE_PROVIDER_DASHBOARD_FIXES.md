# Web Team: Service Provider Dashboard — Backend Fixes Required

**Priority:** High
**Date:** 2026-03-30 (updated 2026-04-09)
**Raised by:** Mobile Team
**Context:** The mobile Service Provider Dashboard has been audited end-to-end. Several backend API endpoints and database columns do not match what the mobile client sends or expects. This doc covers every fix required, including SQL to run and API contract changes.

---

## 1. Service Offerings — ✅ RESOLVED (2026-04-09)

**Confirmed actual DB schema:** `service_offerings` uses `rate_amount` and `rate_unit` (not `rate`/`unit` as originally assumed). Mobile types have been updated to match. The web team's view returns both original and alias names for cross-client compatibility — no further action needed.

Confirmed columns: `id, provider_id, title, description, category, rate_amount, rate_currency, rate_unit, is_active, created_at, updated_at`

---

## 2. Portfolio Items — Field Name Mismatch

### Problem
The mobile client sends `sort_order` in `POST /api/service-providers/:userId/portfolio`.

The `ServicePortfolioItem` type and `service_portfolio_items` DB table both use `sort_order` correctly. However an earlier version of the mobile type used `display_order` — this has now been fixed on mobile. Confirm the API accepts `sort_order` and ignores/does not reject `display_order` for backwards compatibility.

### Required API Fix
Accept `sort_order` in POST body. Map to `service_portfolio_items.sort_order`.

### SQL
```sql
-- Confirm sort_order column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'service_portfolio_items' AND column_name = 'sort_order';
```

---

## 3. Availability — Field Name Mismatch (CRITICAL)

### Problem
The mobile client sends `start_time`, `end_time`, and `recurrence` in `POST /api/service-providers/:userId/availability`.

The database table `service_provider_availability` uses `start_at`, `end_at`, and `recurrence_rule`.

### Required API Fix

In the availability create handler, map:

```
request.body.start_time  →  service_provider_availability.start_at
request.body.end_time    →  service_provider_availability.end_at
request.body.recurrence  →  service_provider_availability.recurrence_rule
```

For `recurrence_rule`, accept the simple values the mobile client sends (`'none'`, `'daily'`, `'weekly'`, `'monthly'`) and store them as-is. Do NOT require RRULE format from mobile — the API layer can transform to RRULE internally if needed by the calendar system.

### Required Response Fix

When returning availability slots, include **both** the DB column name and the alias the mobile client reads:

```json
{
  "id": "...",
  "start_at": "2026-04-01T10:00:00Z",
  "start_time": "2026-04-01T10:00:00Z",
  "end_at": "2026-04-01T12:00:00Z",
  "end_time": "2026-04-01T12:00:00Z",
  "recurrence_rule": "weekly",
  "is_bookable": true,
  "timezone": "Europe/London"
}
```

### SQL
```sql
-- Confirm columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'service_provider_availability'
ORDER BY ordinal_position;

-- Expected: id, provider_id, start_at, end_at, recurrence_rule, timezone, is_bookable, created_at, updated_at

-- Add timezone default if missing
ALTER TABLE service_provider_availability
  ALTER COLUMN timezone SET DEFAULT 'UTC';
```

---

## 4. Bookings — Missing Joined Relations (HIGH)

### Problem
`GET /api/service-providers/:userId/bookings` returns raw `service_bookings` rows. The mobile dashboard needs two joined objects:

- `booker` — the profile of the person who made the booking (from `profiles` table)
- `offering` — the service offering that was booked (from `service_offerings` table)

Without these, the dashboard always shows "Client" and "Custom service" as fallbacks.

### Required API Fix

Update the bookings response to join and embed:

```json
{
  "id": "...",
  "status": "pending",
  "currency": "GBP",
  "price_total": 150.00,
  "scheduled_start": "2026-04-05T14:00:00Z",
  "scheduled_end": "2026-04-05T16:00:00Z",
  "booking_notes": "...",
  "booker": {
    "id": "...",
    "username": "djjuntao",
    "display_name": "Dj Juntao",
    "avatar_url": "https://..."
  },
  "offering": {
    "id": "...",
    "title": "Full mix & master",
    "rate": 150.00,
    "unit": "per_track"
  }
}
```

### SQL (Supabase RPC or view)
```sql
-- Option A: Create a view for populated bookings
CREATE OR REPLACE VIEW service_bookings_populated AS
SELECT
  sb.*,
  json_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url
  ) AS booker,
  json_build_object(
    'id', so.id,
    'title', so.title,
    'rate', so.rate,
    'rate_amount', so.rate,
    'unit', so.unit,
    'rate_unit', so.unit,
    'rate_currency', so.rate_currency
  ) AS offering
FROM service_bookings sb
LEFT JOIN profiles p ON p.id = sb.booker_id
LEFT JOIN service_offerings so ON so.id = sb.offering_id;

-- Grant access
GRANT SELECT ON service_bookings_populated TO authenticated;
```

---

## 5. Reviews — Missing Reviewer Display Name (MEDIUM)

### Problem
`GET /api/service-providers/:userId/reviews` returns only `reviewer_id`. The dashboard shows `User <first-8-chars-of-id>` as a fallback because no display name is joined.

### Required API Fix

Join the reviewer's profile and include `reviewer_display_name` and `reviewer_avatar_url` in each review response:

```json
{
  "id": "...",
  "rating": 5,
  "comment": "Excellent work!",
  "reviewer_id": "...",
  "reviewer_display_name": "Dj Juntao",
  "reviewer_avatar_url": "https://...",
  "created_at": "2026-03-28T10:00:00Z"
}
```

### SQL
```sql
-- Add reviewer info to reviews query
CREATE OR REPLACE VIEW service_reviews_populated AS
SELECT
  sr.*,
  p.display_name AS reviewer_display_name,
  p.avatar_url AS reviewer_avatar_url,
  p.username AS reviewer_username
FROM service_reviews sr
LEFT JOIN profiles p ON p.id = sr.reviewer_id;

GRANT SELECT ON service_reviews_populated TO authenticated;
```

---

## 6. Earnings — Replace Mock Data with Real Wallet Data (HIGH)

### Problem
`GET /api/revenue` or equivalent currently returns **mock random data** (`Math.random()`). Every page refresh shows different numbers. This is not production-ready.

### Required Fix

Connect the earnings endpoint to real data. Based on the existing wallet architecture:

```sql
-- Real earnings query
SELECT
  w.user_id,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'credit' AND wt.status = 'completed'), 0) AS total_earnings,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'credit' AND wt.status = 'pending'), 0) AS pending_earnings,
  w.currency
FROM wallets w
LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
WHERE w.user_id = $1
GROUP BY w.user_id, w.currency;
```

Return format expected by mobile:
```json
{
  "user_id": "...",
  "total_earnings": 450.00,
  "pending_earnings": 75.00,
  "last_payout": 200.00,
  "last_payout_date": "2026-03-15T00:00:00Z",
  "next_payout_date": "2026-04-01T00:00:00Z",
  "currency": "GBP"
}
```

---

## 7. Identity Verification — New Table Required (for upcoming Persona integration)

### Context
SoundBridge will be integrating **Persona** (identity verification provider) as a paid feature. Users will pay a one-time fee (£9.99) to get verified. The verification badge will unlock higher booking visibility and trust signals.

This table must be created **now** so the mobile team can start building the flow.

### SQL — Create verification sessions table

```sql
CREATE TABLE IF NOT EXISTS provider_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'persona',       -- 'persona' | 'smile_identity'
  session_id VARCHAR(255),                                -- Persona inquiry ID
  status VARCHAR(50) NOT NULL DEFAULT 'pending',          -- 'pending' | 'approved' | 'declined' | 'needs_review'
  payment_intent_id VARCHAR(255),                         -- Stripe payment intent for the £9.99 fee
  payment_status VARCHAR(50) DEFAULT 'unpaid',            -- 'unpaid' | 'paid'
  amount_paid INTEGER DEFAULT 0,                          -- in pence/cents
  currency VARCHAR(10) DEFAULT 'GBP',
  verification_data JSONB,                                -- raw webhook payload from Persona (sanitised)
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_provider_verification_sessions_user_id
  ON provider_verification_sessions(user_id);

-- RLS
ALTER TABLE provider_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own verification sessions
CREATE POLICY "Users can view own verification sessions"
  ON provider_verification_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (backend) can insert/update
CREATE POLICY "Service role can manage verification sessions"
  ON provider_verification_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

### SQL — Add verification fields to service_provider_profiles if not already present

```sql
ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50);
```

### Required Webhook Endpoint

Create `POST /api/webhooks/persona` to receive Persona verification results:

1. Verify Persona webhook signature
2. On `inquiry.completed` with `status = approved`:
   - Update `provider_verification_sessions.status = 'approved'`
   - Update `service_provider_profiles.is_verified = true`, `verified_at = NOW()`
3. On `inquiry.completed` with `status = declined`:
   - Update `provider_verification_sessions.status = 'declined'`
   - Do NOT set `is_verified = true`
4. No manual review queue — Persona handles everything automatically

---

## 8. Summary Checklist

| Fix | Table/Endpoint | Type | Priority | Status |
|---|---|---|---|---|
| `service_offerings` uses `rate_amount`/`rate_unit` (confirmed) | `service_offerings` | Schema confirmed | **Critical** | ✅ Done |
| Include both field names in offerings response (via view) | `GET /offerings` | Response shape | **Critical** | ✅ Done |
| Accept `sort_order` in portfolio | `POST /portfolio` | API mapping | Medium | ✅ Done |
| Map `start_time`→`start_at`, `end_time`→`end_at` | `POST /availability` | API mapping | **Critical** | ✅ Done |
| Add timezone default `UTC` | `service_provider_availability` | SQL | Medium | ✅ Done |
| Join `booker` + `offering` in bookings response | `GET /bookings` | SQL + Response | High | ✅ Done (view) |
| `service_bookings` uses `service_offering_id` (confirmed) | `service_bookings` | Schema confirmed | High | ✅ Done |
| Join `reviewer_display_name` in reviews response | `GET /reviews` | SQL + Response | Medium | ✅ Done (view) |
| Add `is_verified`, `verified_at` to provider profiles | `service_provider_profiles` | SQL | High | ✅ Done |
| Replace mock earnings with real wallet data | `GET /revenue` | API logic | High | ⏳ Pending |
| Create `provider_verification_sessions` table | New table | SQL | High | ⏳ Pending confirm |
| Create `POST /api/webhooks/persona` endpoint | New endpoint | API | High | ⏳ Pending |

---

## Notes for Web Team

- All SQL above is safe to run on production — uses `ADD COLUMN IF NOT EXISTS` and `CREATE IF NOT EXISTS`
- The Persona webhook endpoint should be added now even as a stub — the mobile team will be wiring up the flow immediately
- The `provider_verification_sessions` table is the source of truth for verification state — do NOT rely on `service_provider_profiles.is_verified` alone without a corresponding session row
- Persona webhook docs: https://docs.withpersona.com/docs/webhooks
