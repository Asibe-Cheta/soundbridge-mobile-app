# Web Team — Add live_interest_enabled to audio_tracks + Backfill

**From:** Mobile team / Justice  
**Date:** 2026-05-31  
**Priority:** High — column doesn't exist yet; mobile is already writing to it on upload

---

## Run this SQL in Supabase (production)

Two steps — run them together:

```sql
-- Step 1: Add the column (it does not exist yet)
ALTER TABLE public.audio_tracks
  ADD COLUMN IF NOT EXISTS live_interest_enabled boolean NOT NULL DEFAULT true;

-- Step 2: Backfill all existing tracks to true
-- (default true means new rows already get it, but existing rows need updating)
UPDATE public.audio_tracks
SET live_interest_enabled = true
WHERE live_interest_enabled = false;
```

---

## Why this is needed

Mobile has been writing `live_interest_enabled` on upload for a while, but the
column was never added to the table via a migration. Supabase was silently
ignoring the field on insert. No data was corrupted — tracks just weren't
getting the flag set.

From this OTA onwards, every new music track upload sets `live_interest_enabled = true`
automatically (no creator toggle — default on, opt-out later in track settings).

The backfill turns on live interest for the entire existing catalogue so the
prompt starts working for all tracks, not just newly uploaded ones.

---

## What mobile changed in the same OTA

- Upload form: removed the Live Interest toggle — now always `true` for music
- Track Details screen: added a "Live Interest" toggle in the creator settings
  section as an opt-out (buried, not on the upload form)
- All track fetch queries now include `live_interest_enabled` so the prompt
  actually fires (was always `undefined` before — that was the bug)
