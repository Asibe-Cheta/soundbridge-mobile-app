# 🐛 BUG: Admin Panel API SQL Query Error

**Date:** December 23, 2024  
**Priority:** 🔴 CRITICAL  
**Endpoint:** `/api/admin/moderation/queue`

---

## 🔴 **ERROR**

```
Status: 500 Internal Server Error
Error: "column profiles_1.email does not exist"
```

---

## 📊 **REPRODUCTION**

### **Request:**
```
GET /api/admin/moderation/queue?filter=pending
Cookie: (authenticated as admin)
```

### **Response:**
```json
{
  "error": "column profiles_1.email does not exist"
}
```

### **Browser Console:**
```
[Error] Failed to load resource: the server responded with a status of 500 () (queue, line 0)
[Error] API error: – "column profiles_1.email does not exist"
```

---

## 🔍 **DIAGNOSIS**

### **Database Status:**
```sql
-- All 8 tracks exist and are in pending_check
SELECT id, title, moderation_status 
FROM audio_tracks 
WHERE deleted_at IS NULL;

-- Returns 8 tracks, all with moderation_status = 'pending_check'
```

### **API Status:**
- ✅ Authentication working (user logged in as admin)
- ✅ Tracks exist in database
- ❌ **SQL query has bug** - references non-existent column

---

## 🐛 **LIKELY CAUSE**

The admin API endpoint is probably doing something like:

```typescript
// ❌ BROKEN CODE (guessing):
const { data, error } = await supabase
  .from('audio_tracks')
  .select(`
    *,
    profiles!creator_id (
      username,
      email    // ❌ This doesn't exist in profiles table
    )
  `)
  .in('moderation_status', ['pending_check', 'checking']);
```

**Problem:** 
- The query is trying to get `email` from `profiles` table
- But `email` is stored in `auth.users` table, not `profiles`
- Or the JOIN alias is wrong (`profiles_1` instead of `profiles`)

---

## 🔧 **SUGGESTED FIX**

### **Option 1: Remove email from query**
```typescript
// ✅ FIXED:
const { data, error } = await supabase
  .from('audio_tracks')
  .select(`
    *,
    profiles!creator_id (
      username,
      display_name,
      avatar_url
    )
  `)
  .in('moderation_status', ['pending_check', 'checking']);
```

### **Option 2: Get email from correct table**
```typescript
// ✅ ALTERNATIVE FIX:
const { data, error } = await supabase
  .from('audio_tracks')
  .select(`
    *,
    creator:profiles!creator_id (
      username,
      display_name,
      avatar_url,
      user:users!user_id (
        email
      )
    )
  `)
  .in('moderation_status', ['pending_check', 'checking']);
```

### **Option 3: Join with users table directly**
```typescript
// ✅ SIMPLEST FIX:
const { data: tracks, error } = await supabase
  .from('audio_tracks')
  .select(`
    *,
    profiles!creator_id (
      username,
      display_name,
      avatar_url
    )
  `)
  .in('moderation_status', ['pending_check', 'checking']);

// Get emails separately if needed
const userIds = tracks.map(t => t.creator_id);
const { data: users } = await supabase.auth.admin.listUsers();
// Map emails to tracks
```

---

## 📍 **FILE TO FIX**

**Location:** `apps/web/app/api/admin/moderation/queue/route.ts`

Look for:
- Supabase query that selects from `audio_tracks`
- JOIN or select with `profiles` table
- Any reference to `email` column

**Current code probably looks like:**
```typescript
.select('*, profiles_1(email, username)')
```

**Should be:**
```typescript
.select('*, profiles!creator_id(username, display_name)')
```

---

## 🧪 **VERIFICATION STEPS**

After fixing:

1. **Test API directly:**
```bash
curl "https://www.soundbridge.live/api/admin/moderation/queue?filter=pending"
```

Expected: 200 status with tracks array

2. **Test admin panel:**
- Go to /admin/moderation
- Click "Pending" tab
- Should show "Pending (8)"

3. **Check browser console:**
- Should not see 500 errors
- Should not see SQL column errors

---

## 📊 **IMPACT**

**Current State:**
- ❌ Admin panel completely broken
- ❌ Cannot view pending tracks
- ❌ Cannot manually review or approve tracks
- ❌ 8 tracks stuck for months

**After Fix:**
- ✅ Admin panel will work
- ✅ Can view all pending tracks
- ✅ Can manually approve/reject
- ✅ Complete moderation workflow functional

---

## 🎯 **IMMEDIATE ACTIONS NEEDED**

1. **Fix SQL query** in `/api/admin/moderation/queue/route.ts`
2. **Remove `email` from profiles select** OR get it from correct table
3. **Deploy fix** to production
4. **Test** that API returns 200 with tracks
5. **Notify mobile team** when fixed

---

## 📝 **ADDITIONAL NOTES**

### **Database Schema Reference:**

**`profiles` table has:**
- `id` (UUID)
- `user_id` (UUID, references auth.users)
- `username` (text)
- `display_name` (text)
- `avatar_url` (text)
- **NO `email` column** ❌

**`auth.users` table has:**
- `id` (UUID)
- `email` (text) ✅
- Other auth fields

**To get email, you must:**
- Query `auth.users` table directly
- OR join through `profiles.user_id → auth.users.id`

---

## ⏰ **URGENCY**

**Priority:** 🔴 CRITICAL

This is a simple SQL query fix that should take 5 minutes:
1. Find the query with `profiles_1.email`
2. Remove `email` from the select
3. Deploy

**Estimated Fix Time:** 5-10 minutes  
**Expected Deployment Time:** Immediate after commit

---

**Mobile Team**  
December 23, 2024

---

## 📎 **SUPPORTING DATA**

**Database confirms tracks exist:**
```json
[
  { "title": "Lovely", "moderation_status": "pending_check" },
  { "title": "Healing in you", "moderation_status": "pending_check" },
  // ... 8 total tracks
]
```

**Browser console error:**
```
[Error] Failed to load resource: the server responded with a status of 500 () (queue, line 0)
[Error] API error: "column profiles_1.email does not exist"
```

**API response:**
```json
{
  "error": "column profiles_1.email does not exist"
}
```

