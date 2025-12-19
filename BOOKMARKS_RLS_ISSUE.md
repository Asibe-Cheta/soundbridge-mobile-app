# 🚨 CRITICAL: Bookmarks Table RLS Policy Missing

**Date:** December 18, 2025  
**Status:** 🔴 **PRODUCTION BLOCKER**  
**Priority:** HIGH  
**Error Code:** `42501`

---

## 🔥 TL;DR - The Problem

The `bookmarks` table is missing Row Level Security (RLS) policies, causing **400 Bad Request** errors when users try to save posts.

**Error Message:**
```
new row violates row-level security policy for table "bookmarks"
```

**Impact:**
- ❌ Users cannot save posts
- ❌ Users cannot bookmark tracks/events
- ❌ All bookmark features broken

**Solution:**
Add RLS policies to the `bookmarks` table (5 minute fix).

---

## 📊 Current State

### ✅ **What's Working:**
- Bookmark API endpoint is deployed
- Authentication is working (401 error fixed)
- Database table exists

### ❌ **What's Broken:**
- RLS policies are missing or too restrictive
- INSERT operations are blocked
- SELECT operations may also be blocked

---

## 🔍 Root Cause

### **The Error:**

```json
{
  "error": {
    "code": "42501",
    "details": null,
    "hint": null,
    "message": "new row violates row-level security policy for table \"bookmarks\""
  }
}
```

**PostgreSQL Error Code 42501:**
- Means: **Insufficient privilege** (RLS policy violation)
- Caused by: Missing or incorrect RLS policies on `bookmarks` table

### **Why This Happens:**

1. ✅ Supabase enforces Row Level Security (RLS) on all tables
2. ✅ The `bookmarks` table has RLS enabled (good for security)
3. ❌ But no policies exist to allow authenticated users to insert/select their own bookmarks
4. ❌ Result: All operations are blocked by default

---

## ✅ The Fix - Add RLS Policies

Run these SQL commands in **Supabase SQL Editor**:

### **1. Check Current Policies:**

```sql
-- Check if policies exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookmarks';
```

**Expected Result:** Empty (no policies)

---

### **2. Add Missing Policies:**

```sql
-- ============================================================
-- BOOKMARKS TABLE RLS POLICIES
-- ============================================================

-- Policy 1: Allow users to INSERT their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
ON bookmarks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users to SELECT their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON bookmarks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Allow users to DELETE their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON bookmarks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- VERIFY POLICIES WERE CREATED
-- ============================================================

SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'Allow user to save bookmarks'
    WHEN cmd = 'SELECT' THEN 'Allow user to view saved items'
    WHEN cmd = 'DELETE' THEN 'Allow user to unsave bookmarks'
  END as description
FROM pg_policies 
WHERE tablename = 'bookmarks'
ORDER BY cmd;
```

**Expected Output:**
```
policyname                             | cmd    | description
---------------------------------------|--------|----------------------------------
Users can create their own bookmarks   | INSERT | Allow user to save bookmarks
Users can view their own bookmarks     | SELECT | Allow user to view saved items
Users can delete their own bookmarks   | DELETE | Allow user to unsave bookmarks
```

---

## 📋 Step-by-Step Fix Guide

### **Step 1: Access Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your SoundBridge project
3. Click "SQL Editor" in the left sidebar

### **Step 2: Run the Policy Creation SQL**
1. Copy the SQL from section "2. Add Missing Policies" above
2. Paste into SQL Editor
3. Click "Run"
4. Verify "Success. No rows returned" message

### **Step 3: Verify Policies Were Created**
Run:
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookmarks';
```

Should show 3 policies (INSERT, SELECT, DELETE).

### **Step 4: Test from Mobile App**
1. Mobile team: Restart app
2. Try to save a post
3. Should work without error

### **Step 5: Test from Web App (if applicable)**
1. Open web app
2. Try to bookmark a post
3. Verify success

---

## 🔍 How RLS Policies Work

### **Policy Breakdown:**

```sql
CREATE POLICY "Users can create their own bookmarks"
ON bookmarks              -- Apply to bookmarks table
FOR INSERT                -- For INSERT operations only
TO authenticated          -- For logged-in users only
WITH CHECK (              -- Condition that must be TRUE to allow insert
  auth.uid() = user_id    -- User can only insert if user_id matches their auth ID
);
```

**What this does:**
1. ✅ Allows authenticated users to insert bookmarks
2. ✅ But ONLY if `user_id` column matches their auth ID
3. ✅ Prevents users from creating bookmarks for other users
4. ✅ Anonymous users cannot insert (must be authenticated)

### **Policy Types:**

| Policy | Purpose | When Used |
|--------|---------|-----------|
| **INSERT** | Allow user to save bookmarks | When user taps "save" button |
| **SELECT** | Allow user to view saved items | When loading "Saved Posts" screen |
| **DELETE** | Allow user to unsave bookmarks | When user taps "unsave" button |
| **UPDATE** | Modify existing bookmarks | Not needed (bookmarks don't update) |

---

## 🧪 Testing the Fix

### **Test Case 1: Save a Post**

**Steps:**
1. Open mobile app
2. Go to Feed screen
3. Tap bookmark icon on any post

**Expected Result:**
- ✅ Icon fills in (post saved)
- ✅ No error alert
- ✅ Console: `✅ Bookmark added via Supabase`

**Current Result (BEFORE FIX):**
- ❌ Error alert: "Failed to save post"
- ❌ Console: `❌ API Error (400): new row violates row-level security policy`

---

### **Test Case 2: View Saved Posts**

**Steps:**
1. Open mobile app
2. Go to Profile screen
3. Tap "Saved Posts" button

**Expected Result:**
- ✅ Shows list of saved posts
- ✅ Posts load in 1-2 seconds

**Current Result (BEFORE FIX):**
- ❌ Empty state (if SELECT policy also missing)
- ❌ Or RLS error

---

### **Test Case 3: Unsave a Post**

**Steps:**
1. Open mobile app
2. Go to Saved Posts screen
3. Tap bookmark icon on a saved post

**Expected Result:**
- ✅ Icon unfills (post unsaved)
- ✅ Post removed from list
- ✅ Console: `✅ Bookmark removed via Supabase`

**Current Result (BEFORE FIX):**
- ❌ Error alert: "Failed to unsave post"
- ❌ Or nothing happens

---

## 📊 Database Schema Check

### **Verify bookmarks Table Structure:**

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bookmarks'
ORDER BY ordinal_position;
```

**Expected Columns:**
```
column_name   | data_type | is_nullable | column_default
--------------|-----------|-------------|----------------------------
id            | uuid      | NO          | gen_random_uuid()
user_id       | uuid      | NO          | (references auth.users)
content_id    | uuid      | NO          | (references posts/tracks/events)
content_type  | text      | NO          | ('post', 'track', or 'event')
created_at    | timestamp | NO          | now()
```

---

## 🔧 Troubleshooting

### **Issue 1: "Policy already exists"**

**Error:**
```
ERROR: policy "Users can create their own bookmarks" for table "bookmarks" already exists
```

**Solution:**
Policies already exist! No action needed. Test the mobile app.

---

### **Issue 2: "Table bookmarks does not exist"**

**Error:**
```
ERROR: relation "bookmarks" does not exist
```

**Solution:**
Table needs to be created first. Run:
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'track', 'event')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Then add policies (from section above)
```

---

### **Issue 3: Still getting 400 after adding policies**

**Possible Causes:**
1. **Policies not applied correctly**
   - Re-run verification query
   - Check policy names match
   
2. **auth.uid() returning NULL**
   - Check user is logged in
   - Verify JWT token is valid
   
3. **user_id column mismatch**
   - Verify bookmarks.user_id matches auth.uid()
   - Check for typos in column names

**Debug Query:**
```sql
-- Check what auth.uid() returns (run as logged-in user)
SELECT auth.uid() as current_user_id;

-- Check user_id in recent bookmarks
SELECT user_id, content_id, created_at 
FROM bookmarks 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🎯 Why Mobile App Still Works

The mobile app now has a **fallback mechanism**:

```typescript
// 1. Try API endpoint
const response = await apiFetch('/api/social/bookmark', { ... });

// 2. If RLS error, fallback to direct Supabase query
if (error.includes('row-level security')) {
  return await supabase.from('bookmarks').insert({ ... });
}
```

**When using direct Supabase client:**
- ✅ Uses user's JWT token (not service role)
- ✅ RLS policies apply correctly
- ✅ User can insert their own bookmarks
- ✅ User cannot insert for other users

**This is why the fallback works even though API fails.**

---

## 📧 Summary for Backend Team

### **Problem:**
`bookmarks` table has RLS enabled but no policies, blocking all operations.

### **Impact:**
- ❌ Users cannot save posts/tracks/events
- ❌ Saved Posts feature broken
- ❌ 400 errors in production

### **Solution:**
Add 3 RLS policies (INSERT, SELECT, DELETE) to allow users to manage their own bookmarks.

### **Fix Time:**
5 minutes (run SQL script)

### **Testing:**
Mobile app has fallback, will automatically work once policies are added.

### **Priority:**
HIGH - Feature is completely broken without this fix.

---

## ✅ Success Criteria

After fix, mobile app should:
1. ✅ Save posts without errors
2. ✅ View saved posts in "Saved Posts" screen
3. ✅ Unsave posts successfully
4. ✅ Console shows: `✅ Bookmark toggled via API` (no fallback needed)

---

## 📚 Related Issues

1. **Similar Issue:** `user_roles` infinite recursion (already fixed)
2. **Similar Issue:** `posts` table RLS issues (already fixed)
3. **Pattern:** Several tables needed RLS policy fixes after schema changes

**Recommendation:**
Run RLS policy audit on all new tables to prevent similar issues.

---

## 🔗 Helpful Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SoundBridge Schema Docs](./MOBILE_TEAM_ANSWERS.md)

---

**Document Created:** December 18, 2025  
**Author:** Claude Sonnet 4.5 (Mobile Team Assistant)  
**Status:** Ready to share with backend team  
**Next Step:** Send to backend team, run SQL script, test mobile app

---

## 📞 Support

If you have questions or issues, please:
1. Check the "Troubleshooting" section above
2. Run verification queries to diagnose
3. Contact mobile team for testing assistance

**Expected Resolution Time:** 5-10 minutes after running SQL script

---

**🚀 Let's ship this!**

