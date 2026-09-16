-- Prevent Duplicate Track Uploads (SOCIAL_VALIDATION.MD)
--
-- Client-side already disables the Publish button on first tap (TestUploadScreen.tsx),
-- but that alone doesn't catch retries or flaky-network double-submits. This is the
-- server-side backstop: reject an insert into audio_tracks if the same creator already
-- has a row with the same title + duration created within the last 60 seconds.
--
-- No file-hash/checksum column exists anywhere in this codebase (confirmed — nothing
-- computes one client-side), so this uses the spec's fallback: same title + audio
-- duration combination, not a hash. Deliberately a short (60s) recent-window check,
-- not all-time duplicate detection — a genuine later re-upload (corrected version,
-- days later) must still be allowed through untouched.
--
-- audio_tracks itself isn't defined by any migration in this repo (created via the
-- Supabase dashboard), so this only adds a trigger function — no ALTER TABLE.

CREATE OR REPLACE FUNCTION prevent_duplicate_track_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM audio_tracks
    WHERE creator_id = NEW.creator_id
      AND title = NEW.title
      AND duration IS NOT DISTINCT FROM NEW.duration
      AND created_at > NOW() - INTERVAL '60 seconds'
  ) THEN
    RAISE EXCEPTION 'This track was already uploaded, please check your library.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_track_upload ON audio_tracks;

CREATE TRIGGER trg_prevent_duplicate_track_upload
  BEFORE INSERT ON audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_track_upload();
