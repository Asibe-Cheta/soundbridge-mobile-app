-- Community updates — creator-only posts visible to community members
CREATE TABLE IF NOT EXISTS community_updates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  image_url  TEXT,
  posted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_updates_creator_idx ON community_updates(creator_id, posted_at DESC);

ALTER TABLE community_updates ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own updates
CREATE POLICY "community_updates_creator" ON community_updates
  FOR ALL USING (auth.uid() = creator_id);

-- Members can read updates for creators they follow
CREATE POLICY "community_updates_member_read" ON community_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_memberships
      WHERE community_memberships.creator_id = community_updates.creator_id
        AND community_memberships.user_id = auth.uid()
    )
  );
