# Web Team: Genre System Database Migration - DEPLOYED

**Date:** December 30, 2025
**From:** Mobile Team
**To:** Web App Team
**Priority:** 🟢 **INFORMATIONAL** (No urgent action required)
**Status:** ✅ Database migration completed successfully

---

## Executive Summary

The **genre personalization system** database migration has been successfully deployed to production. This adds a new `genres` table with 52 genres (35 music + 17 podcast) and enables user preference storage for personalization.

**Impact on Web App:**
- ✅ **No breaking changes** - Existing functionality unaffected
- ✅ **New endpoints needed** - For future personalization features (optional)
- ✅ **Gospel genre added** - Now #1 music genre across all platforms
- ✅ **Database tables ready** - `genres` and `user_preferred_genres` tables created

---

## What Was Deployed

### Database Changes

#### 1. New Table: `genres`

```sql
CREATE TABLE genres (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,        -- 'music' or 'podcast'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes created:**
- `idx_genres_category` (category)
- `idx_genres_active` (is_active)
- `idx_genres_sort_order` (sort_order)

**Data inserted:**
- 35 music genres (Gospel, Afrobeats, Hip Hop, R&B, etc.)
- 17 podcast categories (Technology, Business, Education, etc.)

#### 2. New Table: `user_preferred_genres`

```sql
CREATE TABLE user_preferred_genres (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  genre_id UUID NOT NULL REFERENCES genres(id),
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, genre_id)
);
```

**Indexes created:**
- `idx_user_preferred_genres_user_id` (user_id)
- `idx_user_preferred_genres_genre_id` (genre_id)

#### 3. Helper Functions

Two PostgreSQL functions were created for easy data access:

```sql
-- Get user's preferred genres
get_user_preferred_genres(user_uuid UUID)
RETURNS TABLE (genre_id, genre_name, genre_category, genre_description)

-- Set user's preferred genres (replaces existing)
set_user_preferred_genres(user_uuid UUID, genre_ids UUID[])
RETURNS void
```

#### 4. Row Level Security (RLS)

All tables have RLS enabled:
- `genres` table: Public read, service role write
- `user_preferred_genres` table: Users can only access their own preferences

---

## Genre List Details

### Music Genres (35 total)

**Top Priority (High Demand):**
1. Gospel
2. Afrobeats
3. Hip Hop
4. R&B
5. Pop

**Regional/Cultural:**
6. UK Drill
7. Reggae
8. Highlife
9. Amapiano
10. Afropop

**Traditional/Classic:**
11. Jazz
12. Blues
13. Soul
14. Funk
15. Rock
16. Classical
17. Country
18. Folk

**Electronic/Modern:**
19. Electronic
20. House
21. Techno
22. Drum & Bass
23. Dubstep

**Alternative/Indie:**
24. Alternative
25. Indie
26. Punk
27. Metal

**World/Latin:**
28. Reggaeton
29. Salsa
30. Samba
31. Bossa Nova

**Other/Misc:**
32. Instrumental
33. Acoustic
34. Lo-fi
35. Other

### Podcast Categories (17 total)

1. Technology
2. Business
3. Education
4. Entertainment
5. News
6. Sports
7. Health
8. Science
9. Arts
10. Comedy
11. True Crime
12. History
13. Politics
14. Music
15. Society & Culture
16. Religion & Spirituality
17. Other

---

## Recommended Backend API Endpoints

To enable mobile app personalization features, we recommend implementing these optional endpoints:

### 1. Get All Genres (Public)

```http
GET /api/genres?category=music
GET /api/genres?category=podcast
```

**Implementation:**
```typescript
// apps/web/app/api/genres/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // 'music' or 'podcast'

  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .eq('is_active', true)
    .eq('category', category || 'music')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    genres: data,
  });
}
```

**Response:**
```json
{
  "success": true,
  "genres": [
    {
      "id": "uuid-here",
      "name": "Gospel",
      "category": "music",
      "description": "Inspirational and religious music",
      "is_active": true,
      "sort_order": 1
    },
    ...
  ]
}
```

### 2. Get User Preferred Genres

```http
GET /api/users/{userId}/genres
```

**Implementation:**
```typescript
// apps/web/app/api/users/[userId]/genres/route.ts
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase
    .rpc('get_user_preferred_genres', { user_uuid: params.userId });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    genres: data.map((g: any) => g.genre_name),
  });
}
```

**Response:**
```json
{
  "success": true,
  "genres": ["Gospel", "Hip Hop", "R&B"]
}
```

### 3. Set User Preferred Genres

```http
POST /api/users/{userId}/genres
Content-Type: application/json

{
  "genre_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Implementation:**
```typescript
// apps/web/app/api/users/[userId]/genres/route.ts
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { genre_ids } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase.rpc('set_user_preferred_genres', {
    user_uuid: params.userId,
    genre_ids: genre_ids,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Preferences saved successfully',
  });
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences saved successfully"
}
```

---

## Current Integration Points

### Onboarding Flow

The mobile app's onboarding screens already call these endpoints (currently may return 404):

```
GET https://www.soundbridge.live/api/genres?category=music
GET https://www.soundbridge.live/api/genres?category=podcast
```

**Mobile app behavior:**
- If endpoint exists: Uses database-driven genres ✅
- If endpoint returns 404: Falls back to hardcoded list ✅

**Recommendation:** Implement these endpoints at your convenience. No urgency, as fallback is working.

---

## Gospel Genre Priority

Gospel is now the **#1 music genre** across all platforms:

**Database:**
```sql
SELECT name, sort_order FROM genres WHERE category = 'music' ORDER BY sort_order LIMIT 5;

-- Results:
-- Gospel     | 1
-- Afrobeats  | 2
-- Hip Hop    | 3
-- R&B        | 4
-- Pop        | 5
```

**Mobile App:**
- ✅ Upload screen shows Gospel first
- ✅ Search filters include Gospel
- ✅ Onboarding genre selection (when backend ready)

**Web App:**
If you have genre dropdowns or filters, consider adding Gospel or updating sort order to match mobile app.

---

## Verification Queries

You can verify the deployment with these SQL queries:

### Check Genre Counts

```sql
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM genres
GROUP BY category;

-- Expected:
-- music    | 35 | 35
-- podcast  | 17 | 17
```

### View All Music Genres

```sql
SELECT name, description, sort_order
FROM genres
WHERE category = 'music' AND is_active = true
ORDER BY sort_order
LIMIT 10;
```

### View All Podcast Categories

```sql
SELECT name, description
FROM genres
WHERE category = 'podcast' AND is_active = true
ORDER BY sort_order;
```

### Test Helper Functions

```sql
-- Set user preferences (replace with real user_id)
SELECT set_user_preferred_genres(
  'user-uuid-here'::uuid,
  ARRAY[
    (SELECT id FROM genres WHERE name = 'Gospel'),
    (SELECT id FROM genres WHERE name = 'Hip Hop'),
    (SELECT id FROM genres WHERE name = 'R&B')
  ]::uuid[]
);

-- Get user preferences
SELECT * FROM get_user_preferred_genres('user-uuid-here'::uuid);
```

---

## Impact Assessment

### ✅ No Breaking Changes

- Existing tables and columns unchanged
- No modifications to `profiles`, `audio_tracks`, or other tables
- RLS policies are additive only

### ✅ No Performance Impact

- All queries are indexed
- Genre table is small (~5KB for 52 rows)
- User preferences table scales linearly
- No impact on existing queries

### ✅ Backward Compatible

- Old `profiles.genres` array column still works
- New system is optional
- Mobile app has fallback to hardcoded lists

---

## Future Opportunities

Once backend endpoints are implemented, you can enable:

### 1. Personalized Recommendations
- Recommend tracks based on user's preferred genres
- "Because you like Gospel" suggestions
- Genre-based discover feed

### 2. Enhanced Search
- Filter by multiple genres
- Search within specific genres
- "Similar genre" suggestions

### 3. Analytics
- Track popular genres by region
- Genre trends over time
- Creator genre distribution

### 4. Dynamic Management
- Add new genres without app deployment
- Update genre descriptions remotely
- A/B test genre names

---

## Security Notes

All tables have Row Level Security (RLS) enabled:

**Genres Table:**
```sql
-- Anyone can read genres
CREATE POLICY "Genres are viewable by everyone"
  ON genres FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify genres"
  ON genres FOR ALL USING (auth.role() = 'service_role');
```

**User Preferred Genres:**
```sql
-- Users can only view their own preferences
CREATE POLICY "Users can view their own genre preferences"
  ON user_preferred_genres FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only modify their own preferences
CREATE POLICY "Users can insert their own genre preferences"
  ON user_preferred_genres FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Testing Recommendations

### Verify Database Deployment

1. **Check tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('genres', 'user_preferred_genres');
   ```

2. **Check genre count:**
   ```sql
   SELECT COUNT(*) FROM genres;
   -- Expected: 52
   ```

3. **Test RLS policies:**
   ```sql
   -- As authenticated user, try to read genres
   SET ROLE authenticated;
   SELECT * FROM genres LIMIT 5;
   -- Should succeed

   -- As authenticated user, try to modify genres
   UPDATE genres SET name = 'Test' WHERE id = (SELECT id FROM genres LIMIT 1);
   -- Should fail with permission error
   ```

### Test API Endpoints (Once Implemented)

1. **Test GET /api/genres:**
   ```bash
   curl https://soundbridge.live/api/genres?category=music
   # Should return 35 music genres
   ```

2. **Test GET /api/users/{userId}/genres:**
   ```bash
   curl https://soundbridge.live/api/users/{userId}/genres
   # Should return user's preferred genres or empty array
   ```

3. **Test POST /api/users/{userId}/genres:**
   ```bash
   curl -X POST https://soundbridge.live/api/users/{userId}/genres \
     -H "Content-Type: application/json" \
     -d '{"genre_ids": ["uuid1", "uuid2"]}'
   # Should save preferences
   ```

---

## Questions & Answers

**Q: Do we need to implement the API endpoints immediately?**
A: No, not urgent. Mobile app has fallback to hardcoded lists. Implement when convenient for personalization features.

**Q: Will this affect existing user data?**
A: No, no existing data modified. The old `profiles.genres` array column still works. This is additive.

**Q: How do we add new genres?**
A: Simply insert into the `genres` table:
```sql
INSERT INTO genres (name, category, description, is_active, sort_order)
VALUES ('New Genre', 'music', 'Description', true, 40);
```

**Q: Can we customize genre descriptions?**
A: Yes, update the `description` column anytime:
```sql
UPDATE genres SET description = 'Updated description' WHERE name = 'Gospel';
```

**Q: What if we want to remove a genre?**
A: Soft delete (keeps historical data):
```sql
UPDATE genres SET is_active = false WHERE name = 'Old Genre';
```

**Q: How do we migrate users from old `profiles.genres` array to new system?**
A: We have a migration function in mobile app. You can create similar for web users:
```typescript
// Get old genres from profiles.genres array
// Find matching genre IDs in genres table
// Insert into user_preferred_genres table
```

---

## Documentation Links

1. **[CREATE_GENRES_TABLE_MIGRATION.sql](CREATE_GENRES_TABLE_MIGRATION.sql)**
   - The SQL migration that was run (for reference)

2. **[GENRE_PERSONALIZATION_SYSTEM.md](GENRE_PERSONALIZATION_SYSTEM.md)**
   - Complete technical documentation
   - API specifications
   - Usage examples

3. **[src/services/GenreService.ts](src/services/GenreService.ts)**
   - Mobile app's genre service (reference implementation)

4. **[GENRE_SYSTEM_IMPLEMENTATION_SUMMARY.md](GENRE_SYSTEM_IMPLEMENTATION_SUMMARY.md)**
   - Executive summary of the entire system

---

## Next Steps

### Optional - Implement Backend Endpoints

**Priority:** 🟡 **LOW** (Nice to have, not urgent)

**Estimated Time:** 2-4 hours

**Files to Create:**
1. `apps/web/app/api/genres/route.ts` - Get all genres
2. `apps/web/app/api/users/[userId]/genres/route.ts` - Get/set user preferences

**Benefits:**
- Enable mobile app personalization
- Centralized genre management
- No app updates needed to add genres

### Optional - Update Web App Genre Lists

If you have genre dropdowns or filters in the web app, consider:
1. Fetching from `genres` table instead of hardcoded lists
2. Adding Gospel to existing lists
3. Matching mobile app sort order

---

## Support

If you have questions or need clarification:

1. **Database Questions:** Review the SQL migration file
2. **API Questions:** See usage examples in GENRE_PERSONALIZATION_SYSTEM.md
3. **Integration Questions:** Check mobile app GenreService.ts for reference

---

## Summary

✅ **Database migration deployed successfully**
- 2 new tables created (`genres`, `user_preferred_genres`)
- 52 genres inserted (35 music + 17 podcast)
- Gospel is now #1 music genre
- Helper functions created for easy access
- RLS policies enabled for security

🟢 **No breaking changes**
- All existing functionality works as before
- New system is optional and additive

📋 **Recommended next steps (optional):**
- Implement GET /api/genres endpoint
- Implement GET/POST /api/users/{userId}/genres endpoints
- Test with mobile app for personalization features

**Status:** ✅ COMPLETE - No urgent action required
**Impact:** 🟢 LOW - Informational only
**Priority:** Optional backend endpoint implementation

---

**Prepared by:** Mobile Team
**Date:** December 30, 2025
**Database Migration Status:** ✅ Deployed to Production
