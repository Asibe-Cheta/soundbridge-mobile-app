-- Optimized SQL function to get creators with stats in ONE query
-- This eliminates N+1 queries (30+ queries for 10 creators down to 1 query)
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_creators_with_stats(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  social_links JSONB,
  role TEXT,
  location TEXT,
  country TEXT,
  genre TEXT,
  followers_count BIGINT,
  tracks_count BIGINT,
  events_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.banner_url,
    p.website_url,
    p.social_links,
    p.role,
    p.location,
    p.country,
    p.genre,
    COALESCE(f.followers_count, 0) AS followers_count,
    COALESCE(t.tracks_count, 0) AS tracks_count,
    COALESCE(e.events_count, 0) AS events_count,
    p.created_at
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS followers_count
    FROM follows
    WHERE following_id = p.id
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS tracks_count
    FROM audio_tracks
    WHERE creator_id = p.id AND is_public = true
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS events_count
    FROM events
    WHERE creator_id = p.id
  ) e ON true
  WHERE p.role = 'creator'
  ORDER BY f.followers_count DESC, t.tracks_count DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_creators_with_stats(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creators_with_stats(INT) TO anon;

