# Web Team: Live Session Backend API — Required for Mobile

**Priority: HIGH — Live sessions are completely broken without this**
**Date: 2026-02-14**
**Status: BLOCKED — Mobile app cannot join/create/manage live sessions**

---

## Problem

The mobile app can **list** live sessions (via direct Supabase queries), but **cannot join, manage, or start** any session. Every attempt results in:

> "Unable to Join Session — Unable to connect to the live session service"

This happens because the **Agora token generation endpoint does not exist** on the backend. The mobile app needs a server-side endpoint to generate Agora RTC tokens (the Agora App Certificate is a secret and cannot be embedded in the client).

---

## What the Web Team Needs to Build

### Endpoint 1 (CRITICAL): Agora Token Generation

```
POST /live-sessions/generate-token
```

**Full URL:** `https://www.soundbridge.live/live-sessions/generate-token`

> **Note:** The mobile app constructs this as `${EXPO_PUBLIC_API_URL}/live-sessions/generate-token`. The env var is set to `https://www.soundbridge.live` (no `/api` prefix for this service). If your backend routes everything under `/api/`, then either:
> - Add a route at `/live-sessions/generate-token` (preferred, no mobile changes needed), OR
> - Let us know and we'll update the mobile URL to include `/api/`

**Authentication:**
```
Authorization: Bearer <supabase_access_token>
```
Validate using Supabase's `auth.getUser(token)` server-side.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "role": "audience" | "broadcaster"
}
```

- `"broadcaster"` = host or promoted speaker (can send audio)
- `"audience"` = listener (receive-only)

**Server-Side Logic:**
1. Validate the JWT and extract the user ID
2. Look up the `live_sessions` row by `sessionId` — get the `agora_channel_name`
3. Verify the session `status = 'live'` (or `'scheduled'` if the user is the creator starting it)
4. If `role = 'broadcaster'`, verify the user is either the `creator_id` OR has a `live_session_participants` row with `role = 'speaker'`
5. Generate an Agora RTC token using the **Agora App ID + App Certificate** with:
   - `channelName` = the session's `agora_channel_name`
   - `uid` = a unique integer (e.g., hash of user UUID, or auto-increment)
   - `role` = `RtcRole.PUBLISHER` for broadcaster, `RtcRole.SUBSCRIBER` for audience
   - `privilegeExpiredTs` = current time + 3600 seconds (1 hour)
6. Return the response

**Success Response (200):**
```json
{
  "success": true,
  "token": "007eJxTYBBb...",
  "channelName": "session_1707900000000_abc12345",
  "uid": 12345,
  "expiresAt": "2026-02-14T15:00:00.000Z"
}
```

**Error Responses:**

| Status | Body | When |
|--------|------|------|
| 401 | `{ "success": false, "error": "User not authenticated" }` | Invalid/missing JWT |
| 404 | `{ "success": false, "error": "Session not found" }` | Invalid sessionId |
| 403 | `{ "success": false, "error": "Not authorized as broadcaster" }` | Non-speaker requesting broadcaster role |
| 400 | `{ "success": false, "error": "Session is not live" }` | Session ended/cancelled |
| 500 | `{ "success": false, "error": "Failed to generate token" }` | Server error |

**Agora SDK Reference (Node.js):**
```javascript
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const token = RtcTokenBuilder.buildTokenWithUid(
  AGORA_APP_ID,           // From Agora Console
  AGORA_APP_CERTIFICATE,  // From Agora Console (KEEP SECRET)
  channelName,            // From live_sessions.agora_channel_name
  uid,                    // Unique integer for this user
  role,                   // RtcRole.PUBLISHER or RtcRole.SUBSCRIBER
  privilegeExpiredTs      // Unix timestamp (seconds)
);
```

**npm package:** `agora-access-token` (or `agora-token` for newer versions)

---

### Endpoint 2 (REQUIRED for Stripe tips): Create Tip Payment Intent

```
POST /api/payments/create-tip
```

**Authentication:** `Authorization: Bearer <supabase_access_token>`

**Request Body:**
```json
{
  "creatorId": "uuid",
  "amount": 10.00,
  "currency": "USD",
  "message": "Great session!",
  "isAnonymous": false,
  "userTier": "free",
  "paymentMethod": "card"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "paymentIntentId": "pi_xxxx",
  "clientSecret": "pi_xxxx_secret_xxxx",
  "tipId": "uuid",
  "platformFee": 1.50,
  "creatorEarnings": 8.50,
  "message": "Tip created successfully"
}
```

**Server-Side Logic:**
1. Validate JWT
2. Create a Stripe PaymentIntent with `amount` (in cents), `currency`, and `application_fee_amount` (15% platform fee)
3. Store a pending tip record
4. Return the `clientSecret` for client-side confirmation

---

### Endpoint 3 (REQUIRED for Stripe tips): Confirm Tip Payment

```
POST /api/payments/confirm-tip
```

**Authentication:** `Authorization: Bearer <supabase_access_token>`

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxxx"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tip confirmed"
}
```

**Server-Side Logic:**
1. Validate JWT
2. Verify the PaymentIntent status with Stripe
3. Update the tip record status to `completed`

> **Note:** Tips currently work in MVP/dev mode without Stripe (writes directly to Supabase with `status='completed'`). Endpoints 2 & 3 are needed for production payment processing.

---

## Database Tables Already in Use (Mobile Writes Directly)

The mobile app reads/writes these tables via the Supabase JS client. They should already exist:

### `live_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| creator_id | uuid (FK → profiles) | Required |
| title | text | 3-200 chars |
| description | text | Optional |
| session_type | text | `'broadcast'` or `'interactive'` |
| status | text | `'scheduled'`, `'live'`, `'ended'`, `'cancelled'` |
| scheduled_start_time | timestamptz | Nullable |
| actual_start_time | timestamptz | Set when going live |
| end_time | timestamptz | Set when ended |
| max_speakers | int | 1 for broadcast, 2-50 for interactive |
| allow_recording | boolean | Default false |
| recording_url | text | Nullable |
| peak_listener_count | int | Default 0 |
| total_tips_amount | numeric | Default 0 |
| total_comments_count | int | Default 0 |
| agora_channel_name | text | Client-generated: `session_{timestamp}_{userId.slice(0,8)}` |
| agora_token | text | Nullable (not used by mobile — tokens are per-user) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### `live_session_participants`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| session_id | uuid (FK) | Required |
| user_id | uuid (FK) | Required |
| role | text | `'host'`, `'speaker'`, `'listener'` |
| is_speaking | boolean | Default false |
| is_muted | boolean | Default true |
| hand_raised | boolean | Default false |
| hand_raised_at | timestamptz | Nullable |
| total_tips_sent | numeric | Default 0 |
| comments_count | int | Default 0 |
| joined_at | timestamptz | Set on join |
| left_at | timestamptz | Null while active, set on leave |

**Unique constraint:** `(session_id, user_id)` — mobile uses UPSERT

### `live_session_comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| session_id | uuid (FK) | Required |
| user_id | uuid (FK) | Required |
| content | text | Message text |
| comment_type | text | `'text'`, `'emoji'`, `'system'` |
| is_pinned | boolean | Default false |
| is_deleted | boolean | Default false |
| created_at | timestamptz | Auto |

### `live_session_tips`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| session_id | uuid (FK) | Required |
| tipper_id | uuid (FK) | Required |
| creator_id | uuid (FK) | Required |
| amount | numeric | Gross amount |
| currency | text | Default `'USD'` |
| platform_fee_percentage | numeric | Currently 15 |
| platform_fee_amount | numeric | `amount * 0.15` |
| creator_amount | numeric | `amount * 0.85` |
| message | text | Optional |
| stripe_payment_intent_id | text | Nullable (null in dev/MVP mode) |
| stripe_transfer_id | text | Nullable |
| status | text | `'pending'`, `'completed'`, `'failed'`, `'refunded'` |
| created_at | timestamptz | Auto |

---

## Required Supabase RPC Function

The mobile app calls this after inserting a tip:

```sql
CREATE OR REPLACE FUNCTION increment_session_tips(
  session_id UUID,
  tip_amount NUMERIC
)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions
  SET total_tips_amount = total_tips_amount + tip_amount,
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Required RLS Policies

All tables need Row Level Security enabled. Suggested policies:

```sql
-- live_sessions: anyone can read, only creator can update/delete
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live sessions"
  ON live_sessions FOR SELECT USING (true);

CREATE POLICY "Creators can insert their own sessions"
  ON live_sessions FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own sessions"
  ON live_sessions FOR UPDATE USING (auth.uid() = creator_id);

-- live_session_participants: anyone can read, users manage their own
ALTER TABLE live_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON live_session_participants FOR SELECT USING (true);

CREATE POLICY "Users can join sessions"
  ON live_session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON live_session_participants FOR UPDATE USING (auth.uid() = user_id);

-- Host can also manage participants (promote/demote/remove)
CREATE POLICY "Hosts can manage participants"
  ON live_session_participants FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_participants.session_id
      AND live_sessions.creator_id = auth.uid()
    )
  );

-- live_session_comments: anyone can read, users post their own
ALTER TABLE live_session_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON live_session_comments FOR SELECT USING (true);

CREATE POLICY "Users can post comments"
  ON live_session_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- live_session_tips: anyone can read, users can insert their own
ALTER TABLE live_session_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tips"
  ON live_session_tips FOR SELECT USING (true);

CREATE POLICY "Users can send tips"
  ON live_session_tips FOR INSERT WITH CHECK (auth.uid() = tipper_id);
```

---

## Realtime Subscriptions (Already Working if Tables Exist)

The mobile app subscribes to these channels — no backend work needed, just ensure the tables have **Realtime enabled** in Supabase Dashboard:

| Channel | Table | Event | Filter |
|---------|-------|-------|--------|
| `session_comments:{id}` | `live_session_comments` | INSERT | `session_id=eq.{id}` |
| `session_participants:{id}` | `live_session_participants` | * | `session_id=eq.{id}` |
| `session_tips:{id}` | `live_session_tips` | INSERT | `session_id=eq.{id}` |
| `session_status_{id}` | `live_sessions` | UPDATE | `id=eq.{id}` |

**To enable:** Supabase Dashboard → Database → Replication → Enable for all 4 tables.

---

## Environment Variables Needed on Backend

| Variable | Purpose |
|----------|---------|
| `AGORA_APP_ID` | From Agora Console → Project |
| `AGORA_APP_CERTIFICATE` | From Agora Console → Project (enable if not already) |
| `STRIPE_SECRET_KEY` | For creating PaymentIntents (tips) |
| `STRIPE_WEBHOOK_SECRET` | For verifying Stripe webhook events |

---

## Mobile App Status

| Feature | Status | Depends On |
|---------|--------|------------|
| List live/upcoming sessions | Working | Supabase tables only |
| Create a session | Working | Supabase tables only |
| Join/manage a session | **BLOCKED** | `POST /live-sessions/generate-token` |
| Live chat (comments) | Ready | Session join working first |
| Participant management | Ready | Session join working first |
| Tipping (dev/MVP mode) | Ready | Session join working first |
| Tipping (Stripe production) | **BLOCKED** | `POST /api/payments/create-tip` + `confirm-tip` |

---

## Quick Win — Minimum to Unblock Mobile

If you want to unblock live sessions with minimal effort, **only Endpoint 1 is needed** (Agora token generation). Tips already work in dev mode without Stripe. Here's the minimal Node.js implementation:

```javascript
// POST /live-sessions/generate-token
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.post('/live-sessions/generate-token', async (req, res) => {
  try {
    // 1. Verify auth
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { sessionId, role } = req.body;

    // 2. Get session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, agora_channel_name, status, creator_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'live' && session.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Session is not live' });
    }

    // 3. Generate token
    const channelName = session.agora_channel_name;
    const uid = Math.floor(Math.random() * 100000) + 1; // Or use a deterministic hash
    const agoraRole = role === 'broadcaster' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraToken = RtcTokenBuilder.buildTokenWithUid(
      process.env.AGORA_APP_ID,
      process.env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    return res.json({
      success: true,
      token: agoraToken,
      channelName,
      uid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate token' });
  }
});
```

**Install:** `npm install agora-access-token`

---

## Questions for Web Team

1. Is the Agora project already set up? Do you have the App ID and App Certificate?
2. Are the 4 live session tables already created in Supabase, or do they need to be created?
3. Does the `increment_session_tips` RPC function exist?
4. Is Realtime enabled for these tables in the Supabase dashboard?
5. Should the token endpoint live at `/live-sessions/generate-token` or `/api/live-sessions/generate-token`? (Mobile currently expects no `/api` prefix)
