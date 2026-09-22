-- Fixes a real production bug: the original NSO seed (20260914000000_sound_movements.sql)
-- resolved founding_artist_id via an exact track-title match subquery. That subquery found
-- no match at the time it ran (Dan RicHee's actual track is titled "Obi Lai (STMS) feat.
-- Dxxter", not an exact "Obi Lai"), so the INSERT silently succeeded with
-- founding_artist_id = NULL instead of failing loudly — leaving the entire Sound Division
-- feature invisible to its intended artist with no error anywhere.
--
-- Two parts: (1) backfill the one row this actually broke — idempotent, safe to run even
-- though it was already corrected via a one-off UPDATE run directly against prod; (2) add a
-- NOT NULL constraint so this exact silent-failure mode can never recur for this or any
-- future movement — a future INSERT with an unresolved founding artist will now fail the
-- migration outright instead of shipping a silently-broken feature.

UPDATE sound_movements
SET founding_artist_id = 'fb4d615f-9355-45b5-9412-2c9086c25e09'
WHERE slug = 'new-skool-ogene' AND founding_artist_id IS NULL;

ALTER TABLE sound_movements
  ALTER COLUMN founding_artist_id SET NOT NULL;
