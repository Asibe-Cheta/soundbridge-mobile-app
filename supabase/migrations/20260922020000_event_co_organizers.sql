-- Item 43: Co-Organizer Tagging for Events
--
-- A junction table letting an event's creator tag other registered SoundBridge
-- users as co-organisers. Multiple co-organisers per event, no cap. Tagging is
-- restricted to the event's creator (not self-service by the tagged user) —
-- matches "type @ to search and add" in the creation form, not an invite/accept
-- flow. Permissions scope deliberately stops here: this table only records who
-- is tagged, it does not grant edit access to the event — that's explicitly out
-- of scope per COORGANIZER_TAG.MD ("do not build any new permissions system").

CREATE TABLE IF NOT EXISTS event_co_organizers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_by    UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_co_organizers_event_id_idx ON event_co_organizers (event_id);
CREATE INDEX IF NOT EXISTS event_co_organizers_user_id_idx ON event_co_organizers (user_id);

ALTER TABLE event_co_organizers ENABLE ROW LEVEL SECURITY;

-- Publicly readable — same reasoning as sound_divisions: this is additive
-- metadata on an already-public event, not sensitive.
CREATE POLICY "Event co-organizers are publicly readable"
  ON event_co_organizers FOR SELECT USING (true);

-- Only the event's own creator can tag/untag co-organisers on it.
CREATE POLICY "Event creators can tag co-organizers on their own events"
  ON event_co_organizers FOR INSERT
  WITH CHECK (
    tagged_by = auth.uid()
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = auth.uid())
  );

CREATE POLICY "Event creators can remove co-organizers from their own events"
  ON event_co_organizers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = auth.uid())
  );
