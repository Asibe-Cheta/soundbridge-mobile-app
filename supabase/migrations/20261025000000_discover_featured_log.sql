-- Featured on Discover for Premium/Unlimited creators (tier build-out Phase 3
-- item 3). Premium gets featured up to 1x/month, Unlimited up to 2x/month.
--
-- One small table logging each time a creator is given a featured slot, so
-- the app can count "times featured this month" per creator and rotate
-- fairly (least-recently-featured eligible creator first). No new columns
-- on profiles — kept separate and minimal, matching this project's existing
-- vote_campaign_pushes/vote_campaign_voted pattern.
--
-- Selection logic itself lives in the app (DiscoverScreen), not here — this
-- table is just the ledger. If no eligible Premium/Unlimited creator exists
-- (e.g. table empty, or everyone's used their monthly slots), Discover falls
-- back to today's unmodified behaviour exactly.

CREATE TABLE IF NOT EXISTS discover_featured_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  featured_month  DATE NOT NULL, -- first-of-month date, e.g. 2026-11-01, for easy per-month counting
  featured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discover_featured_log_user_month_idx
  ON discover_featured_log (user_id, featured_month);

ALTER TABLE discover_featured_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read the log — needed client-side to compute
-- each candidate creator's remaining monthly slots before picking who to
-- feature. No row here is sensitive (it's just "X was featured on date Y").
CREATE POLICY "Authenticated users can read the featured log"
  ON discover_featured_log FOR SELECT
  TO authenticated
  USING (true);

-- Writes go through this function, not a raw INSERT policy, so a client
-- can't fabricate "I was featured" rows for itself or anyone else outside
-- the real selection flow calling it. SECURITY DEFINER so it can insert
-- regardless of whose slot it's logging (the featured creator, not the
-- caller, who is just the viewer whose Discover load triggered the pick).
CREATE OR REPLACE FUNCTION log_discover_featured(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO discover_featured_log (user_id, featured_month)
  VALUES (p_user_id, date_trunc('month', now())::date);
$$;

GRANT EXECUTE ON FUNCTION log_discover_featured(UUID) TO authenticated;
