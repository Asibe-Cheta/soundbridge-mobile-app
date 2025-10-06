# 🎯 Personalized Discovery Database Schema - Implementation Request

**Date:** December 6, 2025  
**From:** Mobile App Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH** - Required for Personalized Discovery Feature  
**Status:** ⏳ **PENDING** - Database Schema Issues Blocking Implementation

---

## 📋 **OVERVIEW**

The mobile app has implemented a **Personalized Discovery System** that filters content based on user preferences from the onboarding flow. However, we're encountering multiple database schema issues that are preventing the feature from working properly.

**Current Status:**
- ✅ **Mobile Implementation**: Complete with personalized filtering logic
- ✅ **Onboarding Flow**: Users can select genres and location preferences  
- ❌ **Database Schema**: Missing tables and columns causing errors
- ❌ **Content Relationships**: Missing genre-content linking tables

---

## 🚨 **CRITICAL ERRORS ENCOUNTERED**

### **Error 1: Missing Content-Genre Relationship**
```
Error with personalized query, falling back to trending: 
Could not find a relationship between 'audio_tracks' and 'content_genres' in the schema cache
```

### **Error 2: Missing Country Column in Events**
```
Error with personalized events, falling back to general: 
column events.country does not exist
```

### **Error 3: Missing Audio URL Column**
```
Using fallback mock data. Error: 
column audio_tracks.audio_url does not exist
```

### **Error 4: User Genres Not Found**
```
Getting user genres for: bd8a455d-a54d-45c5-968d-e4cf5e8d928e
Found user genres in user_genres table: 4
Filtering by genre IDs: Array(4)
```
*Note: User genres are found, but content filtering fails due to missing relationships*

---

## 🗄️ **REQUIRED DATABASE SCHEMA**

### **1. Content-Genre Relationship Table**

**Table: `content_genres`**
```sql
CREATE TABLE content_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'audio_track', 'event', 'playlist'
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(content_id, content_type, genre_id),
  
  -- Indexes for performance
  INDEX idx_content_genres_content (content_id, content_type),
  INDEX idx_content_genres_genre (genre_id),
  INDEX idx_content_genres_lookup (content_type, genre_id)
);
```

**Purpose:** Links audio tracks, events, and playlists to their respective genres for personalized filtering.

### **2. Audio Tracks Table Updates**

**Missing Columns in `audio_tracks`:**
```sql
ALTER TABLE audio_tracks 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS cover_art_url TEXT,
ADD COLUMN IF NOT EXISTS artwork_url TEXT;

-- Update existing records to have proper URLs
UPDATE audio_tracks 
SET audio_url = file_url 
WHERE audio_url IS NULL AND file_url IS NOT NULL;
```

### **3. Events Table Updates**

**Missing Columns in `events`:**
```sql
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tickets_available INTEGER DEFAULT 0;

-- Add index for country-based filtering
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_date_country ON events(event_date, country);
```

### **4. User Genres System Verification**

**Please confirm these tables exist and are properly structured:**

**Table: `user_genres`**
```sql
-- Expected structure
CREATE TABLE user_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, genre_id)
);
```

**Table: `genres`**
```sql
-- Expected structure  
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'music', 'podcast', etc.
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 **WHAT WE'RE TRYING TO ACHIEVE**

### **Personalized Music Discovery**
When a user completes onboarding and selects genres like "Afrobeat", "Hip-Hop", "Jazz":

```sql
-- This query should work:
SELECT audio_tracks.*, profiles.display_name
FROM audio_tracks
JOIN profiles ON audio_tracks.creator_id = profiles.id
JOIN content_genres ON content_genres.content_id = audio_tracks.id 
  AND content_genres.content_type = 'audio_track'
JOIN user_genres ON user_genres.genre_id = content_genres.genre_id
WHERE user_genres.user_id = $user_id
ORDER BY audio_tracks.play_count DESC;
```

### **Location-Based Events**
When a user selects "Nigeria" as their country:

```sql
-- This query should work:
SELECT events.*, profiles.display_name
FROM events
JOIN profiles ON events.creator_id = profiles.id
WHERE events.country = 'Nigeria'
  AND events.event_date >= NOW()
ORDER BY events.event_date ASC;
```

### **Genre-Based Content Filtering**
Filter out content that doesn't match user preferences:

```sql
-- Show only content matching user's selected genres
-- Hide content from genres the user didn't select
```

---

## 📊 **SAMPLE DATA REQUIREMENTS**

### **Content-Genre Relationships**
```sql
-- Example: Link audio tracks to genres
INSERT INTO content_genres (content_id, content_type, genre_id) VALUES
('track-1-uuid', 'audio_track', 'afrobeat-genre-uuid'),
('track-1-uuid', 'audio_track', 'hip-hop-genre-uuid'),
('track-2-uuid', 'audio_track', 'jazz-genre-uuid');

-- Example: Link events to genres  
INSERT INTO content_genres (content_id, content_type, genre_id) VALUES
('event-1-uuid', 'event', 'afrobeat-genre-uuid'),
('event-2-uuid', 'event', 'jazz-genre-uuid');
```

### **Event Location Data**
```sql
-- Example: Add country data to existing events
UPDATE events SET country = 'Nigeria' WHERE location LIKE '%Lagos%';
UPDATE events SET country = 'United States' WHERE location LIKE '%New York%';
UPDATE events SET country = 'United Kingdom' WHERE location LIKE '%London%';
```

---

## 🔍 **QUESTIONS FOR WEB APP TEAM**

### **1. Existing Schema Check**
- **Q:** Do any of these tables/columns already exist in a different form?
- **Q:** Is there an existing content categorization system we should use instead?
- **Q:** Are there existing foreign key relationships we should leverage?

### **2. Content-Genre Relationships**
- **Q:** How are genres currently linked to audio tracks on the web app?
- **Q:** Is there an existing tagging or categorization system for content?
- **Q:** Should we use a different approach for content-genre relationships?

### **3. Location Data**
- **Q:** How does the web app handle location-based event filtering?
- **Q:** Is country data already stored somewhere else in the events system?
- **Q:** Should we use a different location field (city, region, etc.)?

### **4. Performance Considerations**
- **Q:** What indexes should we add for optimal query performance?
- **Q:** Are there any existing indexes we should be aware of?
- **Q:** What's the expected data volume for these relationships?

---

## 🚀 **IMPLEMENTATION PRIORITY**

### **Phase 1: Critical (Immediate)**
1. **Create `content_genres` table** - Enables basic personalization
2. **Add missing columns** to `audio_tracks` and `events`
3. **Verify `user_genres` and `genres` tables** are properly structured

### **Phase 2: Enhancement (Next Sprint)**
1. **Populate content-genre relationships** for existing data
2. **Add location data** to existing events
3. **Create indexes** for performance optimization

### **Phase 3: Advanced (Future)**
1. **Smart recommendation algorithms** based on listening history
2. **Cross-genre recommendations** for discovery
3. **Location-based creator suggestions**

---

## 📝 **MOBILE APP CURRENT IMPLEMENTATION**

### **Functions Ready to Use:**
- ✅ `getUserGenres(userId)` - Gets user's selected genres
- ✅ `getPersonalizedTracks(userId)` - Filters tracks by user genres  
- ✅ `getPersonalizedEvents(userId)` - Filters events by user location
- ✅ Graceful fallbacks to general content when personalization fails

### **Integration Points:**
- ✅ Onboarding flow saves user preferences
- ✅ DiscoverScreen uses personalized content
- ✅ Console logging for debugging and monitoring
- ✅ Error handling with fallback to mock data

---

## 🔧 **TESTING REQUIREMENTS**

### **Test Data Needed:**
1. **Audio tracks** with proper genre relationships
2. **Events** with country/location data
3. **User accounts** with completed onboarding (genre preferences)
4. **Varied content** across different genres for filtering tests

### **Test Scenarios:**
1. **User with genres** → Should see personalized content
2. **User without genres** → Should see general trending content  
3. **User in specific country** → Should see local events
4. **Empty results** → Should gracefully fall back to general content

---

## 📞 **NEXT STEPS**

1. **Web App Team:** Review this request and confirm feasibility
2. **Database Team:** Implement the required schema changes
3. **Content Team:** Populate genre relationships for existing content
4. **Mobile Team:** Test the implementation once schema is ready
5. **QA Team:** Validate personalization works end-to-end

---

## 🎯 **SUCCESS CRITERIA**

**When this is complete, users should:**
- ✅ See music that matches their selected genres
- ✅ See events in their selected country/region  
- ✅ Have a personalized discovery experience
- ✅ Still see content even if personalization fails (fallbacks work)

**Technical Success:**
- ✅ No more database schema errors in console
- ✅ Personalized queries return real data (not mock data)
- ✅ Performance is acceptable for mobile app usage
- ✅ Content filtering works as expected

---

**Please let us know:**
1. **Timeline** for implementing these schema changes
2. **Any existing solutions** we should use instead
3. **Additional requirements** or considerations we missed
4. **Testing database access** for mobile team validation

Thank you for your support in making personalized discovery a reality! 🚀

---

**Contact:** Mobile App Team  
**Priority:** High - Blocking personalized discovery feature  
**Dependencies:** Database schema, content relationships, location data
