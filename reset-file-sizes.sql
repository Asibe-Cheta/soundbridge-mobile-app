-- Reset file sizes back to 10MB so the backfill script will reprocess them
UPDATE audio_tracks
SET file_size = 10485760
WHERE deleted_at IS NULL;
