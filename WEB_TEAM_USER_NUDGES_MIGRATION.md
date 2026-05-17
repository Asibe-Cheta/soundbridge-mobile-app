# Web Team: user_nudges Table — Fan Acquisition Nudge System

## Summary

The mobile app now includes a nudge system that fires targeted push notifications
to guide creators toward key actions (sharing their profile, using the Request Room,
posting events, inviting fans). Each nudge fires **once per user, permanently**, and
dismissal state is stored server-side so it persists across devices and reinstalls.

## Required Migration

Run this SQL against the production Supabase instance:

```sql
-- Fan acquisition nudge dismissal tracking
CREATE TABLE IF NOT EXISTS user_nudges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nudge_id    TEXT NOT NULL,
  sent_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, nudge_id)
);

-- RLS
ALTER TABLE user_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own nudge state"
  ON user_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nudge state"
  ON user_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS user_nudges_user_id_idx ON user_nudges (user_id);
```

## Nudge IDs (nudge_id values)

| nudge_id                    | Trigger condition                                          |
|-----------------------------|------------------------------------------------------------|
| `creator_share_profile`     | Creator has ≥1 track uploaded but hasn't shared profile    |
| `request_room_intro`        | Creator has never started a Request Room session           |
| `request_room_post_session` | Creator has completed ≥1 Request Room session              |
| `post_event`                | Creator has not created an event in the last 30 days       |
| `fan_invite`                | User account is older than 7 days                          |

## Behaviour

- A row in `user_nudges` means the nudge has been **permanently sent** for that user.
- The mobile app checks all five conditions on each app launch and fires at most
  one nudge per session (the first eligible, unsent nudge in priority order).
- Once a row exists for a `(user_id, nudge_id)` pair, that nudge never fires again.
- No UPDATE or DELETE policies are granted — rows are immutable once written.

## No Backend Changes Required

All condition checks and nudge firing happen entirely client-side via Supabase
direct queries. The only server requirement is this table and its RLS policies.
