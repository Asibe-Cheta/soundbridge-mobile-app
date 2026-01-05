# Mobile to Web Team: Genre System Clarification

**Date:** December 30, 2025
**Re:** Genre system deployment - Table name and helper function clarification
**Status:** ✅ **CLARIFICATION PROVIDED**

---

## Response to Web Team Questions

Thank you for reviewing the genre system update documentation and checking your existing endpoints! Here's the clarification on the discrepancies you noted:

---

## ✅ Correct Table Name: `user_preferred_genres`

The migration creates `user_preferred_genres` (NOT `user_genres`).

**From migration (lines 24-30):**
```sql
CREATE TABLE IF NOT EXISTS user_preferred_genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, genre_id)
);
```

### Action Required

If your current endpoints use `user_genres`, they need to be updated to use `user_preferred_genres`.

**Example fix:**
```typescript
// ❌ OLD (incorrect)
const { data } = await supabase
  .from('user_genres')  // This table doesn't exist after migration
  .select('*');

// ✅ NEW (correct)
const { data } = await supabase
  .from('user_preferred_genres')  // Correct table name
  .select('*');
```

---

## ✅ Helper Functions DO Exist

The migration creates two PostgreSQL helper functions that you should use instead of direct SQL queries.

### 1. Get User Preferred Genres

**Function created (lines 148-168):**
```sql
CREATE OR REPLACE FUNCTION get_user_preferred_genres(user_uuid UUID)
RETURNS TABLE (
  genre_id UUID,
  genre_name TEXT,
  genre_category TEXT,
  genre_description TEXT
)
```

**How to use in your API:**
```typescript
// ❌ OLD (direct query - less efficient)
const { data } = await supabase
  .from('user_preferred_genres')
  .select(`
    genre_id,
    genres (
      name,
      category,
      description
    )
  `)
  .eq('user_id', userId);

// ✅ NEW (use helper function - recommended)
const { data } = await supabase
  .rpc('get_user_preferred_genres', { user_uuid: userId });

// Returns:
// [
//   {
//     genre_id: 'uuid-here',
//     genre_name: 'Gospel',
//     genre_category: 'music',
//     genre_description: 'Inspirational and religious music'
//   },
//   ...
// ]
```

### 2. Set User Preferred Genres

**Function created (lines 175-188):**
```sql
CREATE OR REPLACE FUNCTION set_user_preferred_genres(
  user_uuid UUID,
  genre_ids UUID[]
)
RETURNS void
```

**How to use in your API:**
```typescript
// ❌ OLD (manual delete + insert - error-prone)
await supabase
  .from('user_preferred_genres')
  .delete()
  .eq('user_id', userId);

await supabase
  .from('user_preferred_genres')
  .insert(genreIds.map(id => ({ user_id: userId, genre_id: id })));

// ✅ NEW (use helper function - atomic & safer)
const { error } = await supabase
  .rpc('set_user_preferred_genres', {
    user_uuid: userId,
    genre_ids: genreIds  // Array of UUIDs
  });
```

**Benefits of using helper functions:**
- ✅ Atomic operations (all-or-nothing)
- ✅ Proper error handling
- ✅ Security: Functions have `SECURITY DEFINER` (run with creator privileges)
- ✅ Performance: Database-side operations
- ✅ Cleaner code

---

## Recommended Endpoint Updates

Based on the migration, here are the updated implementations:

### 1. GET /api/genres (Public)

This endpoint is likely fine as-is since it just queries the `genres` table directly.

**No change needed** (unless you're filtering by user preferences).

```typescript
// apps/web/app/api/genres/route.ts
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

### 2. GET /api/users/{userId}/genres - **UPDATE REQUIRED**

**Before (if using `user_genres` or direct queries):**
```typescript
const { data } = await supabase
  .from('user_genres')  // ❌ Wrong table
  .select('*')
  .eq('user_id', userId);
```

**After (using helper function):**
```typescript
// apps/web/app/api/users/[userId]/genres/route.ts
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });

  // ✅ Use helper function
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
    genres: data.map((g: any) => g.genre_name),  // Just return names for mobile app
  });
}
```

**Response format:**
```json
{
  "success": true,
  "genres": ["Gospel", "Hip Hop", "R&B"]
}
```

### 3. POST /api/users/{userId}/genres - **UPDATE REQUIRED**

**Before (if using direct queries):**
```typescript
// Delete old preferences
await supabase
  .from('user_genres')  // ❌ Wrong table
  .delete()
  .eq('user_id', userId);

// Insert new ones
await supabase
  .from('user_genres')  // ❌ Wrong table
  .insert(genreIds.map(id => ({ user_id: userId, genre_id: id })));
```

**After (using helper function):**
```typescript
// apps/web/app/api/users/[userId]/genres/route.ts
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { genre_ids } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });

  // ✅ Use helper function (atomic operation)
  const { error } = await supabase.rpc('set_user_preferred_genres', {
    user_uuid: params.userId,
    genre_ids: genre_ids,  // Array of UUIDs
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

**Request body:**
```json
{
  "genre_ids": [
    "genre-uuid-1",
    "genre-uuid-2",
    "genre-uuid-3"
  ]
}
```

---

## Migration Status

✅ **Database migration has been run successfully**

The following now exist in production:
- `genres` table (52 entries: 35 music + 17 podcast)
- `user_preferred_genres` table (junction table)
- `get_user_preferred_genres()` function
- `set_user_preferred_genres()` function
- Proper indexes for performance
- Row Level Security (RLS) policies

You can verify with these SQL queries:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('genres', 'user_preferred_genres');

-- Check genre count
SELECT category, COUNT(*) FROM genres GROUP BY category;
-- Expected: music (35), podcast (17)

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%preferred_genres%';
-- Expected: get_user_preferred_genres, set_user_preferred_genres
```

---

## Summary of Changes Needed

### If Your Endpoints Already Exist

1. ✅ **GET /api/genres** - No change needed (unless filtering by user)
2. ⚠️ **GET /api/users/{userId}/genres** - Update to use `get_user_preferred_genres()` RPC
3. ⚠️ **POST /api/users/{userId}/genres** - Update to use `set_user_preferred_genres()` RPC

### If Your Endpoints Don't Exist Yet

Just implement them using the helper functions from the start (see code examples above).

---

## Testing After Update

### 1. Test GET /api/genres

```bash
curl https://soundbridge.live/api/genres?category=music
# Should return 35 music genres with Gospel first
```

**Expected response:**
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

### 2. Test GET /api/users/{userId}/genres

```bash
curl https://soundbridge.live/api/users/{userId}/genres
```

**Expected response:**
```json
{
  "success": true,
  "genres": ["Gospel", "Hip Hop", "R&B"]
}
```

### 3. Test POST /api/users/{userId}/genres

```bash
curl -X POST https://soundbridge.live/api/users/{userId}/genres \
  -H "Content-Type: application/json" \
  -d '{
    "genre_ids": [
      "gospel-uuid",
      "hiphop-uuid",
      "rnb-uuid"
    ]
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Preferences saved successfully"
}
```

---

## Mobile App Behavior

The mobile app is already configured to:
- ✅ Call `GET /api/genres?category=music` on onboarding
- ✅ Call `GET /api/genres?category=podcast` for podcast selection
- ✅ Fall back to hardcoded lists if endpoints return 404 or error

**Current behavior:**
- If endpoints exist and work → Uses database-driven genres ✅
- If endpoints return 404 → Falls back to hardcoded list ✅
- **No breaking changes** for mobile app

---

## Questions & Answers

**Q: Do we need to update our endpoints immediately?**
A: Not urgent, but recommended. Mobile app has fallback to hardcoded lists. Update when convenient.

**Q: What if we haven't implemented the endpoints yet?**
A: Use the code examples above with the helper functions from the start.

**Q: Can we still use direct SQL queries instead of helper functions?**
A: You can, but helper functions are recommended because:
- They're atomic (safer)
- They have better error handling
- They're optimized by the database team
- They're maintained centrally (if logic changes, just update function)

**Q: What about backward compatibility with old data?**
A: The mobile app's `GenreService` handles migration from old `profiles.genres` array to new `user_preferred_genres` table. Web team doesn't need to worry about this.

---

## Next Steps for Web Team

1. **Verify table exists:**
   ```sql
   SELECT * FROM user_preferred_genres LIMIT 1;
   ```

2. **Update endpoints** (if they exist and use `user_genres`):
   - Change `user_genres` → `user_preferred_genres`
   - Use helper functions instead of direct queries

3. **Test endpoints:**
   - GET /api/genres
   - GET /api/users/{userId}/genres
   - POST /api/users/{userId}/genres

4. **Deploy changes**

5. **Notify mobile team** when endpoints are live

---

## Support

If you have questions or issues:

1. **Database schema questions:** See [CREATE_GENRES_TABLE_MIGRATION.sql](CREATE_GENRES_TABLE_MIGRATION.sql)
2. **Mobile app usage:** See [GENRE_PERSONALIZATION_SYSTEM.md](GENRE_PERSONALIZATION_SYSTEM.md)
3. **Helper function usage:** See examples above
4. **Slack:** #soundbridge-backend channel

---

## Summary

✅ **Table name:** `user_preferred_genres` (NOT `user_genres`)
✅ **Helper functions:** DO exist and should be used
✅ **Migration:** Already run successfully in production
⚠️ **Action required:** Update endpoints if they currently use `user_genres` or direct queries

**Status:** Clarification provided - ready for web team implementation
**Priority:** 🟡 Medium (Mobile app has fallback, but endpoints enable personalization)
**Estimated update time:** 30 minutes - 1 hour

---

**Prepared by:** Mobile Team
**Date:** December 30, 2025
**For:** Web App Team
