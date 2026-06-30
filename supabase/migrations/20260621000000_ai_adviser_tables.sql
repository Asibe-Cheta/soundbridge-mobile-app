-- AI Career Adviser tables
-- Part 3 of AI_CAREER_ADVISOR_REAL_IMPLEMENTATION.MD

-- Usage tracking per billing period
CREATE TABLE IF NOT EXISTS ai_adviser_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  chats_used INTEGER NOT NULL DEFAULT 0,
  free_demo_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, billing_period_start)
);

-- Stored analysis results
CREATE TABLE IF NOT EXISTS ai_adviser_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Persisted chat conversations
CREATE TABLE IF NOT EXISTS ai_adviser_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: creators can only read/write their own rows
ALTER TABLE ai_adviser_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adviser_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_adviser_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_adviser_usage_self" ON ai_adviser_usage
  FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "ai_adviser_analyses_self" ON ai_adviser_analyses
  FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "ai_adviser_conversations_self" ON ai_adviser_conversations
  FOR ALL USING (auth.uid() = creator_id);
