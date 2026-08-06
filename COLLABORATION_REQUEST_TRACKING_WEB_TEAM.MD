FULL HANDOFF — Collaboration Request Tracking for Admin Dashboard

Ask: "Track collaboration requests sent to creators on the admin web side (who
sent a collaboration, when, and to whom the collaboration was sent)."

## The data already exists — this is a web-admin-UI task, not a schema task

The `collaboration_requests` table (`COLLABORATION_DATABASE_SCHEMA.sql`) already
captures everything requested:

```sql
CREATE TABLE IF NOT EXISTS collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- who sent it
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,    -- who it was sent to
    availability_id UUID NOT NULL REFERENCES creator_availability(id),
    proposed_start_date TIMESTAMPTZ NOT NULL,
    proposed_end_date TIMESTAMPTZ NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response_message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),   -- when it was sent
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);
```

Every request the mobile app sends already populates `requester_id`,
`creator_id`, and `created_at` — mobile writes via `CollaborationRequestForm.tsx`
→ `dbHelpers` in `src/lib/supabase.ts`. Nothing new needs to be added on the
mobile or DB side for the data itself to exist.

## What's actually needed: an admin dashboard view

A query like this gives you the exact "who sent, when, to whom" list, joined
to display names for readability:

```sql
SELECT
  cr.id,
  cr.created_at        AS sent_at,
  cr.status,
  requester.id          AS requester_id,
  requester.username    AS requester_username,
  requester.display_name AS requester_display_name,
  creator.id             AS creator_id,
  creator.username       AS creator_username,
  creator.display_name   AS creator_display_name,
  cr.subject,
  cr.responded_at
FROM collaboration_requests cr
JOIN profiles requester ON requester.id = cr.requester_id
JOIN profiles creator ON creator.id = cr.creator_id
ORDER BY cr.created_at DESC;
```

Add whatever admin-table plumbing (pagination, filters by status/date range,
search by username) fits your existing admin dashboard conventions — no
opinion from mobile on that part.

## Related: new mobile-side "Available for Collaboration" toggle

Separately (same underlying feature area, but a different gap): there was
previously **no UI anywhere** — mobile or, as far as we can tell, web — that
let a creator toggle `profiles.collaboration_enabled` (the DB column already
existed, `DEFAULT TRUE`, but nothing ever wrote to it). Mobile has now added
a toggle for this in Profile → Creator Tools → "Available for Collaboration".
If web also wants a way for creators to control this from their web profile
settings, the column is the same one (`profiles.collaboration_enabled`,
boolean) — no schema change needed there either, just a UI + write.

Worth knowing for the admin view above: `collaboration_requests.status` stays
whatever it was regardless of this flag — turning `collaboration_enabled` off
does not cancel or expire existing pending requests, it only prevents new ones
via `isCreatorAvailable()` gating on the request-sending side.

## Scope

- No schema changes needed for the tracking ask itself — table already has
  every field requested.
- Only new column-level behavior is the `collaboration_enabled` write path,
  and that column already existed — just wiring a UI to it.
