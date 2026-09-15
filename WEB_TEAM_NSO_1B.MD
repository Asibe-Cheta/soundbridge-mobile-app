# NSO_1B — Self-Service Sound Division Tagging (Web)

Mirrors the mobile implementation just shipped. Same data model as Item 40 (`sound_movements`,
`sound_divisions`, `track_sound_divisions` — already live), no schema changes needed. This doc
covers the one thing that changed underneath (RLS) and what the equivalent UI should do.

## What changed in the DB (already applied)

New migration `20260915000000_sound_division_self_service.sql` added two RLS policies to
`track_sound_divisions`, previously service-role-write-only:

```sql
-- INSERT: an artist can tag their OWN track (audio_tracks.creator_id = auth.uid())
-- with a division from a movement where they are sound_movements.founding_artist_id.
-- DELETE: same scoping, for untagging.
```

So authenticated writes now work directly from the client for anyone recognised as a movement's
`founding_artist_id` — no new endpoint required, same pattern as Item 40's read side.

## Access gating

Before showing any Sound Division UI on a creator's own track-management page, check:

```sql
SELECT sm.id AS movement_id, sm.name AS movement_name, sd.id, sd.slug, sd.name, sd.display_order
FROM sound_movements sm
JOIN sound_divisions sd ON sd.movement_id = sm.id
WHERE sm.founding_artist_id = :currentUserId
ORDER BY sd.display_order;
```

Empty result → render nothing (the overwhelming majority of creators). Non-empty → this artist is
recognised, show the tagging UI using the returned divisions.

## UI

On the creator's own track edit/management view (wherever you already show/edit `genre`), add a
separate "Sound Division" section — explicitly not the same control as genre, same copy pattern we
used: *"Tag this track into one or more {movementName} Sound Divisions. This is separate from the
track's genre, which stays unchanged."*

- Multi-select checklist (many-to-many, no restriction to one division per track or per artist)
- Pre-check whatever's already in `track_sound_divisions` for that track (`SELECT division_id FROM
  track_sound_divisions WHERE track_id = :trackId`)
- On save, diff and write directly: insert newly-checked division_ids, delete newly-unchecked ones,
  against `track_sound_divisions` — RLS enforces ownership + movement membership, so no need to
  re-validate server-side beyond that.

## Scope boundaries (per spec)

- Genre field/flow: untouched.
- No movement/division creation UI — that's still admin/backend only, curated.
- Badge display on profile/track pages: unchanged, still reads from `track_sound_divisions` the
  same way it already does.

## Status

Dan RicHee (`@danrichee`) has signed up but has 0 tracks uploaded yet — so there's nothing to tag
in production right now regardless of UI readiness on either side. No urgency, but flagging so this
doesn't get re-investigated as "broken" again.
