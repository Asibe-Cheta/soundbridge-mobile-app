# Web Team: `user_availability` Table Required

**Date:** 2026-04-09  
**From:** Mobile team  
**Priority:** High — Urgent Gig Availability screen throws 500 errors without this

---

## Problem

The `GET /api/user/availability` and `PATCH /api/user/availability` REST endpoints return 500. Mobile has switched to **direct Supabase queries** on a `user_availability` table as a working fallback, but the table doesn't exist yet.

---

## Required: Create `user_availability` table

```sql
CREATE TABLE IF NOT EXISTS user_availability (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_for_urgent_gigs BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat               DOUBLE PRECISION,
  current_lng               DOUBLE PRECISION,
  general_area              TEXT,
  general_area_lat          DOUBLE PRECISION,
  general_area_lng          DOUBLE PRECISION,
  max_radius_km             INTEGER NOT NULL DEFAULT 20,
  hourly_rate               NUMERIC(10,2),
  per_gig_rate              NUMERIC(10,2),
  rate_negotiable           BOOLEAN NOT NULL DEFAULT FALSE,
  availability_schedule     JSONB,
  last_location_update      TIMESTAMPTZ,
  dnd_start                 TEXT,        -- e.g. "23:00"
  dnd_end                   TEXT,        -- e.g. "08:00"
  max_notifications_per_day INTEGER NOT NULL DEFAULT 5,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

-- RLS
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own availability"
  ON user_availability FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own availability"
  ON user_availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability"
  ON user_availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow urgent gig matching to read all available providers
CREATE POLICY "Anyone can read available providers"
  ON user_availability FOR SELECT
  TO authenticated
  USING (available_for_urgent_gigs = TRUE);
```

---

## `availability_schedule` JSONB shape

```json
{
  "monday":    { "available": true,  "hours": "09:00-17:00" },
  "tuesday":   { "available": true,  "hours": "09:00-17:00" },
  "wednesday": { "available": true,  "hours": "09:00-17:00" },
  "thursday":  { "available": true,  "hours": "09:00-17:00" },
  "friday":    { "available": true,  "hours": "09:00-17:00" },
  "saturday":  { "available": false, "hours": "all_day" },
  "sunday":    { "available": false, "hours": "all_day" }
}
```

---

## What mobile does

- **GET** → `supabase.from('user_availability').select('*').eq('user_id', userId).single()`  
  — auto-inserts defaults if no row exists (`PGRST116` error = no row)
- **UPSERT** → `supabase.from('user_availability').upsert({...updates, user_id})`
- **Location update** → direct `UPDATE current_lat, current_lng, last_location_update`

REST endpoints (`/api/user/availability`) can be built on top of this table later for web dashboard use — mobile no longer depends on them.
