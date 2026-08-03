-- Talent Discovery: populate professional categories (TALENT_DISCOVERY_ADDITIONS.MD)
--
-- Talent Discovery's category rows (DJs, Podcasters, Audio Engineers, ...) return
-- no results because nothing in the data model tracks a creator's professional
-- category with the granularity Talent Discovery needs. This migration adds a
-- multi-value talent_categories field (user_talent_categories), backfills it from
-- existing unambiguous signals, and wires triggers so it keeps itself up to date
-- going forward regardless of which client (mobile, web, admin tooling) makes the
-- underlying change.
--
-- Categories: musician, instrumentalist, songwriter, session_musician,
-- backup_vocalist, vocal_coach, dj, podcaster, audio_engineer, producer.
--
-- source = 'inferred' | 'self_identified'. Inference always writes with
-- ON CONFLICT (user_id, category) DO NOTHING, so it can never overwrite or
-- remove a category the user self-identified — self-identification is
-- authoritative for whichever categories it covers; inference only fills gaps.

CREATE TABLE IF NOT EXISTS user_talent_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('inferred', 'self_identified')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category)
);

ALTER TABLE user_talent_categories ENABLE ROW LEVEL SECURITY;

-- Talent Discovery needs to find OTHER users' categories, so SELECT is public
-- (matches the existing read pattern on user_creator_types).
CREATE POLICY "Talent categories are publicly readable"
  ON user_talent_categories FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own talent categories"
  ON user_talent_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own talent categories"
  ON user_talent_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_talent_categories_category_idx ON user_talent_categories (category);
CREATE INDEX IF NOT EXISTS user_talent_categories_user_id_idx ON user_talent_categories (user_id);

-- One-time self-identification modal gate (Part B) — a profile column, not
-- AsyncStorage, so it syncs across devices/reinstalls like fan_link_shared does.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS talent_category_prompted boolean NOT NULL DEFAULT false;


-- ============================================================================
-- Part A: one-time backfill for existing users (bulk set-based INSERT ... SELECT,
-- not a row-by-row loop, so it stays efficient at current table sizes).
-- ============================================================================

-- Signal: uploaded content_type on audio_tracks.
INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT creator_id, 'musician', 'inferred' FROM audio_tracks WHERE content_type = 'music'
ON CONFLICT (user_id, category) DO NOTHING;

INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT creator_id, 'podcaster', 'inferred' FROM audio_tracks WHERE content_type = 'podcast'
ON CONFLICT (user_id, category) DO NOTHING;

INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT creator_id, 'dj', 'inferred' FROM audio_tracks WHERE content_type = 'mixtape'
ON CONFLICT (user_id, category) DO NOTHING;

-- Signal: institutional badge (Item 11) — both Sound Academy and Abbey Road
-- Institute are audio-engineering/production schools.
INSERT INTO user_talent_categories (user_id, category, source)
SELECT id, 'audio_engineer', 'inferred' FROM profiles
WHERE institution_badge IN ('sound_academy', 'abbey_road_institute')
ON CONFLICT (user_id, category) DO NOTHING;

-- Signal: service-provider categories — same category labels already used by
-- the service marketplace (see src/utils/serviceCategoryLabels.ts).
INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT user_id, 'audio_engineer', 'inferred' FROM service_provider_profiles
WHERE categories && ARRAY['sound_engineering', 'mixing_mastering']::text[]
ON CONFLICT (user_id, category) DO NOTHING;

INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT user_id, 'session_musician', 'inferred' FROM service_provider_profiles
WHERE categories && ARRAY['session_musician']::text[]
ON CONFLICT (user_id, category) DO NOTHING;

-- Signal: existing user_creator_types rows (musician/podcaster/dj already share
-- the same category label).
INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT user_id, creator_type::text, 'inferred' FROM user_creator_types
WHERE creator_type IN ('musician', 'podcaster', 'dj')
ON CONFLICT (user_id, category) DO NOTHING;


-- ============================================================================
-- Ongoing inference — applies automatically going forward regardless of which
-- client wrote the underlying row (mobile app, web app, or admin tooling).
-- ============================================================================

CREATE OR REPLACE FUNCTION infer_talent_category(p_user_id uuid, p_category text)
RETURNS void AS $$
BEGIN
  INSERT INTO user_talent_categories (user_id, category, source)
  VALUES (p_user_id, p_category, 'inferred')
  ON CONFLICT (user_id, category) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New upload.
CREATE OR REPLACE FUNCTION trg_infer_talent_from_upload()
RETURNS trigger AS $$
BEGIN
  IF NEW.content_type = 'music' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'musician');
  ELSIF NEW.content_type = 'podcast' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'podcaster');
  ELSIF NEW.content_type = 'mixtape' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'dj');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audio_tracks_infer_talent_category ON audio_tracks;
CREATE TRIGGER audio_tracks_infer_talent_category
  AFTER INSERT ON audio_tracks
  FOR EACH ROW EXECUTE FUNCTION trg_infer_talent_from_upload();

-- Institutional badge assignment (admin/DB-level, per INSTITUTIONAL_BADGES.MD).
CREATE OR REPLACE FUNCTION trg_infer_talent_from_badge()
RETURNS trigger AS $$
BEGIN
  IF NEW.institution_badge IS DISTINCT FROM OLD.institution_badge
     AND NEW.institution_badge IN ('sound_academy', 'abbey_road_institute') THEN
    PERFORM infer_talent_category(NEW.id, 'audio_engineer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_infer_talent_from_badge ON profiles;
CREATE TRIGGER profiles_infer_talent_from_badge
  AFTER UPDATE OF institution_badge ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_infer_talent_from_badge();

-- Service-provider category changes.
CREATE OR REPLACE FUNCTION trg_infer_talent_from_service_categories()
RETURNS trigger AS $$
BEGIN
  IF NEW.categories && ARRAY['sound_engineering', 'mixing_mastering']::text[] THEN
    PERFORM infer_talent_category(NEW.user_id, 'audio_engineer');
  END IF;
  IF NEW.categories && ARRAY['session_musician']::text[] THEN
    PERFORM infer_talent_category(NEW.user_id, 'session_musician');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_provider_infer_talent_category ON service_provider_profiles;
CREATE TRIGGER service_provider_infer_talent_category
  AFTER INSERT OR UPDATE OF categories ON service_provider_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_infer_talent_from_service_categories();

-- New user_creator_types rows.
CREATE OR REPLACE FUNCTION trg_infer_talent_from_creator_type()
RETURNS trigger AS $$
BEGIN
  IF NEW.creator_type IN ('musician', 'podcaster', 'dj') THEN
    PERFORM infer_talent_category(NEW.user_id, NEW.creator_type::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_creator_types_infer_talent_category ON user_creator_types;
CREATE TRIGGER user_creator_types_infer_talent_category
  AFTER INSERT ON user_creator_types
  FOR EACH ROW EXECUTE FUNCTION trg_infer_talent_from_creator_type();
