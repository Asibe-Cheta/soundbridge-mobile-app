# URGENT: RPC Column Mismatch - Events Not Showing

## Error

```
⚠️ get_personalized_events RPC error: structure of query does not match function result type
```

## Problem

The `get_personalized_events` RPC function exists but returns columns that don't match what Supabase/PostgREST expects. This causes ALL events to fail to load.

---

## Required Fix

The RPC function MUST return **exactly these columns** with **exactly these types**:

```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  venue TEXT,
  category TEXT,
  price_gbp NUMERIC,
  price_ngn NUMERIC,
  max_attendees INT,
  current_attendees INT,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
```

### Important Notes:

1. **Column names must match exactly** - case sensitive
2. **Column types must match the events table** - use the same types as the `events` table
3. **Do NOT add extra columns** like `creator_id` or `distance_km` - the mobile app doesn't expect them
4. **Column order matters** - return them in this exact order

---

## Common Causes of This Error

1. **Extra columns in RETURNS TABLE** - RPC returns more columns than mobile expects
2. **Type mismatch** - e.g., returning `FLOAT` when table has `NUMERIC`
3. **Column name mismatch** - e.g., `eventDate` vs `event_date`
4. **Missing columns** - RPC doesn't return all expected columns

---

## How to Verify Column Types

Run this query to see the exact types in your events table:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
```

Then make sure your RPC `RETURNS TABLE` uses the **exact same types**.

---

## Example Fix

If your events table has:
- `price_gbp` as `numeric` → use `NUMERIC` in RETURNS TABLE
- `price_ngn` as `numeric` → use `NUMERIC` in RETURNS TABLE
- `event_date` as `timestamp with time zone` → use `TIMESTAMPTZ` in RETURNS TABLE

```sql
-- Drop and recreate with correct types
DROP FUNCTION IF EXISTS get_personalized_events(UUID, INT, INT);

CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  venue TEXT,
  category TEXT,
  price_gbp NUMERIC,
  price_ngn NUMERIC,
  max_attendees INT,
  current_attendees INT,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Your personalization logic here
  -- Make sure SELECT returns columns in EXACT same order as RETURNS TABLE

  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.venue,
    e.category,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url,
    e.created_at
  FROM events e
  WHERE e.event_date >= NOW()
  -- Add your personalization WHERE clauses here
  ORDER BY e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personalized_events TO authenticated;
```

---

## Testing

After fixing, test with:

```sql
SELECT * FROM get_personalized_events('bd8a455d-a54d-45c5-968d-e4cf5e8d928e', 20, 0);
```

If this returns rows without error, mobile will work.

---

## Priority

**CRITICAL** - This is blocking all event display for all users.

---

*Document created: January 17, 2026*
