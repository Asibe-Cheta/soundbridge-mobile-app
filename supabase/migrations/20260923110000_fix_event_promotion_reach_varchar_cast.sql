-- Defensive fix for get_event_promotion_reach (20260922000000_event_promotion_reach_rpc.sql),
-- applying the same explicit-cast pattern that just fixed a real, platform-wide outage in
-- find_nearby_users_for_event (web's 20260923100000 migration).
--
-- profiles.city is varchar(50); COALESCE(varchar, 'Unknown') can resolve to varchar rather
-- than text, and this function's RETURN QUERY requires an exact match against its declared
-- RETURNS TABLE(city text, ...) — the identical mismatch shape (Postgres error 42804) that
-- silently zeroed out event notifications entirely. Not confirmed to have actually hit this
-- one yet (Sent has been genuinely 0 for every event regardless, due to the other bug), but
-- the fix costs nothing and the failure mode is identical and equally silent, so applying it
-- defensively rather than waiting to find out the hard way again.

CREATE OR REPLACE FUNCTION get_event_promotion_reach(p_event_id uuid)
RETURNS TABLE(
  city text,
  sent_count bigint,
  delivered_count bigint,
  opened_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this event';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.city, 'Unknown')::text AS city,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.status = 'sent') AS sent_count,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.delivered_at IS NOT NULL) AS delivered_count,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.clicked = true) AS opened_count
  FROM event_notifications en
  JOIN profiles p ON p.id = en.user_id
  WHERE en.event_id = p_event_id
  GROUP BY COALESCE(p.city, 'Unknown')::text
  ORDER BY sent_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_promotion_reach(uuid) TO authenticated;
