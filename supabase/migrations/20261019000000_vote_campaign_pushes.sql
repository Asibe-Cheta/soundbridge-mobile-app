-- "Vote for SoundBridge" campaign (VOTE_FOR_SOUNDBRIDGE.MD)
--
-- Minimal send-tracking for the 3-push campaign: one row per (user, push number)
-- once that push has actually been sent. The campaign's send function checks this
-- table before sending so a restart or a re-run of the dry-run-then-confirm flow
-- can never double-send the same push to the same user. Deliberately scoped to just
-- this campaign (not a generic notification log) per the task's "no new tables
-- unless truly required, minimal" instruction.

CREATE TABLE IF NOT EXISTS vote_campaign_pushes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_number  SMALLINT NOT NULL CHECK (push_number IN (1, 2, 3)),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, push_number)
);

CREATE INDEX IF NOT EXISTS vote_campaign_pushes_user_id_idx ON vote_campaign_pushes (user_id);

ALTER TABLE vote_campaign_pushes ENABLE ROW LEVEL SECURITY;

-- The send function runs with the service role (bypasses RLS) — this policy only
-- covers the hypothetical case of a client ever reading its own send history.
CREATE POLICY "Users can read their own vote campaign push history"
  ON vote_campaign_pushes FOR SELECT
  USING (user_id = auth.uid());
