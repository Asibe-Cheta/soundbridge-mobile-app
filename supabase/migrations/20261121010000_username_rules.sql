-- Username change rules: reserved names, length/charset, 30-day cooldown,
-- and a history table so old links/QR codes keep resolving after a rename.
--
-- Deliberately enforced with a BEFORE UPDATE trigger on profiles, not just
-- in app code. The actual username update today goes through the web app's
-- /api/profile/update route, which isn't in this repo — a client-side-only
-- check there would be easy to bypass and wouldn't touch mobile's own
-- direct-to-Supabase paths either. A trigger fires for every path that
-- updates profiles.username (web API, mobile, admin tooling, future
-- features) with no extra code needed on any of them. SECURITY DEFINER
-- for the same reason as get_nearby_events_for_user earlier this session:
-- it must insert into username_history and read reserved_usernames
-- regardless of which role (authenticated, service_role) performed the
-- UPDATE.
--
-- Known gap: this only covers accounts whose first-ever username change is
-- made after this migration runs. username_changed_at starts NULL for
-- everyone (including existing users who already changed their username
-- before today), so per the "first change is always allowed" rule, the
-- next change for every existing user is treated as their first — that's
-- intentional and matches what was asked, not an oversight.

CREATE TABLE IF NOT EXISTS reserved_usernames (
  username text PRIMARY KEY
);

-- Keep this list in sync with src/constants/reservedUsernames.ts (that
-- copy exists only for instant client-side feedback without a network
-- round trip — this table is the real enforcement). Web app's own
-- top-level routes still need to be merged in once the web team supplies
-- them.
INSERT INTO reserved_usernames (username) VALUES
  ('soundbridge'), ('soundbridgeteam'), ('soundbridgelive'), ('official'),
  ('admin'), ('administrator'), ('support'), ('help'), ('helpdesk'),
  ('contact'), ('staff'), ('team'), ('moderator'), ('mod'), ('system'),
  ('root'), ('security'), ('abuse'), ('legal'), ('privacy'), ('terms'),
  ('api'), ('www'), ('app'), ('mail'), ('email'), ('ftp'), ('cdn'),
  ('static'), ('assets'),
  ('home'), ('feed'), ('explore'), ('discover'), ('connect'), ('upload'),
  ('profile'), ('profiles'), ('settings'), ('setting'), ('account'),
  ('login'), ('logout'), ('signup'), ('signin'), ('register'), ('auth'),
  ('onboarding'), ('notifications'), ('messages'), ('wallet'), ('tip'),
  ('tips'), ('join'), ('events'), ('event'), ('live'), ('tracks'),
  ('track'), ('album'), ('albums'), ('playlist'), ('playlists'), ('post'),
  ('posts'), ('collaboration'), ('collaborations'), ('opportunity'),
  ('opportunities'), ('creator'), ('creators'), ('artist'), ('artists'),
  ('venue'), ('venues')
ON CONFLICT (username) DO NOTHING;

ALTER TABLE reserved_usernames ENABLE ROW LEVEL SECURITY;
-- Public select: non-sensitive reference data (just blocked words), and the
-- client may want to query it directly in future instead of only using its
-- local copy. No insert/update/delete policy — only the SECURITY DEFINER
-- trigger function below can modify it, same pattern as username_history.
CREATE POLICY reserved_usernames_select_all ON reserved_usernames
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_username text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS username_history_old_username_idx ON username_history (lower(old_username));
CREATE INDEX IF NOT EXISTS username_history_user_id_idx ON username_history (user_id);

ALTER TABLE username_history ENABLE ROW LEVEL SECURITY;
-- Public select: resolving an old username to a profile has to work for
-- anonymous link clicks, not just the profile owner. No insert/update/
-- delete policy for anyone — only the trigger (SECURITY DEFINER) writes here.
CREATE POLICY username_history_select_all ON username_history
  FOR SELECT USING (true);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

-- Case-insensitive uniqueness. If this fails with a duplicate-key error,
-- two existing profiles differ only by case — resolve that manually
-- before re-running (query below finds them):
--   SELECT lower(username), array_agg(id) FROM profiles
--   GROUP BY lower(username) HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON profiles (lower(username));

CREATE OR REPLACE FUNCTION enforce_username_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF length(NEW.username) < 3 OR length(NEW.username) > 30 THEN
      RAISE EXCEPTION 'Username must be between 3 and 30 characters';
    END IF;

    IF NEW.username !~ '^[a-z0-9_]+$' THEN
      RAISE EXCEPTION 'Username can only contain lowercase letters, numbers, and underscores';
    END IF;

    IF EXISTS (SELECT 1 FROM reserved_usernames WHERE username = lower(NEW.username)) THEN
      RAISE EXCEPTION 'This username is reserved and cannot be used';
    END IF;

    IF OLD.username_changed_at IS NOT NULL
       AND now() - OLD.username_changed_at < interval '30 days' THEN
      RAISE EXCEPTION 'Username can next be changed on %', to_char(OLD.username_changed_at + interval '30 days', 'YYYY-MM-DD');
    END IF;

    INSERT INTO username_history (user_id, old_username, changed_at)
    VALUES (OLD.id, OLD.username, now());

    NEW.username_changed_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_username_rules_trigger ON profiles;
CREATE TRIGGER enforce_username_rules_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_username_rules();

-- ============================================================
-- ROLLBACK — run only if you need to undo this migration.
-- ============================================================
-- DROP TRIGGER IF EXISTS enforce_username_rules_trigger ON profiles;
-- DROP FUNCTION IF EXISTS enforce_username_rules();
-- DROP INDEX IF EXISTS profiles_username_lower_unique;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS username_changed_at;
-- DROP TABLE IF EXISTS username_history;
-- DROP TABLE IF EXISTS reserved_usernames;
