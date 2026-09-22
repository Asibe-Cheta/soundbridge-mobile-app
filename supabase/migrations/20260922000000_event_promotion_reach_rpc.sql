-- Item 50: Event Promotion Reach Visualization
-- Read-only, aggregate-only RPC exposing per-city Sent/Reached/Opened counts for an
-- event's own creator. event_notifications has no registered FK/embed for user_id
-- (per web-team confirmation), so this joins profiles explicitly. RLS on
-- event_notifications is bypassed via SECURITY DEFINER; ownership is checked manually
-- so a creator can only ever read their own events' rows — no raw recipient identity
-- is exposed, only per-city counts.

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
    COALESCE(p.city, 'Unknown') AS city,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.status = 'sent') AS sent_count,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.delivered_at IS NOT NULL) AS delivered_count,
    COUNT(DISTINCT en.user_id) FILTER (WHERE en.clicked = true) AS opened_count
  FROM event_notifications en
  JOIN profiles p ON p.id = en.user_id
  WHERE en.event_id = p_event_id
  GROUP BY COALESCE(p.city, 'Unknown')
  ORDER BY sent_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_promotion_reach(uuid) TO authenticated;
