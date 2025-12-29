-- Migration: Add Grace Period Fields for Subscription Downgrade Storage Management
-- Date: 2025-12-29
-- Purpose: Implement 90-day grace period when users downgrade from Premium/Unlimited to Free tier

-- 1. Add grace period tracking fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS storage_at_downgrade BIGINT,
ADD COLUMN IF NOT EXISTS grace_periods_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_grace_period_used TIMESTAMPTZ;

-- 2. Add privacy field to posts table (for marking excess tracks as private after grace period)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 3. Add index for grace period queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_grace_period
ON profiles(grace_period_ends)
WHERE grace_period_ends IS NOT NULL;

-- 4. Add index for private posts queries
CREATE INDEX IF NOT EXISTS idx_posts_privacy
ON posts(user_id, is_private, created_at);

-- 5. Create subscription_changes table to track downgrade history (abuse prevention)
CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_at_change BIGINT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for subscription change queries
CREATE INDEX IF NOT EXISTS idx_subscription_changes_user
ON subscription_changes(user_id, changed_at DESC);

-- 6. Create function to check if user is eligible for grace period
CREATE OR REPLACE FUNCTION is_eligible_for_grace_period(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_grace_periods_used INTEGER;
  v_last_grace_used TIMESTAMPTZ;
  v_recent_changes INTEGER;
BEGIN
  -- Get grace period usage
  SELECT grace_periods_used, last_grace_period_used
  INTO v_grace_periods_used, v_last_grace_used
  FROM profiles
  WHERE id = p_user_id;

  -- First time downgrading = eligible
  IF v_grace_periods_used = 0 OR v_grace_periods_used IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Last grace period was over 12 months ago = eligible
  IF v_last_grace_used < NOW() - INTERVAL '12 months' THEN
    RETURN TRUE;
  END IF;

  -- Count subscription changes in last 12 months (abuse prevention)
  SELECT COUNT(*)
  INTO v_recent_changes
  FROM subscription_changes
  WHERE user_id = p_user_id
    AND changed_at > NOW() - INTERVAL '12 months'
    AND from_tier IN ('premium', 'unlimited')
    AND to_tier = 'free';

  -- More than 3 downgrades in 12 months = not eligible
  IF v_recent_changes >= 3 THEN
    RETURN FALSE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to calculate storage status
CREATE OR REPLACE FUNCTION get_storage_status(p_user_id UUID)
RETURNS TABLE (
  status TEXT,
  days_remaining INTEGER,
  can_upload BOOLEAN
) AS $$
DECLARE
  v_grace_period_ends TIMESTAMPTZ;
  v_subscription_tier TEXT;
BEGIN
  SELECT grace_period_ends, subscription_tier
  INTO v_grace_period_ends, v_subscription_tier
  FROM profiles
  WHERE id = p_user_id;

  -- Active subscription (not in grace period)
  IF v_grace_period_ends IS NULL THEN
    RETURN QUERY SELECT
      'active_subscription'::TEXT,
      0::INTEGER,
      TRUE::BOOLEAN;
    RETURN;
  END IF;

  -- In grace period
  IF NOW() < v_grace_period_ends THEN
    RETURN QUERY SELECT
      'grace_period'::TEXT,
      EXTRACT(DAY FROM v_grace_period_ends - NOW())::INTEGER,
      FALSE::BOOLEAN; -- Cannot upload during grace period if over limit
    RETURN;
  END IF;

  -- Grace period expired
  RETURN QUERY SELECT
    'grace_expired'::TEXT,
    0::INTEGER,
    FALSE::BOOLEAN; -- Cannot upload after grace period expires
END;
$$ LANGUAGE plpgsql;

-- 8. Add comments for documentation
COMMENT ON COLUMN profiles.downgraded_at IS 'Timestamp when user downgraded from paid tier to free tier';
COMMENT ON COLUMN profiles.grace_period_ends IS 'End of 90-day grace period (NULL = no active grace period)';
COMMENT ON COLUMN profiles.storage_at_downgrade IS 'Storage used (in bytes) at time of downgrade';
COMMENT ON COLUMN profiles.grace_periods_used IS 'Number of grace periods used (abuse prevention)';
COMMENT ON COLUMN profiles.last_grace_period_used IS 'Last time grace period was granted';
COMMENT ON COLUMN posts.is_private IS 'TRUE = private/unlisted (owner-only access), FALSE = public';

COMMENT ON TABLE subscription_changes IS 'Tracks subscription tier changes for analytics and abuse prevention';
COMMENT ON FUNCTION is_eligible_for_grace_period IS 'Check if user qualifies for 90-day grace period (max once per year, max 3 downgrades/year)';
COMMENT ON FUNCTION get_storage_status IS 'Returns current storage status: active_subscription, grace_period, or grace_expired';

-- 9. Grant permissions (adjust role names as needed)
-- GRANT SELECT ON subscription_changes TO authenticated;
-- GRANT EXECUTE ON FUNCTION is_eligible_for_grace_period TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_storage_status TO authenticated;
