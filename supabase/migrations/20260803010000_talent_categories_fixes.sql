-- Talent Discovery category inference fixes (CORECTED_TALENT_DISCOVERY_SCREEN.MD)
--
-- Two gaps found after the first pass:
--
-- 1. Audio Engineers undercounted. The original inference only read
--    profiles.institution_badge, an admin-only visual-badge field that's set
--    for very few accounts. Most "Sound Academy" users actually come through
--    the institutional_access table (populated by the grant_institutional_access
--    RPC during Sound Academy referral signup — see migrations/partner_referral_system.sql
--    and src/services/ReferralService.ts) — that's the real, well-populated signal.
--
-- 2. Session Musicians & Instrumentalists was nearly empty (only sourced from
--    service_provider_profiles categories, which almost nobody has set). Per
--    explicit product direction: treat any music-track upload as a starting
--    signal for this category too, alongside 'musician'.

-- ============================================================================
-- Backfill
-- ============================================================================

INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT user_id, 'audio_engineer', 'inferred' FROM institutional_access
WHERE institution = 'sound_academy'
ON CONFLICT (user_id, category) DO NOTHING;

INSERT INTO user_talent_categories (user_id, category, source)
SELECT DISTINCT creator_id, 'session_musician', 'inferred' FROM audio_tracks WHERE content_type = 'music'
ON CONFLICT (user_id, category) DO NOTHING;

-- ============================================================================
-- Ongoing inference
-- ============================================================================

-- institutional_access rows are inserted by grant_institutional_access (RPC,
-- SECURITY DEFINER) — a trigger here catches every future Sound Academy grant
-- regardless of which client/flow triggers it.
CREATE OR REPLACE FUNCTION trg_infer_talent_from_institutional_access()
RETURNS trigger AS $$
BEGIN
  IF NEW.institution = 'sound_academy' THEN
    PERFORM infer_talent_category(NEW.user_id, 'audio_engineer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS institutional_access_infer_talent_category ON institutional_access;
CREATE TRIGGER institutional_access_infer_talent_category
  AFTER INSERT ON institutional_access
  FOR EACH ROW EXECUTE FUNCTION trg_infer_talent_from_institutional_access();

-- Extend the existing upload trigger to also infer session_musician from music uploads.
CREATE OR REPLACE FUNCTION trg_infer_talent_from_upload()
RETURNS trigger AS $$
BEGIN
  IF NEW.content_type = 'music' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'musician');
    PERFORM infer_talent_category(NEW.creator_id, 'session_musician');
  ELSIF NEW.content_type = 'podcast' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'podcaster');
  ELSIF NEW.content_type = 'mixtape' THEN
    PERFORM infer_talent_category(NEW.creator_id, 'dj');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- (Trigger itself is unchanged — it already points at this function by name.)
