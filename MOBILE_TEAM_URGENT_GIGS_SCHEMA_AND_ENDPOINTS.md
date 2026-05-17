# Urgent Gigs — Schema Changes & Endpoints (Mobile Team Reference)

**Date:** January 2026  
**Status:** Backend implemented per `WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md`  
**For:** Mobile team building the urgent gigs flow

This document is the single reference for **schema changes**, **API endpoints**, **push payloads**, and **cron behaviour**. All endpoints use the same auth as the rest of the app (Bearer / session); responses use `success` and `data`/`error` where specified below.

---

## 1. Naming: Backend vs doc

| Doc / product term | Backend (DB & API) |
|--------------------|--------------------|
| “opportunities”    | **`opportunity_posts`** (table; `id` = gig id when `gig_type = 'urgent'`) |
| “requester”        | `opportunity_posts.user_id` |
| “provider”         | `selected_provider_id` or `gig_responses.provider_id` |
| “status” (gig)     | **`urgent_status`** on `opportunity_posts`: `searching` \| `confirmed` \| `completed` \| `cancelled` |

Mobile can treat “gig” and “opportunity” as the same entity; IDs are `opportunity_posts.id`.

---

## 2. Schema summary

### 2.1 Tables created or ensured by urgent gigs migration

Migration: **`supabase/migrations/20260228000000_urgent_gigs_schema.sql`**.  
It can run standalone (creates prerequisite tables if missing). Requires **`profiles`** to exist.

| Table | Purpose |
|-------|--------|
| **user_availability** | Per-user: available for urgent gigs, location (current + general area), radius, rates, schedule, DND, max notifications/day. |
| **gig_responses** | One row per (gig, provider): status `pending` \| `accepted` \| `declined` \| `expired`, message, response time. |
| **gig_ratings** | Post-gig ratings: project_id, rater_id, ratee_id, overall + sub-ratings, review_text. Visible only after **both** parties have rated (or you see your own). |
| **notification_rate_limits** | Audit/rate-limit: user_id, notification_type, sent_at, gig_id, action. |
| **disputes** | project_id, raised_by, against, reason, description, evidence_urls, status, counter_response, counter_evidence_urls, resolution fields. |
| **profile_skills** | user_id, skill (for matching). Created if missing. |
| **user_push_tokens** | user_id, push_token, platform, device_id, active, last_used_at. Created if missing (shared with events). |
| **notification_history** | user_id, event_id, type, title, body, data, sent_at. Created if missing (shared with events). |

### 2.2 Columns added to existing tables

**opportunity_posts** (urgent gig = row with `gig_type = 'urgent'`):

| Column | Type | Notes |
|--------|------|--------|
| gig_type | text | `'urgent'` \| `'planned'` |
| skill_required | text | e.g. `'trumpeter'` |
| genre | text[] | e.g. `['gospel']` |
| location_radius_km | integer | Default 20 |
| duration_hours | decimal | e.g. 2 |
| payment_status | text | `pending` \| `escrowed` \| `released` \| `refunded` |
| selected_provider_id | uuid | Set when requester selects a provider |
| urgent_status | text | `searching` \| `confirmed` \| `completed` \| `cancelled` |
| stripe_payment_intent_id | text | For hold/capture |
| payment_amount | decimal | e.g. 120.00 |
| payment_currency | text | Default GBP |
| date_needed | timestamptz | When gig is needed |
| location_address | text | Human-readable address |

Existing columns used for urgent gigs: `location_lat`, `location_lng`, `expires_at` (e.g. date_needed + 4h), `user_id`, `title`, `description`, etc.

**profiles** (if missing): **genres** (text[]) added for matching.

**opportunity_projects**: **interest_id** is now nullable (urgent gig projects are created without an `opportunity_interest`).

### 2.3 user_availability (full shape for PATCH/GET)

```ts
{
  id: string;
  user_id: string;
  available_for_urgent_gigs: boolean;   // default false
  current_lat: number | null;
  current_lng: number | null;
  general_area: string | null;
  general_area_lat: number | null;
  general_area_lng: number | null;
  max_radius_km: number;                 // default 20
  hourly_rate: number | null;
  per_gig_rate: number | null;
  rate_negotiable: boolean;
  availability_schedule: {               // JSONB, e.g. by day
    monday?: { available: boolean; hours?: string };  // "18:00-23:00" | "all_day"
    // ... tuesday .. sunday
  } | null;
  dnd_start: string | null;              // TIME e.g. "23:00:00"
  dnd_end: string | null;                // TIME e.g. "08:00:00"
  max_notifications_per_day: number;     // default 5
  last_location_update: string | null;   // timestamptz
  created_at: string;
  updated_at: string;
}
```

### 2.4 gig_responses (for GET responses)

```ts
{
  id: string;
  gig_id: string;
  provider_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  response_time_seconds: number | null;
  message: string | null;
  notified_at: string;
  responded_at: string | null;
  created_at: string;
  // API may attach provider profile, distance_km, hourly_rate, per_gig_rate
}
```

### 2.5 gig_ratings (for POST / GET)

```ts
{
  id: string;
  project_id: string;
  rater_id: string;
  ratee_id: string;
  overall_rating: number;           // 1–5 required
  professionalism_rating: number;  // 1–5 required
  punctuality_rating: number;      // 1–5 required
  quality_rating: number | null;   // 1–5 optional
  payment_promptness_rating: number | null;
  review_text: string | null;      // max 1000 chars
  created_at: string;
}
```

### 2.6 disputes (for POST / GET)

```ts
{
  id: string;
  project_id: string;
  raised_by: string;
  against: string;
  reason: string;
  description: string;
  evidence_urls: string[] | null;
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'resolved_split';
  counter_response: string | null;
  counter_evidence_urls: string[] | null;
  resolution_notes: string | null;
  split_percent: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 3. API endpoints (all auth required unless marked “Public”)

Base URL: same as existing app (e.g. `https://your-api.com` or relative `/api/`).  
Headers: same as rest of app (e.g. `Authorization: Bearer <token>` or session).

---

### 3.1 User availability

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user/availability` | Yes | Current user’s `user_availability`; creates default row if none. |
| PATCH | `/api/user/availability` | Yes | Update allowed fields (partial body). |
| POST | `/api/user/availability/location` | Yes | Body: `{ "lat": number, "lng": number }`. Updates current_lat/lng and last_location_update. |

**GET response:** `{ "success": true, "data": <UserAvailability> }`  
**PATCH response:** updated record (same shape).  
**POST location response:** `{ "success": true }`

---

### 3.2 Urgent gig lifecycle

| Method | Path | Auth | Who | Description |
|--------|------|------|-----|-------------|
| POST | `/api/gigs/urgent` | Yes | Requester | Create gig + Stripe PaymentIntent (hold). Matching runs after payment (webhook). |
| GET | `/api/gigs/urgent/:id` | Yes | Requester or provider in responses | Full gig + requester profile; includes `distance_km` when viewer is provider. |
| GET | `/api/gigs/urgent/:id/responses` | Yes | Requester only | List of gig_responses with provider profiles, distance, rates. |
| POST | `/api/gigs/:id/respond` | Yes | Provider (notified for this gig) | Accept or decline. |
| POST | `/api/gigs/:id/select` | Yes | Requester only | Select one response; creates project, expires others, notifies. |
| POST | `/api/gigs/:id/complete` | Yes | Either party | Mark completed; capture payment, transfer to provider, wallet credit, notify. |

**POST /api/gigs/urgent**  
- Body (required): `skill_required`, `date_needed`, `payment_amount` (positive), `location_lat`, `location_lng`.  
- Optional: `genre[]`, `duration_hours`, `location_address`, `location_radius_km`, `payment_currency`, `description`.  
- Response:  
  `{ "success": true, "data": { "gig_id": "uuid", "stripe_client_secret": "pi_xxx_secret_xxx", "estimated_matches": number } }`  
- Mobile: use `stripe_client_secret` with Stripe Payment Sheet; after payment succeeds, backend runs matching and sends pushes to matched providers.

**GET /api/gigs/urgent/:id**  
- Response:  
  `{ "success": true, "data": { id, gig_type, skill_required, genre, date_needed, duration_hours, payment_amount, payment_currency, location_address, urgent_status, expires_at, requester: { id, display_name, avatar_url, ... }, distance_km? } }`  
- `distance_km` present when the authenticated user is a provider (e.g. in responses list).

**GET /api/gigs/urgent/:id/responses**  
- Response:  
  `{ "success": true, "data": [ { id, provider: { id, display_name, avatar_url, rating, review_count, distance_km, hourly_rate, per_gig_rate }, status, response_time_seconds, message, responded_at } ] }`

**POST /api/gigs/:id/respond**  
- Body: `{ "action": "accept" | "decline", "message": "optional string" }`  
- Response: `{ "success": true }`  
- On accept, requester gets a push (e.g. “X accepted your gig”).

**POST /api/gigs/:id/select**  
- Body: `{ "response_id": "uuid" }` (the gig_response id to select).  
- Response: `{ "success": true, "data": { "project_id": "uuid" } }`  
- Use `project_id` for project/agreement/chat/completion flows.

**POST /api/gigs/:id/complete**  
- No body.  
- Response: `{ "success": true, "data": { "released_amount": number, "currency": "GBP" } }`  
- Backend: captures PaymentIntent, Stripe Transfer to provider, credits wallet, creates wallet_transaction, sends completion + review-prompt notifications.

---

### 3.3 Gig ratings

| Method | Path | Auth | Who | Description |
|--------|------|------|-----|-------------|
| POST | `/api/gig-ratings` | Yes | Party to project | Submit rating for the other party. |
| GET | `/api/gig-ratings/project/:projectId` | Yes | Party to project | Both ratings if both submitted; else has_rated + my_rating. |
| GET | `/api/gig-ratings/user/:userId` | No (Public) | Anyone | Visible ratings for that user + average and total count. |

**POST /api/gig-ratings**  
- Body: `project_id`, `ratee_id`, `overall_rating`, `professionalism_rating`, `punctuality_rating` (1–5); optional: `quality_rating`, `payment_promptness_rating`, `review_text` (max 1000).  
- Response: `{ "success": true }`  
- 409 if already rated for this project.

**GET /api/gig-ratings/project/:projectId**  
- Response:  
  `{ "success": true, "data": { "both_submitted": boolean, "has_rated": boolean, "my_rating": <GigRating> | null, "their_rating": <GigRating> | null } }`

**GET /api/gig-ratings/user/:userId**  
- Response:  
  `{ "success": true, "data": { "average_rating": number | null, "total_reviews": number, "ratings": [ <GigRating & rater_profile> ] } }`

---

### 3.4 Disputes

| Method | Path | Auth | Who | Description |
|--------|------|------|-----|-------------|
| POST | `/api/disputes` | Yes | Party to project | Raise dispute. |
| GET | `/api/disputes/:disputeId` | Yes | Parties or admin | Full dispute + project + raiser/against profiles. |
| POST | `/api/disputes/:disputeId/respond` | Yes | “Against” party only | Submit counter-response. |

**POST /api/disputes**  
- Body: `project_id`, `reason`, `description`; optional: `evidence_urls` (string[]).  
- Response: `{ "success": true, "data": { "dispute_id": "uuid" } }`  
- Backend sets project status to `disputed` and notifies other party.

**GET /api/disputes/:disputeId**  
- Response:  
  `{ "success": true, "data": { ...dispute, project, raiser_profile, against_profile } }`

**POST /api/disputes/:disputeId/respond**  
- Body: `response` (string), optional `counter_evidence_urls` (string[]).  
- Response: `{ "success": true }`

---

## 4. Push notification payloads (for deep linking / UI)

Backend sends these via Expo; mobile should handle `data.type` and route accordingly.

| type | When | Suggested use |
|------|------|----------------|
| **urgent_gig** | Matched provider (after payment) | Open gig detail: `data.gig_id`. |
| **gig_accepted** | Requester when a provider accepts | Open gig / responses: `data.gig_id`, `data.response_id`. |
| **gig_confirmed** | Selected provider | Open project/gig: `data.gig_id`, `data.project_id`. |
| **gig_starting_soon** | Both parties ~1h before date_needed | Open gig/project: `data.gig_id`. |
| **confirm_completion** | Requester (reminder to confirm) | Open project: `data.project_id`. |
| **gig_filled** | Other providers (not selected) | Informational; optional open gig. |
| **rating_prompt** | Both after completion | Open rate screen: `data.project_id`, `data.ratee_id`, `data.ratee_name`. |
| **opportunity_project_completed** | Provider when payment released | Project completed / wallet. |
| **opportunity_project_disputed** | Other party when dispute raised | Open dispute: dispute_id in metadata. |

Example **urgent_gig** payload (to provider):

```json
{
  "to": "<expo_push_token>",
  "title": "🎺 Urgent Gig: Trumpeter Tonight 7pm",
  "body": "£120 · Gospel · 2.3km away · Luton",
  "sound": "default",
  "data": {
    "type": "urgent_gig",
    "gig_id": "uuid",
    "distance_km": 2.3,
    "payment": 120,
    "skill": "trumpeter",
    "genre": ["gospel"],
    "location": "Luton Church",
    "date_time": "2026-02-24T19:00:00Z"
  }
}
```

Example **gig_accepted** (to requester):

```json
{
  "title": "✅ James Okafor accepted your gig",
  "body": "Trumpeter · ⭐ 4.8 · 2.3km away — tap to view",
  "data": {
    "type": "gig_accepted",
    "gig_id": "uuid",
    "response_id": "uuid"
  }
}
```

Example **gig_confirmed** (to selected provider):

```json
{
  "title": "🎉 You've been selected!",
  "body": "Trumpeter · Tonight 7pm · Luton · £105.60",
  "data": {
    "type": "gig_confirmed",
    "gig_id": "uuid",
    "project_id": "uuid"
  }
}
```

---

## 5. Background jobs (cron) — no mobile calls

These are server-side only. Mobile only needs to react to push/state.

| Job | Schedule | What it does |
|-----|----------|--------------|
| Expire stale gigs | Every 1 min | urgent_status=searching and expires_at &lt; now → cancel PI, set cancelled/refunded, notify requester. |
| Pre-gig reminders | Every 5 min | Confirmed gigs with date_needed in 55–65 min → push “gig starting soon” to both parties. |
| Clean stale location | Every 30 min | user_availability: clear current_lat/lng where last_location_update &gt; 30 min ago. |
| Auto-release escrow | Daily 00:00 UTC | opportunity_projects delivered &gt;48h, no open dispute → release payment, wallet credit, notify. |
| Completion reminders | Daily 12:00 UTC | Projects delivered 20–28h ago → push requester to confirm completion. |

Cron endpoints (for reference only; not for mobile):  
`/api/cron/urgent-gigs/expire`, `.../reminders`, `.../clean-location`, `.../auto-release`, `.../completion-reminders`.  
Protected by `CRON_SECRET` when set.

---

## 6. Error responses

APIs return JSON with `success: false` and `error` string when applicable. Typical status codes:

- **400** — Bad request (e.g. missing/invalid body, wrong state).  
- **401** — Not authenticated.  
- **403** — Not allowed (e.g. not requester for this gig).  
- **404** — Gig/project/response/dispute not found.  
- **409** — Conflict (e.g. already rated, dispute already exists).  
- **500** — Server error.

Example: `{ "success": false, "error": "Not a party to this project" }`

---

## 7. Flow summary (for mobile screens)

1. **Requester:** Set availability (GET/PATCH `/api/user/availability`), optionally POST location when going “available”.
2. **Requester:** Create gig → POST `/api/gigs/urgent` → show Stripe sheet with `stripe_client_secret` → on success, backend matches and notifies providers.
3. **Provider:** Receives push `urgent_gig` → GET `/api/gigs/urgent/:id` → POST `/api/gigs/:id/respond` (accept/decline).
4. **Requester:** GET `/api/gigs/urgent/:id/responses` → POST `/api/gigs/:id/select` with `response_id` → receive `project_id`.
5. **Both:** Use `project_id` for agreement/chat/delivery (existing opportunity project flow where applicable).
6. **Requester (or either):** POST `/api/gigs/:id/complete` when gig is done → backend releases payment, credits wallet, sends completion + rating prompts.
7. **Both:** POST `/api/gig-ratings` for the other party; GET by project or by user for display.
8. **Either (if needed):** POST `/api/disputes`; other party GET dispute and POST respond.

---

## 8. Files to run / reference

- **Migration (run once):** `supabase/migrations/20260228000000_urgent_gigs_schema.sql`  
- **Requirements (full spec):** `WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md`  
- **This doc:** `MOBILE_TEAM_URGENT_GIGS_SCHEMA_AND_ENDPOINTS.md`

If you need more detail on a specific endpoint or payload, we can add a short “Examples” section or align with your API client types.
