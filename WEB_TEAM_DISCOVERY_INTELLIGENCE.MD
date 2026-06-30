# Web Team — Discovery Intelligence Implementation

Mobile has fully implemented its side of this feature.
This document covers what the backend and web dashboard need to deliver.
The full product spec is in DISCOVERY_INTELLIGENCE_TIGHTENED_LOGIC.MD.

---

## 1. Run the Migration SQL

File: `migrations/discovery_intelligence.sql`

Run the entire file in the Supabase SQL editor (production).
It creates the following:

- `audio_tracks.mood_tags text[]` — added via ALTER TABLE
- `profiles.preferred_moods text[]` — added via ALTER TABLE
- `track_quality_signals` — aggregated quality signals per track
- `play_sessions` — individual play records
- `listener_genre_affinity` — per user-creator engagement scores
- `recalculate_quality_score(p_track_id uuid)` — PL/pgSQL function
- RLS policies and indexes for all three tables

Do not modify the function or column names — mobile code references them directly.

---

## 2. Listener Mood Preferences — Discovery Preferences Screen

Mobile stores `preferred_moods` on the `profiles` table (already in migration).

Web needs to add a mood preference selector to the notification/discovery
preferences screen on the web dashboard:

**Label:** "What moods move you most?"

**Multi-select — same list as mobile upload form:**

```
Worshipful, Energetic, Reflective, Celebratory, Raw and honest,
Uplifting, Melancholic, Peaceful, Intense, Romantic, Nostalgic, Motivational
```

**Save to:** `profiles.preferred_moods text[]`

**Read/write pattern:**
```sql
-- Read
SELECT preferred_moods FROM profiles WHERE id = auth.uid();

-- Write
UPDATE profiles SET preferred_moods = $1 WHERE id = auth.uid();
```

---

## 3. Track Upload Form — Mood Tags

Add the mood selector to the web track upload form.

**Label:** "What mood does this track create?"

**Multi-select, max 3 selections, same list as above.**

**Save to:** `audio_tracks.mood_tags text[]`

---

## 4. Discovery Feed Query — Mood Matching

Update the web discovery feed query to include mood matching alongside
existing genre and location matching.

Priority order (bucket 1 first, fall back to next if insufficient tracks):

```
Bucket 1: genre AND mood overlap AND location
Bucket 2: genre AND mood overlap
Bucket 3: genre AND location
Bucket 4: genre only
Bucket 5: trending (fallback)
```

**Mood overlap query pattern (Supabase JS):**
```js
// Bucket 1: genre + mood + location
const { data: bucket1 } = await supabase
  .from('audio_tracks')
  .select('...')
  .contains('genre', [userGenre])         // or your existing genre filter
  .overlaps('mood_tags', preferredMoods)  // array overlap
  .eq('location', userLocation)           // your existing location filter
  .order('play_count', { ascending: false })
  .limit(limit);
```

`.overlaps()` returns rows where `mood_tags` has at least one element in common
with `preferredMoods`. Rows without `mood_tags` (null) will not match — this is
correct behaviour; untagged tracks fall to the genre-only bucket.

---

## 5. Quality Score → Discovery Exposure

Track quality score (0–100) controls how widely a track is served.
Mobile calculates and stores this — web feed queries should apply this filter:

```
Score  0–30:  serve to creator's immediate location only
Score 31–60:  serve to expanded radius + similar genre listeners
Score 61–80:  featured in genre discovery beyond location
Score 81–100: eligible for platform-wide featured placement
```

**Practical implementation:** add a quality_score filter/boost to the
discovery query, or use it to sort within buckets:

```sql
-- Example: for broad discovery (score > 60), remove location restriction
SELECT t.* FROM audio_tracks t
LEFT JOIN track_quality_signals tqs ON tqs.track_id = t.id
WHERE t.genre = $user_genre
  AND (tqs.quality_score > 60 OR t.creator_location = $user_location)
ORDER BY tqs.quality_score DESC NULLS LAST, t.play_count DESC
LIMIT 50;
```

Quality score is creator-private — never expose the raw number to listeners.

---

## 6. live_interest_rate — Hook Up to live_interest_responses

Mobile tracks `live_interest_rate` in `track_quality_signals`, but the source
of truth is the existing `live_interest_responses` table.

When a new live interest response is submitted (any platform), update
`track_quality_signals` for that track:

```sql
-- After any INSERT into live_interest_responses:
UPDATE track_quality_signals
SET
  live_interest_yes_count = (
    SELECT COUNT(*) FROM live_interest_responses
    WHERE track_id = $track_id AND responded_yes = true
  ),
  live_interest_rate = (
    SELECT COUNT(*) FILTER (WHERE responded_yes = true)::numeric
           / NULLIF(COUNT(*), 0)
    FROM live_interest_responses
    WHERE track_id = $track_id
  )
WHERE track_id = $track_id;

-- Then recalculate quality score
SELECT recalculate_quality_score($track_id);
```

This can be a Supabase database trigger or a webhook handler — whichever
fits your existing live interest flow.

---

## 7. tip_count and tip_rate — Hook Up to Tips

Similarly, when a tip is processed for a track, update `track_quality_signals`:

```sql
-- After any confirmed tip payment linked to a track:
UPDATE track_quality_signals
SET
  tip_count = tip_count + 1,
  tip_total_amount = tip_total_amount + $tip_amount,
  tip_rate = (tip_count + 1)::numeric / NULLIF(unique_listeners, 0)
WHERE track_id = $track_id;

SELECT recalculate_quality_score($track_id);
```

---

## 8. Audience Intelligence Dashboard — Web Creator Portal

Add an "Audience Intelligence" section to the web creator analytics dashboard.
Tier-gate the depth as follows:

### Free tier
Locked preview card:

> "Discover who your real audience is, where they are, and when they want
> to hear you live. Available on Premium and Unlimited."

Button: **Access Premium** → subscription upgrade flow.

### Premium tier

**Track Performance Summary**
For each uploaded track, show:
- Total plays and unique listeners
- Repeat listen rate as % (`repeat_listens / total_plays * 100`)
- Tip rate as % (`tip_rate * 100`)
- Quality score out of 100
- Live interest count

Query:
```sql
SELECT
  t.id, t.title, t.cover_image_url,
  tqs.total_plays, tqs.unique_listeners, tqs.repeat_listens,
  tqs.tip_count, tqs.tip_rate, tqs.live_interest_yes_count,
  tqs.quality_score
FROM audio_tracks t
JOIN track_quality_signals tqs ON tqs.track_id = t.id
WHERE t.creator_id = $creator_id
ORDER BY tqs.quality_score DESC;
```

**Audience Location Overview**
List cities where engaged listeners are concentrated.
An engaged listener = tipped OR repeated a listen OR expressed live interest.

```sql
SELECT
  p.city,
  p.country,
  COUNT(DISTINCT lga.user_id) AS engaged_listeners
FROM listener_genre_affinity lga
JOIN profiles p ON p.id = lga.user_id
WHERE lga.creator_id = $creator_id
  AND (lga.tips_sent > 0 OR lga.repeat_listens > 0 OR lga.live_interest_expressed = true)
GROUP BY p.city, p.country
ORDER BY engaged_listeners DESC
LIMIT 10;
```

Display format: `Manchester — 23 engaged listeners`

**Live Interest Summary**
```sql
-- Total live interest for this creator's tracks
SELECT
  COUNT(*) AS total_responses,
  COUNT(*) FILTER (WHERE lir.responded_yes = true) AS yes_count,
  p.city,
  COUNT(*) FILTER (WHERE lir.responded_yes = true) AS city_yes_count
FROM live_interest_responses lir
JOIN audio_tracks t ON t.id = lir.track_id
JOIN profiles p ON p.id = lir.user_id
WHERE t.creator_id = $creator_id
GROUP BY p.city
ORDER BY city_yes_count DESC;
```

Show: total yes count, top 3 cities by yes count, most common availability
preference (from `live_interest_responses.availability_preference` if that
column exists, or surface it as a follow-up).

### Unlimited tier

Everything in Premium plus:

**Audience Similarity Insights**
Find which other creators' fans overlap with this creator's fans:

```sql
SELECT
  other_t.creator_id AS similar_creator_id,
  p.username AS similar_creator_username,
  COUNT(DISTINCT overlap.user_id) AS shared_fans
FROM listener_genre_affinity lga
JOIN listener_genre_affinity overlap
  ON overlap.user_id = lga.user_id
  AND overlap.creator_id != lga.creator_id
JOIN audio_tracks other_t ON other_t.creator_id = overlap.creator_id
JOIN profiles p ON p.id = overlap.creator_id
WHERE lga.creator_id = $creator_id
  AND lga.affinity_score > 0
GROUP BY other_t.creator_id, p.username
ORDER BY shared_fans DESC
LIMIT 5;
```

Display as: "Listeners who engage with your music also engage with [genre/mood]
creators."

**Optimal Event Timing**
Requires `live_interest_responses.availability_preference` field.
If not yet present, add it: `availability_preference text` (values: weekends,
weekday_evenings, any_time).

```sql
SELECT
  availability_preference,
  COUNT(*) AS count,
  p.city
FROM live_interest_responses lir
JOIN audio_tracks t ON t.id = lir.track_id
JOIN profiles p ON p.id = lir.user_id
WHERE t.creator_id = $creator_id
  AND lir.responded_yes = true
GROUP BY availability_preference, p.city
ORDER BY count DESC;
```

Display as: "Your strongest audience availability is Saturday evenings.
67% of your live-interested listeners in Manchester prefer weekends."

**Track Quality Breakdown**
Full signal breakdown per track (all four contributing signals with their
percentage contribution) and a comparison to genre-average quality score:

```sql
-- Genre average for comparison
SELECT AVG(tqs.quality_score) AS genre_avg
FROM track_quality_signals tqs
JOIN audio_tracks t ON t.id = tqs.track_id
WHERE t.genre = $creator_genre;
```

**Growth Signals**
Month-on-month comparison of quality scores, repeat listen rates, tip rates.
Join `play_sessions` (grouped by month) with `track_quality_signals` history
(or store a monthly snapshot if you prefer not to recompute).

---

## 9. What Mobile Has Already Done

- Migration SQL written: `migrations/discovery_intelligence.sql`
- `mood_tags` selector on upload form (max 3 moods)
- `play_sessions` inserted after every valid play (≥30s or ≥50% duration)
- `track_quality_signals` upserted after each valid play
- `recalculate_quality_score()` called after each signal update
- `listener_genre_affinity` updated for repeat listeners
- Discovery feed updated to bucket by genre+mood, genre-only fallback
- Post-upload guidance card shown to creators
- Audience Intelligence tab in Creator Insights Dashboard (mobile)
  - Free: locked upgrade card
  - Premium: quality score leaderboard + signal breakdown
  - Unlimited: above + affinity fans list

---

## 10. General Rules (from product spec)

- Quality score is never manually adjustable by creators
- A play under 30 seconds or less than 50% of track duration does not count
- Do not expose quality scores to listeners — creators only
- Mood tags are optional on upload but encouraged
- All existing discovery and genre matching logic unchanged — this adds layers
- Match existing SoundBridge design system throughout

---

## Questions for Mobile Team

None currently. All DB column names and table names are finalized in the
migration SQL. Mobile and web should reference them verbatim.
