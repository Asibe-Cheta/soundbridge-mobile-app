-- Item 42: "Who's Coming" Arrival Visualization
--
-- Manual, opt-in attendee check-in. No GPS/live tracking — an attendee taps one of
-- two statuses ("close" / "difficulty") and that's recorded once per event, upserted
-- on subsequent taps. The organiser's "Who's Coming" visualization reads this table;
-- a "difficulty" check-in also drives a one-time notification to the organiser and
-- any tagged co-organisers (event_co_organizers, Item 43).

CREATE TABLE IF NOT EXISTS event_checkins (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('close', 'difficulty')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_checkins_event_id_idx ON event_checkins (event_id);
CREATE INDEX IF NOT EXISTS event_checkins_user_id_idx ON event_checkins (user_id);

ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;

-- Readable by: the checked-in attendee themselves, the event's creator, or a tagged
-- co-organiser. Deliberately not public — a "difficulty" status is closer to
-- sensitive personal state than public event metadata.
CREATE POLICY "Event checkins are readable by self, organiser or co-organisers"
  ON event_checkins FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.creator_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM event_co_organizers co
      WHERE co.event_id = event_checkins.event_id AND co.user_id = auth.uid()
    )
  );

-- Only a ticket-holder can check themselves in to that event — mirrors this
-- session's established pattern of verifying real ownership in RLS rather than
-- trusting client-side gating alone (see the Item 43 co-organizer policies).
--
-- Status vocabulary confirmed authoritative by the web team against the real
-- CHECK constraint: status IN ('active','used','refunded','cancelled'). 'active'
-- = paid and unredeemed, 'used' = scanned at the door — both represent a real,
-- currently-valid ticket holder. 'refunded'/'cancelled' correctly excluded.
CREATE POLICY "Ticket holders can check themselves in"
  ON event_checkins FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM purchased_event_tickets t
      WHERE t.event_id = event_checkins.event_id
        AND t.user_id = auth.uid()
        AND t.status IN ('active', 'used')
    )
  );

CREATE POLICY "Ticket holders can update their own checkin status"
  ON event_checkins FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
