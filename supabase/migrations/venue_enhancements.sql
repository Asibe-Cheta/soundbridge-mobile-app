-- =============================================================================
-- Venue table enhancements + venue_notification_preferences
-- Run this migration in the Supabase SQL editor or via CLI:
--   supabase db push
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend the existing venues table with fields needed for SoundBridge listings
-- ---------------------------------------------------------------------------
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS venue_type        TEXT,
  ADD COLUMN IF NOT EXISTS capacity          INTEGER,
  ADD COLUMN IF NOT EXISTS daily_rate        NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS hourly_rate       NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS photo_url         TEXT,
  ADD COLUMN IF NOT EXISTS photos            TEXT[],
  ADD COLUMN IF NOT EXISTS available_dates   TEXT[],
  ADD COLUMN IF NOT EXISTS external_booking_link TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS website           TEXT,
  ADD COLUMN IF NOT EXISTS rating            NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS google_place_id   TEXT;

-- Index for proximity queries
CREATE INDEX IF NOT EXISTS venues_location_idx ON venues (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for status filter
CREATE INDEX IF NOT EXISTS venues_status_idx ON venues (status);

-- ---------------------------------------------------------------------------
-- 2. venue_notification_preferences — one row per artist user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_notification_preferences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  min_budget               NUMERIC(10, 2),
  max_budget               NUMERIC(10, 2),
  preferred_venue_types    TEXT[],
  preferred_location_lat   NUMERIC(10, 6),
  preferred_location_lng   NUMERIC(10, 6),
  preferred_location_name  TEXT,
  notification_radius_km   INTEGER NOT NULL DEFAULT 10 CHECK (notification_radius_km BETWEEN 1 AND 50),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_notification_preferences_user_id_key UNIQUE (user_id)
);

-- RLS
ALTER TABLE venue_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own venue preferences"
  ON venue_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service-role bypass for edge functions
CREATE POLICY "Service role can read venue preferences"
  ON venue_notification_preferences
  FOR SELECT
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. venues RLS — allow public read of active listings, owners manage their own
-- ---------------------------------------------------------------------------
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active venues"
  ON venues FOR SELECT
  USING (status = 'active');

CREATE POLICY "Owners can manage their venues"
  ON venues FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Service role full access to venues"
  ON venues FOR ALL
  USING (auth.role() = 'service_role');
