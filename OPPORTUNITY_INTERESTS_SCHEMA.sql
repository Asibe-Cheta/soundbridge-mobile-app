-- ============================================================================
-- OPPORTUNITY INTERESTS SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- This schema supports the Express Interest system for opportunities
-- Service providers can express interest in opportunities and poster can manage them
-- ============================================================================

-- ============================================================================
-- TABLE: opportunity_interests
-- Purpose: Track when service providers express interest in opportunities
-- ============================================================================
CREATE TABLE IF NOT EXISTS opportunity_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL, -- References opportunities table (to be created)
  interested_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Interest details
  reason TEXT NOT NULL CHECK (reason IN ('perfect_fit', 'interested', 'learn_more', 'available')),
  message TEXT, -- Optional custom message from interested user
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',

  -- Poster's response
  custom_message TEXT, -- Poster's acceptance message
  rejection_reason TEXT, -- Optional rejection reason

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(opportunity_id, interested_user_id) -- Can't apply twice to same opportunity

  -- Note: Service provider check enforced via RLS policy, not CHECK constraint
  -- (PostgreSQL doesn't allow subqueries in CHECK constraints)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_opportunity ON opportunity_interests(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_interested_user ON opportunity_interests(interested_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_poster ON opportunity_interests(poster_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_status ON opportunity_interests(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_interests_created_at ON opportunity_interests(created_at DESC);

-- ============================================================================
-- TABLE: opportunity_alerts
-- Purpose: Allow subscribers to get notified of similar opportunities
-- NOTE: ONLY for subscribers (Premium/Unlimited), not free tier
-- ============================================================================
CREATE TABLE IF NOT EXISTS opportunity_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Alert preferences
  keywords TEXT[], -- e.g., ['gospel', 'vocalist', 'UK']
  categories TEXT[], -- e.g., ['collaboration', 'event']
  location TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Source
  created_from_opportunity_id UUID, -- Original opportunity that triggered alert creation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ

  -- Note: Subscriber check enforced via RLS policy, not CHECK constraint
  -- (PostgreSQL doesn't allow subqueries in CHECK constraints)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_user ON opportunity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_enabled ON opportunity_alerts(enabled);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_keywords ON opportunity_alerts USING GIN(keywords);

-- ============================================================================
-- TABLE: opportunities (PLACEHOLDER - may already exist)
-- Purpose: Store job/collaboration/event opportunities posted by service providers
-- ============================================================================
-- NOTE: Check if this table already exists in your database
-- If it exists, you can skip this section
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Opportunity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('collaboration', 'event', 'job')),
  category TEXT, -- e.g., 'music', 'audio_engineering', 'production'

  -- Location & Budget
  location TEXT,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'GBP',

  -- Timeline
  deadline TIMESTAMPTZ,
  start_date TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'filled', 'expired', 'cancelled')) DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  keywords TEXT[], -- For matching with alerts
  required_skills TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ

  -- Note: Service provider check enforced via RLS policy, not CHECK constraint
  -- (PostgreSQL doesn't allow subqueries in CHECK constraints)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_poster ON opportunities(poster_user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_keywords ON opportunities USING GIN(keywords);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE opportunity_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: opportunity_interests
-- ============================================================================

-- Users can view interests they created
CREATE POLICY "Users can view their own interests"
  ON opportunity_interests FOR SELECT
  USING (auth.uid() = interested_user_id);

-- Users can view interests on their opportunities
CREATE POLICY "Posters can view interests on their opportunities"
  ON opportunity_interests FOR SELECT
  USING (auth.uid() = poster_user_id);

-- Service providers can insert interests
CREATE POLICY "Service providers can express interest"
  ON opportunity_interests FOR INSERT
  WITH CHECK (
    auth.uid() = interested_user_id AND
    auth.uid() IN (SELECT user_id FROM service_provider_profiles)
  );

-- Posters can update interests (accept/reject)
CREATE POLICY "Posters can update interests on their opportunities"
  ON opportunity_interests FOR UPDATE
  USING (auth.uid() = poster_user_id);

-- ============================================================================
-- POLICIES: opportunity_alerts
-- ============================================================================

-- Users can view their own alerts
CREATE POLICY "Users can view their own alerts"
  ON opportunity_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Subscribers can create alerts
CREATE POLICY "Subscribers can create alerts"
  ON opportunity_alerts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE subscription_tier IN ('premium', 'unlimited')
    )
  );

-- Users can update their own alerts
CREATE POLICY "Users can update their own alerts"
  ON opportunity_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own alerts
CREATE POLICY "Users can delete their own alerts"
  ON opportunity_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- POLICIES: opportunities
-- ============================================================================

-- Everyone can view active opportunities
CREATE POLICY "Anyone can view active opportunities"
  ON opportunities FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- Service providers can create opportunities
CREATE POLICY "Service providers can create opportunities"
  ON opportunities FOR INSERT
  WITH CHECK (
    auth.uid() = poster_user_id AND
    auth.uid() IN (SELECT user_id FROM service_provider_profiles)
  );

-- Posters can update their own opportunities
CREATE POLICY "Posters can update their own opportunities"
  ON opportunities FOR UPDATE
  USING (auth.uid() = poster_user_id);

-- Posters can delete their own opportunities
CREATE POLICY "Posters can delete their own opportunities"
  ON opportunities FOR DELETE
  USING (auth.uid() = poster_user_id);

-- ============================================================================
-- FUNCTIONS: Notification matching
-- ============================================================================

-- Function to find users with matching alert profiles
CREATE OR REPLACE FUNCTION match_opportunity_alerts(
  p_opportunity_id UUID,
  p_keywords TEXT[],
  p_location TEXT,
  p_category TEXT
)
RETURNS TABLE(user_id UUID, alert_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oa.user_id,
    oa.id as alert_id
  FROM opportunity_alerts oa
  WHERE
    oa.enabled = true
    AND (
      -- Match keywords (array overlap)
      (oa.keywords && p_keywords) OR
      -- Match location
      (oa.location IS NULL OR oa.location = p_location) OR
      -- Match category
      (p_category = ANY(oa.categories))
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Update updated_at on opportunity_alerts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_opportunity_alerts_updated_at
  BEFORE UPDATE ON opportunity_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample opportunity (uncomment to use)
/*
INSERT INTO opportunities (
  poster_user_id,
  title,
  description,
  type,
  location,
  budget_min,
  budget_max,
  keywords
) VALUES (
  'YOUR_USER_ID_HERE',
  'Looking for Gospel Vocalist for Worship Album',
  'We''re producing a new worship album and need a powerful gospel vocalist.',
  'collaboration',
  'Lagos, Nigeria',
  500,
  1000,
  ARRAY['gospel', 'vocalist', 'worship', 'album']
);
*/
