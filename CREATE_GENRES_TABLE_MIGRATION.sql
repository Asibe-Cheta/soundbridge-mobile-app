-- Create comprehensive genres table for robust genre management with database backend
-- This enables genre personalization across the app (onboarding, upload, search, recommendations)

-- Date: December 30, 2025
-- Purpose: Centralize genre management in database for better personalization

-- Drop existing table if re-running
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS user_preferred_genres CASCADE;

-- Create genres table
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'music' or 'podcast'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferred_genres junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_preferred_genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, genre_id) -- Prevent duplicate preferences
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_genres_category ON genres(category);
CREATE INDEX IF NOT EXISTS idx_genres_active ON genres(is_active);
CREATE INDEX IF NOT EXISTS idx_genres_sort_order ON genres(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_preferred_genres_user_id ON user_preferred_genres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferred_genres_genre_id ON user_preferred_genres(genre_id);

-- Insert comprehensive music genres (matching mobile app + search filters + onboarding)
INSERT INTO genres (name, category, description, is_active, sort_order) VALUES
  -- Top priority genres (most popular)
  ('Gospel', 'music', 'Inspirational and religious music', true, 1),
  ('Afrobeats', 'music', 'African popular music combining West African musical styles', true, 2),
  ('Hip Hop', 'music', 'Urban music featuring rapping and beats', true, 3),
  ('R&B', 'music', 'Rhythm and Blues - soul and contemporary R&B', true, 4),
  ('Pop', 'music', 'Popular mainstream music', true, 5),

  -- Regional/Cultural genres
  ('UK Drill', 'music', 'UK style of drill music with dark beats', true, 6),
  ('Reggae', 'music', 'Jamaican music with offbeat rhythms', true, 7),
  ('Highlife', 'music', 'West African music genre from Ghana', true, 8),
  ('Amapiano', 'music', 'South African house music subgenre', true, 9),
  ('Afropop', 'music', 'African popular music', true, 10),

  -- Traditional/Classic genres
  ('Jazz', 'music', 'American music characterized by swing and blue notes', true, 11),
  ('Blues', 'music', 'Soulful American music with 12-bar structure', true, 12),
  ('Soul', 'music', 'African-American music combining gospel and R&B', true, 13),
  ('Funk', 'music', 'Rhythmic music emphasizing groove', true, 14),
  ('Rock', 'music', 'Electric guitar-based popular music', true, 15),
  ('Classical', 'music', 'Traditional orchestral and chamber music', true, 16),
  ('Country', 'music', 'American roots music from rural South', true, 17),
  ('Folk', 'music', 'Traditional acoustic music', true, 18),

  -- Electronic/Modern genres
  ('Electronic', 'music', 'Music produced using electronic instruments', true, 19),
  ('House', 'music', 'Electronic dance music with 4/4 beat', true, 20),
  ('Techno', 'music', 'Electronic dance music with repetitive beats', true, 21),
  ('Drum & Bass', 'music', 'Fast breakbeat electronic music', true, 22),
  ('Dubstep', 'music', 'Electronic music with heavy bass', true, 23),

  -- Alternative/Indie
  ('Alternative', 'music', 'Non-mainstream rock and pop music', true, 24),
  ('Indie', 'music', 'Independent music outside major labels', true, 25),
  ('Punk', 'music', 'Fast aggressive rock music', true, 26),
  ('Metal', 'music', 'Heavy loud rock music', true, 27),

  -- World/Latin
  ('Reggaeton', 'music', 'Latin urban music combining reggae and hip hop', true, 28),
  ('Salsa', 'music', 'Latin dance music', true, 29),
  ('Samba', 'music', 'Brazilian music with African influences', true, 30),
  ('Bossa Nova', 'music', 'Brazilian jazz and samba fusion', true, 31),

  -- Other/Misc
  ('Instrumental', 'music', 'Music without vocals', true, 32),
  ('Acoustic', 'music', 'Unplugged music with acoustic instruments', true, 33),
  ('Lo-fi', 'music', 'Relaxed downtempo music', true, 34),
  ('Other', 'music', 'Other music genres', true, 999)
ON CONFLICT (name) DO NOTHING;

-- Insert podcast categories (matching mobile app)
INSERT INTO genres (name, category, description, is_active, sort_order) VALUES
  ('Technology', 'podcast', 'Tech, gadgets, software, and innovation', true, 1),
  ('Business', 'podcast', 'Entrepreneurship, startups, and business strategy', true, 2),
  ('Education', 'podcast', 'Learning and educational content', true, 3),
  ('Entertainment', 'podcast', 'Pop culture, movies, TV, and entertainment news', true, 4),
  ('News', 'podcast', 'Current events and news commentary', true, 5),
  ('Sports', 'podcast', 'Sports news, analysis, and commentary', true, 6),
  ('Health', 'podcast', 'Health, fitness, and wellness', true, 7),
  ('Science', 'podcast', 'Scientific discoveries and explanations', true, 8),
  ('Arts', 'podcast', 'Visual arts, design, and creativity', true, 9),
  ('Comedy', 'podcast', 'Humorous and comedic content', true, 10),
  ('True Crime', 'podcast', 'Crime stories and investigations', true, 11),
  ('History', 'podcast', 'Historical events and figures', true, 12),
  ('Politics', 'podcast', 'Political analysis and discussion', true, 13),
  ('Music', 'podcast', 'Music industry news and interviews', true, 14),
  ('Society & Culture', 'podcast', 'Social issues and cultural topics', true, 15),
  ('Religion & Spirituality', 'podcast', 'Faith, spirituality, and religious topics', true, 16),
  ('Other', 'podcast', 'Other podcast categories', true, 999)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS) for security
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferred_genres ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read genres (public data)
CREATE POLICY "Genres are viewable by everyone"
  ON genres FOR SELECT
  USING (true);

-- RLS Policy: Only admins/service role can modify genres
CREATE POLICY "Only service role can modify genres"
  ON genres FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policy: Users can read their own preferred genres
CREATE POLICY "Users can view their own genre preferences"
  ON user_preferred_genres FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own genre preferences
CREATE POLICY "Users can insert their own genre preferences"
  ON user_preferred_genres FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own genre preferences
CREATE POLICY "Users can delete their own genre preferences"
  ON user_preferred_genres FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON genres TO authenticated, anon;
GRANT ALL ON user_preferred_genres TO authenticated;
GRANT ALL ON genres TO service_role;
GRANT ALL ON user_preferred_genres TO service_role;

-- Create helper function to get user's preferred genres
CREATE OR REPLACE FUNCTION get_user_preferred_genres(user_uuid UUID)
RETURNS TABLE (
  genre_id UUID,
  genre_name TEXT,
  genre_category TEXT,
  genre_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.category,
    g.description
  FROM user_preferred_genres upg
  JOIN genres g ON g.id = upg.genre_id
  WHERE upg.user_id = user_uuid
    AND g.is_active = true
  ORDER BY g.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_user_preferred_genres(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_genres(UUID) TO service_role;

-- Create function to set user's preferred genres (replaces existing)
CREATE OR REPLACE FUNCTION set_user_preferred_genres(
  user_uuid UUID,
  genre_ids UUID[]
)
RETURNS void AS $$
BEGIN
  -- Delete existing preferences
  DELETE FROM user_preferred_genres WHERE user_id = user_uuid;

  -- Insert new preferences
  INSERT INTO user_preferred_genres (user_id, genre_id)
  SELECT user_uuid, unnest(genre_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_preferred_genres(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_preferred_genres(UUID, UUID[]) TO service_role;

-- Verification queries
-- Check genres created
SELECT
  category,
  COUNT(*) as genre_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM genres
GROUP BY category
ORDER BY category;

-- Show all music genres (sorted by popularity)
SELECT name, description, sort_order
FROM genres
WHERE category = 'music' AND is_active = true
ORDER BY sort_order
LIMIT 20;

-- Show all podcast categories
SELECT name, description
FROM genres
WHERE category = 'podcast' AND is_active = true
ORDER BY sort_order;

-- Success message
SELECT
  '✅ Genres table created successfully!' as status,
  COUNT(*) FILTER (WHERE category = 'music') as music_genres,
  COUNT(*) FILTER (WHERE category = 'podcast') as podcast_categories,
  COUNT(*) as total_genres
FROM genres;
