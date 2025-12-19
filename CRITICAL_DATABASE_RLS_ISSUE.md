# 🚨 CRITICAL: Database RLS Infinite Recursion Error

**Date:** December 18, 2025  
**Severity:** 🔴 **PRODUCTION BLOCKER**  
**Status:** ✅ **FIX PROVIDED BY WEB TEAM - AWAITING DEPLOYMENT**  

---

## ✅ UPDATE: Web Team Response (Dec 18, 2025)

**Status:** 🟢 **FIX READY**

The web team has provided a complete solution:

### **Fix Provided**
- ✅ SQL script: `FIX_USER_ROLES_INFINITE_RECURSION.sql`
- ✅ Comprehensive documentation
- ✅ Step-by-step deployment guide
- ✅ Verification tests
- ✅ Rollback plan

### **Solution Summary**
1. **Simplifies `user_roles` RLS policies** - Removes circular self-reference
2. **Creates `is_admin_user()` function** - Uses `SECURITY DEFINER` to safely check admin status
3. **Updates `audio_tracks` policies** - Uses the safe function instead of subquery

### **Expected Impact**
- ⏱️ **Deploy time:** 2-5 minutes
- 🔒 **Security:** No impact (safe fix)
- ⚡ **Performance:** Normal (~50ms queries)
- ✅ **Success rate:** 100%

### **Next Steps**
1. Web team runs SQL script in Supabase
2. Web team verifies with test queries
3. Mobile team tests app functionality
4. Monitor for 1 hour post-deployment

---

## 🔥 Problem Summary (Original Issue)

**Error:** `infinite recursion detected in policy for relation "user_roles"`  
**Error Code:** `42P17`  
**Impact:** All queries to `audio_tracks` table are failing  

### **Affected Features**
- ❌ Trending tracks (Discover screen)
- ❌ Recent tracks (Discover screen)
- ❌ Personalized tracks
- ❌ User's own tracks (Profile screen)
- ❌ Track counts
- ❌ My Tracks screen
- ❌ Feed posts
- ❌ Search functionality

### **What's Working**
- ✅ Playlists
- ✅ Albums
- ✅ Featured Creators
- ✅ Events
- ✅ Messages
- ✅ Network/Connections

---

## 📊 Error Logs

### **Example 1: Trending Tracks**
```
[recent] Query error: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "user_roles"'
}

❌ Error getting trending tracks: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "user_roles"'
}

✅ Found trending tracks: 0
```

### **Example 2: User Tracks**
```
[tracks] Query error: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "user_roles"'
}
```

### **Example 3: Track Count**
```
[tracksCount] Query error: {
  message: ''
}
```

---

## 🔍 Root Cause Analysis

### **What's Happening**

1. Mobile app queries `audio_tracks` table
2. RLS policy on `audio_tracks` checks `user_roles` table
3. RLS policy on `user_roles` checks back to `audio_tracks` (or another table that checks `audio_tracks`)
4. **Infinite loop** → PostgreSQL aborts the query

### **Typical RLS Policy Issue Example**

**Bad (causes infinite recursion):**
```sql
-- RLS policy on audio_tracks
CREATE POLICY "Users can view their own tracks"
ON audio_tracks FOR SELECT
USING (
  creator_id = auth.uid() OR
  is_public = true AND (
    SELECT role FROM user_roles WHERE user_id = auth.uid()
  ) = 'creator'
);

-- RLS policy on user_roles
CREATE POLICY "Users can view roles"
ON user_roles FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM audio_tracks WHERE creator_id = user_id
  )
);
```
☝️ This creates a circular dependency!

**Good (no recursion):**
```sql
-- RLS policy on audio_tracks
CREATE POLICY "Users can view their own tracks"
ON audio_tracks FOR SELECT
USING (
  creator_id = auth.uid() OR
  (is_public = true AND auth.role() = 'authenticated')
);

-- RLS policy on user_roles
CREATE POLICY "Users can view their own role"
ON user_roles FOR SELECT
USING (user_id = auth.uid());
```

---

## 🛠️ How to Fix (Web Team Action Required)

### **Step 1: Identify the Circular Policy**

Run this in Supabase SQL Editor:

```sql
-- Check RLS policies on audio_tracks
SELECT * FROM pg_policies WHERE tablename = 'audio_tracks';

-- Check RLS policies on user_roles
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- Check RLS policies on profiles (often related)
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### **Step 2: Review Recent Policy Changes**

Check Supabase dashboard → Database → Policies for recent changes to:
- `audio_tracks` table
- `user_roles` table
- `profiles` table

**Look for:**
- Policies that reference other tables in subqueries
- Policies added in the last 24-48 hours
- Policies with complex JOIN conditions

### **Step 3: Temporarily Disable Problematic Policy**

```sql
-- Disable RLS on user_roles temporarily (for testing only)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Try a query
SELECT * FROM audio_tracks WHERE is_public = true LIMIT 1;

-- If it works, the issue is confirmed in user_roles
-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### **Step 4: Fix the Policy**

**General rules to avoid recursion:**

1. **Avoid circular references** between tables in RLS policies
2. **Use `auth.uid()`** directly instead of subqueries when possible
3. **Use `EXISTS` with caution** - ensure it doesn't create loops
4. **Simplify policies** - break complex policies into multiple simple ones
5. **Test incrementally** - add one policy at a time

### **Step 5: Test the Fix**

```sql
-- Test trending tracks query
SELECT id, title, play_count, creator_id
FROM audio_tracks
WHERE is_public = true
  AND moderation_status IN ('pending_check', 'checking', 'clean', 'approved')
ORDER BY play_count DESC
LIMIT 10;

-- Test user's tracks query
SELECT id, title, creator_id
FROM audio_tracks
WHERE creator_id = 'YOUR_TEST_USER_ID'
LIMIT 10;
```

---

## 🚀 Quick Fix Options

### **Option 1: Revert Recent Policy Changes (Recommended)**

If you recently updated RLS policies, revert them:

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- Revert last migration (if it's the culprit)
-- Note: Replace 'MIGRATION_VERSION' with actual version
-- Be careful with this - backup first!
```

### **Option 2: Simplify `user_roles` Policy**

```sql
-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "complex_policy_name" ON user_roles;

-- Create simple policy
CREATE POLICY "Users can view their own role"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Create admin policy (if needed)
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);
```

### **Option 3: Bypass RLS for Service Role**

If the mobile app should use service role for certain queries:

```typescript
// For queries that don't need user-specific filtering
const { data } = await supabase
  .from('audio_tracks')
  .select('*', { head: false, count: 'exact' })
  .eq('is_public', true)
  .limit(10);
```

**Note:** This requires updating Supabase client to use service role key for specific queries (NOT recommended for mobile apps due to security).

---

## 📋 Verification Checklist

After fixing, verify these queries work:

```sql
-- [ ] Trending tracks
SELECT * FROM audio_tracks
WHERE is_public = true
ORDER BY play_count DESC LIMIT 10;

-- [ ] User's tracks
SELECT * FROM audio_tracks
WHERE creator_id = auth.uid()
LIMIT 10;

-- [ ] Track count
SELECT COUNT(*) FROM audio_tracks
WHERE creator_id = auth.uid();

-- [ ] User roles
SELECT * FROM user_roles
WHERE user_id = auth.uid();

-- [ ] Profiles
SELECT * FROM profiles
WHERE id = auth.uid();
```

---

## 🔐 Security Considerations

**Important:** Don't disable RLS entirely to "fix" this issue!

❌ **Bad:**
```sql
ALTER TABLE audio_tracks DISABLE ROW LEVEL SECURITY;
```

✅ **Good:**
```sql
-- Fix the policy to avoid recursion, keep RLS enabled
CREATE POLICY "simple_policy" ON audio_tracks
FOR SELECT USING (creator_id = auth.uid() OR is_public = true);
```

---

## 📞 Contact

**Mobile Team:** This issue is blocking all content in the mobile app  
**Web Team:** Please prioritize this fix - it's a production blocker  
**ETA Needed:** ASAP (hours, not days)

---

## 🧪 Testing After Fix

### **Mobile App Tests**

1. Open Discover screen → Should see trending tracks
2. Open Profile screen → Should see track count
3. Open "My Tracks" → Should see user's tracks
4. Open "My Playlists" → Should see user's playlists
5. Play a track → Should load correctly

### **Database Tests**

```sql
-- Run these in Supabase SQL Editor as a regular user (not admin)
SELECT COUNT(*) FROM audio_tracks WHERE is_public = true;
SELECT COUNT(*) FROM audio_tracks WHERE creator_id = auth.uid();
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

All should return results without errors.

---

## 📚 Additional Resources

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Avoiding Circular Dependencies in RLS](https://supabase.com/docs/guides/auth/row-level-security#avoiding-circular-dependencies)

---

**Status:** 🔴 **AWAITING WEB TEAM FIX**  
**Created:** December 18, 2025  
**Last Updated:** December 18, 2025  

---

## 🎯 Next Steps

1. **Web team:** Fix RLS policy circular dependency
2. **Web team:** Test queries in Supabase SQL Editor
3. **Web team:** Deploy fix to production
4. **Mobile team:** Verify fix in mobile app
5. **Both teams:** Monitor for any related issues

---

**This is NOT a mobile app bug. This is a database configuration issue that requires backend/web team intervention.**


