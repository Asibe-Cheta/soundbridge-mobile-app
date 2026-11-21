-- Per-request Gemini usage log, written only by the gemini-proxy edge
-- function (service role), so RLS has no insert/update/delete policy for
-- authenticated/anon — only a select-own policy, so a user can see their
-- own usage history but never anyone else's, and never write to it
-- directly (that would let them fabricate or erase their own cap history).

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_created_idx ON ai_usage_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_log_feature_created_idx ON ai_usage_log (feature, created_at);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_log_select_own ON ai_usage_log
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- ROLLBACK — run only if you need to undo this migration.
-- ============================================================
-- DROP TABLE IF EXISTS ai_usage_log;
