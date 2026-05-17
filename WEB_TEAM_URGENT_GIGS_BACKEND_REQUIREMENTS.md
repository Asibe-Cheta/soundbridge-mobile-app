# Web Team — Urgent Gigs & Opportunity Enhancements: Backend Requirements

**Date:** 2026-02-24
**From:** Mobile Team
**Priority:** High — blocks all urgent gig mobile screens
**Companion doc:** `MOBILE_TEAM_URGENT_GIGS_EXECUTION_PLAN.md` (internal mobile reference)

---

## Executive Summary

We are building an **Urgent Gigs** system — a real-time, location-matched, last-minute booking product layered on top of the existing planned opportunities system. The mobile app already has a working planned opportunities + escrow + wallet flow. This document defines everything the backend needs to deliver for the new urgent gigs feature.

**The existing planned opportunities system must not break.**

---

## 1. Database Schema

### 1.1 Modify Existing `opportunities` Table

Add the following columns to support the urgent gig type:

```sql
ALTER TABLE opportunities
  ADD COLUMN gig_type TEXT NOT NULL DEFAULT 'planned'
    CHECK (gig_type IN ('urgent', 'planned')),
  ADD COLUMN skill_required TEXT,           -- single skill: 'trumpeter', 'vocalist', etc.
  ADD COLUMN genre TEXT[],                  -- array: ['gospel', 'jazz']
  ADD COLUMN location_lat DECIMAL(10, 7),
  ADD COLUMN location_lng DECIMAL(10, 7),
  ADD COLUMN location_radius_km INTEGER DEFAULT 20,
  ADD COLUMN duration_hours DECIMAL(4, 1),  -- e.g. 2.5 hours
  ADD COLUMN payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'escrowed', 'released', 'refunded')),
  ADD COLUMN expires_at TIMESTAMPTZ;        -- urgent gigs only, auto-calculated from date_needed
```

**Index additions:**
```sql
CREATE INDEX idx_opportunities_gig_type ON opportunities (gig_type);
CREATE INDEX idx_opportunities_location ON opportunities (location_lat, location_lng);
CREATE INDEX idx_opportunities_expires_at ON opportunities (expires_at)
  WHERE expires_at IS NOT NULL;
```

---

### 1.2 New Table: `user_availability`

```sql
CREATE TABLE user_availability (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_for_urgent_gigs BOOLEAN NOT NULL DEFAULT false,
  current_lat               DECIMAL(10, 7),
  current_lng               DECIMAL(10, 7),
  general_area              TEXT,           -- e.g. 'Luton', 'Birmingham City Centre'
  general_area_lat          DECIMAL(10, 7), -- geocoded from general_area
  general_area_lng          DECIMAL(10, 7),
  max_radius_km             INTEGER NOT NULL DEFAULT 20,
  hourly_rate               DECIMAL(10, 2),
  per_gig_rate              DECIMAL(10, 2),
  rate_negotiable           BOOLEAN NOT NULL DEFAULT false,
  availability_schedule     JSONB,          -- see structure below
  dnd_start                 TIME,           -- e.g. '23:00:00'
  dnd_end                   TIME,           -- e.g. '08:00:00'
  max_notifications_per_day INTEGER NOT NULL DEFAULT 5,
  last_location_update      TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_user_availability_active
  ON user_availability (available_for_urgent_gigs, current_lat, current_lng)
  WHERE available_for_urgent_gigs = true;
```

**`availability_schedule` JSONB structure:**
```json
{
  "monday":    { "available": true,  "hours": "18:00-23:00" },
  "tuesday":   { "available": true,  "hours": "all_day" },
  "wednesday": { "available": false },
  "thursday":  { "available": true,  "hours": "18:00-23:00" },
  "friday":    { "available": true,  "hours": "18:00-23:00" },
  "saturday":  { "available": true,  "hours": "all_day" },
  "sunday":    { "available": true,  "hours": "14:00-22:00" }
}
```

**RLS Policies:**
```sql
-- Users can only read/write their own availability
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own availability"
  ON user_availability FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own availability"
  ON user_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own availability"
  ON user_availability FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### 1.3 New Table: `gig_responses`

(Separate from `opportunity_interests` — urgent gig responses have different semantics)

```sql
CREATE TABLE gig_responses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id                 UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  provider_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  response_time_seconds  INTEGER,
  message                TEXT,
  notified_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, provider_id)
);

CREATE INDEX idx_gig_responses_gig_id ON gig_responses (gig_id);
CREATE INDEX idx_gig_responses_provider ON gig_responses (provider_id, status);

ALTER TABLE gig_responses ENABLE ROW LEVEL SECURITY;

-- Requester can see all responses to their gig
CREATE POLICY "Requester can view responses to their gigs"
  ON gig_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE id = gig_responses.gig_id
        AND created_by = auth.uid()
    )
  );

-- Provider can see their own responses
CREATE POLICY "Provider can view their own responses"
  ON gig_responses FOR SELECT
  USING (provider_id = auth.uid());
```

---

### 1.4 New Table: `gig_ratings`

```sql
CREATE TABLE gig_ratings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID NOT NULL REFERENCES opportunity_projects(id) ON DELETE CASCADE,
  rater_id                    UUID NOT NULL REFERENCES profiles(id),
  ratee_id                    UUID NOT NULL REFERENCES profiles(id),
  overall_rating              SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  professionalism_rating      SMALLINT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  punctuality_rating          SMALLINT NOT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  quality_rating              SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),         -- providers only
  payment_promptness_rating   SMALLINT CHECK (payment_promptness_rating BETWEEN 1 AND 5), -- requesters only
  review_text                 TEXT CHECK (char_length(review_text) <= 1000),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, rater_id),    -- one rating per project per rater
  CHECK (rater_id != ratee_id)
);

CREATE INDEX idx_gig_ratings_ratee ON gig_ratings (ratee_id);
CREATE INDEX idx_gig_ratings_project ON gig_ratings (project_id);

ALTER TABLE gig_ratings ENABLE ROW LEVEL SECURITY;

-- Ratings are public (for profile display) after both parties have rated
CREATE POLICY "Ratings visible after both parties submit"
  ON gig_ratings FOR SELECT
  USING (
    -- Both parties have rated
    (SELECT COUNT(*) FROM gig_ratings gr2 WHERE gr2.project_id = gig_ratings.project_id) = 2
    -- OR viewer is the rater seeing their own pending submission
    OR rater_id = auth.uid()
  );

CREATE POLICY "Only rater can insert"
  ON gig_ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid());
```

---

### 1.5 New Table: `notification_rate_limits`

Tracks per-user notification counts for rate limiting.

```sql
CREATE TABLE notification_rate_limits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,             -- 'urgent_gig'
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  gig_id           UUID REFERENCES opportunities(id),
  action           TEXT                        -- 'accepted', 'declined', 'no_response'
);

CREATE INDEX idx_notif_rate_limits_user_day
  ON notification_rate_limits (user_id, notification_type, sent_at);
```

---

### 1.6 New Table: `disputes`

Replaces the simple `dispute_reason` column approach.

```sql
CREATE TABLE disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES opportunity_projects(id),
  raised_by         UUID NOT NULL REFERENCES profiles(id),
  against           UUID NOT NULL REFERENCES profiles(id),
  reason            TEXT NOT NULL,
  description       TEXT NOT NULL,
  evidence_urls     TEXT[],                     -- uploaded to post-attachments bucket
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_release', 'resolved_split')),
  counter_response  TEXT,
  counter_evidence_urls TEXT[],
  resolution_notes  TEXT,                       -- admin fills this in
  split_percent     SMALLINT,                   -- if resolved_split
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Parties involved can see their dispute
CREATE POLICY "Parties can view their disputes"
  ON disputes FOR SELECT
  USING (raised_by = auth.uid() OR against = auth.uid());
```

---

## 2. New API Endpoints

### 2.1 User Availability

**GET /api/user/availability**
- Returns current user's `user_availability` record (create with defaults if not exists)
- Response:
```json
{
  "success": true,
  "data": { /* UserAvailability object */ }
}
```

**PATCH /api/user/availability**
- Auth required
- Body: any subset of `user_availability` fields
- Response: updated record
- Side effect: if `general_area` changes, geocode it and store `general_area_lat/lng`

**POST /api/user/availability/location**
- Auth required
- Body: `{ lat: number, lng: number }`
- Updates `current_lat`, `current_lng`, `last_location_update = now()`
- Response: `{ success: true }`

---

### 2.2 Urgent Gig Lifecycle

**POST /api/gigs/urgent**
- Auth required
- Body:
```json
{
  "skill_required": "trumpeter",
  "genre": ["gospel"],
  "date_needed": "2026-02-24T19:00:00Z",
  "duration_hours": 2,
  "location_lat": 51.8787,
  "location_lng": -0.4200,
  "location_address": "Luton Church, 123 High St",
  "location_radius_km": 20,
  "payment_amount": 120.00,
  "payment_currency": "GBP",
  "description": "Optional description"
}
```
- Server actions:
  1. Create `opportunities` record with `gig_type = 'urgent'`, `expires_at = date_needed + 4 hours`
  2. Create Stripe Payment Intent for `payment_amount` (hold, do not capture yet)
  3. Return `client_secret` for mobile Stripe Payment Sheet
  4. After payment confirmed (webhook): run matching algorithm, insert `gig_responses`, send push notifications
- Response:
```json
{
  "success": true,
  "data": {
    "gig_id": "uuid",
    "stripe_client_secret": "pi_xxx_secret_xxx",
    "estimated_matches": 8
  }
}
```

**GET /api/gigs/urgent/:id**
- Auth required (requester OR provider in responses)
- Response: full gig object + requester profile + `distance_km` if viewer is provider
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "gig_type": "urgent",
    "skill_required": "trumpeter",
    "genre": ["gospel"],
    "date_needed": "2026-02-24T19:00:00Z",
    "duration_hours": 2,
    "payment_amount": 120.00,
    "payment_currency": "GBP",
    "location_address": "Luton Church, 123 High St",
    "status": "searching",
    "expires_at": "2026-02-24T23:00:00Z",
    "requester": {
      "id": "uuid",
      "display_name": "Sarah M.",
      "avatar_url": "...",
      "rating": 4.9,
      "review_count": 12
    },
    "distance_km": 2.3
  }
}
```

**GET /api/gigs/urgent/:id/responses**
- Auth required — requester only
- Response: array of `gig_responses` with provider profiles, sorted by match_score desc
```json
{
  "success": true,
  "data": [
    {
      "id": "response_uuid",
      "provider": {
        "id": "uuid",
        "display_name": "James Okafor",
        "avatar_url": "...",
        "rating": 4.8,
        "review_count": 12,
        "distance_km": 2.3,
        "hourly_rate": 100,
        "per_gig_rate": 150
      },
      "status": "accepted",
      "response_time_seconds": 180,
      "message": "Available and ready!",
      "responded_at": "2026-02-24T12:05:00Z"
    }
  ]
}
```

**POST /api/gigs/:id/respond**
- Auth required — only providers who received notification for this gig
- Body: `{ "action": "accept" | "decline", "message": "optional" }`
- Server actions:
  - Update `gig_responses.status` and `responded_at`
  - Calculate and store `response_time_seconds`
  - If accept: send push notification to requester ("James accepted your urgent gig")
  - Insert into `notification_rate_limits`
- Response: `{ "success": true }`

**POST /api/gigs/:id/select**
- Auth required — requester only
- Body: `{ "response_id": "uuid" }` (the gig_response to select)
- Server actions:
  1. Update `opportunities.selected_provider_id` and `status = 'confirmed'`
  2. Update selected `gig_responses.status = 'accepted'`
  3. Update all other pending responses to `status = 'expired'`
  4. Send push notification to selected provider: "🎉 You've been selected!"
  5. Send push notification to declined providers: "This gig was filled by another musician"
  6. Create `opportunity_projects` record (reuse existing project flow for agreement + completion)
- Response: `{ "success": true, "data": { "project_id": "uuid" } }`

**POST /api/gigs/:id/complete**
- Auth required — either party
- Server actions:
  1. Update `opportunities.status = 'completed'`
  2. Update `opportunity_projects.status = 'completed'`
  3. Trigger Stripe Transfer: release escrow to provider (net of 12% fee)
  4. Credit provider's wallet balance in database
  5. Create wallet transaction record with reference to gig/project
  6. Prompt both parties to rate (handled via push notification)
- Response: `{ "success": true, "data": { "released_amount": 105.60, "currency": "GBP" } }`

**GET /api/gigs/my**
- Auth required — requester (poster) only
- Returns all urgent gigs posted by the authenticated user, newest first
- Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "gig_type": "urgent",
      "skill_required": "trumpeter",
      "genre": ["gospel"],
      "date_needed": "2026-02-24T19:00:00Z",
      "duration_hours": 2,
      "payment_amount": 120.00,
      "payment_currency": "GBP",
      "location_address": "Luton Church, 123 High St",
      "status": "searching",
      "payment_status": "escrowed",
      "expires_at": "2026-02-24T23:00:00Z",
      "response_count": 3,
      "created_at": "2026-02-24T10:00:00Z"
    }
  ]
}
```
- **Backend:** Endpoint implemented. If `gig_type` (or related columns) are missing, returns `200 { success: true, data: [] }` so the mobile never gets 500. Once the urgent-gigs schema migration is run, the section will populate automatically with no mobile release required (MyOpportunitiesScreen catch block only sees 500; 200 + empty array shows empty state).
- Include `response_count` (number of `gig_responses` rows for that gig) so the mobile can show a badge without a separate request.

**POST /api/gigs/:id/expire** *(internal — called by cron job, not mobile)*
- Cancels urgent gig if `expires_at` passed and no provider selected
- Refunds Stripe Payment Intent
- Notifies requester

---

### 2.3 Gig Ratings

**POST /api/gig-ratings**
- Auth required
- Body:
```json
{
  "project_id": "uuid",
  "ratee_id": "uuid",
  "overall_rating": 5,
  "professionalism_rating": 5,
  "punctuality_rating": 4,
  "quality_rating": 5,
  "review_text": "Excellent performance, very professional."
}
```
- Response: `{ "success": true }`

**GET /api/gig-ratings/project/:projectId**
- Auth required (must be a party to the project)
- Returns both ratings only if both have been submitted; otherwise returns only `has_rated: true/false`
```json
{
  "success": true,
  "data": {
    "both_submitted": true,
    "my_rating": { /* GigRating */ },
    "their_rating": { /* GigRating */ }
  }
}
```

**GET /api/gig-ratings/user/:userId**
- Public
- Returns all visible ratings for a user with overall average
```json
{
  "success": true,
  "data": {
    "average_rating": 4.8,
    "total_reviews": 12,
    "ratings": [ /* array of GigRating with rater profile */ ]
  }
}
```

---

### 2.4 Disputes

**POST /api/disputes**
- Auth required (must be party to the project)
- Body: `{ "project_id": "uuid", "reason": "...", "description": "...", "evidence_urls": [...] }`
- Server actions:
  1. Insert into `disputes`
  2. Update `opportunity_projects.status = 'disputed'`
  3. Hold Stripe Payment (ensure not released)
  4. Notify other party
  5. Notify admin via email/Slack
- Response: `{ "success": true, "data": { "dispute_id": "uuid" } }`

**GET /api/disputes/:disputeId**
- Auth required (parties or admin)
- Returns full dispute with both parties' submissions and status

**POST /api/disputes/:disputeId/respond**
- Auth required (the `against` party only)
- Body: `{ "response": "...", "counter_evidence_urls": [...] }`
- Updates `disputes.counter_response` and `counter_evidence_urls`
- Notifies admin
- Response: `{ "success": true }`

---

## 3. Matching Algorithm

When an urgent gig is posted and payment confirmed, run the following server-side:

### 3.1 Filter candidates
```sql
SELECT
  ua.user_id,
  ua.current_lat,
  ua.current_lng,
  ua.general_area_lat,
  ua.general_area_lng,
  ua.max_radius_km,
  ua.hourly_rate,
  ua.per_gig_rate,
  ua.availability_schedule,
  p.skills,      -- from profiles table
  p.genres,      -- from profiles table
  AVG(gr.overall_rating) as avg_rating,
  COUNT(gr.id) as review_count
FROM user_availability ua
JOIN profiles p ON p.id = ua.user_id
LEFT JOIN gig_ratings gr ON gr.ratee_id = ua.user_id
WHERE
  ua.available_for_urgent_gigs = true
  AND (
    ua.last_location_update > NOW() - INTERVAL '30 minutes'  -- recent GPS
    OR ua.general_area_lat IS NOT NULL                       -- or has static area
  )
  AND ua.user_id != :requester_id
GROUP BY ua.user_id, ua.current_lat, ua.current_lng, ua.general_area_lat, ua.general_area_lng,
         ua.max_radius_km, ua.hourly_rate, ua.per_gig_rate, ua.availability_schedule,
         p.skills, p.genres
HAVING AVG(gr.overall_rating) >= 4.0 OR COUNT(gr.id) = 0  -- min 4.0 star or no ratings yet
```

### 3.2 Calculate match score per candidate

For each candidate:

**A. Distance score (25%)**
```
Use the Haversine formula:
  lat1, lng1 = provider location (current_lat/lng or general_area_lat/lng)
  lat2, lng2 = gig location

function haversine(lat1, lng1, lat2, lng2):
  R = 6371  # Earth's radius in km
  dLat = radians(lat2 - lat1)
  dLng = radians(lng2 - lng1)
  a = sin(dLat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLng/2)^2
  c = 2 * atan2(sqrt(a), sqrt(1-a))
  return R * c  # distance in km

Filter out: distance > min(gig.location_radius_km, provider.max_radius_km)
Distance score: max(0, 1 - (distance / gig.location_radius_km))
Weighted: distance_score * 0.25
```

**B. Skill + genre score (40%)**
```
skill_match = 1 if provider.skills contains gig.skill_required (case-insensitive), else 0
genre_overlap = len(intersection(provider.genres, gig.genre)) / len(gig.genre)
skill_genre_score = (skill_match * 0.7) + (genre_overlap * 0.3)
Weighted: skill_genre_score * 0.40
```

**C. Rating score (20%)**
```
rating_score = (avg_rating - 1) / 4   # normalise 1-5 to 0-1
If no ratings: rating_score = 0.6     # neutral default
Weighted: rating_score * 0.20
```

**D. Availability score (10%)**
```
Check current day/time against provider.availability_schedule:
  if day.available = true AND current_time within day.hours: availability_score = 1
  if day.available = true AND 'all_day': availability_score = 1
  else: availability_score = 0
Check DND: if current_time between dnd_start and dnd_end: skip provider entirely
Weighted: availability_score * 0.10
```

**E. Budget score (5%)**
```
effective_rate = min(provider.hourly_rate * gig.duration_hours, provider.per_gig_rate)
  (use whichever is lower, or hourly if per_gig_rate not set)
if effective_rate <= gig.payment_amount: budget_score = 1
elif provider.rate_negotiable: budget_score = 0.5
else: budget_score = 0
Weighted: budget_score * 0.05
```

**F. Final score**
```
total_score = distance_score + skill_genre_score + rating_score + availability_score + budget_score
```

### 3.3 Select and notify top 10
- Sort candidates by `total_score` descending
- Take top 10 (or fewer if less available)
- Insert `gig_responses` rows (status = 'pending') for each
- Send push notification to each (see notification payload below)
- Enforce `max_notifications_per_day` from `user_availability` — if provider has reached limit today, skip them and pick the next

---

## 4. Push Notification Payloads

### 4.1 Urgent Gig Notification (to matched providers)
```json
{
  "to": "[provider_expo_push_token]",
  "title": "🎺 Urgent Gig: Trumpeter Tonight 7pm",
  "body": "£120 · Gospel · 2.3km away · Luton",
  "sound": "default",
  "badge": 1,
  "categoryId": "urgent_gig",
  "data": {
    "type": "urgent_gig",
    "gig_id": "uuid",
    "distance_km": 2.3,
    "payment": 120,
    "skill": "trumpeter",
    "genre": "gospel",
    "location": "Luton Church",
    "date_time": "2026-02-24T19:00:00Z"
  }
}
```

### 4.2 Provider Accepted (to requester)
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

### 4.3 Gig Confirmed (to selected provider)
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

### 4.4 Gig Starting Soon (both parties, 1 hour before)
```json
{
  "title": "⏰ Your gig starts in 1 hour",
  "body": "Trumpeter · 7pm · Luton Church, 123 High St",
  "data": {
    "type": "gig_starting_soon",
    "gig_id": "uuid"
  }
}
```

### 4.5 Confirm Completion (requester, 24h after gig)
```json
{
  "title": "Please confirm your gig is complete",
  "body": "Tap to release £105.60 to James, or raise a dispute",
  "data": {
    "type": "confirm_completion",
    "project_id": "uuid"
  }
}
```

### 4.6 Not Selected (other providers)
```json
{
  "title": "This gig was filled",
  "body": "Keep your availability on — more gigs coming soon!",
  "data": {
    "type": "gig_filled",
    "gig_id": "uuid"
  }
}
```

### 4.7 Rating Prompt (both parties, after completion)
```json
{
  "title": "How was your experience?",
  "body": "Leave a review for James Okafor",
  "data": {
    "type": "rating_prompt",
    "project_id": "uuid",
    "ratee_id": "uuid",
    "ratee_name": "James Okafor"
  }
}
```

---

## 5. Background Jobs (Cron)

### 5.1 Every 1 minute — Expire stale urgent gigs
```sql
-- Find urgent gigs past expires_at with no provider selected
UPDATE opportunities
SET status = 'cancelled', payment_status = 'refunded'
WHERE gig_type = 'urgent'
  AND status = 'searching'
  AND expires_at < NOW();
-- Then: refund Stripe Payment Intent for each
-- Then: push notification to requester
```

### 5.2 Every 5 minutes — Pre-gig reminders
```sql
-- Find confirmed gigs starting within 55–65 minutes
SELECT * FROM opportunities
WHERE status = 'confirmed'
  AND date_needed BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
  AND id NOT IN (SELECT gig_id FROM notification_rate_limits WHERE notification_type = 'gig_starting_soon');
-- Send push to both requester and selected_provider_id
-- Insert into notification_rate_limits to prevent duplicate
```

### 5.3 Every 30 minutes — Clean stale location data
```sql
UPDATE user_availability
SET current_lat = NULL, current_lng = NULL
WHERE last_location_update < NOW() - INTERVAL '30 minutes'
  AND current_lat IS NOT NULL;
```

### 5.4 Daily at 00:00 UTC — Auto-release escrow
```sql
-- Find projects delivered >48 hours ago, no dispute
SELECT * FROM opportunity_projects
WHERE status = 'delivered'
  AND delivered_at < NOW() - INTERVAL '48 hours'
  AND id NOT IN (SELECT project_id FROM disputes WHERE status != 'resolved_refund');
-- Call confirm-delivery logic for each
-- Send push to provider: "Your payment has been auto-released"
```

### 5.5 Daily at 12:00 UTC — Completion reminders
```sql
-- Find projects delivered 20–28 hours ago with no dispute or confirmation
SELECT * FROM opportunity_projects
WHERE status = 'delivered'
  AND delivered_at BETWEEN NOW() - INTERVAL '28 hours' AND NOW() - INTERVAL '20 hours';
-- Send push to requester: "Please confirm the gig is complete"
```

---

## 6. Wallet Integration (Critical)

Currently, when a project is completed (via `POST /api/opportunity-projects/:id/confirm-delivery`), the mobile app shows a success state but there is **no automatic credit to the provider's wallet balance**. This needs to be added.

### Required change to `confirm-delivery` endpoint:

```
Existing flow:
  1. Validate project ownership
  2. Update project status to 'completed'
  3. [MISSING] Stripe Transfer to provider's Connect account
  4. [MISSING] Credit provider's wallet balance in database
  5. [MISSING] Create wallet transaction record

Add the following:
  3. Call Stripe: create Transfer from platform to provider's connected account
     Amount: project.agreed_amount * 0.88 (after 12% fee)
     Transfer_group: project_id
  4. UPDATE wallet_balances SET balance = balance + net_amount WHERE user_id = provider_id
  5. INSERT INTO wallet_transactions (user_id, amount, type, reference_type, reference_id, description)
     VALUES (provider_id, net_amount, 'credit', 'opportunity_project', project_id, 'Gig: [project brief]')
```

**Same logic applies to the new `POST /api/gigs/:id/complete` endpoint for urgent gigs.**

---

## 7. Notification Rate Limiting Logic

Implement in the matching algorithm before sending notifications:

```
For each candidate in top 10:
  1. Count today's urgent_gig notifications for this user:
     SELECT COUNT(*) FROM notification_rate_limits
     WHERE user_id = candidate.user_id
       AND notification_type = 'urgent_gig'
       AND sent_at > CURRENT_DATE

  2. If count >= candidate.max_notifications_per_day → skip, take next candidate

  3. Check consecutive declines:
     SELECT action FROM notification_rate_limits
     WHERE user_id = candidate.user_id
       AND notification_type = 'urgent_gig'
     ORDER BY sent_at DESC LIMIT 3
     If all 3 = 'declined' AND last sent_at > NOW() - 2 hours → skip for 2 hours

  4. Check consecutive no-responses (5 in a row → reduce priority):
     Count last 5 where action = 'no_response'
     If 5 → move to bottom of sorted list (still notified, lower priority)

  5. Check DND: if current server time (in user's timezone) between dnd_start and dnd_end → skip

  6. If all checks pass: send notification, INSERT into notification_rate_limits
```

---

## 8. Existing Endpoint: Character Limit Fix (STILL NEEDED)

**This was flagged previously and must still be fixed if not done:**

`POST /api/posts` and `PUT /api/posts/:id` must accept up to **3,000 characters** in the content field, not 500. Update validation:

```javascript
// Change from:
if (content.length > 500) { ... }
// To:
if (content.length > 3000) { ... }
```

---

## 9. Updated Existing Endpoint: `confirm-delivery`

**Current endpoint:** `POST /api/opportunity-projects/:id/confirm-delivery`

**Current behaviour:** Updates status to 'completed', but does NOT release funds or credit wallet.

**Required change:** After status update, trigger:
1. Stripe Transfer (platform → provider Connected account)
2. Wallet balance credit
3. Wallet transaction record
4. Push notification to provider: "Your payment of £X has been released"
5. Push notification to both: "Leave a review"

---

## 10. Summary Checklist

### Database
- [ ] Add `gig_type`, `skill_required`, `genre`, `location_lat`, `location_lng`, `location_radius_km`, `duration_hours`, `payment_status`, `expires_at` to `opportunities` table
- [ ] Create `user_availability` table (with RLS)
- [ ] Create `gig_responses` table (with RLS)
- [ ] Create `gig_ratings` table (with RLS)
- [ ] Create `notification_rate_limits` table
- [ ] Create `disputes` table (with RLS)

### API Endpoints
- [ ] `GET /api/user/availability`
- [ ] `PATCH /api/user/availability`
- [ ] `POST /api/user/availability/location`
- [x] `GET /api/gigs/my` (implemented; returns 200 with `data: []` if schema not ready, full list once migration run)
- [ ] `POST /api/gigs/urgent` (create + Stripe Payment Intent + trigger matching)
- [ ] `GET /api/gigs/urgent/:id`
- [ ] `GET /api/gigs/urgent/:id/responses`
- [ ] `POST /api/gigs/:id/respond` (provider accept/decline)
- [ ] `POST /api/gigs/:id/select` (poster selects provider)
- [ ] `POST /api/gigs/:id/complete` (escrow release + wallet credit)
- [ ] `POST /api/gig-ratings`
- [ ] `GET /api/gig-ratings/project/:projectId`
- [ ] `GET /api/gig-ratings/user/:userId`
- [ ] `POST /api/disputes`
- [ ] `GET /api/disputes/:disputeId`
- [ ] `POST /api/disputes/:disputeId/respond`
- [ ] Fix `POST /api/posts` 500 → 3000 char limit (if not done)

### Matching & Notifications
- [ ] Haversine distance function
- [ ] Matching algorithm (triggered after urgent gig payment confirmed)
- [ ] Notification rate limiting logic
- [ ] Push notification payloads (all 7 types above)
- [ ] Notification category `urgent_gig` with ACCEPT/VIEW/DECLINE action buttons

### Background Jobs
- [ ] Every 1 min: expire stale urgent gigs + refund
- [ ] Every 5 min: pre-gig reminders (1 hour before)
- [ ] Every 30 min: clean stale GPS data
- [ ] Daily 00:00: auto-release escrow after 48h
- [ ] Daily 12:00: confirmation reminders

### Existing Endpoint Fix
- [ ] `confirm-delivery`: add Stripe Transfer + wallet credit + transaction record + push notifications

### Please notify mobile team when:
- `user_availability` table + endpoints are live → we can build ProviderAvailabilityScreen
- `gig_ratings` table + endpoints are live → we can build PostGigRatingScreen
- All urgent gig endpoints are live → we can build the full 6-screen urgent gig flow
- `confirm-delivery` wallet credit fix is deployed → we can add wallet refresh to project completion
