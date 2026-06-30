-- Personalised Event Intelligence — "This Event is For You"
-- Scoring job + Gemini reason generation are web/backend responsibilities.
-- Mobile reads event_match_scores via Supabase client.

CREATE TABLE IF NOT EXISTS event_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons jsonb DEFAULT '{}'::jsonb,
  personalised_reason text,
  indicator_shown boolean NOT NULL DEFAULT false,
  indicator_dismissed boolean NOT NULL DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_match_scores_user_score
  ON event_match_scores (user_id, match_score DESC)
  WHERE indicator_dismissed = false;

CREATE INDEX IF NOT EXISTS idx_event_match_scores_expires
  ON event_match_scores (expires_at);

ALTER TABLE event_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own event match scores"
  ON event_match_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own event match indicator flags"
  ON event_match_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE event_match_scores IS
  'Daily-scored user-event matches for personalised event intelligence.';
COMMENT ON COLUMN event_match_scores.match_reasons IS
  'JSON breakdown of scoring signals (genre, mood, location, calendar, affinity).';
COMMENT ON COLUMN event_match_scores.personalised_reason IS
  'Gemini-generated one-liner for scores >= 75; cached per user-event pair.';
COMMENT ON COLUMN event_match_scores.indicator_shown IS
  'True after user viewed the event in Events picked for you screen.';
COMMENT ON COLUMN event_match_scores.expires_at IS
  'Typically the event start time; rows deleted after event passes.';
