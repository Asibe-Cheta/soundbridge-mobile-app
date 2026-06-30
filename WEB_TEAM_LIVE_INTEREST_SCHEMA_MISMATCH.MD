# Web Team — live_interest_responses Schema Mismatch

**From:** Mobile team / Justice  
**Date:** 2026-05-31  
**Priority:** High — live interest responses are failing silently right now

---

## What is happening

The mobile live interest prompt is working visually — it shows after 60 seconds
of listening or at track end, the user sees "Would you like to hear this live?",
they tap Yes or Maybe Later. Everything looks correct on screen.

But the response is **never reaching the database**. The insert fails silently
because the mobile code writes columns that do not exist in the table you created.

---

## The mismatch

### What the migration created (`live_interest_responses`)

```sql
id                  uuid
track_id            uuid
user_id             uuid
responded_yes       boolean
availability_preference text
created_at          timestamptz
```

### What mobile actually writes (from `liveInterestService.recordResponse`)

```js
{
  track_id,
  user_id,
  creator_id,           // ← MISSING from table
  responded,            // ← MISSING (mobile uses this, not responded_yes)
  response,             // ← MISSING — 'yes' | 'maybe_later' | 'auto_dismissed'
  availability,         // ← MISSING (mobile uses this, not availability_preference)
  profile_location,     // ← MISSING
  profile_city,         // ← MISSING
  profile_country,      // ← MISSING
  current_location_lat, // ← MISSING
  current_location_lng, // ← MISSING
  current_city,         // ← MISSING
  current_country,      // ← MISSING
  responded_at,         // ← MISSING
}
```

Also: `liveInterestService.getStatsForCreator(creatorId)` filters by `creator_id`
and reads `response`, `availability`, `profile_city`, `profile_country` — none
of which are in the current table. The creator analytics for live interest are
also broken for the same reason.

---

## Why the extra columns matter

- `creator_id` — needed to query "how many people are interested per creator" without joining through audio_tracks every time
- `response` — distinguishes yes / maybe_later / auto_dismissed. "responded_yes" alone loses this nuance
- `availability` — the availability preference (weekends / weekday_evenings / any_time / not_sure) that powers the "Optimal Event Timing" insight in the Audience Intelligence dashboard
- `profile_city` / `profile_country` — the listener's home city. Powers the "Audience Location Overview" in the dashboard
- `current_location_lat/lng` / `current_city` / `current_country` — the listener's GPS city at time of response (more accurate than profile city for touring decisions)
- `responded_at` — timestamp of response (separate from `created_at` which is row creation)

All of these are collected live in the prompt. Dropping them would lose data that the Audience Intelligence dashboard and the Demand-Led Event system both depend on.

---

## What we need from you

Please run the following ALTER TABLE in Supabase (production):

```sql
ALTER TABLE public.live_interest_responses
  ADD COLUMN IF NOT EXISTS creator_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded           boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS response            text        CHECK (response IN ('yes','maybe_later','auto_dismissed')),
  ADD COLUMN IF NOT EXISTS availability        text        CHECK (availability IN ('weekends','weekday_evenings','any_time','not_sure')),
  ADD COLUMN IF NOT EXISTS profile_location    text,
  ADD COLUMN IF NOT EXISTS profile_city        text,
  ADD COLUMN IF NOT EXISTS profile_country     text,
  ADD COLUMN IF NOT EXISTS current_location_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS current_location_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS current_city        text,
  ADD COLUMN IF NOT EXISTS current_country     text,
  ADD COLUMN IF NOT EXISTS responded_at        timestamptz;

-- Index for creator-based queries (used by stats + Audience Intelligence)
CREATE INDEX IF NOT EXISTS idx_lir_creator
  ON public.live_interest_responses(creator_id);

CREATE INDEX IF NOT EXISTS idx_lir_response
  ON public.live_interest_responses(response);
```

---

## Question for the web team

Before we run the above — did the `live_interest_responses` table exist before
the Discovery Intelligence migration? If there was already a version of this
table in the database, please confirm what columns it already has so we don't
accidentally conflict.

If the table was freshly created by the Discovery Intelligence migration, the
ALTER TABLE above is safe to run as-is.

---

## After you run the ALTER TABLE

Mobile needs no code changes — `liveInterestService.recordResponse()` is already
writing all the correct column names. Once the columns exist, responses will
land correctly and the Audience Intelligence creator dashboard will have real data.

The `responded_yes` and `availability_preference` columns that you created can
stay — they do no harm. We just need the additional columns added alongside them.
