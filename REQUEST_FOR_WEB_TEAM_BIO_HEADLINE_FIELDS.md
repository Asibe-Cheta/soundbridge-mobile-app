# 🔴 REQUEST FOR WEB APP TEAM: Add `bio` and `headline` to Post API Responses

**Date:** January 2, 2026
**Requested by:** Mobile Team
**Priority:** Medium
**Status:** Pending

---

## 📋 Summary

The mobile app needs `bio` and `headline` fields included in the `author` object for all post-related API endpoints. These fields exist in the Supabase `profiles` table but are not currently being returned by the backend API.

---

## 🎯 What We Need

### Add these fields to the `author` object in API responses:
- `headline` (string, optional) - User's professional headline
- `bio` (string, optional) - User's biography

---

## 📡 API Endpoints That Need Updates

### 1️⃣ **GET `/api/posts/feed`** - Feed posts endpoint

**Current Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "...",
        "content": "...",
        "author": {
          "id": "uuid",
          "username": "johndoe",
          "name": "John Doe",
          "avatar_url": "https://...",
          "role": "creator"
        }
        // ... other fields
      }
    ]
  }
}
```

**Required Response (add highlighted fields):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "...",
        "content": "...",
        "author": {
          "id": "uuid",
          "username": "johndoe",
          "name": "John Doe",
          "avatar_url": "https://...",
          "role": "creator",
          "headline": "Gospel Artist & Producer",  // ⬅️ ADD THIS
          "bio": "Creating music that inspires..."  // ⬅️ ADD THIS
        }
        // ... other fields
      }
    ]
  }
}
```

### 2️⃣ **GET `/api/posts/[id]`** - Single post endpoint
Same `author` object changes as endpoint #1

### 3️⃣ **GET `/api/posts/user/[userId]`** - User's posts endpoint
Same `author` object changes as endpoint #1

### 4️⃣ **Reposted posts**
If your API returns `reposted_from` objects with author data, those also need `headline` and `bio` fields.

---

## 🗄️ Database Changes Required

When querying the `profiles` table for post authors, include these fields in your SELECT:

**Before:**
```sql
SELECT
  id,
  username,
  display_name,
  avatar_url,
  role
FROM profiles
WHERE id IN (...)
```

**After:**
```sql
SELECT
  id,
  username,
  display_name,
  avatar_url,
  role,
  headline,    -- ⬅️ ADD THIS
  bio          -- ⬅️ ADD THIS
FROM profiles
WHERE id IN (...)
```

---

## ✅ Verification

These columns already exist in the Supabase `profiles` table:
- ✅ `bio` - TEXT column
- ✅ `headline` - TEXT column

You can verify by running:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('bio', 'headline');
```

---

## 🎨 Why This Is Needed

The mobile app displays LinkedIn-style post cards with user profile information shown above each post:

```
┌─────────────────────────────────────┐
│  👤 John Doe                 [Follow]│
│     Gospel Artist & Producer        │  ⬅️ headline/role
│     Creating music that inspires... │  ⬅️ bio (truncated)
│     2h ago                          │
├─────────────────────────────────────┤
│                                     │
│  [Post content here...]             │
│                                     │
└─────────────────────────────────────┘
```

The UI is fully implemented and ready, but the bio/headline are not appearing because the API doesn't return them.

---

## 📱 Current Mobile App Status

The mobile app already has:
- ✅ TypeScript interfaces updated with `bio` and `headline` fields
- ✅ UI components that display these fields
- ✅ Supabase fallback queries that fetch these fields
- ✅ Conditional rendering (only shows when data exists)

**The only missing piece:** Backend API including these fields in responses.

---

## 🧪 Testing After Implementation

After you deploy this change, we should see:
1. User's headline displayed under their name (if they have one)
2. User's bio shown as a single truncated line (if they have one)
3. No errors or missing data

Test users with:
- ✅ User with bio and headline set
- ✅ User with only bio set
- ✅ User with only headline set
- ✅ User with neither set (should just show name and role)

---

## ❓ Questions?

If you need any clarification or have questions about this request, please let the mobile team know.

**Mobile Team Contact:** [Your name/contact]

---

## 📝 Notes

- These fields are optional - not all users will have them filled
- Return `null` or omit the field if user doesn't have bio/headline
- No need to add fallback text - the mobile app handles empty states
- This is purely additive - no breaking changes to existing fields
