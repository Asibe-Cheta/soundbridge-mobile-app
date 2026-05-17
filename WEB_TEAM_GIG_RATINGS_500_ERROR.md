# 🚨 URGENT — Gig Rating Submission Fails with 500

## What's Happening

After a project completes, when the poster taps **Submit Review**, the app calls:

```
POST /api/gig-ratings
```

And receives:

```json
HTTP 500
{ "success": false, "error": "Failed to submit rating" }
```

The rating is never saved.

## Request Details

- **URL**: `https://www.soundbridge.live/api/gig-ratings`
- **Method**: POST
- **Auth**: Bearer token present (`hasToken: true`, `hasSession: true`)
- **Project**: "Looking for a trumpeter" (status: `completed`)

## Payload Sent (from mobile)

```json
{
  "project_id": "<projectId>",
  "ratee_id": "<providerUserId>",
  "overall_rating": 5,
  "professionalism_rating": <1-5>,
  "punctuality_rating": <1-5>,
  "quality_rating": <1-5>,
  "written_review": "Great!"
}
```

## What to Check

1. **Check the `gig_ratings` table schema** — ensure all columns in the insert match what the mobile is sending. A NOT NULL column missing from the insert, or an unexpected column name, will cause a silent 500.
2. **Check RLS policies** on `gig_ratings` — the poster's JWT must have insert access.
3. **Check for unique constraint** — if a rating for this `project_id` + `rater_id` already exists (from a previous attempt), a blind insert will violate the constraint.
4. **Add proper error logging** — surface the actual DB error rather than swallowing it into "Failed to submit rating".

## Suggested Fix

```js
// Find or insert — never blindly insert
const existing = await db.gig_ratings.findOne({
  where: { project_id: projectId, rater_id: raterId }
});

if (existing) {
  return res.json({ success: true, rating: existing }); // already rated
}

const rating = await db.gig_ratings.create({ ... });
return res.json({ success: true, rating });
```

## Impact

**High** — users cannot leave verified reviews after completing paid projects. This breaks the trust/reputation system entirely.
