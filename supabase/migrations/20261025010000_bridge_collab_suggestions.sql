-- "Suggested by Bridge" collaborator matching for Premium/Unlimited
-- (tier build-out Phase 4 item 2). Rule-based selection (complementary
-- role, overlapping genre, same country), not ML — this table just tracks
-- what's already been shown/dismissed per user so a dismissed suggestion
-- doesn't keep reappearing, and so a daily AI-explanation-call cap can be
-- computed from real history instead of guessed client-side.

CREATE TABLE IF NOT EXISTS bridge_collab_suggestions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Cached once per pair so re-viewing the same suggestion never re-triggers
  -- an AI call — the daily cap only has to cover genuinely new pairs.
  explanation       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed         BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_at      TIMESTAMPTZ,
  UNIQUE (user_id, suggested_user_id)
);

CREATE INDEX IF NOT EXISTS bridge_collab_suggestions_user_id_idx
  ON bridge_collab_suggestions (user_id);

ALTER TABLE bridge_collab_suggestions ENABLE ROW LEVEL SECURITY;

-- A user reads/writes only their own suggestion history (which other
-- creators they've been shown, and which they dismissed). Never exposes
-- who else has been suggested to whom beyond the row owner.
CREATE POLICY "Users can read their own collab suggestion history"
  ON bridge_collab_suggestions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can log a suggestion shown to them"
  ON bridge_collab_suggestions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can dismiss their own suggestions"
  ON bridge_collab_suggestions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
