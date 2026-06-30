# Web Team Handoff — User Behaviour Profile System
**From:** Mobile team / Justice  
**Date:** 2026-06-01  
**Priority:** High — mobile hooks are already deployed; they call RPCs that don't exist yet.
Until the SQL below is run, those calls will fail silently (non-blocking).

---

## Architecture overview

```
Mobile fires signal
  └─ DB trigger catches it automatically   ← plays, tips, bookmarks,
     and updates user_behaviour_profiles       purchases, follows,
                                               live interest,
                                               request-room tips,
                                               new user signup

  └─ Mobile RPC call                       ← app open,
     updates user_behaviour_profiles           event view
     (two signals with no table to trigger on)
```

Everything is fire-and-forget on the mobile side.
Errors are logged but never shown to the user.

---

## Step 1 — Run this SQL in Supabase (production)

Run the entire block in order. It is idempotent — safe to run again if needed.

```sql
-- ═══════════════════════════════════════════════════════════════════
-- 1. MAIN TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_behaviour_profiles (
  user_id                           uuid PRIMARY KEY
                                    REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Event signals
  events_viewed                     integer NOT NULL DEFAULT 0,
  events_bookmarked                 integer NOT NULL DEFAULT 0,
  events_purchased                  integer NOT NULL DEFAULT 0,
  events_attended_via_request_room  integer NOT NULL DEFAULT 0,
  preferred_event_cities            text[]  NOT NULL DEFAULT '{}',
  preferred_event_days              text[]  NOT NULL DEFAULT '{}',
  preferred_event_times             text[]  NOT NULL DEFAULT '{}',

  -- Track signals
  tracks_played                     integer NOT NULL DEFAULT 0,
  tracks_repeat_listened            integer NOT NULL DEFAULT 0,
  tracks_tipped                     integer NOT NULL DEFAULT 0,
  preferred_genres                  text[]  NOT NULL DEFAULT '{}',
  preferred_moods                   text[]  NOT NULL DEFAULT '{}',

  -- Social signals
  creators_followed                 integer NOT NULL DEFAULT 0,
  creators_tipped                   integer NOT NULL DEFAULT 0,
  live_interests_expressed          integer NOT NULL DEFAULT 0,

  -- Session signals
  most_active_day                   text,
  most_active_hour                  integer,
  primary_location_city             text,

  last_updated                      timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can read their own profile; service role has full access
ALTER TABLE public.user_behaviour_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_behaviour_profiles' AND policyname = 'ubp_own_read'
  ) THEN
    CREATE POLICY ubp_own_read ON public.user_behaviour_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 2. APP SESSION LOG  (used to compute most_active_day / hour)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_session_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opened_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_session_log_user_time
  ON public.app_session_log (user_id, opened_at DESC);


-- ═══════════════════════════════════════════════════════════════════
-- 3. HELPER — ensure a profile row exists for a user
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ubp_ensure(p_user_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.user_behaviour_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 4. HELPER — compute top-3 genres from recent plays
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ubp_top_genres(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT array_agg(genre ORDER BY cnt DESC)
     FROM (
       SELECT at.genre, COUNT(*) AS cnt
       FROM   public.play_sessions  ps
       JOIN   public.audio_tracks   at ON at.id = ps.track_id
       WHERE  ps.user_id    = p_user_id
         AND  at.genre      IS NOT NULL
         AND  ps.played_at  > now() - interval '90 days'
       GROUP  BY at.genre
       ORDER  BY cnt DESC
       LIMIT  3
     ) t),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 5. HELPER — compute top-3 moods from completed plays
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.ubp_top_moods(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT array_agg(mood ORDER BY cnt DESC)
     FROM (
       SELECT UNNEST(at.mood_tags) AS mood, COUNT(*) AS cnt
       FROM   public.play_sessions  ps
       JOIN   public.audio_tracks   at ON at.id = ps.track_id
       WHERE  ps.user_id   = p_user_id
         AND  at.mood_tags IS NOT NULL
         AND  ps.completed = true
       GROUP  BY mood
       ORDER  BY cnt DESC
       LIMIT  3
     ) t),
    '{}'::text[]
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 6. TRIGGER — play_sessions → tracks_played, repeat, genres, moods
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_play_session_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prior_plays integer;
BEGIN
  PERFORM public.ubp_ensure(NEW.user_id);

  -- Count previous plays of this track by this user (before this insert)
  SELECT COUNT(*) INTO v_prior_plays
  FROM   public.play_sessions
  WHERE  user_id  = NEW.user_id
    AND  track_id = NEW.track_id
    AND  id       != NEW.id;

  UPDATE public.user_behaviour_profiles
  SET
    tracks_played          = tracks_played + 1,
    tracks_repeat_listened = tracks_repeat_listened
                             + CASE WHEN v_prior_plays > 0 THEN 1 ELSE 0 END,
    preferred_genres       = public.ubp_top_genres(NEW.user_id),
    preferred_moods        = public.ubp_top_moods(NEW.user_id),
    last_updated           = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_play_session_ubp ON public.play_sessions;
CREATE TRIGGER trg_play_session_ubp
  AFTER INSERT ON public.play_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_play_session_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 7. TRIGGER — tips → tracks_tipped / creators_tipped
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_tip_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;

  PERFORM public.ubp_ensure(NEW.sender_id);

  UPDATE public.user_behaviour_profiles
  SET
    tracks_tipped   = tracks_tipped
                      + CASE WHEN NEW.track_id IS NOT NULL THEN 1 ELSE 0 END,
    creators_tipped = creators_tipped
                      + CASE WHEN NEW.track_id IS NULL THEN 1 ELSE 0 END,
    last_updated    = now()
  WHERE user_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tip_ubp ON public.tips;
CREATE TRIGGER trg_tip_ubp
  AFTER INSERT ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.trg_tip_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 8. TRIGGER — event_bookmarks → events_bookmarked, event_days/cities
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_event_bookmark_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_city     text;
  v_day      text;
  v_date     timestamptz;
BEGIN
  PERFORM public.ubp_ensure(NEW.user_id);

  -- Pull city and date from the event
  SELECT location, event_date
  INTO   v_city, v_date
  FROM   public.events
  WHERE  id = NEW.event_id;

  v_day := to_char(v_date AT TIME ZONE 'UTC', 'Day');

  UPDATE public.user_behaviour_profiles
  SET
    events_bookmarked       = events_bookmarked + 1,
    preferred_event_cities  = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    preferred_event_days    = CASE
      WHEN v_day IS NOT NULL AND NOT (preferred_event_days @> ARRAY[trim(v_day)])
      THEN (preferred_event_days || ARRAY[trim(v_day)])[1:7]
      ELSE preferred_event_days
    END,
    last_updated            = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_bookmark_ubp ON public.event_bookmarks;
CREATE TRIGGER trg_event_bookmark_ubp
  AFTER INSERT ON public.event_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.trg_event_bookmark_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 9. TRIGGER — purchased_event_tickets → events_purchased
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_ticket_purchase_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_city text;
BEGIN
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  SELECT location INTO v_city FROM public.events WHERE id = NEW.event_id;

  UPDATE public.user_behaviour_profiles
  SET
    events_purchased        = events_purchased + 1,
    preferred_event_cities  = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    last_updated            = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_purchase_ubp ON public.purchased_event_tickets;
CREATE TRIGGER trg_ticket_purchase_ubp
  AFTER INSERT ON public.purchased_event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_purchase_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 10. TRIGGER — follows → creators_followed
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_follow_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.ubp_ensure(NEW.follower_id);

  UPDATE public.user_behaviour_profiles
  SET
    creators_followed = creators_followed + 1,
    last_updated      = now()
  WHERE user_id = NEW.follower_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_follow_ubp ON public.follows;
CREATE TRIGGER trg_follow_ubp
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trg_follow_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 11. TRIGGER — live_interest_responses → live_interests_expressed
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_live_interest_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only count positive responses
  IF NEW.responded_yes IS NOT TRUE AND NEW.response != 'yes' THEN
    RETURN NEW;
  END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  UPDATE public.user_behaviour_profiles
  SET
    live_interests_expressed = live_interests_expressed + 1,
    last_updated             = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_interest_ubp ON public.live_interest_responses;
CREATE TRIGGER trg_live_interest_ubp
  AFTER INSERT ON public.live_interest_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_live_interest_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 12. TRIGGER — request_room_requests → events_attended_via_request_room
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_request_room_tip_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only count rows where the user paid a tip (tip_amount > 0)
  IF NEW.tip_amount IS NULL OR NEW.tip_amount <= 0 THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM public.ubp_ensure(NEW.user_id);

  UPDATE public.user_behaviour_profiles
  SET
    events_attended_via_request_room = events_attended_via_request_room + 1,
    last_updated                     = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_room_tip_ubp ON public.request_room_requests;
CREATE TRIGGER trg_request_room_tip_ubp
  AFTER INSERT ON public.request_room_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_request_room_tip_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 13. TRIGGER — profiles INSERT → create blank behaviour profile on signup
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trg_new_user_ubp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_behaviour_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user_ubp ON public.profiles;
CREATE TRIGGER trg_new_user_ubp
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_new_user_ubp();


-- ═══════════════════════════════════════════════════════════════════
-- 14. RPC — record_app_open  (called from mobile on every foreground)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_app_open(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day  text;
  v_hour integer;
BEGIN
  -- Log the session
  INSERT INTO public.app_session_log (user_id) VALUES (p_user_id);

  -- Compute mode day and hour from last 30 days
  SELECT
    to_char(opened_at AT TIME ZONE 'UTC', 'FMDay'),
    EXTRACT(hour FROM opened_at AT TIME ZONE 'UTC')::integer
  INTO v_day, v_hour
  FROM public.app_session_log
  WHERE user_id = p_user_id
    AND opened_at > now() - interval '30 days'
  GROUP BY 1, 2
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Upsert behaviour profile
  INSERT INTO public.user_behaviour_profiles
    (user_id, most_active_day, most_active_hour, last_updated)
  VALUES
    (p_user_id, v_day, v_hour, now())
  ON CONFLICT (user_id) DO UPDATE SET
    most_active_day  = EXCLUDED.most_active_day,
    most_active_hour = EXCLUDED.most_active_hour,
    last_updated     = now();
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 15. RPC — record_event_view  (called from mobile when EventDetailsScreen loads)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.record_event_view(
  p_user_id  uuid,
  p_event_id uuid,
  p_city     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_city text := COALESCE(p_city, (SELECT location FROM public.events WHERE id = p_event_id));
BEGIN
  PERFORM public.ubp_ensure(p_user_id);

  UPDATE public.user_behaviour_profiles
  SET
    events_viewed          = events_viewed + 1,
    preferred_event_cities = CASE
      WHEN v_city IS NOT NULL AND NOT (preferred_event_cities @> ARRAY[v_city])
      THEN (preferred_event_cities || ARRAY[v_city])[1:10]
      ELSE preferred_event_cities
    END,
    last_updated           = now()
  WHERE user_id = p_user_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 16. ONE-TIME MIGRATION — backfill all existing users
-- ═══════════════════════════════════════════════════════════════════
-- Run this ONCE after the table and triggers are created.
-- It inserts blank rows for every user who signed up before this system.
-- New users will get their row automatically via the profiles INSERT trigger.

INSERT INTO public.user_behaviour_profiles (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 17. OPTIONAL MAINTENANCE — auto-prune app_session_log (keep 90 days)
-- ═══════════════════════════════════════════════════════════════════
-- Add this as a Supabase cron job (pg_cron) running nightly:
--
-- SELECT cron.schedule(
--   'prune-app-session-log',
--   '0 3 * * *',   -- 3 AM UTC
--   $$DELETE FROM public.app_session_log WHERE opened_at < now() - interval '90 days'$$
-- );
```

---

## Step 2 — Grant RPC access

```sql
GRANT EXECUTE ON FUNCTION public.record_app_open(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_event_view(uuid, uuid, text) TO authenticated;
```

---

## Step 3 — Verify triggers are live

```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM   information_schema.triggers
WHERE  trigger_name LIKE 'trg_%_ubp'
ORDER  BY event_object_table;
```

Expected output (8 rows):

| trigger_name | event_object_table |
|---|---|
| trg_event_bookmark_ubp | event_bookmarks |
| trg_follow_ubp | follows |
| trg_live_interest_ubp | live_interest_responses |
| trg_new_user_ubp | profiles |
| trg_play_session_ubp | play_sessions |
| trg_request_room_tip_ubp | request_room_requests |
| trg_ticket_purchase_ubp | purchased_event_tickets |
| trg_tip_ubp | tips |

---

## Step 4 — Spot-check a user

```sql
SELECT * FROM public.user_behaviour_profiles
WHERE user_id = '55b5bc91-5f6a-4155-9594-2e0237417976';  -- Justice's UID
```

---

## Signal mapping summary

| User action | Table that triggers | Field(s) updated |
|---|---|---|
| Play a track | play_sessions INSERT | tracks_played, preferred_genres, preferred_moods |
| Play same track again | play_sessions INSERT | tracks_repeat_listened |
| Tip a track | tips INSERT (status=completed, track_id set) | tracks_tipped |
| Tip a creator | tips INSERT (status=completed, track_id NULL) | creators_tipped |
| View an event | Mobile RPC call | events_viewed, preferred_event_cities |
| Bookmark an event | event_bookmarks INSERT | events_bookmarked, preferred_event_cities, preferred_event_days |
| Buy a ticket | purchased_event_tickets INSERT | events_purchased, preferred_event_cities |
| Tip via Request Room | request_room_requests INSERT (tip_amount > 0) | events_attended_via_request_room |
| Follow a creator | follows INSERT | creators_followed |
| Express live interest | live_interest_responses INSERT (responded_yes=true) | live_interests_expressed |
| Open the app | Mobile RPC call | most_active_day, most_active_hour |
| Sign up | profiles INSERT | Creates blank user_behaviour_profiles row |

---

## What mobile already deployed

Mobile OTA was pushed on 2026-06-01. The following hooks are live:

- `UserBehaviourService.recordAppOpen()` — called every time app comes to foreground (AuthContext AppState handler)
- `UserBehaviourService.recordEventView()` — called when EventDetailsScreen loads a valid event
- `UserBehaviourService.updatePrimaryCity()` — available for future use (profile city sync)

Both call the RPCs defined in Steps 14–15 above. Until those RPCs exist they fail silently and log a warning. After you run the SQL, they will start recording automatically with no further mobile changes needed.

---

## Notes

**preferred_genres** is recomputed from play_sessions on every play (last 90 days window). For users with thousands of plays this is a light indexed query and should be fast. Monitor query time after launch.

**preferred_moods** is computed from completed plays only (plays where the user listened past the 90% threshold). mood_tags comes from audio_tracks.mood_tags (text array).

**most_active_day / hour** uses a true mode (most frequent value) from the last 30 days of app_session_log. The app_session_log table should be pruned monthly — see Step 17 for the cron schedule.

**app_session_log deduplication** — mobile calls record_app_open on every foreground transition, including lock-screen unlock. This is intentional. The mode computation naturally absorbs noisy opens.

🙏🏾
