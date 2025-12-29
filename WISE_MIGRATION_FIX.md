# Wise Migration SQL Error Fix

**Date:** 2025-12-29
**Issue:** Column `p.full_name` does not exist
**Status:** ✅ FIXED

---

## Error Details

```
ERROR: 42703: column p.full_name does not exist
LINE 225: p.full_name as creator_name,
```

**Location:** `migrations/create_wise_payouts_table.sql` line 225

---

## Root Cause

The `wise_payouts_recent_successful` view referenced `p.full_name` from the `profiles` table, but the actual profiles table schema uses:
- `username` (VARCHAR)
- `display_name` (VARCHAR)
- NOT `full_name`

---

## Fix Applied

### File: `migrations/create_wise_payouts_table.sql`

**BEFORE (line 225-227):**
```sql
SELECT
  wp.*,
  p.full_name as creator_name,
  p.email as creator_email
FROM wise_payouts wp
LEFT JOIN profiles p ON wp.creator_id = p.id
```

**AFTER:**
```sql
SELECT
  wp.*,
  p.username as creator_username,
  p.display_name as creator_name,
  p.email as creator_email
FROM wise_payouts wp
LEFT JOIN profiles p ON wp.creator_id = p.id
```

**Changes:**
- ✅ Added `p.username as creator_username`
- ✅ Changed `p.full_name` → `p.display_name as creator_name`
- ✅ Kept `p.email as creator_email`

---

### File: `src/lib/types/wise.ts`

Updated TypeScript interface to match:

**BEFORE:**
```typescript
export interface PayoutWithCreator extends WisePayout {
  creator?: {
    id: string;
    full_name?: string;
    email?: string;
    username?: string;
  };
}
```

**AFTER:**
```typescript
export interface PayoutWithCreator extends WisePayout {
  creator?: {
    id: string;
    username?: string;
    display_name?: string;
    email?: string;
  };
}
```

---

## Verification

Run the migration again:

```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Paste migration SQL
3. Run

# Via psql
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f migrations/create_wise_payouts_table.sql
```

**Expected:** Migration should complete without errors.

---

## View Output After Fix

```sql
SELECT * FROM wise_payouts_recent_successful LIMIT 1;
```

**Columns returned:**
- All `wise_payouts` columns
- `creator_username` (from profiles.username)
- `creator_name` (from profiles.display_name)
- `creator_email` (from profiles.email)

---

## Profiles Table Schema Reference

Based on codebase analysis, the `profiles` table has these user identity columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `username` | VARCHAR | Unique username (e.g., @johndoe) |
| `display_name` | VARCHAR | Display name (e.g., "John Doe") |
| `email` | VARCHAR | Email address |
| `avatar_url` | TEXT | Profile avatar URL |

**Source:** `src/services/ProfileService.ts`

---

## Status

✅ **FIXED** - Migration now uses correct column names matching the actual profiles table schema.

---

**Last Updated:** 2025-12-29
