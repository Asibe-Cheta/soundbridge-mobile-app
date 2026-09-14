-- Sound Movements / Sound Divisions (NSO_STAGE1.MD)
--
-- A track-level tagging system, deliberately generalisable rather than hardcoded to
-- New Skool Ogene: a "movement" is a parent category (e.g. "New Skool Ogene"), each
-- with N "divisions" beneath it (e.g. "Pulse Culture"). A track can be tagged into
-- one or more divisions, and — critically — an artist's catalogue is not restricted
-- to a single division (no artist-level uniqueness constraint anywhere below), since
-- NSO's founding artist (Dan RicHee) spans all four divisions himself.
--
-- Stage 1 only: backfills Dan RicHee's existing tracks with curated tags. No
-- self-service tagging UI or browsable discovery screens yet (Stage 2, separate).
-- Movements/divisions are curated (service-role writes only) for the same reason —
-- this isn't a creator-editable taxonomy yet.

CREATE TABLE IF NOT EXISTS sound_movements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  founding_artist_id  UUID REFERENCES profiles(id),
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sound_divisions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_id    UUID NOT NULL REFERENCES sound_movements(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (movement_id, slug)
);

-- Many-to-many: a track can carry multiple division tags (e.g. a track that
-- genuinely blends two divisions), and nothing here limits how many divisions a
-- given artist's tracks collectively span.
CREATE TABLE IF NOT EXISTS track_sound_divisions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id     UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
  division_id  UUID NOT NULL REFERENCES sound_divisions(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (track_id, division_id)
);

CREATE INDEX IF NOT EXISTS sound_divisions_movement_id_idx ON sound_divisions (movement_id);
CREATE INDEX IF NOT EXISTS track_sound_divisions_track_id_idx ON track_sound_divisions (track_id);
CREATE INDEX IF NOT EXISTS track_sound_divisions_division_id_idx ON track_sound_divisions (division_id);

ALTER TABLE sound_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sound_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_sound_divisions ENABLE ROW LEVEL SECURITY;

-- Publicly readable (same pattern as user_talent_categories) — display is additive
-- to a creator's existing, already-public profile/catalogue. No public write policy
-- on any of the three tables yet: curated only, via service_role, until self-service
-- tagging is scoped (Stage 2+).
CREATE POLICY "Sound movements are publicly readable"
  ON sound_movements FOR SELECT USING (true);
CREATE POLICY "Sound divisions are publicly readable"
  ON sound_divisions FOR SELECT USING (true);
CREATE POLICY "Track sound division tags are publicly readable"
  ON track_sound_divisions FOR SELECT USING (true);

-- ============================================================================
-- Seed: New Skool Ogene + its four Sound Divisions.
-- ============================================================================

-- Resolved via track title rather than a guessed username/profile id —
-- "Fashionative" and "Obi Lai" are distinctive enough titles to anchor this
-- safely. If neither track exists yet under this exact title, founding_artist_id
-- is left NULL rather than guessed; verify with the SELECT at the bottom of this
-- file after running.
INSERT INTO sound_movements (slug, name, founding_artist_id, description)
SELECT
  'new-skool-ogene',
  'New Skool Ogene',
  (
    SELECT creator_id FROM audio_tracks WHERE title = 'Fashionative'
    UNION
    SELECT creator_id FROM audio_tracks WHERE title = 'Obi Lai'
    LIMIT 1
  ),
  'Founded by Dan RicHee, spanning four Sound Divisions.'
WHERE NOT EXISTS (SELECT 1 FROM sound_movements WHERE slug = 'new-skool-ogene');

INSERT INTO sound_divisions (movement_id, slug, name, display_order)
SELECT m.id, d.slug, d.name, d.ord
FROM sound_movements m
CROSS JOIN (VALUES
  ('pulse-culture', 'Pulse Culture', 1),
  ('rhythm-forge',  'Rhythm Forge',  2),
  ('soul-motion',   'Soul Motion',   3),
  ('fierce-fusion', 'Fierce Fusion', 4)
) AS d(slug, name, ord)
WHERE m.slug = 'new-skool-ogene'
ON CONFLICT (movement_id, slug) DO NOTHING;

-- ============================================================================
-- Tag Dan RicHee's tracks. Each INSERT is scoped to his creator_id (resolved the
-- same way as above) AND an exact title match — so even a generically-titled
-- track like "Wave" or "Intro" can't accidentally tag some other artist's track
-- of the same name. A title that doesn't currently exist under his creator_id
-- just inserts zero rows here rather than erroring — check the verification
-- query at the bottom after running this.
-- ============================================================================

INSERT INTO track_sound_divisions (track_id, division_id)
SELECT t.id, sd.id
FROM audio_tracks t
JOIN (VALUES
  ('Oha',         'pulse-culture'),
  ('Wave',        'pulse-culture'),
  ('Intro',       'rhythm-forge'),
  ('Under Cover', 'rhythm-forge'),
  ('Fashionative','rhythm-forge'),
  ('Obi Lai',     'soul-motion'),
  ('Apii',        'soul-motion'),
  ('Longing',     'fierce-fusion')
) AS tag(track_title, division_slug) ON tag.track_title = t.title
JOIN sound_divisions sd ON sd.slug = tag.division_slug
JOIN sound_movements sm ON sm.id = sd.movement_id AND sm.slug = 'new-skool-ogene'
JOIN (
  SELECT creator_id FROM audio_tracks WHERE title = 'Fashionative'
  UNION
  SELECT creator_id FROM audio_tracks WHERE title = 'Obi Lai'
  LIMIT 1
) dr ON dr.creator_id = t.creator_id
ON CONFLICT (track_id, division_id) DO NOTHING;

-- ============================================================================
-- Verification — run after the migration to confirm what actually got tagged.
-- ============================================================================
--
-- SELECT sm.name AS movement, sd.name AS division, t.title, t.creator_id
-- FROM track_sound_divisions tsd
-- JOIN sound_divisions sd ON sd.id = tsd.division_id
-- JOIN sound_movements sm ON sm.id = sd.movement_id
-- JOIN audio_tracks t ON t.id = tsd.track_id
-- WHERE sm.slug = 'new-skool-ogene'
-- ORDER BY sd.display_order, t.title;
--
-- Expect 8 rows. If fewer, one or more of Dan RicHee's track titles above didn't
-- match exactly (typo, not yet uploaded, or a leading/trailing space) — check
-- `SELECT title FROM audio_tracks WHERE creator_id = (SELECT creator_id FROM
-- audio_tracks WHERE title = 'Fashionative')` to see his actual catalogue.
