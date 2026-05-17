# Web Team: Verified Professional Badge — Implementation Guide

**Priority:** High
**Date:** 2026-03-31
**Launch target:** May 2026
**Raised by:** Mobile Team

---

## Overview

Identity verification is a **Premium-gated feature**, not a standalone paid product. Users on Premium or Unlimited get access to identity verification via Persona. On successful verification, they receive a "Verified Professional" badge on their profile.

The badge is **tied to an active Premium subscription**:
- Verified + Active Premium → badge displays
- Verified + Downgraded → badge hidden, verification record retained
- Verified + Re-subscribed → badge reappears instantly (no re-verification)
- Not verified + Premium → show "Get Verified" CTA (launching May 2026)
- Not verified + Free → show upgrade prompt

---

## 1. Badge Display Logic

**Two conditions must BOTH be true to show the badge:**

```
is_verified = true  (from service_provider_profiles or provider_verification_sessions)
AND
active Premium/Unlimited subscription (from RevenueCat or subscription_tier in profiles)
```

Never show the badge based on `is_verified` alone.

### SQL helper view (optional, for server-side badge resolution)

```sql
CREATE OR REPLACE VIEW verified_professional_status AS
SELECT
  p.id AS user_id,
  p.subscription_tier,
  COALESCE(sp.is_verified, false) AS is_verified,
  CASE
    WHEN COALESCE(sp.is_verified, false) = true
     AND p.subscription_tier IN ('premium', 'unlimited')
    THEN true
    ELSE false
  END AS badge_active
FROM profiles p
LEFT JOIN service_provider_profiles sp ON sp.user_id = p.id;

GRANT SELECT ON verified_professional_status TO authenticated;
```

---

## 2. Persona Integration (Backend)

### 2a. Required environment variables

```
PERSONA_API_KEY=<from Persona dashboard>
PERSONA_WEBHOOK_SECRET=<from Persona dashboard>
PERSONA_TEMPLATE_ID=<inquiry template ID>
```

### 2b. Start verification endpoint

```
POST /api/verification/start
Auth: Bearer token required
Body: { user_id: string }
```

Flow:
1. Check user has active Premium subscription (reject with 403 if not)
2. Check no existing approved session for this user (idempotent)
3. Create a Persona inquiry via their API using the template ID
4. Insert row into `provider_verification_sessions` with `status = 'pending'`, `session_id = <persona inquiry id>`
5. Return `{ inquiry_id, session_url }` — mobile/web opens the Persona hosted flow

### 2c. Persona webhook endpoint

```
POST /api/webhooks/persona
```

1. Verify `Persona-Signature` header against `PERSONA_WEBHOOK_SECRET`
2. On `inquiry.completed` with `status = 'approved'`:
   - Update `provider_verification_sessions.status = 'approved'`, `completed_at = NOW()`
   - Update `service_provider_profiles.is_verified = true`, `verified_at = NOW()`, `verification_provider = 'persona'`
3. On `inquiry.completed` with `status = 'declined'` or `status = 'needs_review'`:
   - Update `provider_verification_sessions.status` accordingly
   - Do NOT set `is_verified = true`
4. Return 200 immediately — process async if needed

---

## 3. DB Schema

Already covered in `WEB_TEAM_SERVICE_PROVIDER_DASHBOARD_FIXES.md` (Section 7). Summary:

```sql
-- provider_verification_sessions table (already specified)
-- service_provider_profiles additions:
ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_provider VARCHAR(50);
```

---

## 4. Web App Frontend Changes

### 4a. Service Provider Dashboard — Verification Section

Implement the same four-state UI as mobile:

| State | Condition | UI |
|---|---|---|
| Verified + Premium | `is_verified AND active_premium` | Green shield, "Verified Professional" confirmed message |
| Verified + Downgraded | `is_verified AND NOT active_premium` | Amber shield, "Badge Hidden" message, "Reactivate Premium" CTA → Upgrade page |
| Premium + Not verified | `NOT is_verified AND active_premium` | Purple shield, "Get Verified Professional" CTA → triggers Persona flow (May 2026) |
| Free + Not verified | `NOT is_verified AND NOT active_premium` | Purple shield, "Upgrade to Premium" CTA → Upgrade page |

### 4b. Profile Page — Badge Display

On any service provider's public profile, show the "Verified Professional" badge only when `badge_active = true` (both conditions met). Use amber/gold colour treatment, NOT a plain blue tick — the distinction from Meta/X paid ticks is intentional.

Suggested badge: shield-checkmark icon + "Verified Professional" label in amber/gold (`#F59E0B`).

### 4c. Search Results

Show the Verified Professional badge on service provider cards in search/discover results when `badge_active = true`.

---

## 5. Timeline

| Milestone | Date |
|---|---|
| DB schema deployed | ASAP |
| Persona account created + template configured | April 2026 |
| `/api/verification/start` endpoint live (stub OK) | April 2026 |
| Persona webhook endpoint live | April 2026 |
| Web app UI for all four states | April 2026 |
| Official launch positioning verification as Premium feature | May 2026 |

---

## Notes

- The mobile app currently shows the correct four-state UI with "launching May 2026" messaging for Premium users — no Persona SDK calls yet
- The Persona React Native SDK will be wired on mobile in April once the backend endpoints are live
- Badge name is **"Verified Professional"** — not "Verified" or a blue tick. This distinction matters for user trust
- Re-verification is never required after the first successful verification, even if the user cancels and re-subscribes
