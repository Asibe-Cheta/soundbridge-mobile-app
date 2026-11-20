-- Fixes get_nearby_events_for_user (20261119010000_nearby_events_for_feed.sql):
-- it was SECURITY INVOKER (the plpgsql default), so calling it as the
-- `authenticated` role — which is how the app actually calls it — runs it
-- under RLS and that role's own grants, not the elevated access it had when
-- tested directly as the Postgres superuser. Every other client-facing RPC
-- in this codebase is SECURITY DEFINER (event_promotion_reach_rpc,
-- gift_bundle, discover_featured_log) for exactly this reason; this one was
-- the one exception, written without a reason to deviate from that
-- convention. The original migration also never GRANTed base table
-- privileges on event_feed_impressions to authenticated — only EXECUTE on
-- the function — so NearbyEventsService's direct writes to that table
-- (recordShown/recordTap/recordDismiss) were almost certainly failing
-- silently too, by the same fail-closed design meant to guard against the
-- RPC itself erroring.
--
-- SECURITY DEFINER makes the function run with its owner's privileges
-- (bypassing RLS internally), so it needs its own access check in RLS's
-- place: the auth.uid() guard below ensures a caller can still only ever
-- get results for themselves.

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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_city TEXT;
  v_user_location TEXT;
  v_user_latitude DECIMAL;
  v_user_longitude DECIMAL;
  v_user_preferred_distance NUMERIC;
  v_user_city_normalized TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN;
  END IF;

  SELECT p.city, p.location, p.preferred_event_distance
  INTO v_user_city, v_user_location, v_user_preferred_distance
  FROM profiles p
  WHERE p.id = p_user_id;

  SELECT COALESCE(p_override_lat, p.latitude), COALESCE(p_override_lng, p.longitude)
  INTO v_user_latitude, v_user_longitude
  FROM profiles p
  WHERE p.id = p_user_id;

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
      efi_src.event_id AS impression_event_id,
      count(*) AS shown_count,
      max(efi_src.shown_at) AS last_shown_at,
      bool_or(efi_src.tapped_at IS NOT NULL) AS was_tapped,
      bool_or(efi_src.dismissed_at IS NOT NULL) AS was_dismissed
    FROM event_feed_impressions efi_src
    WHERE efi_src.user_id = p_user_id
    GROUP BY efi_src.event_id
  ) efi ON efi.impression_event_id = e.id
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
  ORDER BY efi.last_shown_at ASC NULLS FIRST, e.event_date ASC
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_nearby_events_for_user(uuid, integer, numeric, numeric, numeric) TO authenticated;

-- Original migration RLS-gated this table correctly but never granted the
-- base table privileges those policies assume.
GRANT SELECT, INSERT, UPDATE ON event_feed_impressions TO authenticated;
