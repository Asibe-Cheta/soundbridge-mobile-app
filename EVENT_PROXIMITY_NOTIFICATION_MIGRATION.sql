-- Event Proximity & Notification System - Database Migration
-- Date: December 30, 2025
-- Purpose: Enable city-based event filtering, proximity sorting, and category-based notifications

-- ============================================================================
-- PART 1: ADD CITY/STATE COLUMNS TO TABLES
-- ============================================================================

-- Add city and state fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;  -- Alternative name for state

-- Add city and state fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;

-- ============================================================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Events: Index on city for fast city-based filtering
CREATE INDEX IF NOT EXISTS idx_events_city
ON events(city)
WHERE city IS NOT NULL;

-- Events: Index on coordinates for proximity calculations
CREATE INDEX IF NOT EXISTS idx_events_coordinates
ON events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Events: Index on event_date for sorting
CREATE INDEX IF NOT EXISTS idx_events_date
ON events(event_date)
WHERE event_date >= NOW();

-- Events: Index on category for filtering
CREATE INDEX IF NOT EXISTS idx_events_category
ON events(category)
WHERE category IS NOT NULL;

-- Profiles: Index on city for finding users in same city
CREATE INDEX IF NOT EXISTS idx_profiles_city
ON profiles(city)
WHERE city IS NOT NULL;

-- Profiles: Index on push tokens for notification delivery
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
ON profiles(expo_push_token)
WHERE expo_push_token IS NOT NULL;

-- ============================================================================
-- PART 3: CREATE NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Master control
  enabled BOOLEAN DEFAULT true,

  -- Time window (all notifications respect this)
  start_hour INTEGER DEFAULT 8,   -- 8 AM
  end_hour INTEGER DEFAULT 22,    -- 10 PM
  timezone TEXT DEFAULT 'UTC',

  -- Type-specific toggles
  event_notifications_enabled BOOLEAN DEFAULT true,
  message_notifications_enabled BOOLEAN DEFAULT true,
  tip_notifications_enabled BOOLEAN DEFAULT true,
  collaboration_notifications_enabled BOOLEAN DEFAULT true,
  wallet_notifications_enabled BOOLEAN DEFAULT true,

  -- Event category filtering (array of category names)
  preferred_event_categories TEXT[] DEFAULT '{}',

  -- Location for proximity filtering
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user preference lookup
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
ON notification_preferences(user_id);

-- Index for finding users with event notifications enabled
CREATE INDEX IF NOT EXISTS idx_notification_preferences_events_enabled
ON notification_preferences(user_id, enabled, event_notifications_enabled)
WHERE enabled = true AND event_notifications_enabled = true;

-- ============================================================================
-- PART 4: CREATE NOTIFICATION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL,  -- 'event', 'tip', 'message', etc.
  title TEXT,
  body TEXT,
  data JSONB,  -- Additional payload data

  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user's notification history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_sent
ON notification_history(user_id, sent_at DESC);

-- Index for daily quota checking (last 24 hours)
CREATE INDEX IF NOT EXISTS idx_notification_history_daily_quota
ON notification_history(user_id, type, sent_at)
WHERE sent_at >= NOW() - INTERVAL '24 hours';

-- Index for event notifications
CREATE INDEX IF NOT EXISTS idx_notification_history_event
ON notification_history(event_id)
WHERE event_id IS NOT NULL;

-- ============================================================================
-- PART 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius DECIMAL := 6371; -- Earth radius in kilometers
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Handle NULL coordinates
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO service_role;

-- ============================================================================
-- PART 6: CREATE PERSONALIZED EVENTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_max_distance_km INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  event_time TEXT,
  location TEXT,
  venue_name TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  country TEXT,
  city TEXT,
  state TEXT,
  category TEXT,
  price_gbp DECIMAL,
  price_ngn DECIMAL,
  max_attendees INTEGER,
  tickets_available INTEGER,
  image_url TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL,
  has_coordinates BOOLEAN
) AS $$
DECLARE
  v_user_lat DECIMAL;
  v_user_lon DECIMAL;
  v_user_city TEXT;
  v_user_categories TEXT[];
BEGIN
  -- Get user's location and preferences
  SELECT p.latitude, p.longitude, p.city INTO v_user_lat, v_user_lon, v_user_city
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Get user's preferred event categories
  SELECT np.preferred_event_categories INTO v_user_categories
  FROM notification_preferences np
  WHERE np.user_id = p_user_id;

  -- Return personalized events
  RETURN QUERY
  SELECT
    e.id,
    e.creator_id,
    e.title,
    e.description,
    e.event_date,
    e.event_time,
    e.location,
    e.venue_name,
    e.latitude,
    e.longitude,
    e.country,
    e.city,
    e.state,
    e.category,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.tickets_available,
    e.image_url,
    e.is_public,
    e.created_at,
    e.updated_at,
    -- Calculate distance (NULL if user or event has no coordinates)
    CASE
      WHEN v_user_lat IS NOT NULL AND v_user_lon IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN calculate_distance(v_user_lat, v_user_lon, e.latitude, e.longitude)
      ELSE NULL
    END AS distance_km,
    -- Flag if event has coordinates
    (e.latitude IS NOT NULL AND e.longitude IS NOT NULL) AS has_coordinates
  FROM events e
  WHERE
    -- Only future events
    e.event_date >= NOW()
    -- Only public events
    AND e.is_public = true
    -- Category filtering (strict if user has preferences, show all if not)
    AND (
      v_user_categories IS NULL
      OR cardinality(v_user_categories) = 0
      OR e.category = ANY(v_user_categories)
    )
  ORDER BY
    -- Sort priority:
    -- 1. Events with coordinates first (proximity sorting)
    -- 2. Then by calculated distance (closest first)
    -- 3. Events without coordinates last (alphabetical)
    CASE WHEN e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN 0 ELSE 1 END,
    CASE
      WHEN v_user_lat IS NOT NULL AND v_user_lon IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN calculate_distance(v_user_lat, v_user_lon, e.latitude, e.longitude)
      ELSE 999999
    END,
    e.title ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_personalized_events(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_events(UUID, INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- PART 7: CREATE FUNCTION TO FIND NEARBY USERS FOR NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_users_for_event(
  p_event_id UUID,
  p_max_distance_km INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  username TEXT,
  display_name TEXT,
  city TEXT,
  distance_km DECIMAL,
  preferred_categories TEXT[],
  start_hour INTEGER,
  end_hour INTEGER
) AS $$
DECLARE
  v_event_lat DECIMAL;
  v_event_lon DECIMAL;
  v_event_city TEXT;
  v_event_category TEXT;
BEGIN
  -- Get event details
  SELECT e.latitude, e.longitude, e.city, e.category
  INTO v_event_lat, v_event_lon, v_event_city, v_event_category
  FROM events e
  WHERE e.id = p_event_id;

  -- Find users within distance or same city
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.expo_push_token,
    p.username,
    p.display_name,
    p.city,
    -- Calculate distance
    CASE
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
           AND v_event_lat IS NOT NULL AND v_event_lon IS NOT NULL
      THEN calculate_distance(p.latitude, p.longitude, v_event_lat, v_event_lon)
      ELSE NULL
    END AS distance_km,
    np.preferred_event_categories,
    COALESCE(np.start_hour, 8) AS start_hour,
    COALESCE(np.end_hour, 22) AS end_hour
  FROM profiles p
  LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE
    -- Must have push token
    p.expo_push_token IS NOT NULL
    -- Notification preferences enabled
    AND (np.enabled IS NULL OR np.enabled = true)
    AND (np.event_notifications_enabled IS NULL OR np.event_notifications_enabled = true)
    -- Either in same city OR within distance radius
    AND (
      -- Same city
      (v_event_city IS NOT NULL AND p.city = v_event_city)
      -- OR within distance radius (if both have coordinates)
      OR (
        p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND v_event_lat IS NOT NULL AND v_event_lon IS NOT NULL
        AND calculate_distance(p.latitude, p.longitude, v_event_lat, v_event_lon) <= p_max_distance_km
      )
    )
    -- Category filtering (only if user has preferences set)
    AND (
      np.preferred_event_categories IS NULL
      OR cardinality(np.preferred_event_categories) = 0
      OR v_event_category = ANY(np.preferred_event_categories)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_nearby_users_for_event(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_users_for_event(UUID, INTEGER) TO service_role;

-- ============================================================================
-- PART 8: CREATE FUNCTION TO CHECK DAILY NOTIFICATION QUOTA
-- ============================================================================

CREATE OR REPLACE FUNCTION check_notification_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count event notifications sent in last 24 hours
  SELECT COUNT(*) INTO v_count
  FROM notification_history
  WHERE user_id = p_user_id
    AND type = 'event'
    AND sent_at >= NOW() - INTERVAL '24 hours';

  -- Return true if under quota, false if over
  RETURN v_count < p_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_notification_quota(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_notification_quota(UUID, INTEGER) TO service_role;

-- ============================================================================
-- PART 9: CREATE FUNCTION TO RECORD NOTIFICATION SENT
-- ============================================================================

CREATE OR REPLACE FUNCTION record_notification_sent(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notification_history (
    user_id,
    event_id,
    type,
    title,
    body,
    data,
    sent_at,
    delivered,
    opened
  ) VALUES (
    p_user_id,
    p_event_id,
    p_type,
    p_title,
    p_body,
    p_data,
    NOW(),
    false,
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_notification_sent(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION record_notification_sent(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- PART 10: GRANT PERMISSIONS ON TABLES
-- ============================================================================

-- notification_preferences
GRANT ALL ON notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

-- notification_history
GRANT ALL ON notification_history TO service_role;
GRANT SELECT, INSERT ON notification_history TO authenticated;

-- ============================================================================
-- PART 11: CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view their own notification history"
  ON notification_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert notification history
CREATE POLICY "Service role can insert notification history"
  ON notification_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('city', 'state', 'region')
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('city', 'state', 'region')
ORDER BY column_name;

-- Check that tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('notification_preferences', 'notification_history')
ORDER BY table_name;

-- Check that functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%event%' OR routine_name LIKE '%notification%'
ORDER BY routine_name;

-- Check that indexes were created
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename = 'events' OR tablename = 'profiles' OR tablename = 'notification_preferences' OR tablename = 'notification_history')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added city/state columns to events and profiles tables
-- ✅ Created performance indexes for proximity queries
-- ✅ Created notification_preferences table
-- ✅ Created notification_history table for tracking
-- ✅ Created helper functions for distance calculation
-- ✅ Created get_personalized_events() function for proximity sorting
-- ✅ Created find_nearby_users_for_event() for notification targeting
-- ✅ Created quota checking and notification recording functions
-- ✅ Enabled Row Level Security (RLS) policies
-- ✅ Granted appropriate permissions

-- Next steps:
-- 1. Run this migration on your Supabase instance
-- 2. Implement backend webhook for event creation
-- 3. Update mobile app to use get_personalized_events() function
-- 4. Add modal prompt for users without category preferences
