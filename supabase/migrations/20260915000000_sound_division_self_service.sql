-- Self-Service Sound Division Tagging (NSO_1B.MD)
--
-- Item 40 (NSO_STAGE1.MD) built the data model with curated, service-role-only
-- writes. This adds a narrowly-scoped write path so a recognised movement
-- artist can tag their OWN tracks with divisions from THEIR OWN movement,
-- without any backend/dashboard involvement — while still preventing anyone
-- else from writing arbitrary rows into track_sound_divisions.
--
-- "Recognised member of a movement" is currently modelled only as
-- sound_movements.founding_artist_id (single artist per movement, matching
-- NSO/Dan RicHee today). Both policies key off that column, so this
-- generalises automatically if a movement's founding_artist_id changes or a
-- future movement is added — no hardcoding to NSO specifically.

CREATE POLICY "Recognised movement artists can tag their own tracks"
  ON track_sound_divisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audio_tracks t
      WHERE t.id = track_id AND t.creator_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM sound_divisions sd
      JOIN sound_movements sm ON sm.id = sd.movement_id
      WHERE sd.id = division_id AND sm.founding_artist_id = auth.uid()
    )
  );

CREATE POLICY "Recognised movement artists can untag their own tracks"
  ON track_sound_divisions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM audio_tracks t
      WHERE t.id = track_id AND t.creator_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM sound_divisions sd
      JOIN sound_movements sm ON sm.id = sd.movement_id
      WHERE sd.id = division_id AND sm.founding_artist_id = auth.uid()
    )
  );
