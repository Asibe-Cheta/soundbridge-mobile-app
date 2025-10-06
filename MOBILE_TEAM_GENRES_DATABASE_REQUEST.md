# 🎵 Genres Database System - Implementation Request

**Date:** October 5, 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH** - Required for Onboarding Implementation  
**Status:** 🚧 **AWAITING IMPLEMENTATION**

---

## 🎯 **OBJECTIVE**

We need a comprehensive genres database system to power the mobile app's onboarding flow, content discovery, and personalized recommendations. This is a prerequisite for implementing the subscription-driven onboarding experience.

---

## 📋 **REQUIREMENTS SUMMARY**

### **Core Functionality:**
- ✅ **User genre preferences** (3-5 selections max)
- ✅ **Content discovery** based on genre preferences
- ✅ **Creator profile genres** (what they create)
- ✅ **Analytics tracking** (genre popularity, trends)
- ✅ **Smart recommendations** (location + genre based)
- ✅ **Multi-category support** (music + podcasts)

### **Smart Suggestions Logic:**
- **Example:** User in Nigeria + Gospel preference → Prioritize Nigerian gospel content
- **Example:** User in Lagos + Afrobeat preference → Show Lagos-based Afrobeat artists first
- **No manual trending** - all suggestions algorithmic based on location + preferences

---

## 🗄️ **DATABASE SCHEMA REQUEST**

### **1. Genres Table**
```sql
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'music', 'podcast'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_genres_category ON genres(category);
CREATE INDEX idx_genres_active ON genres(is_active);
CREATE INDEX idx_genres_sort_order ON genres(sort_order);
```

### **2. User Genre Preferences (Junction Table)**
```sql
CREATE TABLE user_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    preference_strength INTEGER DEFAULT 1, -- 1-5 scale for future ML
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, genre_id)
);

-- Indexes for performance
CREATE INDEX idx_user_genres_user_id ON user_genres(user_id);
CREATE INDEX idx_user_genres_genre_id ON user_genres(genre_id);
```

### **3. Content Genre Tags (For Tracks/Podcasts)**
```sql
CREATE TABLE content_genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL, -- references audio_tracks.id or podcast_episodes.id
    content_type VARCHAR(20) NOT NULL, -- 'track', 'podcast'
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, content_type, genre_id)
);

-- Indexes for performance
CREATE INDEX idx_content_genres_content ON content_genres(content_id, content_type);
CREATE INDEX idx_content_genres_genre_id ON content_genres(genre_id);
```

---

## 🎵 **COMPREHENSIVE GENRE DATA**

### **Music Genres** (Category: 'music')

#### **African Music:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('Afrobeat', 'music', 'Nigerian-originated genre blending jazz, funk, and traditional African music', 1),
('Afrobeats', 'music', 'Contemporary African pop music with global appeal', 2),
('Amapiano', 'music', 'South African house music subgenre with jazz and lounge influences', 3),
('Highlife', 'music', 'Ghanaian music genre that originated in the early 20th century', 4),
('Bongo Flava', 'music', 'Tanzanian hip hop and R&B music', 5),
('Kwaito', 'music', 'South African music genre with house beats and African sounds', 6),
('Soukous', 'music', 'Congolese dance music with guitar-driven melodies', 7),
('Makossa', 'music', 'Cameroonian urban music genre', 8),
('Juju', 'music', 'Nigerian popular music style derived from traditional Yoruba music', 9),
('Fuji', 'music', 'Nigerian musical genre based on traditional Yoruba music', 10);
```

#### **Gospel & Christian:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('Contemporary Gospel', 'music', 'Modern Christian music with contemporary sounds', 11),
('Traditional Gospel', 'music', 'Classic Christian music with traditional arrangements', 12),
('Praise & Worship', 'music', 'Christian music focused on worship and praise', 13),
('Christian Hip-Hop', 'music', 'Hip-hop music with Christian themes and messages', 14),
('Gospel Afrobeat', 'music', 'Gospel music with Afrobeat influences', 15);
```

#### **Hip-Hop & Rap:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('Hip-Hop', 'music', 'Urban music genre with rhythmic speech and beats', 16),
('Trap', 'music', 'Hip-hop subgenre with heavy bass and hi-hats', 17),
('Drill', 'music', 'Hip-hop subgenre with dark, violent themes', 18),
('Old School Hip-Hop', 'music', 'Classic hip-hop from the 1970s-1980s', 19),
('Conscious Rap', 'music', 'Hip-hop focused on social and political issues', 20),
('Afro-Trap', 'music', 'Trap music with African influences', 21);
```

#### **R&B & Soul:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('R&B', 'music', 'Rhythm and blues music with soulful vocals', 22),
('Contemporary R&B', 'music', 'Modern R&B with contemporary production', 23),
('Neo-Soul', 'music', 'Modern soul music with alternative influences', 24),
('Classic Soul', 'music', 'Traditional soul music from the 1960s-1970s', 25),
('Afro-R&B', 'music', 'R&B music with African influences', 26);
```

#### **Pop & Electronic:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('Pop', 'music', 'Popular music with mainstream appeal', 27),
('Afro-Pop', 'music', 'Pop music with African influences', 28),
('Dance Pop', 'music', 'Pop music designed for dancing', 29),
('Electronic', 'music', 'Music produced using electronic instruments', 30),
('House', 'music', 'Electronic dance music with four-on-the-floor beats', 31),
('Afro-House', 'music', 'House music with African influences', 32),
('Deep House', 'music', 'House music subgenre with complex melodies', 33),
('Techno', 'music', 'Electronic dance music with repetitive beats', 34),
('EDM', 'music', 'Electronic dance music for festivals and clubs', 35);
```

#### **Other Music Genres:**
```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('Rock', 'music', 'Rock music with guitar-driven sound', 36),
('Alternative Rock', 'music', 'Rock music outside mainstream conventions', 37),
('Indie Rock', 'music', 'Independent rock music', 38),
('Jazz', 'music', 'American musical style with improvisation', 39),
('Afro-Jazz', 'music', 'Jazz music with African influences', 40),
('Reggae', 'music', 'Jamaican music genre with offbeat rhythms', 41),
('Dancehall', 'music', 'Jamaican popular music genre', 42),
('Country', 'music', 'American folk music with rural themes', 43),
('Blues', 'music', 'American music genre with blue notes', 44),
('Classical', 'music', 'Traditional Western art music', 45),
('Folk', 'music', 'Traditional music passed down through generations', 46),
('World Music', 'music', 'Traditional and contemporary music from around the world', 47),
('Instrumental', 'music', 'Music without vocals', 48),
('Spoken Word', 'music', 'Performance art combining writing and live performance', 49);
```

### **Podcast Genres** (Category: 'podcast')

```sql
INSERT INTO genres (name, category, description, sort_order) VALUES
('News & Politics', 'podcast', 'Current events and political discussions', 50),
('Business', 'podcast', 'Entrepreneurship, finance, and business topics', 51),
('Technology', 'podcast', 'Tech news, reviews, and discussions', 52),
('Health & Wellness', 'podcast', 'Physical and mental health topics', 53),
('Comedy', 'podcast', 'Humorous content and entertainment', 54),
('True Crime', 'podcast', 'Real criminal cases and investigations', 55),
('Education', 'podcast', 'Learning and educational content', 56),
('Sports', 'podcast', 'Sports news, analysis, and discussions', 57),
('Music', 'podcast', 'Music industry news and artist interviews', 58),
('Arts & Culture', 'podcast', 'Creative arts and cultural topics', 59),
('Religion & Spirituality', 'podcast', 'Faith-based and spiritual content', 60),
('History', 'podcast', 'Historical events and stories', 61),
('Science', 'podcast', 'Scientific discoveries and discussions', 62),
('Personal Development', 'podcast', 'Self-improvement and growth', 63),
('Entertainment', 'podcast', 'Pop culture and entertainment news', 64),
('Lifestyle', 'podcast', 'Daily life, relationships, and personal topics', 65);
```

---

## 🔧 **API ENDPOINTS NEEDED**

### **For Mobile App Integration:**

#### **1. Get All Genres**
```
GET /api/genres
Query params: ?category=music|podcast&active=true
Response: Array of genre objects
```

#### **2. Get User's Genre Preferences**
```
GET /api/users/{userId}/genres
Response: Array of user's selected genres
```

#### **3. Update User's Genre Preferences**
```
POST /api/users/{userId}/genres
Body: { genre_ids: [uuid1, uuid2, uuid3] }
Validation: Max 5 genres per user
```

#### **4. Get Content by Genres**
```
GET /api/content/by-genres
Query params: ?genre_ids=uuid1,uuid2&location=Lagos&limit=20
Response: Personalized content based on genres + location
```

#### **5. Get Popular Genres by Location**
```
GET /api/genres/popular
Query params: ?location=Nigeria&category=music
Response: Most popular genres in user's location
```

---

## 🎯 **SMART RECOMMENDATION LOGIC**

### **Algorithm Requirements:**

#### **1. Location + Genre Matching:**
```sql
-- Example query for Nigerian Gospel lover
SELECT DISTINCT at.*, p.location, p.country
FROM audio_tracks at
JOIN profiles p ON at.creator_id = p.id
JOIN content_genres cg ON at.id = cg.content_id
JOIN user_genres ug ON cg.genre_id = ug.genre_id
WHERE ug.user_id = $user_id
  AND p.country = $user_country  -- Same country priority
  AND cg.content_type = 'track'
  AND at.is_public = true
ORDER BY 
  CASE WHEN p.location = $user_location THEN 1 ELSE 2 END,  -- Same city first
  at.play_count DESC,
  at.created_at DESC
LIMIT 20;
```

#### **2. Genre Preference Weighting:**
- **Primary genres** (user's top 3): 100% weight
- **Secondary genres** (related/similar): 70% weight
- **Location match**: +30% boost
- **Recent/trending**: +20% boost

#### **3. Discovery Balance:**
- **70%** content matching user's exact preferences
- **20%** similar/related genres for discovery
- **10%** popular content in user's location

---

## 📊 **ANALYTICS REQUIREMENTS**

### **Tracking Needed:**
- **Genre popularity** by location
- **User engagement** by genre
- **Content performance** by genre
- **Genre combination patterns** (which genres users select together)
- **Location-based genre trends**

### **Reports for Admin Dashboard:**
- Most popular genres globally
- Genre trends by country/city
- User preference patterns
- Content gaps by genre/location

---

## 🚀 **IMPLEMENTATION PRIORITY**

### **Phase 1 (Immediate - Required for Onboarding):**
- ✅ Create `genres` table with music genres
- ✅ Create `user_genres` table
- ✅ API endpoints for getting/setting user preferences
- ✅ Basic genre selection in mobile onboarding

### **Phase 2 (Week 2):**
- ✅ Add podcast genres
- ✅ Create `content_genres` table
- ✅ Implement content discovery by genres
- ✅ Location-based recommendations

### **Phase 3 (Week 3-4):**
- ✅ Advanced recommendation algorithm
- ✅ Analytics and reporting
- ✅ Genre-based push notifications
- ✅ A/B testing for genre suggestions

---

## 🔍 **VALIDATION & TESTING**

### **Data Validation:**
- Users can select **maximum 5 genres**
- Genre names are **unique** within category
- **Soft delete** for genres (set is_active = false)
- **Referential integrity** maintained

### **Performance Testing:**
- Genre queries should execute **< 100ms**
- Recommendation queries should execute **< 500ms**
- Support for **100K+ users** with genre preferences

### **User Experience Testing:**
- Genre selection feels **intuitive**
- Recommendations are **relevant**
- **No duplicate** content in feeds
- **Balanced discovery** (not too narrow)

---

## 📞 **TECHNICAL QUESTIONS**

### **1. Content Tagging:**
- Should existing tracks/podcasts be **retroactively tagged** with genres?
- Who assigns genres to content - **creators** or **admin moderation**?
- Should we allow **multiple genres per track** (recommended: yes, max 3)?

### **2. Migration Strategy:**
- Any existing genre data to migrate?
- Should we **pre-populate** user preferences based on their uploaded content?
- Timeline for **backfilling** existing content with genre tags?

### **3. Localization:**
- Should genre names be **translated** for different languages?
- Any **region-specific genres** we should add?
- How to handle **genre synonyms** (e.g., "Hip-Hop" vs "Rap")?

---

## ⏰ **TIMELINE REQUEST**

### **Immediate Need:**
- **Phase 1 implementation** needed within **1 week**
- Required for mobile onboarding flow implementation
- Blocking mobile app subscription strategy

### **Preferred Schedule:**
- **Day 1-2:** Database schema creation + basic data
- **Day 3-4:** API endpoints development
- **Day 5-6:** Testing and validation
- **Day 7:** Mobile team integration testing

---

## 📋 **DELIVERABLES CHECKLIST**

### **Database:**
- [ ] `genres` table created with music genres
- [ ] `user_genres` table created
- [ ] `content_genres` table created
- [ ] All indexes and constraints added
- [ ] Sample data populated

### **APIs:**
- [ ] GET /api/genres (with filtering)
- [ ] GET /api/users/{userId}/genres
- [ ] POST /api/users/{userId}/genres (with validation)
- [ ] GET /api/content/by-genres (with location)
- [ ] GET /api/genres/popular (by location)

### **Documentation:**
- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Example queries provided
- [ ] Mobile integration guide

---

## 🎯 **SUCCESS CRITERIA**

### **Functional:**
- ✅ Users can select 3-5 genre preferences during onboarding
- ✅ Content discovery shows relevant music/podcasts
- ✅ Location-based recommendations work correctly
- ✅ Genre preferences sync across web/mobile platforms

### **Performance:**
- ✅ Genre selection loads in < 2 seconds
- ✅ Personalized content loads in < 3 seconds
- ✅ Recommendation accuracy > 70% user satisfaction

### **Business:**
- ✅ Increased user engagement with personalized content
- ✅ Higher onboarding completion rates
- ✅ Better content discovery leading to more subscriptions

---

## 📞 **NEXT STEPS**

1. **Web App Team:** Review and approve this schema
2. **Web App Team:** Implement Phase 1 (database + basic APIs)
3. **Mobile Team:** Begin onboarding UI development
4. **Both Teams:** Integration testing and validation
5. **Launch:** Deploy with mobile onboarding flow

---

**Status:** 🚧 **AWAITING WEB APP TEAM RESPONSE**  
**Priority:** 🔴 **HIGH** - Blocking mobile subscription implementation  
**Timeline:** 1 week for Phase 1 completion

**This genres system will power personalized discovery and significantly improve user engagement! 🎵**
