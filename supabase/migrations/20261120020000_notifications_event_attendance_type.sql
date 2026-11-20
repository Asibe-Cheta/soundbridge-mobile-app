-- Adds 'event_attendance' to notifications_type_check. Rebuilds the
-- constraint dynamically from whatever is currently live (via
-- pg_get_constraintdef) instead of hardcoding the value list, since that's
-- exactly what went wrong last time this constraint needed widening: the
-- hardcoded list in a migration file silently drifted from what's actually
-- on the live table, and an insert using a new type value failed silently
-- (caught and logged, never surfaced) until it was tracked down by hand.

DO $$
DECLARE
  current_def text;
  current_values text[];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO current_def
  FROM pg_constraint
  WHERE conname = 'notifications_type_check' AND conrelid = 'public.notifications'::regclass;

  IF current_def IS NULL THEN
    RAISE EXCEPTION 'notifications_type_check not found on public.notifications';
  END IF;

  IF current_def LIKE '%event_attendance%' THEN
    RAISE NOTICE 'event_attendance already allowed, nothing to do';
  ELSE
    SELECT array_agg(m[1]) INTO current_values
    FROM regexp_matches(current_def, '''([^'']*)''', 'g') AS m;

    EXECUTE 'ALTER TABLE notifications DROP CONSTRAINT notifications_type_check';
    EXECUTE format(
      'ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type::text = ANY (%L::text[]))',
      current_values || ARRAY['event_attendance']
    );
  END IF;
END $$;
