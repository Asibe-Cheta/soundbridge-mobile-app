# WEB TEAM — Opportunities Feature: Full Implementation Guide

**Priority:** High
**Feature:** Opportunities tab (Connect screen) — creator-posted gigs, collabs, and jobs
**Mobile status:** Feed UI, OpportunityCard, and ExpressInterestModal are fully built with mock data. Ready to wire up as soon as backend is live.
**Last updated:** February 2026

---

## Table of Contents

1. [What This Feature Is](#1-what-this-feature-is)
2. [Database Schema](#2-database-schema)
3. [RLS Policies](#3-rls-policies)
4. [Smart Recommendations RPC](#4-smart-recommendations-rpc)
5. [API Endpoints](#5-api-endpoints)
6. [Project Agreement & Escrow Flow](#6-project-agreement--escrow-flow)
7. [Anti-Off-Platform Payment Design](#7-anti-off-platform-payment-design)
8. [Notification Triggers](#8-notification-triggers)
9. [Complete User Journey (Both Roles)](#9-complete-user-journey-both-roles)
10. [Tier / Access Rules](#10-tier--access-rules)
11. [Mobile — What's Built vs What's Needed](#11-mobile--whats-built-vs-whats-needed)
12. [Web App — Pages Required](#12-web-app--pages-required)
13. [MVP Phase 1 vs Phase 2 Scope](#13-mvp-phase-1-vs-phase-2-scope)

---

## 1. What This Feature Is

The **Opportunities** tab in the Connect screen lets any user post a short-form opportunity — a collaboration request, a session gig, an event slot, or a job — that other creators can discover and express interest in.

This is **distinct** from the existing Services marketplace (Explore screen):

| | Services (Explore) | Opportunities (Connect) |
|---|---|---|
| Who posts | Service providers via their dashboard | Any user |
| What it is | "I offer mixing at £75/hr" (ongoing) | "I need a bass player by Jan 30" (one-off) |
| Response action | Book via availability calendar | Express Interest with a message |
| Discovery | Browse by category/rating | Feed + smart personalised recommendations |
| Payment initiation | Buyer requests a booking | **Poster accepts interest → creates Project Agreement** |

**Revenue model:** The platform earns a 12% fee (8% for Unlimited subscribers) on all agreed project amounts processed through the platform. The escrow system is the primary mechanism for capturing this revenue and preventing off-platform payment.

---

## 2. Database Schema

### 2a. `opportunity_posts` table

```sql
CREATE TABLE opportunity_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('collaboration', 'event', 'job')),
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description       TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 1000),
  skills_needed     TEXT[] DEFAULT '{}',       -- from existing skills taxonomy
  location          TEXT,                       -- free text, e.g. "Lagos", "Remote", "London"
  location_lat      NUMERIC,                    -- for geo-based recommendations
  location_lng      NUMERIC,
  is_remote         BOOLEAN DEFAULT FALSE,
  date_from         DATE,                       -- optional project start
  date_to           DATE,                       -- optional project end
  budget_min        NUMERIC,                    -- optional
  budget_max        NUMERIC,
  budget_currency   TEXT DEFAULT 'GBP',
  visibility        TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'connections')),
  is_featured       BOOLEAN DEFAULT FALSE,      -- admin-controlled
  is_active         BOOLEAN DEFAULT TRUE,       -- poster can deactivate
  interest_count    INT DEFAULT 0,              -- denormalised counter
  expires_at        TIMESTAMPTZ,               -- auto-expire after 60 days if null
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-expire: set expires_at = created_at + 60 days if not provided
CREATE OR REPLACE FUNCTION set_opportunity_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunity_expiry
  BEFORE INSERT ON opportunity_posts
  FOR EACH ROW EXECUTE FUNCTION set_opportunity_expiry();

CREATE INDEX idx_opportunity_posts_active ON opportunity_posts(is_active, expires_at, created_at DESC);
CREATE INDEX idx_opportunity_posts_user ON opportunity_posts(user_id);
CREATE INDEX idx_opportunity_posts_type ON opportunity_posts(type);
CREATE INDEX idx_opportunity_posts_skills ON opportunity_posts USING gin(skills_needed);
```

---

### 2b. `opportunity_interests` table

```sql
CREATE TABLE opportunity_interests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id      UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE CASCADE,
  interested_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poster_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason              TEXT NOT NULL,              -- selected from predefined reasons
  message             TEXT,                       -- optional free text
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(opportunity_id, interested_user_id)      -- one interest per user per opportunity
);

-- Auto-increment interest_count on opportunity_posts
CREATE OR REPLACE FUNCTION increment_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = interest_count + 1
  WHERE id = NEW.opportunity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_interest
  AFTER INSERT ON opportunity_interests
  FOR EACH ROW EXECUTE FUNCTION increment_interest_count();

CREATE INDEX idx_opportunity_interests_opp ON opportunity_interests(opportunity_id);
CREATE INDEX idx_opportunity_interests_user ON opportunity_interests(interested_user_id);
CREATE INDEX idx_opportunity_interests_poster ON opportunity_interests(poster_user_id);
```

> **Note on `enable_alerts`:** The `enable_alerts` field from the Express Interest modal has been removed from this table for Phase 1. The Opportunity Alerts feature is Phase 2. The mobile app will not show the toggle at launch.

---

### 2c. `opportunity_projects` table

This is the escrow-backed project agreement that links an accepted interest to a payment and a chat thread. **This is the core revenue mechanism for the feature.**

```sql
CREATE TABLE opportunity_projects (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id            UUID NOT NULL REFERENCES opportunity_posts(id) ON DELETE RESTRICT,
  interest_id               UUID NOT NULL REFERENCES opportunity_interests(id) ON DELETE RESTRICT,
  poster_user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,  -- the one paying
  creator_user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,  -- the one being paid
  title                     TEXT NOT NULL,
  brief                     TEXT NOT NULL,         -- agreed deliverables description
  agreed_amount             NUMERIC NOT NULL CHECK (agreed_amount > 0),
  currency                  TEXT NOT NULL DEFAULT 'GBP',
  platform_fee_percent      NUMERIC NOT NULL DEFAULT 12, -- 12% standard, 8% for Unlimited
  platform_fee_amount       NUMERIC NOT NULL,            -- computed: agreed_amount * (fee_percent / 100)
  creator_payout_amount     NUMERIC NOT NULL,            -- computed: agreed_amount - platform_fee_amount
  deadline                  DATE,
  status                    TEXT NOT NULL DEFAULT 'payment_pending'
                            CHECK (status IN (
                              'payment_pending',      -- poster submitted agreement, Stripe payment not yet confirmed
                              'awaiting_acceptance',  -- payment IS in escrow, waiting for creator to accept
                              'active',               -- creator accepted, work in progress
                              'delivered',            -- creator marked delivered, awaiting poster confirmation
                              'completed',            -- poster confirmed delivery, funds released to creator
                              'disputed',             -- dispute raised, under review
                              'cancelled',            -- cancelled, payment refunded to poster
                              'declined'              -- creator declined the agreement
                            )),
  stripe_payment_intent_id  TEXT,                   -- Stripe PaymentIntent with capture_method: manual
  stripe_transfer_id        TEXT,                   -- populated after funds released to creator
  chat_thread_id            UUID REFERENCES conversations(id) ON DELETE SET NULL,
  poster_review_id          UUID REFERENCES reviews(id) ON DELETE SET NULL,
  creator_review_id         UUID REFERENCES reviews(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ,
  UNIQUE(interest_id)   -- one project per accepted interest
);

CREATE INDEX idx_opportunity_projects_poster ON opportunity_projects(poster_user_id, status);
CREATE INDEX idx_opportunity_projects_creator ON opportunity_projects(creator_user_id, status);
CREATE INDEX idx_opportunity_projects_opp ON opportunity_projects(opportunity_id);
CREATE INDEX idx_opportunity_projects_status ON opportunity_projects(status);
```

> **Note on `chat_thread_id`:** On project creation, the backend should create or reuse a conversation between `poster_user_id` and `creator_user_id`. Reference whatever table the existing Messages/ChatScreen uses (likely `conversations` or `chat_threads`). The first message in that thread should be a system-generated message (see Section 7).

> **Note on `reviews`:** If a `reviews` table does not yet exist, create it (it will also be needed by Services, Events etc.). Minimum schema:
> ```sql
> CREATE TABLE reviews (
>   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   reviewer_id  UUID NOT NULL REFERENCES auth.users(id),
>   reviewee_id  UUID NOT NULL REFERENCES auth.users(id),
>   entity_type  TEXT NOT NULL, -- 'opportunity_project', 'service_booking', etc.
>   entity_id    UUID NOT NULL,
>   rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
>   comment      TEXT,
>   is_verified  BOOLEAN DEFAULT TRUE, -- TRUE = came from a real platform transaction
>   created_at   TIMESTAMPTZ DEFAULT NOW()
> );
> ```
> The `is_verified = TRUE` flag is what makes "Verified Reviews" work — only reviews from on-platform transactions get this flag.

---

### 2d. `opportunity_alerts` table (Phase 2 — create now, activate later)

```sql
CREATE TABLE opportunity_alerts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords                    TEXT[] DEFAULT '{}',
  categories                  TEXT[] DEFAULT '{}',   -- 'collaboration', 'event', 'job'
  location                    TEXT,
  enabled                     BOOLEAN DEFAULT TRUE,
  created_from_opportunity_id UUID REFERENCES opportunity_posts(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunity_alerts_user ON opportunity_alerts(user_id, enabled);
```

---

## 3. RLS Policies

```sql
-- ============================================================
-- opportunity_posts: public readable, own rows writable
-- ============================================================
ALTER TABLE opportunity_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active opportunities"
  ON opportunity_posts FOR SELECT
  USING (is_active = TRUE AND expires_at > NOW());

CREATE POLICY "Users can insert own opportunities"
  ON opportunity_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities"
  ON opportunity_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities"
  ON opportunity_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- opportunity_interests
-- ============================================================
ALTER TABLE opportunity_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interests on their own opportunities or their own interests"
  ON opportunity_interests FOR SELECT
  USING (
    auth.uid() = interested_user_id OR
    auth.uid() = poster_user_id
  );

CREATE POLICY "Authenticated users can insert interests"
  ON opportunity_interests FOR INSERT
  WITH CHECK (auth.uid() = interested_user_id);

CREATE POLICY "Users can update own interests"
  ON opportunity_interests FOR UPDATE
  USING (auth.uid() = interested_user_id);

-- Opportunity owner can update status (viewed, accepted, declined)
CREATE POLICY "Opportunity owner can update interest status"
  ON opportunity_interests FOR UPDATE
  USING (auth.uid() = poster_user_id);

-- ============================================================
-- opportunity_projects
-- ============================================================
ALTER TABLE opportunity_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view their projects"
  ON opportunity_projects FOR SELECT
  USING (auth.uid() = poster_user_id OR auth.uid() = creator_user_id);

-- Insert is done server-side only (via service role in the accept endpoint)
-- No direct client INSERT allowed — all project creation goes through the API

CREATE POLICY "Project participants can update their projects"
  ON opportunity_projects FOR UPDATE
  USING (auth.uid() = poster_user_id OR auth.uid() = creator_user_id);

-- ============================================================
-- opportunity_alerts (Phase 2)
-- ============================================================
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alerts"
  ON opportunity_alerts FOR ALL
  USING (auth.uid() = user_id);
```

---

## 4. Smart Recommendations RPC

Both mobile and web call this RPC to get a personalised, ranked feed of opportunities.

**Ranking signals (in priority order):**
1. Skills match — poster requested skills the viewer has tagged
2. Follow graph — posted by someone the viewer follows or is connected to
3. Location proximity — if viewer has location set, prefer nearby non-remote posts
4. Recency + engagement — fresher posts with more interest signals rank higher

```sql
CREATE OR REPLACE FUNCTION get_recommended_opportunities(
  p_user_id       UUID,
  p_limit         INT DEFAULT 20,
  p_offset        INT DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  type            TEXT,
  title           TEXT,
  description     TEXT,
  skills_needed   TEXT[],
  location        TEXT,
  is_remote       BOOLEAN,
  date_from       DATE,
  date_to         DATE,
  budget_min      NUMERIC,
  budget_max      NUMERIC,
  budget_currency TEXT,
  visibility      TEXT,
  is_featured     BOOLEAN,
  interest_count  INT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ,
  posted_by       JSONB,
  has_expressed_interest BOOLEAN,
  relevance_score FLOAT
)
LANGUAGE sql STABLE AS $$
  WITH
    viewer_skills AS (
      SELECT COALESCE(array_agg(skill_name), '{}') AS skills
      FROM user_skills
      WHERE user_id = p_user_id
    ),
    viewer_follows AS (
      SELECT following_id AS followed_user_id
      FROM follows
      WHERE follower_id = p_user_id
    ),
    viewer_connections AS (
      SELECT
        CASE WHEN user_id = p_user_id THEN connected_user_id ELSE user_id END AS connected_user_id
      FROM connections
      WHERE (user_id = p_user_id OR connected_user_id = p_user_id)
        AND status = 'accepted'
    ),
    scored AS (
      SELECT
        op.id,
        op.type,
        op.title,
        op.description,
        op.skills_needed,
        op.location,
        op.is_remote,
        op.date_from,
        op.date_to,
        op.budget_min,
        op.budget_max,
        op.budget_currency,
        op.visibility,
        op.is_featured,
        op.interest_count,
        op.expires_at,
        op.created_at,
        jsonb_build_object(
          'id',           p.id,
          'username',     p.username,
          'display_name', p.display_name,
          'avatar_url',   p.avatar_url
        ) AS posted_by,
        EXISTS (
          SELECT 1 FROM opportunity_interests oi
          WHERE oi.opportunity_id = op.id AND oi.interested_user_id = p_user_id
        ) AS has_expressed_interest,
        (
          (CASE WHEN op.is_featured THEN 3.0 ELSE 0.0 END) +
          (
            SELECT COUNT(*)::FLOAT
            FROM unnest(op.skills_needed) skill
            WHERE skill = ANY((SELECT skills FROM viewer_skills))
          ) * 2.0 +
          (CASE WHEN op.user_id IN (SELECT followed_user_id FROM viewer_follows) THEN 2.5 ELSE 0.0 END) +
          (CASE WHEN op.user_id IN (SELECT connected_user_id FROM viewer_connections) THEN 1.5 ELSE 0.0 END) +
          GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - op.created_at)) / (14 * 86400)) * 1.5 +
          LOG(1 + op.interest_count) * 0.5
        ) AS relevance_score
      FROM opportunity_posts op
      JOIN profiles p ON p.id = op.user_id
      WHERE
        op.is_active = TRUE
        AND op.expires_at > NOW()
        AND op.user_id <> p_user_id
        AND (
          op.visibility = 'public'
          OR (
            op.visibility = 'connections'
            AND op.user_id IN (SELECT connected_user_id FROM viewer_connections)
          )
        )
    )
  SELECT *
  FROM scored
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
```

---

## 5. API Endpoints

### Phase 1 (Required for launch)

---

#### `POST /api/opportunities`
Create a new opportunity post.

**Auth:** Required
**Tier enforcement:** Before inserting, count `opportunity_posts` where `user_id = auth_user AND is_active = TRUE`. If count >= tier limit (Free: 2, Premium: 10, Unlimited: no limit), return `403` with `{ "error": "active_post_limit_reached", "limit": 2, "upgrade_required": true }`.

**Body:**
```json
{
  "type": "collaboration",
  "title": "Looking for Gospel Vocalist for Worship Album",
  "description": "We're producing a new worship album...",
  "skills_needed": ["vocals", "gospel"],
  "location": "Lagos",
  "is_remote": false,
  "date_from": "2026-03-01",
  "budget_min": 200,
  "budget_max": 500,
  "budget_currency": "GBP",
  "visibility": "public"
}
```
**Response:** `201` — Created opportunity object

---

#### `GET /api/opportunities`
Get paginated, recommended opportunities for the authenticated user.

**Auth:** Required
**Query params:** `limit=20&offset=0&type=collaboration` (type is optional filter)
**Implementation:** Call `get_recommended_opportunities(user_id, limit, offset)` RPC
**Response:**
```json
{
  "items": [ /* array of opportunity objects with posted_by, has_expressed_interest */ ],
  "total": 142,
  "has_more": true
}
```

---

#### `GET /api/opportunities/mine`
Get the authenticated user's own posted opportunities, including interest counts and project status.

**Auth:** Required
**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "type": "collaboration",
      "is_active": true,
      "interest_count": 7,
      "created_at": "...",
      "expires_at": "..."
    }
  ]
}
```

---

#### `GET /api/opportunities/:id`
Get a single opportunity post with full details.

**Auth:** Required

---

#### `PATCH /api/opportunities/:id`
Update or deactivate own opportunity.

**Auth:** Required (must be owner)
**Body:** Any subset of mutable fields, or `{ "is_active": false }` to close it.

---

#### `DELETE /api/opportunities/:id`
Delete own opportunity. Cascade-deletes all associated interests. Returns `409` if there is an `active` or `delivered` project linked to this opportunity — must complete or cancel those first.

**Auth:** Required (must be owner)

---

#### `POST /api/opportunities/:id/interest`
Express interest in an opportunity.

**Auth:** Required
**Cannot express interest in own opportunity** — return `403`.
**Body:**
```json
{
  "reason": "I have the skills and availability you need",
  "message": "Hi Marcus, I've been doing gospel vocals for 6 years..."
}
```
> **Note:** `enable_alerts` field is **not accepted in Phase 1**. The alerts feature is Phase 2. Ignore or reject the field if sent.

**Response:** `201` — Created interest object
**Side effects:**
- Inserts into `opportunity_interests` with `status = 'pending'`
- Sends push notification + in-app notification to opportunity poster (see Section 8)

---

#### `GET /api/opportunities/:id/interests`
Get all expressions of interest on the poster's opportunity, with basic profile info for each interested user.

**Auth:** Required (must be opportunity owner)
**Response:**
```json
{
  "items": [
    {
      "id": "interest-uuid",
      "user": {
        "id": "...",
        "display_name": "Sarah Johnson",
        "username": "sarah_johnson",
        "avatar_url": "...",
        "headline": "Gospel Singer & Worship Leader"
      },
      "reason": "I have the skills and availability you need",
      "message": "Hi Marcus...",
      "status": "pending",
      "created_at": "..."
    }
  ]
}
```

---

#### `POST /api/opportunities/:id/interests/:interestId/accept`
Poster accepts an interest and creates a Project Agreement with upfront escrow payment. **This is the core monetisation gate — payment is collected here, before the creator even sees the agreement.**

**Auth:** Required (must be opportunity owner)
**Body:**
```json
{
  "agreed_amount": 250,
  "currency": "GBP",
  "deadline": "2026-03-15",
  "brief": "Record 3 lead vocal tracks + harmonies in our Lagos studio. Files delivered as 48kHz WAV."
}
```

**Server-side logic:**
1. Validate poster owns the opportunity
2. Validate interest exists and is `pending` or `viewed`
3. Compute fee: `platform_fee_percent = 12` (or `8` if poster is Unlimited subscriber); `platform_fee_amount = agreed_amount * (fee_percent / 100)`; `creator_payout_amount = agreed_amount - platform_fee_amount`
4. Create a Stripe PaymentIntent: `amount = agreed_amount * 100` (smallest currency unit), `currency`, `capture_method: 'manual'`, `metadata: { opportunity_id, poster_user_id, creator_user_id }`
5. Create `opportunity_projects` row with `status = 'payment_pending'`, storing `stripe_payment_intent_id`
6. Create or reuse a `conversations` row between poster and creator; store `chat_thread_id` on the project
7. Return `client_secret` to the mobile/web client so the Stripe payment sheet can be presented

> ⚠️ **At this point the creator is NOT yet notified.** The interest is NOT yet marked accepted. The project exists only internally as `payment_pending`. The creator will be notified only after the Stripe webhook confirms payment.

**Response:** `201`
```json
{
  "project": {
    "id": "...",
    "status": "payment_pending",
    "agreed_amount": 250,
    "currency": "GBP",
    "platform_fee_amount": 30,
    "creator_payout_amount": 220,
    "deadline": "2026-03-15",
    "brief": "...",
    "chat_thread_id": "..."
  },
  "client_secret": "pi_xxx_secret_xxx"
}
```

> After receiving this response, the mobile/web client presents the Stripe payment sheet using `client_secret`. On successful payment, the Stripe webhook (Section 5: `confirm-payment`) fires and moves the project to `awaiting_acceptance`.

---

#### `POST /api/opportunity-projects/:id/confirm-payment`
**Stripe webhook only** — called automatically by `payment_intent.succeeded`. Never called directly by client.

**Server-side logic:**
1. Verify Stripe webhook signature
2. Look up project by `stripe_payment_intent_id`
3. Update project `status = 'awaiting_acceptance'`
4. Update `opportunity_interests.status = 'accepted'`
5. Post a system message to the chat thread (see Section 7)
6. Send push + in-app notification to the creator: "£X is in escrow and waiting for you — review the project agreement" (see Section 8b)

---

#### `POST /api/opportunity-projects/:id/accept-agreement`
Creator accepts the project agreement. Because payment is already in escrow (paid by poster at agreement submission), this immediately activates the project.

**Auth:** Required (must be `creator_user_id`)
**Side effects:**
- Updates project `status = 'active'`
- Sends notification to poster: "Creator accepted — your project is now active. Good luck!" (see Section 8c)
- Posts a system message to the chat thread confirming the project is active

---

#### `POST /api/opportunity-projects/:id/decline-agreement`
Creator declines the project agreement.

**Auth:** Required (must be `creator_user_id`)
**Side effects:**
- Updates project `status = 'declined'`
- Updates interest `status = 'declined'`
- Sends notification to poster

---

#### `POST /api/opportunity-projects/:id/mark-delivered`
Creator marks their work as delivered, triggering poster review.

**Auth:** Required (must be `creator_user_id`)
**Side effects:**
- Updates project `status = 'delivered'`
- Posts system message to chat thread
- Sends notification to poster: "Work has been marked as delivered — confirm to release payment"

---

#### `POST /api/opportunity-projects/:id/confirm-delivery`
Poster confirms they're happy with the delivery. This releases the escrowed funds.

**Auth:** Required (must be `poster_user_id`)
**Server-side logic:**
1. Capture the Stripe PaymentIntent (`stripe.paymentIntents.capture(payment_intent_id)`)
2. Create a Stripe Transfer to creator's Connect account for `creator_payout_amount`
3. Update project `status = 'completed'`, set `completed_at = NOW()`, set `stripe_transfer_id`
4. Prompt both parties for a review (push + in-app notification)

---

#### `POST /api/opportunity-projects/:id/dispute`
Either party raises a dispute.

**Auth:** Required (must be poster or creator)
**Body:** `{ "reason": "Work was not delivered as agreed" }`
**Side effects:**
- Updates project `status = 'disputed'`
- Payment remains captured but NOT transferred
- Sends notification to the other party
- Creates an admin alert for manual review (insert into a `support_tickets` or equivalent table)

---

#### `GET /api/opportunity-projects`
Get all projects for the authenticated user (as poster or creator).

**Auth:** Required
**Query params:** `role=poster|creator&status=active`
**Response:** Array of project objects with opportunity title, other party's profile, amounts, status, chat_thread_id

---

#### `GET /api/opportunity-projects/:id`
Get full project detail.

**Auth:** Required (must be participant)

---

### Phase 2 (Post-launch — Opportunity Alerts)

These endpoints are for the Premium/Unlimited alert subscription system. **Do not build for Phase 1.**

- `GET /api/opportunity-alerts` — Get current user's alerts
- `POST /api/opportunity-alerts` — Create a new alert
- `PATCH /api/opportunity-alerts/:id` — Toggle or update
- `DELETE /api/opportunity-alerts/:id` — Delete

---

## 6. Project Agreement & Escrow Flow

### Core principle (Uber model)
Payment is collected **at the moment the poster submits the agreement** — before the creator even sees it. The creator only receives a notification after the money is confirmed in escrow. There is no step where a project is active without payment being secured. No opportunity for off-platform payment exists because there is no "pay later" option in the flow.

### Full lifecycle:

```
POSTER                                    CREATOR
  |                                          |
  |  [Views interests list]                  |
  |  [Taps "Accept & Create Project"]        |
  |  [Value prop modal — 1st use only]       |
  |  [Fills: amount, deadline, brief]        |
  |  [Taps "Send Agreement & Pay"]           |
  |                                          |
  |--- POST /interests/:id/accept ---------> (server)
  |    server creates project                |
  |    status: payment_pending               |
  |    Stripe PaymentIntent created          |
  |    returns client_secret                 |
  |                                          |
  |  [Stripe payment sheet opens]            |
  |  [Poster completes card payment]         |
  |                                          |
  |--- Stripe webhook fires --------------->(server)
  |    status → awaiting_acceptance          |
  |    interest.status → accepted            |
  |                                          |
  |    <--- push notification to CREATOR --- |
  |         "£250 is in escrow waiting       |
  |          for you — review agreement"     |
  |                                          |
  |                   [Creator sees:         |
  |                    agreed amount,        |
  |                    deadline, brief       |
  |                    AND escrow status     |
  |                    showing £250 held]    |
  |                   [Taps "Accept          |
  |                    Agreement"]           |
  |                                          |
  |    <--- POST /accept-agreement --------- |
  |    status → active                       |
  |                                          |
  |--- push: "Project is now active" ------> |
  |                                          |
  |    [Work in progress — both chat]        |
  |    [Escrow banner visible in chat]       |
  |                                          |
  |                   [Creator delivers]     |
  |                   [Taps "Mark           |
  |                    Delivered"]           |
  |                                          |
  |<-- push: "Work delivered —          <--- |
  |    confirm to release payment"           |
  |                                          |
  |  [Poster confirms delivery]              |
  |--- POST /confirm-delivery               |
  |    Stripe PaymentIntent captured         |
  |    Transfer to creator Stripe account    |
  |    status → completed                    |
  |                                          |
  |  [Both prompted for Verified Review]     |
```

### Why this prevents off-platform payment
There is no point in this flow where the poster has "accepted" a creator but not yet paid. By the time the creator knows they have been chosen, the money is already in escrow. The creator has zero incentive to request payment elsewhere — they can already see it is secured.

Compare to old flow: `accept → create project → creator accepts → poster pays (optional button)` — the poster could accept, skip payment, and arrange cash outside. That gap no longer exists.

### Stripe configuration:

- Use `capture_method: 'manual'` on PaymentIntent so funds are authorised but not captured until delivery confirmed
- Stripe authorisation holds last **7 days**. If work is still in progress after 7 days, the PaymentIntent must be re-confirmed. Build a cron job or Supabase Edge Function to re-authorise any `active` projects where `stripe_payment_intent_id` is nearing expiry (check daily, re-authorise at day 5).
- Use **Stripe Connect** (already integrated) for creator payouts. Creator must have a connected Stripe account.
- If a creator has not connected Stripe yet, prompt them when accepting the agreement: "To receive payment, connect your payout account." Link to `/settings/payouts`.

---

## 7. Anti-Off-Platform Payment Design

**The problem:** After expressing interest is accepted, users could exchange contact details and pay offline, bypassing the platform's 12% fee.

**The solution is structural, not just a warning.** The "Accept" button for the poster does NOT accept the interest — it opens the Project Agreement modal. There is no way to mark an interest as accepted without initiating an agreement and payment.

### 7a. Button label
- ❌ Do not label the button "Accept"
- ✅ Label it **"Accept & Create Project"**

The label implies a structured next step. This is deliberate psychological design — similar to how Uber's "Confirm" button simultaneously accepts the ride AND locks in payment method.

### 7b. Persistent in-chat banner
Every chat thread linked to an opportunity project must display a **non-dismissible pinned banner** at the top of the conversation:

**Waiting for creator to accept (status: `awaiting_acceptance`):**
> 🔒 **£250 in Escrow** — Waiting for [creator name] to accept the agreement.

**While project is active (status: `active` or `delivered`):**
> 🔒 **SoundBridge Escrow Active** — £250 held securely. Funds release when delivery is confirmed.

**After completion (status: `completed`):**
> ✅ **Project Complete** — Payment released. Leave a Verified Review to build your reputation.
> [Leave a Review →]

> **Note:** There is no "before payment" banner state in the revised flow. Payment happens at agreement submission, so by the time a chat thread is relevant to both parties, escrow is already active.

### 7c. Smart keyword detection in chat (Phase 2)
When either party sends a message containing any of the following patterns (case-insensitive), display a non-blocking toast/popup:

**Trigger keywords:** `whatsapp`, `cash`, `bank transfer`, `paypal`, `wise`, `my number`, `outside`, `directly`, `off platform`, `revolut`, `venmo`

**Popup text:**
> 💬 **Keep it on SoundBridge**
> Payments outside the platform remove escrow protection, dispute resolution, and your Verified Review. Both parties are unprotected.
> [Dismiss]

> **Note:** This is Phase 2. Do not build for launch.

### 7d. Value proposition display
When the poster opens the "Accept & Create Project" modal, before they see the form fields, show a brief 3-point explainer (dismissible after first view, stored in `localStorage` / `AsyncStorage`):

> **Why pay through SoundBridge?**
> ✅ Funds held in escrow — released only on delivery confirmation
> ✅ Full dispute resolution if something goes wrong
> ✅ Verified Review on both profiles — only awarded for platform transactions
> [Got it — Create Agreement →]

### 7e. What users lose by going off-platform
Display this clearly on the project agreement screen. Both parties should understand the asymmetry:

| | On-platform | Off-platform |
|---|---|---|
| Payment protection | ✅ Escrow held until delivery | ❌ No protection |
| Dispute resolution | ✅ Full review process | ❌ None |
| Verified Review on profile | ✅ Yes | ❌ No |
| Platform Champions points | ✅ Counts toward status | ❌ Not counted |
| Tax receipt / invoice | ✅ Auto-generated | ❌ None |
| Creator: guaranteed payout | ✅ Yes | ❌ At poster's discretion |

---

## 8. Notification Triggers

### 8a. When interest is expressed
**Push notification to opportunity poster:**
```json
{
  "title": "New Interest — {{opportunity.title}}",
  "body": "{{interested_user.display_name}} expressed interest in your post",
  "data": {
    "type": "opportunity_interest",
    "opportunity_id": "...",
    "interest_id": "..."
  }
}
```
**In-app notification:**
- `type = 'opportunity_interest'`
- `user_id` = poster
- `actor_id` = interested user
- `entity_id` = opportunity_id
- `message` = "{display_name} expressed interest in your opportunity: {title}"

---

### 8b. When payment is confirmed and creator is notified (Stripe webhook → `awaiting_acceptance`)
**Push notification to creator:**
```json
{
  "title": "£{{agreed_amount}} in Escrow — Review Your Agreement",
  "body": "{{poster.display_name}} has secured payment for '{{opportunity.title}}'. Review and accept to begin.",
  "data": {
    "type": "opportunity_project_agreement",
    "project_id": "..."
  }
}
```

> This is the first notification the creator receives. By the time they open the project, the escrow is already funded — no negotiation needed.

---

### 8c. When creator accepts agreement (project becomes `active`)
**Push notification to poster:**
```json
{
  "title": "Project Active — {{opportunity.title}}",
  "body": "{{creator.display_name}} accepted your agreement. Work has begun.",
  "data": {
    "type": "opportunity_project_active",
    "project_id": "..."
  }
}
```

---

### 8d. When payment is confirmed (poster side — optimistic confirmation)
**In-app confirmation shown immediately after Stripe payment sheet closes successfully:**
> "Payment secured. {{creator.display_name}} will be notified to review and accept the agreement."

> No push notification to poster needed here — they just completed payment in-app and already see feedback.

---

### 8e. When work is marked delivered
**Push notification to poster:**
```json
{
  "title": "Work Delivered — '{{opportunity.title}}'",
  "body": "{{creator.display_name}} marked your project as delivered. Confirm to release payment.",
  "data": {
    "type": "opportunity_project_delivered",
    "project_id": "..."
  }
}
```

---

### 8f. When delivery is confirmed (project complete)
**Push notification to creator:**
```json
{
  "title": "Payment Released — £{{creator_payout_amount}}",
  "body": "{{poster.display_name}} confirmed delivery. Your funds are on the way.",
  "data": {
    "type": "opportunity_project_completed",
    "project_id": "..."
  }
}
```
**Push notification to both parties (review prompt):**
```json
{
  "title": "Leave a Verified Review",
  "body": "How was working with {{other_party.display_name}}?",
  "data": {
    "type": "opportunity_review_prompt",
    "project_id": "..."
  }
}
```

---

### 8g. Opportunity expiry notifications (no payment involved)
Because payment is collected at acceptance — NOT at posting — an opportunity with no interest simply expires cleanly with no refund needed.

**7 days before expiry — push notification to poster (if post has 0 interests):**
```json
{
  "title": "Your opportunity expires soon",
  "body": "No one has expressed interest in '{{opportunity.title}}' yet. Try expanding your location or adjusting your budget.",
  "data": {
    "type": "opportunity_expiring_no_interest",
    "opportunity_id": "..."
  }
}
```

**7 days before expiry — push notification to poster (if post has interests):**
```json
{
  "title": "{{interest_count}} creator(s) are interested — act soon",
  "body": "'{{opportunity.title}}' expires in 7 days. Review interests and choose a creator.",
  "data": {
    "type": "opportunity_expiring_with_interest",
    "opportunity_id": "..."
  }
}
```

**Implementation:** Run a daily Supabase Edge Function or cron job. Query `opportunity_posts` where `expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND is_active = TRUE`. For each, check `interest_count` and send the appropriate notification.

---

## 9. Complete User Journey (Both Roles)

### Role A: The Poster (hiring / seeking collaboration)

1. Taps "Post Opportunity" in Connect screen — **no payment required to post**
2. Fills `CreateOpportunityScreen`: type, title, description, skills needed, location, budget, visibility
3. Submits → `POST /api/opportunities` → active post appears in others' feeds
4. Receives push notification when someone expresses interest
5. If no interest after 30 days → push notification suggesting location/budget adjustment
6. Post expires after 60 days automatically → no refund needed (no payment was taken)
7. Opens "My Opportunities" → taps their post → sees Interests list
8. Reviews each interested creator's profile
9. Taps **"Accept & Create Project"** on one → Project Agreement modal opens
10. (Value prop modal shown on first use — stored in AsyncStorage/localStorage)
11. Fills: agreed amount, currency, deadline, brief
12. Taps **"Send Agreement & Pay"** → API call creates project and returns Stripe `client_secret`
13. **Stripe payment sheet opens immediately** — poster completes card payment
14. Stripe webhook fires → project moves to `awaiting_acceptance` → creator notified
15. Poster sees: "Payment secured. Waiting for [creator] to accept."
16. Creator accepts → poster notified "Project is now active"
17. Receives notification when creator marks delivered
18. Reviews delivered work, taps "Confirm Delivery" → funds released
19. Both prompted to leave Verified Review

### Role B: The Creator (seeking gigs / collaboration)

1. Opens Connect → Opportunities tab
2. Sees smart-ranked feed (skills match, connections, location, recency)
3. Taps opportunity card → reads full detail
4. Taps "Express Interest" → `ExpressInterestModal` opens
5. Selects reason from predefined list, optionally adds message
6. Submits → `POST /api/opportunities/:id/interest` → card shows "Interest Sent"
7. Poster reviews interests — **creator hears nothing until poster has paid**
8. Creator receives push: **"£250 is in escrow and waiting for you — review the project agreement"**
9. Opens `OpportunityProjectScreen` — sees agreed amount, deadline, brief, **and escrow status confirming payment is held**
10. Taps "Accept Agreement" → `POST /api/opportunity-projects/:id/accept-agreement`
11. Project becomes `active` immediately — no waiting for payment (it's already done)
12. Completes the work, communicates via project chat thread (escrow banner always visible)
13. Taps "Mark Delivered" → `POST /api/opportunity-projects/:id/mark-delivered`
14. Waits for poster to confirm → receives payout to Stripe Connect account
15. Receives "Leave a Verified Review" prompt → Verified Review appears on public profile

---

## 10. Tier / Access Rules

| Action | Free | Premium | Unlimited |
|---|---|---|---|
| Browse opportunities | ✅ | ✅ | ✅ |
| Express interest | ✅ | ✅ | ✅ |
| Post an opportunity | ✅ (max 2 active) | ✅ (max 10 active) | ✅ (unlimited) |
| Create a project agreement | ✅ | ✅ | ✅ |
| Platform fee on projects | 12% | 12% | 8% |
| Opportunity alerts | ❌ (Phase 2) | ✅ (Phase 2) | ✅ (Phase 2) |
| Featured opportunity | ❌ | ❌ | ✅ (1/month) |
| Leave / receive Verified Reviews | ✅ | ✅ | ✅ |

**Tier enforcement implementation note:** The active post count check happens server-side in `POST /api/opportunities`. Query `opportunity_posts` where `user_id = auth_user AND is_active = TRUE AND expires_at > NOW()`. If at limit, return:
```json
{
  "error": "active_post_limit_reached",
  "current_count": 2,
  "limit": 2,
  "upgrade_required": true,
  "message": "Free accounts can have 2 active opportunities. Upgrade to Premium for 10."
}
```

---

## 11. Mobile — What's Built vs What's Needed

### Already built (no changes needed once backend is live):
- `OpportunityCard.tsx` — card UI with "Express Interest" button; `handleSubmitInterest` needs wiring
- `ExpressInterestModal.tsx` — reason + message form; database insert is TODO
- `OpportunityAlertsSection.tsx` — alerts UI (Phase 2; hide/disable for launch)
- `NetworkScreen.tsx` Opportunities tab — feed UI with mock data; ready to swap for real API

### Mobile needs to build (Phase 1):
1. **`CreateOpportunityScreen`** — form to post a new opportunity (fields listed in Section 7 of original doc)
2. **`MyOpportunitiesScreen`** — list of poster's own active posts with interest counts and status
3. **`OpportunityInterestListScreen`** — view all interested creators per post, with "Accept & Create Project" button per row
4. **`ProjectAgreementModal`** — bottom sheet with: agreed amount, deadline, brief, value prop explainer, "Send Agreement" CTA
5. **`OpportunityProjectScreen`** — active project detail showing escrow status, chat link, "Mark Delivered" / "Confirm Delivery" / "Dispute" actions
6. **Wire `ExpressInterestModal`** to `POST /api/opportunities/:id/interest`
7. **Replace mock data in `NetworkScreen`** with `get_recommended_opportunities` RPC call
8. **Add "Post Opportunity" button** to Connect screen header
9. **Add tier count check** before opening `CreateOpportunityScreen` — if at limit, show upgrade prompt

### Phase 2 (post-launch):
- Wire `OpportunityAlertsSection` Supabase TODOs to real queries
- Add "Enable Alerts" toggle back to `ExpressInterestModal`
- Keyword detection in chat threads

---

## 12. Web App — Pages Required

### Phase 1 (Required for launch)

| Page / Component | Route (suggested) | Notes |
|---|---|---|
| Opportunities feed | `/connect/opportunities` | Calls `get_recommended_opportunities` RPC; same data as mobile |
| Post opportunity form | `/connect/opportunities/new` | Same fields as mobile `CreateOpportunityScreen` |
| Opportunity detail | `/connect/opportunities/:id` | Full details + "Express Interest" button |
| My posted opportunities | `/connect/my-opportunities` | List with interest counts, edit/deactivate/delete |
| Interests received | `/connect/my-opportunities/:id/interests` | List of interested users + "Accept & Create Project" per row |
| Project Agreement modal | (in-page modal) | Triggered by "Accept & Create Project" |
| Active project detail | `/projects/:id` | Escrow status, chat, "Confirm Delivery" / "Mark Delivered" / "Dispute" |
| My interests (creator view) | `/connect/my-interests` | List of all opportunities the user expressed interest in + status |

### Phase 2 (Post-launch)

| Page | Notes |
|---|---|
| Opportunity alerts management | `/connect/opportunity-alerts` — Premium/Unlimited only |
| Review submission page | `/projects/:id/review` |
| Dispute management | `/projects/:id/dispute` — admin visibility needed |

### Shared UX requirements for web:
- Persistent escrow banner on all project chat threads (same as mobile spec in Section 7b)
- Value prop modal on first "Accept & Create Project" use (dismissible, stored in `localStorage`)
- "Accept & Create Project" button label — do NOT use "Accept" alone
- Off-platform keyword detection in project chat (Phase 2)

---

## 13. MVP Phase 1 vs Phase 2 Scope

### Phase 1 — Ship at launch

**Backend:**
- [ ] `opportunity_posts` table + trigger + indexes
- [ ] `opportunity_interests` table + trigger + indexes
- [ ] `opportunity_projects` table + indexes
- [ ] `reviews` table (shared with Services)
- [ ] RLS policies for all 3 tables
- [ ] `get_recommended_opportunities` RPC
- [ ] `POST /api/opportunities`
- [ ] `GET /api/opportunities`
- [ ] `GET /api/opportunities/mine`
- [ ] `GET /api/opportunities/:id`
- [ ] `PATCH /api/opportunities/:id`
- [ ] `DELETE /api/opportunities/:id`
- [ ] `POST /api/opportunities/:id/interest`
- [ ] `GET /api/opportunities/:id/interests`
- [ ] `POST /api/opportunities/:id/interests/:interestId/accept`
- [ ] `POST /api/opportunity-projects/:id/accept-agreement` (moves to `active` directly — payment already in escrow)
- [ ] `POST /api/opportunity-projects/:id/decline-agreement`
- [ ] `POST /api/opportunity-projects/:id/mark-delivered`
- [ ] `POST /api/opportunity-projects/:id/confirm-delivery`
- [ ] `POST /api/opportunity-projects/:id/dispute`
- [ ] `GET /api/opportunity-projects`
- [ ] `GET /api/opportunity-projects/:id`
- [ ] Stripe webhook for `payment_intent.succeeded` → project `awaiting_acceptance` + notify creator
- [ ] Stripe PaymentIntent 7-day re-authorisation cron (for projects stuck in `awaiting_acceptance`)
- [ ] All notification triggers (Sections 8a–8g)
- [ ] Tier enforcement on post creation
- [ ] Daily cron for expiry notifications (Section 8g)

### Phase 2 — Post-launch

**Backend:**
- [ ] `opportunity_alerts` table (already defined above, just activate)
- [ ] `POST /api/opportunity-alerts`
- [ ] `GET /api/opportunity-alerts`
- [ ] `PATCH /api/opportunity-alerts/:id`
- [ ] `DELETE /api/opportunity-alerts/:id`
- [ ] Alert matching edge function (on new post creation)

**Mobile:**
- [ ] "Enable Alerts" toggle in `ExpressInterestModal`
- [ ] `OpportunityAlertsSection` wired to real queries

**Web:**
- [ ] Opportunity alerts management page
- [ ] Smart keyword detection in project chat

---

*Document prepared by SoundBridge mobile team. For questions contact Justice Asibe.*
