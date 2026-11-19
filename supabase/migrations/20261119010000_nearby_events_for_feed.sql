-- Supports the "Happening near you" module in the Feed's For You tab.
--
-- get_nearby_events_for_user is the user-centric mirror of
-- find_nearby_users_for_event (20261116010000_event_reminders_support.sql):
-- same four location-match branches (exact city, radius capped at 100km
-- honouring the viewer's own preferred_event_distance, normalised city,
-- normalised location-contains), just with the user's own location fixed
-- and compared against each candidate event instead of the other way
-- round. Deliberately not get_personalized_events: that function has no
-- location filter at all (it ranks by distance but still returns every
-- future public event when nothing is close, by design, for its existing
-- "Events for you" mid-feed strip) and no awareness of per-event impression
-- history. Reusing it here would either break that existing strip's
-- intentionally broad fallback or require branching its one query into two
-- unrelated behaviours.
--
-- event_feed_impressions is new: no impression/tap-tracking table existed
-- that mobile could read back (notification_history is a server-side push
-- dedupe log; EventPromotionTrackingService is a write-only backend
-- endpoint, not a table). It drives the frequency cap entirely inside this
-- function, so the client has no exclusion logic of its own to get wrong:
-- an event a user already tapped or dismissed, or that's already been
-- shown 3 times, or was last shown less than a day ago, is simply absent
-- from the result.

CREATE TABLE IF NOT EXISTS event_feed_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shown_at timestamptz NOT NULL DEFAULT now(),
  tapped_at timestamptz,
  dismissed_at timestamptz
);

CREATE INDEX IF NOT EXISTS event_feed_impressions_user_event_idx
  ON event_feed_impressions (user_id, event_id);

ALTER TABLE event_feed_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_feed_impressions_select_own ON event_feed_impressions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY event_feed_impressions_insert_own ON event_feed_impressions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY event_feed_impressions_update_own ON event_feed_impressions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_nearby_events_for_user(
  p_user_id uuid,
  p_limit integer DEFAULT 2,
  p_max_distance_km numeric DEFAULT 20,
  p_override_lat numeric DEFAULT NULL,
  p_override_lng numeric DEFAULT NULL
)
RETURNS TABLE(
  event_id uuid,
  title text,
  event_date timestamptz,
  location text,
  venue text,
  city text,
  country text,
  category text,
  ticket_price numeric,
  tickets_available integer,
  image_url text,
  distance_km numeric
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_city TEXT;
  v_user_location TEXT;
  v_user_latitude DECIMAL;
  v_user_longitude DECIMAL;
  v_user_preferred_distance NUMERIC;
  v_user_city_normalized TEXT;
BEGIN
  SELECT p.city, p.location, p.preferred_event_distance
  INTO v_user_city, v_user_location, v_user_preferred_distance
  FROM profiles p
  WHERE p.id = p_user_id;

  SELECT COALESCE(p_override_lat, p.latitude), COALESCE(p_override_lng, p.longitude)
  INTO v_user_latitude, v_user_longitude
  FROM profiles p
  WHERE p.id = p_user_id;

  -- No usable location at all (new signup, or a cleaned profile with every
  -- location field cleared, and no device coordinates passed in either) —
  -- return empty, never an error and never an unfiltered dump of events.
  -- The feed module shows its own "set your location" prompt when this
  -- comes back empty.
  IF v_user_city IS NULL AND v_user_location IS NULL AND v_user_latitude IS NULL THEN
    RETURN;
  END IF;

  v_user_city_normalized := regexp_replace(LOWER(COALESCE(v_user_city, '')), '[^a-z]', '', 'g');

  RETURN QUERY
  SELECT
    e.id,
    e.title::TEXT,
    e.event_date,
    e.location::TEXT,
    e.venue::TEXT,
    e.city::TEXT,
    e.country::TEXT,
    e.category::TEXT,
    e.ticket_price,
    e.tickets_available,
    e.image_url::TEXT,
    CASE
      WHEN e.latitude IS NOT NULL AND e.longitude IS NOT NULL
           AND v_user_latitude IS NOT NULL AND v_user_longitude IS NOT NULL THEN
        (
          6371 * acos(
            cos(radians(e.latitude)) *
            cos(radians(v_user_latitude)) *
            cos(radians(v_user_longitude) - radians(e.longitude)) +
            sin(radians(e.latitude)) *
            sin(radians(v_user_latitude))
          )
        )::numeric
      ELSE NULL
    END AS distance_km
  FROM events e
  LEFT JOIN (
    SELECT
      event_id,
      count(*) AS shown_count,
      max(shown_at) AS last_shown_at,
      bool_or(tapped_at IS NOT NULL) AS was_tapped,
      bool_or(dismissed_at IS NOT NULL) AS was_dismissed
    FROM event_feed_impressions
    WHERE user_id = p_user_id
    GROUP BY event_id
  ) efi ON efi.event_id = e.id
  WHERE
    e.creator_id != p_user_id
    AND e.status = 'active'
    AND e.cancelled_at IS NULL
    AND e.event_date >= now()
    AND e.event_date <= now() + interval '30 days'
    AND COALESCE(efi.was_tapped, false) = false
    AND COALESCE(efi.was_dismissed, false) = false
    AND COALESCE(efi.shown_count, 0) < 3
    AND (efi.last_shown_at IS NULL OR efi.last_shown_at < now() - interval '1 day')
    AND (
      (v_user_city IS NOT NULL AND e.city IS NOT NULL AND LOWER(e.city) = LOWER(v_user_city))
      OR (
        e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        AND v_user_latitude IS NOT NULL AND v_user_longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(e.latitude)) *
            cos(radians(v_user_latitude)) *
            cos(radians(v_user_longitude) - radians(e.longitude)) +
            sin(radians(e.latitude)) *
            sin(radians(v_user_latitude))
          )
        ) <= LEAST(COALESCE(v_user_preferred_distance, p_max_distance_km), 100)
      )
      OR (
        length(v_user_city_normalized) >= 4
        AND regexp_replace(LOWER(COALESCE(e.city, '')), '[^a-z]', '', 'g') = v_user_city_normalized
      )
      OR (
        length(regexp_replace(LOWER(COALESCE(e.city, '')), '[^a-z]', '', 'g')) >= 4
        AND regexp_replace(LOWER(COALESCE(v_user_location, '')), '[^a-z]', '', 'g') LIKE
            '%' || regexp_replace(LOWER(COALESCE(e.city, '')), '[^a-z]', '', 'g') || '%'
      )
    )
  -- Events the user hasn't seen before sort first (NULLS FIRST on
  -- last_shown_at), so a brand-new match always wins over a re-show.
  ORDER BY efi.last_shown_at ASC NULLS FIRST, e.event_date ASC
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_nearby_events_for_user(uuid, integer, numeric, numeric, numeric) TO authenticated;
