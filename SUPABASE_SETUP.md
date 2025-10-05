# SoundBridge Supabase Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database Connection (Transaction Pooler)
SUPABASE_DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Environment
NODE_ENV=development
```

## Getting Your Supabase Credentials

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings > API**
3. **Copy the following values:**
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

## Database Connection String (Transaction Pooler)

1. **Go to Settings > Database**
2. **Find the "Connection string" section**
3. **Select "Use connection pooling"**
4. **Copy the connection string and replace:**
   - `[YOUR-PROJECT-REF]` with your project reference
   - `[YOUR-PASSWORD]` with your database password
   - `[REGION]` with your project region (e.g., `us-east-1`)

## Database Schema Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  genre TEXT,
  verified BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_plays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio content table
CREATE TABLE audio_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL,
  duration INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  artwork_url TEXT,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT,
  capacity INTEGER NOT NULL,
  ticket_price DECIMAL(10,2),
  is_free BOOLEAN DEFAULT FALSE,
  attendees_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Followers table
CREATE TABLE followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Likes table
CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT CHECK (content_type IN ('audio', 'event')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);

-- Comments table
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT CHECK (content_type IN ('audio', 'event')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('follow', 'like', 'comment', 'event', 'collaboration')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  play_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  event_attendance INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  peak_listening_hours JSONB,
  top_countries JSONB,
  age_demographics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlists table
CREATE TABLE playlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  track_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlist tracks table
CREATE TABLE playlist_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES audio_content(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- Collaborations table
CREATE TABLE collaborations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  initiator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')) DEFAULT 'pending',
  revenue_split JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_audio_content_creator_id ON audio_content(creator_id);
CREATE INDEX idx_audio_content_created_at ON audio_content(created_at);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_content_id ON likes(content_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_content_id ON comments(content_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_collaborations_initiator_id ON collaborations(initiator_id);
CREATE INDEX idx_collaborations_collaborator_id ON collaborations(collaborator_id);

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Audio content policies
CREATE POLICY "Public audio content is viewable by everyone" ON audio_content
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own audio content" ON audio_content
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own audio content" ON audio_content
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own audio content" ON audio_content
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own audio content" ON audio_content
  FOR DELETE USING (auth.uid() = creator_id);

-- Events policies
CREATE POLICY "Public events are viewable by everyone" ON events
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = organizer_id);

-- Followers policies
CREATE POLICY "Users can view followers" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert followers" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Likes policies
CREATE POLICY "Users can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Playlists policies
CREATE POLICY "Public playlists are viewable by everyone" ON playlists
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own playlists" ON playlists
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own playlists" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own playlists" ON playlists
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own playlists" ON playlists
  FOR DELETE USING (auth.uid() = creator_id);

-- Playlist tracks policies
CREATE POLICY "Users can view playlist tracks" ON playlist_tracks
  FOR SELECT USING (true);

CREATE POLICY "Users can insert playlist tracks" ON playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete playlist tracks" ON playlist_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.creator_id = auth.uid()
    )
  );

-- Collaborations policies
CREATE POLICY "Users can view collaborations" ON collaborations
  FOR SELECT USING (
    auth.uid() = initiator_id OR auth.uid() = collaborator_id
  );

CREATE POLICY "Users can insert collaborations" ON collaborations
  FOR INSERT WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users can update collaborations" ON collaborations
  FOR UPDATE USING (
    auth.uid() = initiator_id OR auth.uid() = collaborator_id
  );

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_content_updated_at BEFORE UPDATE ON audio_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Storage Setup

1. **Go to Storage in your Supabase dashboard**
2. **Create the following buckets:**
   - `audio-files` (for music files)
   - `artwork` (for album/track artwork)
   - `avatars` (for user profile pictures)
   - `event-images` (for event images)

3. **Set bucket policies:**

```sql
-- Audio files bucket
CREATE POLICY "Public audio files are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-files');

CREATE POLICY "Users can upload audio files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own audio files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio files" ON storage.objects
  FOR DELETE USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Artwork bucket
CREATE POLICY "Public artwork is viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork');

CREATE POLICY "Users can upload artwork" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own artwork" ON storage.objects
  FOR UPDATE USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own artwork" ON storage.objects
  FOR DELETE USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket
CREATE POLICY "Public avatars are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Event images bucket
CREATE POLICY "Public event images are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Users can upload event images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own event images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own event images" ON storage.objects
  FOR DELETE USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Testing the Connection

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Check the browser console for any Supabase connection errors**

3. **Test authentication by visiting `/login` or `/signup`**

## Troubleshooting

### Common Issues:

1. **Environment variables not loading:**
   - Ensure `.env.local` is in the root directory
   - Restart your development server after adding environment variables

2. **CORS errors:**
   - Add your localhost URL to Supabase Auth settings
   - Go to Authentication > URL Configuration
   - Add `http://localhost:3000` to Site URL and Redirect URLs

3. **Database connection errors:**
   - Verify your connection string format
   - Check that your database password is correct
   - Ensure your IP is allowed in Supabase dashboard

4. **RLS (Row Level Security) errors:**
   - Make sure all policies are created correctly
   - Check that users are authenticated before accessing protected data

### Getting Help:

- Check the [Supabase documentation](https://supabase.com/docs)
- Review the [Next.js Supabase integration guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- Check the browser console and server logs for detailed error messages 