# Live Interest Feature — Database Migration

Required for: Live Interest prompt on music player
Feeds into: AI Career Adviser (event location + timing signals)

---

## 1. Alter `audio_tracks` table

```sql
ALTER TABLE audio_tracks
  ADD COLUMN live_interest_enabled boolean NOT NULL DEFAULT false;
```

---

## 2. Create `live_interest_responses` table

```sql
CREATE TABLE live_interest_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id              UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responded             boolean NOT NULL DEFAULT false,
  response              TEXT CHECK (response IN ('yes', 'maybe_later', 'auto_dismissed')),
  availability          TEXT CHECK (availability IN ('weekends', 'weekday_evenings', 'any_time', 'not_sure')),
  profile_location      TEXT,
  profile_city          TEXT,
  profile_country       TEXT,
  current_location_lat  DECIMAL,
  current_location_lng  DECIMAL,
  current_city          TEXT,
  current_country       TEXT,
  responded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, track_id)
);
```

---

## 3. Indexes

```sql
CREATE INDEX idx_live_interest_creator
  ON live_interest_responses (creator_id, track_id);

CREATE INDEX idx_live_interest_track
  ON live_interest_responses (track_id, response);
```

---

## 4. Row Level Security

```sql
ALTER TABLE live_interest_responses ENABLE ROW LEVEL SECURITY;

-- Listeners can insert their own response
CREATE POLICY "live_interest_insert_own"
  ON live_interest_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Listeners can read their own response (for dedup check)
CREATE POLICY "live_interest_select_own"
  ON live_interest_responses FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = creator_id);
```

---

## 5. Notes

- `UNIQUE(user_id, track_id)` enforces the once-per-user-per-track rule at the DB level.
- Location fields are NULL for `maybe_later` and `auto_dismissed` responses.
- `availability` is NULL when the secondary question is auto-dismissed.
- The mobile app uses an upsert with `onConflict: 'user_id,track_id'` so duplicate
  prompt renders can never create duplicate rows.
- For AI Career Adviser queries: filter `WHERE creator_id = $1 AND response = 'yes'`
  and group by `profile_city`/`profile_country` for location demand signals.
