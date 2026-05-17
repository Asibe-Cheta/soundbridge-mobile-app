# WEB_TEAM_MOBILE_UPDATES_2026_03_01.md

**Date:** 2026-03-01
**Priority:** HIGH
**For:** Backend / Web team

---

## Overview

Three mobile-side changes shipped in iOS build #212. Each one has a backend dependency that must be addressed for the feature to work end-to-end.

---

## 1. Poster Projects — `GET /api/opportunity-projects?role=poster`

### What the mobile now does

The "My Opportunities → Planned" tab now calls:

```
GET /api/opportunity-projects?role=poster
Authorization: Bearer {token}
```

This loads projects where the **authenticated user is the poster** (`poster_user_id = auth.uid()`). Previously, `?role=creator` was the only role used. The mobile now calls both — `creator` for the "My Work" tab and `poster` for the "Planned" tab.

For projects in `payment_pending` status, the Planned tab shows a yellow **"Complete Payment"** card that navigates to the project screen where the poster can retry Stripe payment.

### Backend requirement

Ensure `GET /api/opportunity-projects` correctly filters by `role=poster`:

```typescript
// Pseudo-code
const role = req.query.role; // 'poster' | 'creator'
const filter = role === 'poster'
  ? { poster_user_id: auth.uid() }
  : { creator_user_id: auth.uid() };

const projects = await db.opportunityProjects
  .where(filter)
  .orderBy('created_at', 'desc');
```

**Also required:** When returning a project to the **poster** and `status === 'payment_pending'`, include `stripe_client_secret` in the response so the mobile can present the Stripe payment sheet directly without an extra round-trip:

```json
{
  "id": "...",
  "status": "payment_pending",
  "stripe_payment_intent_id": "pi_xxx",
  "stripe_client_secret": "pi_xxx_secret_yyy",
  ...
}
```

Only expose `stripe_client_secret` to the **poster**, never to the creator.

**See also:** `WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md` — the retry-payment endpoint (`POST /api/opportunity-projects/:id/retry-payment`) must also be built to handle the case where the stored PaymentIntent has expired.

---

## 2. Bank Name Suggestions — `GET /api/banks?country={cc}&currency={cur}`

### What the mobile now does

When a user opens the "Add Withdrawal Method" form, the mobile calls:

```
GET /api/banks?country=GB&currency=GBP
Authorization: Bearer {token}
```

If the backend returns a non-empty `{ banks: [...] }` array, the "Bank Name" field shows a searchable picker modal. If the array is empty, the mobile now falls back to a **built-in list** of major banks per country (GB, NG, GH, IN, US), so the picker always appears regardless of the backend response.

### Current situation

The endpoint is returning `{ banks: [] }` for GB (and likely all IBAN countries), which is why the picker was not showing. The mobile fallback list patches this for users, but the **backend should still be fixed** so:
- Bank data stays current (new banks, name changes)
- Non-hardcoded countries (AU, CA, SG, etc.) also get a picker

### Backend requirement

The `APILAYER_API_KEY` (`nHfPWK9vOJP6HN0es1KKEeFC0vIfnqAF`) has been added to Vercel environment variables. Ensure the `/api/banks` route is actually using it.

**Expected APILayer call for GB:**

```typescript
const response = await fetch(
  `https://api.apilayer.com/bank_data/banks_by_country?country_code=GB`,
  { headers: { apikey: process.env.APILAYER_API_KEY } }
);
const data = await response.json();
// data.data = [{ name: 'Barclays', bic: 'BUKBGB22', ... }, ...]
```

**Expected response shape the mobile consumes:**

```json
{
  "banks": [
    { "name": "Barclays", "code": "BUKBGB22" },
    { "name": "Lloyds Bank", "code": "LOYDGB21" },
    ...
  ]
}
```

Map `bic` → `code` when constructing the response. Cache per country for 7 days (Redis key: `banks:{country}:{currency}`).

**Countries that should return banks from APILayer:** All IBAN/SEPA countries (GB, DE, FR, IT, ES, NL, etc.) and others supported by the API.

**Countries served by Wise account-requirements:** NG, GH, KE, IN, BR, etc. — the Wise source already returns bank lists for these; ensure those are also returned here.

---

## 3. Opportunity Posting — Remove Server-Side Limits for Free Accounts

### What the mobile now does

The mobile has removed all client-side enforcement of the "2 active opportunities" limit for free accounts:
- No tier check before calling `POST /api/opportunities`
- No "Limit Reached" alert
- No "Free accounts can have 2 active opportunities" notice on the form

**Opportunity and gig posting is free and unlimited for all users.**

### Backend requirement

If the backend also enforces a per-tier opportunity count limit, **remove it**. The check likely looks like:

```typescript
// REMOVE THIS:
const activeCount = await db.opportunityPosts
  .where({ user_id: auth.uid(), is_active: true })
  .count();

const tierLimit = getTierLimit(user.subscription_tier); // free=2, premium=10
if (activeCount >= tierLimit) {
  return res.status(403).json({ error: 'Opportunity limit reached for your plan' });
}
```

Replace with no limit — any authenticated user can create as many opportunities as they need. There is no paywall on posting.

**Note:** Upload limits, storage quotas, and paid content features remain tier-gated as before. Only opportunity/gig posting is being made free.

---

## Summary Table

| Feature | Mobile status | Backend action required |
|---------|--------------|------------------------|
| Poster project list (`?role=poster`) | ✅ Implemented | `retry-payment` ✅ fixed; `role=poster` filter still pending |
| Bank picker for GB/IBAN countries | ✅ Fallback in place | Fix `/api/banks` to return banks from APILayer (key already in Vercel) |
| Unlimited opportunity posting | ✅ Limit removed | Remove server-side tier limit on `POST /api/opportunities` |

---

## 4. ~~REGRESSION: `GET /api/opportunities/mine`~~ — ✅ FIXED (2026-03-01)

**Resolved by web team:** The 500 was caused by the query referencing `gig_type` before the migration ran. Fixed by selecting only base columns — endpoint now returns 200 regardless of migration state. Will return full planned opportunity list once the urgent-gigs schema migration runs. No mobile release required.

---

## 5. MISSING: `GET /api/connections/requests/pending`

**Observed:** 2026-03-01 (returning 404)

The Network/Connect screen calls:

```
GET /api/connections/requests/pending?page=1&limit=20
Authorization: Bearer {token}
```

This endpoint does not exist — 404. The mobile handles the failure gracefully (falls back to empty list via cache), but users never see incoming connection requests.

**Expected response:**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "sender": {
          "id": "uuid",
          "display_name": "James Okafor",
          "avatar_url": "...",
          "role": "creator"
        },
        "message": "Optional message from sender",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

**Related endpoints also needed (mobile is already wired up):**

- `POST /api/connections/requests/:id/accept` — accept a pending request
- `POST /api/connections/requests/:id/decline` — decline a pending request

These likely use the existing `connections` or `collaboration_requests` table. Check if that table already exists and wire up the API routes.

---

## Updated Summary Table

| Feature | Mobile status | Backend action required |
|---------|--------------|------------------------|
| Poster project list (`?role=poster`) | ✅ Implemented | `retry-payment` ✅ fixed; `role=poster` filter still pending |
| Bank picker for GB/IBAN countries | ✅ Fallback in place | Fix `/api/banks` to return banks from APILayer (key already in Vercel) |
| Unlimited opportunity posting | ✅ Limit removed | Remove server-side tier limit on `POST /api/opportunities` |
| `GET /api/opportunities/mine` | ✅ Working | ✅ Fixed — was 500, now returns 200; populates after migration |
| `GET /api/connections/requests/pending` | ✅ Mobile wired | **MISSING** — 404; build endpoint + accept/decline routes |

---

## Related Documents

- `WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md` — retry-payment endpoint spec
- `WEB_TEAM_STRIPE_INCOMPLETE_PAYMENTS_CLEANUP.md` — cleanup of duplicate PaymentIntents
- `WEB_TEAM_BANK_LIST_API_REQUIRED.md` — full bank API spec with Redis caching
- `WEB_TEAM_OPPORTUNITIES_BACKEND_REQUIREMENTS.md` — full opportunities API spec

---

*Document created: 2026-03-01 | Updated: 2026-03-01 (sections 4–5 added)*
