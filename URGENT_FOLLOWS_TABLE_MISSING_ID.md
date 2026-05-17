# URGENT: Follows Table Missing ID Column

**Date:** March 9, 2026  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH - Follow Feature Broken**

---

## Problem

The **Follow** endpoint is returning 500 error because the `follows` table is missing the `id` column.

### Error Details

```
POST /api/user/{userId}/follow
Status: 500
Response: {
  "success": false,
  "error": "Failed to follow user",
  "details": "column follows.id does not exist"
}
```

---

## Required Database Fix

The `follows` table needs to have an `id` column (UUID primary key).

### Correct Schema Should Be:

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id),
  following_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### Possible Issues

1. **Table exists but missing `id` column** - Add the column:
   ```sql
   ALTER TABLE follows ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
   ```

2. **Wrong table name** - Check if table is named something else (`user_follows`, `follows_table`, etc.)

3. **Column named differently** - Check if primary key is named `_id`, `follow_id`, etc.

---

## Verification Query

Please run this in Supabase SQL Editor and share the output:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;

-- Check if table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'follows'
);

-- Check all tables that might be related
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%follow%';
```

---

## Impact

- 🚨 Onboarding Step 6 "Follow creators" is broken
- 🚨 Users cannot follow creators during onboarding
- 🚨 Mobile app shows "Failed to follow" error

---

## Timeline

**URGENT** - Blocks onboarding completion. Please fix ASAP.

---

## Web team fix: migration added

A migration was added so the `follows` table has an `id` column without changing the existing primary key:

**File:** `migrations/add_follows_id_column.sql`

```sql
ALTER TABLE follows
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_id ON follows(id);
```

**Run in Supabase:** SQL Editor → run the contents of `migrations/add_follows_id_column.sql`, then re-test **POST /api/user/{userId}/follow**. Existing rows get a generated `id`; new rows get `id` by default.

---

**Prepared by:** Mobile Team  
**Date:** March 9, 2026
