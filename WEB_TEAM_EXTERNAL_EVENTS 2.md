# Web Team — External Events Integration (Songkick)

Mobile app is ready and waiting. This document specifies everything the backend
needs to deliver for external Songkick events to appear in the Discover screen.

---

## 1. Environment Variable

Add to all environments (dev, staging, production):

```
SONGKICK_API_KEY=<key from songkick.com/developer>
```

Never hardcode this.

---

## 2. New Table — `external_events`

```sql
CREATE TABLE external_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_external_id   TEXT UNIQUE NOT NULL,       -- Songkick event ID
  source              TEXT NOT NULL DEFAULT 'songkick',
  title               TEXT NOT NULL,
  artist_name         TEXT NOT NULL,
  venue_name          TEXT NOT NULL,
  venue_address       TEXT,
  city                TEXT NOT NULL,
  country             TEXT NOT NULL,
  latitude            DECIMAL(9,6),
  longitude           DECIMAL(9,6),
  genre               TEXT,                        -- mapped SoundBridge event category
  event_date          TIMESTAMPTZ NOT NULL,
  ticket_url          TEXT,
  image_url           TEXT,
  is_claimed          BOOLEAN NOT NULL DEFAULT false,
  claimed_by_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_external_events_event_date ON external_events (event_date);
CREATE INDEX idx_external_events_is_claimed  ON external_events (is_claimed);
CREATE INDEX idx_external_events_city        ON external_events (city);
CREATE INDEX idx_external_events_source      ON external_events (source);

-- RLS: public read, no direct writes from client
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read external events"
  ON external_events FOR SELECT
  USING (true);
```

---

## 3. Songkick Genre → SoundBridge Category Mapping

Apply this mapping when ingesting Songkick events. Store the mapped value in
the `genre` column so it participates in the existing category-matching filter.

```
Gospel / Christian / Worship          → Gospel Concert
Jazz / Blues / Swing / Bebop          → Jazz Room
Comedy / Stand-Up Comedy              → Comedy Night
Classical / Opera / Orchestra         → Instrumental
Festival                              → Festival
Karaoke                               → Music Karaoke
Carnival / Parade                     → Carnival
Workshop / Masterclass / Clinic       → Workshop
Conference / Seminar / Talk           → Conference
Everything else (Rock, Pop, Hip-Hop,
  R&B, Afrobeats, Electronic, etc.)  → Music Concert
```

If Songkick returns no genre, default to `Music Concert`.

---

## 4. Background Sync Job — Supabase Edge Function + pg_cron

Create an Edge Function `sync-songkick-events` that runs every 6 hours via
pg_cron (or EAS Scheduled functions).

### UK Locations to Query

Query Songkick for each city's metro area ID. Focus on:

| City | Songkick Metro ID |
|------|-------------------|
| London | 24426 |
| Manchester | 28714 |
| Birmingham | 24521 |
| Leeds | 24485 |
| Bristol | 24521 |
| Reading | (resolve dynamically via location search) |

For each metro, call:

```
GET https://api.songkick.com/api/3.0/metro_areas/{metro_id}/calendar.json
    ?apikey={SONGKICK_API_KEY}
    &min_date={today}
    &max_date={today+90days}
    &per_page=50
    &page=1
```

### Ingestion Logic

```typescript
for (const songkickEvent of fetchedEvents) {
  const mappedCategory = mapSongkickGenre(songkickEvent.performance[0]?.artist?.genres);

  const row = {
    event_external_id: String(songkickEvent.id),
    source: 'songkick',
    title: songkickEvent.displayName,
    artist_name: songkickEvent.performance[0]?.artist?.displayName ?? 'Unknown Artist',
    venue_name: songkickEvent.venue?.displayName ?? 'TBC',
    venue_address: songkickEvent.venue?.street ?? null,
    city: songkickEvent.location?.city ?? '',
    country: songkickEvent.location?.country ?? 'GB',
    latitude: songkickEvent.venue?.lat ?? null,
    longitude: songkickEvent.venue?.lng ?? null,
    genre: mappedCategory,
    event_date: songkickEvent.start?.datetime ?? songkickEvent.start?.date,
    ticket_url: songkickEvent.uri,
    image_url: null,  // Songkick does not provide images in free tier
  };

  // Upsert — never duplicate
  await supabase
    .from('external_events')
    .upsert(row, { onConflict: 'event_external_id', ignoreDuplicates: false });
}
```

### Cleanup (run after ingestion, same Edge Function)

```sql
-- Delete unclaimed past events
DELETE FROM external_events
WHERE event_date < now()
  AND is_claimed = false;

-- Log summary
INSERT INTO sync_logs (source, events_added, events_removed, ran_at)
VALUES ('songkick', $added, $removed, now());
```

Do NOT delete claimed events — they belong to a creator's profile history.

### Scheduling (pg_cron)

```sql
SELECT cron.schedule(
  'sync-songkick-events',
  '0 */6 * * *',           -- every 6 hours
  $$SELECT net.http_post(
      url := 'https://<project-ref>.functions.supabase.co/sync-songkick-events',
      headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

---

## 5. Extend `get_personalized_events` RPC

The mobile app currently calls `get_personalized_events(p_user_id, p_limit, p_offset)`.
Extend it to also return external events, with priority ordering, adding an
`is_external` discriminator column.

### Priority Order (strict)

1. SoundBridge events matching user location (≤20km) + genre
2. External events matching user location (≤20km) + genre
3. SoundBridge events outside 20km but same genre
4. External events outside 20km but same genre

### Example Extension Pattern

```sql
-- Add to the existing RPC function body:

WITH soundbridge_events AS (
  -- existing query — your current CTE
  SELECT
    e.*,
    false AS is_external,
    1 AS priority_tier    -- Tier 1 or 3 depending on distance
  FROM events e
  -- ... existing join and filter logic ...
),
external_ev AS (
  SELECT
    ee.id,
    ee.title,
    ee.artist_name        AS display_name,
    ee.event_date,
    ee.venue_name         AS venue,
    ee.city,
    ee.latitude,
    ee.longitude,
    ee.genre              AS category,
    ee.ticket_url,
    ee.image_url,
    ee.source,
    ee.is_claimed,
    ee.claimed_by_user_id,
    true                  AS is_external,
    -- distance using same Haversine/PostGIS as internal events
    ST_Distance(
      ST_MakePoint(ee.longitude, ee.latitude)::geography,
      ST_MakePoint(p_user_lon, p_user_lat)::geography
    ) / 1000              AS distance_km,
    CASE
      WHEN ST_Distance(...) / 1000 <= 20 THEN 2   -- local external
      ELSE 4                                        -- far external
    END                   AS priority_tier
  FROM external_events ee
  WHERE ee.event_date >= now()
    AND ee.is_claimed = false
    AND ee.latitude IS NOT NULL
)
SELECT * FROM soundbridge_events
UNION ALL
SELECT * FROM external_ev
ORDER BY priority_tier ASC, event_date ASC
LIMIT p_limit
OFFSET p_offset;
```

The mobile app reads the `is_external` boolean to decide which card component
to render. No mobile changes required once this RPC is deployed.

---

## 6. Claim API Endpoint

```
POST /api/events/external/:id/claim
Authorization: Bearer <user-token>
```

### Server Logic

```typescript
// 1. Verify user is authenticated
// 2. Fetch the external_events row
// 3. If already claimed → return 409 { success: false, message: 'Already claimed' }
// 4. Begin transaction:
//    a. UPDATE external_events SET is_claimed=true, claimed_by_user_id=userId, claimed_at=now()
//    b. INSERT INTO events (...) SELECT fields from external_events WHERE id = :id
//       — map: title, event_date, city, venue_name→venue, latitude, longitude, genre→category
//       — set: creator_id = userId, is_public = true
//    c. Commit
// 5. Fire queue-notifications for the newly created events row (existing system)
// 6. Return { success: true, event_id: <new events row id> }
```

The mobile app removes the event from the external events list on success and
the event will now appear as a SoundBridge event on next fetch.

---

## 7. Optional sync_logs Table (for monitoring)

```sql
CREATE TABLE IF NOT EXISTS sync_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL,
  events_added INT NOT NULL DEFAULT 0,
  events_removed INT NOT NULL DEFAULT 0,
  ran_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Acceptance Checklist

- [ ] `external_events` table created with RLS
- [ ] `SONGKICK_API_KEY` added to env
- [ ] Songkick sync Edge Function deployed and scheduled (every 6 hours)
- [ ] Genre mapping applied on ingest
- [ ] Expired unclaimed events deleted on each run
- [ ] `get_personalized_events` extended to return external events with `is_external` field
- [ ] Priority ordering correct (SoundBridge local → external local → SoundBridge far → external far)
- [ ] `POST /api/events/external/:id/claim` endpoint implemented
- [ ] Claim graduates event to Tier 1 and triggers existing notification system
- [ ] Claimed events never deleted by cleanup job
