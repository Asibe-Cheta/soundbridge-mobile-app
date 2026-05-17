# Web Team — Opportunities: Two Issues Requiring Backend Fixes

**Date:** 2026-04-23  
**Raised by:** Mobile team  
**Priority:** High

---

## Issue 1 — DELETE and PATCH on `opportunity_posts` fail from the API layer

### What broke

Calling `DELETE /api/opportunities/:id` throws:

```
update or delete on table "opportunity_posts" violates foreign key constraint
"opportunity_projects_opportunity_id_fkey" on table "opportunity_projects"
```

Calling `PATCH /api/opportunities/:id` (to set `is_active = false`) throws:

```
new row violates row-level security policy for table "opportunity_posts"
```

### Root causes

1. **FK constraint** — The API handler deletes from `opportunity_posts` directly without first removing dependent rows in `opportunity_projects` (and likely `opportunity_interests`). Postgres blocks this because of the foreign key.

2. **RLS violation on PATCH** — The backend is either using the service role key with an incorrect `user_id` condition, or is not passing the authenticated user's JWT correctly when updating the row. The RLS policy `auth.uid() = posted_by` is not being satisfied.

### Current mobile workaround

The mobile app now performs these operations directly via the Supabase client using the user's session token, which satisfies RLS correctly:

```typescript
// Close (deactivate)
await supabase
  .from('opportunity_posts')
  .update({ is_active: false })
  .eq('id', id)
  .eq('posted_by', session.user.id);

// Delete — cascade children first
await supabase.from('opportunity_interests').delete().eq('opportunity_id', id);
await supabase.from('opportunity_projects').delete().eq('opportunity_id', id);
await supabase
  .from('opportunity_posts')
  .delete()
  .eq('id', id)
  .eq('posted_by', session.user.id);
```

### Required backend fix

The API handler for `DELETE /api/opportunities/:id` should cascade-delete in this order before removing the parent row:

```sql
-- 1. Remove interests
DELETE FROM opportunity_interests WHERE opportunity_id = $id;

-- 2. Remove projects (check for active/unpaid ones first and reject if needed)
DELETE FROM opportunity_projects WHERE opportunity_id = $id;

-- 3. Then remove the opportunity
DELETE FROM opportunity_posts WHERE id = $id AND posted_by = $auth_user_id;
```

The PATCH handler should ensure it is using the authenticated user's JWT (not the service key) when updating `opportunity_posts`, so that the RLS policy `auth.uid() = posted_by` is satisfied.

Once the API handlers are fixed, the mobile app can be reverted to use the API endpoints rather than direct Supabase calls.

---

## Issue 2 — No country/region field on `opportunity_posts` for location filtering

### What broke

Users were seeing location-specific opportunities regardless of their own location. Example: a user based in Nigeria was shown and could express interest in a gig explicitly posted for a UK location.

### Root cause

`opportunity_posts` has only a freeform `location` text field (e.g. `"London, UK"`) and an `is_remote` boolean. There is no structured country code or lat/lng column, so neither the `get_recommended_opportunities` RPC nor the API can filter reliably by geography.

### Current mobile workaround

The mobile feed applies a client-side filter after fetching:

```typescript
// Extract trailing segment as country proxy: "London, UK" → "uk"
const extractCountry = (loc?: string) =>
  loc ? loc.split(',').pop()?.trim().toLowerCase() ?? null : null;

const isRelevant = (opp) => {
  if (opp.is_remote) return true;
  if (!opp.location) return true;
  const userCountry = extractCountry(userProfile?.location);
  if (!userCountry) return true;
  return extractCountry(opp.location) === userCountry;
};

feed = feed.filter(isRelevant);
```

This works for well-formatted `"City, Country"` strings but will silently pass through malformed or single-segment locations (e.g. `"Manchester"` with no country suffix).

### Required backend fix

**Option A (recommended) — Add a `country_code` column:**

```sql
ALTER TABLE opportunity_posts
  ADD COLUMN country_code CHAR(2);  -- ISO 3166-1 alpha-2, e.g. 'GB', 'NG', 'US'

-- Backfill existing rows where possible (manual or scripted)
-- Make NULL mean "no restriction / worldwide"
```

Update the `get_recommended_opportunities` RPC to accept an optional `p_country_code` parameter and filter:

```sql
AND (op.country_code IS NULL OR op.is_remote = true OR op.country_code = p_country_code)
```

Update `CREATE /api/opportunities` to accept and store `country_code` from the mobile payload.

**Option B (lighter) — Add country to the RPC filter without a schema change:**

Parse `location` server-side in the RPC using a consistent convention and filter there, keeping the client-side fallback as a safety net.

**Also required:** Update the `express_interest` endpoint to validate that the applicant's profile country matches the opportunity's `country_code` (or that the opportunity is remote), and return a `403` with a clear message if not. This prevents interest expressions being saved even when the feed filter is bypassed.

---

## Summary of required SQL

```sql
-- 1. Add country_code to opportunity_posts
ALTER TABLE opportunity_posts
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- 2. Update RPC to filter by country
-- (modify get_recommended_opportunities to accept p_country_code CHAR(2))
-- AND (op.country_code IS NULL OR op.is_remote OR op.country_code = p_country_code)

-- 3. Fix opportunity_projects FK to CASCADE on delete (optional, cleaner long-term)
ALTER TABLE opportunity_projects
  DROP CONSTRAINT opportunity_projects_opportunity_id_fkey,
  ADD CONSTRAINT opportunity_projects_opportunity_id_fkey
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunity_posts(id)
    ON DELETE CASCADE;

-- Same for opportunity_interests if applicable
ALTER TABLE opportunity_interests
  DROP CONSTRAINT <existing_fkey_name>,
  ADD CONSTRAINT opportunity_interests_opportunity_id_fkey
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunity_posts(id)
    ON DELETE CASCADE;
```

---

*Mobile workarounds are in place and live on production. The backend fixes will let us remove those workarounds and make filtering reliable for all clients (web + mobile).*
