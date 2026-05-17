# Fix: Gig Ratings Not Showing on User Profile

## What's Happening

A gig rating was successfully submitted to `gig_ratings` (POST /api/gig-ratings returns 200), but the rated user's profile still shows "No ratings yet" with a count of 0.

## Root Cause

The mobile profile screen reads `rating_avg` and `rating_count` directly from the `profiles` table:

```sql
SELECT rating_avg, rating_count FROM profiles WHERE id = :userId
```

When a gig rating is inserted into `gig_ratings`, the `profiles.rating_avg` and `profiles.rating_count` columns are **not being updated**.

## Fix

After successfully inserting into `gig_ratings`, the `/api/gig-ratings` POST handler must recalculate and update the ratee's profile:

```js
// After inserting the new rating:
const { data: stats } = await supabase
  .from('gig_ratings')
  .select('overall_rating')
  .eq('ratee_id', rateeId);

const count = stats.length;
const avg = stats.reduce((sum, r) => sum + r.overall_rating, 0) / count;

await supabase
  .from('profiles')
  .update({ rating_avg: avg, rating_count: count })
  .eq('id', rateeId);
```

Alternatively, create a **Supabase trigger** on `gig_ratings` that automatically recomputes and writes to `profiles` on every INSERT/UPDATE/DELETE.

## One-Off Fix for Existing Rating

Merit Uche (`ratee_id` from the "Looking for a trumpeter" project) already has 1 rating in `gig_ratings` (overall: 5, submitted today). Run this SQL to update their profile now:

```sql
UPDATE profiles
SET
  rating_avg = (SELECT AVG(overall_rating) FROM gig_ratings WHERE ratee_id = profiles.id),
  rating_count = (SELECT COUNT(*) FROM gig_ratings WHERE ratee_id = profiles.id)
WHERE id = '<merit_uche_user_id>';
```

## Impact

Medium — ratings are submitted and stored correctly but are invisible on profiles. This makes the verified review system appear broken to users.
