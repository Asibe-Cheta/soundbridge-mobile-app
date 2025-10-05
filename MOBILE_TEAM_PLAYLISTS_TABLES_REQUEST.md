# 🚨 URGENT: Playlists Tables Missing from Database

**Date:** October 5, 2025  
**Priority:** 🔴 **HIGH** - Mobile app ready, waiting for database tables  
**Status:** ⏳ **BLOCKED** - Tables don't exist yet

---

## 📊 **Diagnostic Results**

Mobile app diagnostics confirm that the playlists tables **DO NOT EXIST** in the Supabase database:

```
❌ Playlist_tracks table error: Could not find the table 'public.playlist_tracks' in the schema cache
❌ Playlists table structure issue: Could not find the table 'public.playlists' in the schema cache
❌ Playlists relationship error: Could not find the table 'public.playlists' in the schema cache
```

**Console Evidence:**
- ✅ Other tables working: `profiles`, `audio_tracks`, `events`, `messages`
- ❌ Missing tables: `playlists`, `playlist_tracks`
- ✅ Mobile app handles gracefully with empty state

---

## 🗄️ **Required Database Tables**

Please create these two tables in the Supabase database:

### **1. `playlists` Table**
```sql
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_image_url TEXT,
    tracks_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. `playlist_tracks` Table (Junction Table)**
```sql
CREATE TABLE playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);
```

### **3. RLS Policies**
```sql
-- Public playlists are viewable by everyone
CREATE POLICY "Public playlists are viewable by everyone" 
ON playlists FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id);

-- Users can insert their own playlists
CREATE POLICY "Users can insert their own playlists" 
ON playlists FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Users can update their own playlists
CREATE POLICY "Users can update their own playlists" 
ON playlists FOR UPDATE 
USING (auth.uid() = creator_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete their own playlists" 
ON playlists FOR DELETE 
USING (auth.uid() = creator_id);

-- Playlist tracks policies
CREATE POLICY "Anyone can view tracks in public playlists" 
ON playlist_tracks FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND (is_public = true OR creator_id = auth.uid()))
);

CREATE POLICY "Users can manage tracks in their own playlists" 
ON playlist_tracks FOR ALL 
USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid())
);
```

---

## 🎯 **What Happens After Table Creation**

Once you create these tables:

1. **✅ Immediate**: Mobile app will automatically start working
2. **✅ Playlists Tab**: Will show empty state (ready for content)
3. **✅ Navigation**: PlaylistDetails screen will work
4. **✅ API Integration**: All queries will work without code changes

**No mobile app changes needed** - everything is already implemented and waiting!

---

## 🧪 **Test Data (Optional)**

After creating tables, you can add test data:

```sql
-- Create a test playlist
INSERT INTO playlists (creator_id, name, description, is_public) 
VALUES (
    (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1),
    'Afrobeat Vibes',
    'The best Afrobeat tracks for any mood',
    true
);

-- Add tracks to playlist (if audio_tracks exist)
INSERT INTO playlist_tracks (playlist_id, track_id, position)
SELECT 
    (SELECT id FROM playlists WHERE name = 'Afrobeat Vibes'),
    id,
    ROW_NUMBER() OVER (ORDER BY created_at)
FROM audio_tracks 
WHERE is_public = true 
LIMIT 5;
```

---

## 🚀 **Mobile App Status**

**✅ Ready Features:**
- Playlists discovery tab
- Playlist details screen
- Play all functionality  
- Track navigation
- Error handling
- Loading states

**⏳ Waiting For:**
- Database tables creation
- That's it!

---

## 📞 **Next Steps**

1. **Create the two tables** using the SQL above
2. **Set up RLS policies** for security
3. **Test with sample data** (optional)
4. **Notify mobile team** when complete

**ETA After Table Creation:** ✅ **Immediate** - Feature will work instantly

---

**🎵 The mobile app is 100% ready for playlists - just need the database tables!**
