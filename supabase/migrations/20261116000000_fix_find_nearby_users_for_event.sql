-- Fix find_nearby_users_for_event: it only ever matched on an exact
-- LOWER(p.city) = LOWER(event city) comparison or a lat/lng radius. Almost no
-- real profile has latitude/longitude set (29 of 2,574+ platform-wide,
-- confirmed live), and profiles.city is itself mostly empty or stale (1 of
-- 84 real Port Harcourt profiles even has it set). The actual place people
-- typed their city is profiles.location, which this function never read at
-- all. Net effect: event notifications reached almost nobody, for any event,
-- in any city, since this function was written.
--
-- Three additions, nothing else touched. The two pre-existing match
-- branches (exact p.city, lat/lng radius) are left byte-for-byte as they
-- were.
--
-- 1. Two new OR branches on the final location/distance match: a normalised
--    (lowercase, letters only) comparison of p.city against the event city,
--    and a normalised "contains" check against p.location. Guarded so the
--    normalised event city needs at least 4 letters, to avoid a short city
--    name matching as a substring of something unrelated.
-- 2. Internal/test accounts (profiles.is_internal_team = true) are excluded
--    from matching entirely, so they stop appearing in real event reach.
-- 3. The lat/lng radius branch now honours each user's own
--    profiles.preferred_event_distance (column default 25km) instead of
--    always using the function's single p_max_distance_km argument, capped
--    at 100km so a bad value can't make someone eligible for events far
--    outside any reasonable "nearby". Falls back to p_max_distance_km when
--    a profile has no preference set.

CREATE OR REPLACE FUNCTION public.find_nearby_users_for_event(p_event_id uuid, p_max_distance_km numeric DEFAULT 20)
 RETURNS TABLE(user_id uuid, expo_push_token text, username text, display_name text, city text, distance_km numeric, preferred_categories text[], start_hour integer, end_hour integer, timezone text, preferred_notification_times text[], event_planning_window text, active_event_months integer[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_event_city TEXT;
  v_event_latitude DECIMAL;
  v_event_longitude DECIMAL;
  v_event_category TEXT;
  v_event_creator UUID;
  v_mapped_category TEXT;
  v_event_city_normalized TEXT;
BEGIN
  SELECT
    e.city,
    e.latitude,
    e.longitude,
    e.category::text,
    e.creator_id
  INTO
    v_event_city,
    v_event_latitude,
    v_event_longitude,
    v_event_category,
    v_event_creator
  FROM events e
  WHERE e.id = p_event_id;

  IF v_event_category IS NULL THEN
    RETURN;
  END IF;

  v_mapped_category := CASE v_event_category
    WHEN 'Gospel' THEN 'Gospel Concert'
    WHEN 'Jazz' THEN 'Jazz Room'
    WHEN 'Classical' THEN 'Instrumental'
    WHEN 'Carnival' THEN 'Carnival'
    WHEN 'Christian' THEN 'Gospel Concert'
    WHEN 'Hip-Hop' THEN 'Music Concert'
    WHEN 'Afrobeat' THEN 'Music Concert'
    WHEN 'Rock' THEN 'Music Concert'
    WHEN 'Pop' THEN 'Music Concert'
    WHEN 'Secular' THEN 'Music Concert'
    WHEN 'Other' THEN 'Other'
    ELSE v_event_category
  END;

  -- Lowercase, letters only, so "Port Harcourt", "Port  harcourt" and
  -- "PortHarcourt" all normalise to the same string.
  v_event_city_normalized := regexp_replace(LOWER(COALESCE(v_event_city, '')), '[^a-z]', '', 'g');

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(p.expo_push_token, upt.push_token)::TEXT AS expo_push_token,
    p.username::TEXT,
    p.display_name::TEXT,
    p.city::TEXT,
    CASE
      WHEN v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL
           AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        (
          6371 * acos(
            cos(radians(v_event_latitude)) *
            cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(v_event_longitude)) +
            sin(radians(v_event_latitude)) *
            sin(radians(p.latitude))
          )
        )::numeric
      ELSE NULL
    END AS distance_km,
    COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]) AS preferred_categories,
    COALESCE(np_main.start_hour, unp.notification_start_hour, 8)::INTEGER AS start_hour,
    COALESCE(np_main.end_hour, unp.notification_end_hour, 22)::INTEGER AS end_hour,
    COALESCE(np_main.timezone, 'UTC')::TEXT AS timezone,
    COALESCE(np_main.preferred_notification_times, ARRAY['any_time']::TEXT[]) AS preferred_notification_times,
    COALESCE(np_main.event_planning_window, 'any_time')::TEXT AS event_planning_window,
    COALESCE(np_main.active_event_months, ARRAY[]::INTEGER[]) AS active_event_months
  FROM profiles p
  LEFT JOIN notification_preferences np_main ON np_main.user_id = p.id
  LEFT JOIN user_notification_preferences unp ON unp.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT push_token
    FROM user_push_tokens upt_src
    WHERE upt_src.user_id = p.id
    ORDER BY last_used_at DESC
    LIMIT 1
  ) upt ON TRUE
  WHERE
    p.id != v_event_creator
    AND COALESCE(p.is_internal_team, false) = false
    AND (p.expo_push_token IS NOT NULL OR upt.push_token IS NOT NULL)
    AND (
      (np_main.user_id IS NULL AND unp.user_id IS NULL)
      OR
      (np_main.user_id IS NOT NULL AND COALESCE(np_main.enabled, true) = true AND COALESCE(np_main.event_notifications_enabled, true) = true)
      OR
      (np_main.user_id IS NULL AND unp.user_id IS NOT NULL AND COALESCE(unp.event_notifications_enabled, true) = true)
    )
    AND (
      (array_length(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]), 1) IS NULL)
      OR (v_mapped_category = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[])))
      OR (
        v_mapped_category = 'Other'
        AND (
          'Conference' = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]))
          OR 'Conferences & Seminars' = ANY(COALESCE(np_main.preferred_event_genres, unp.preferred_event_genres, ARRAY[]::TEXT[]))
        )
      )
    )
    AND (
      (v_event_city IS NOT NULL AND p.city IS NOT NULL AND LOWER(p.city) = LOWER(v_event_city))
      OR (
        v_event_latitude IS NOT NULL AND v_event_longitude IS NOT NULL
        AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(v_event_latitude)) *
            cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(v_event_longitude)) +
            sin(radians(v_event_latitude)) *
            sin(radians(p.latitude))
          )
        ) <= LEAST(COALESCE(p.preferred_event_distance, p_max_distance_km), 100)
      )
      -- New: normalised exact match on profiles.city
      OR (
        length(v_event_city_normalized) >= 4
        AND regexp_replace(LOWER(COALESCE(p.city, '')), '[^a-z]', '', 'g') = v_event_city_normalized
      )
      -- New: normalised "contains" match on profiles.location, the field
      -- users actually typed their city into during onboarding.
      OR (
        length(v_event_city_normalized) >= 4
        AND regexp_replace(LOWER(COALESCE(p.location, '')), '[^a-z]', '', 'g') LIKE '%' || v_event_city_normalized || '%'
      )
    );
END;
$function$
