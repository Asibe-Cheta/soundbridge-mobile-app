# Web Team: `isMixtape is not defined` — Production Fix Required

**Priority:** High (production error, Sentry alert)
**Date:** 2026-03-31
**Sentry ID:** bbe517f220d34167882af0650a2f8bf2
**File:** `soundbridge/app/track/[trackId]/page.tsx`, line 171

---

## Error

```
ReferenceError: isMixtape is not defined
  File "soundbridge/app/track/[trackId]/page.tsx", line 171, in TrackPage
    {isMixtape && mixedByName ? `Mixed by: ${mixedByName}` : `by ${creatorName}`}
```

Triggered in production at **2026-03-31, 6:57:37 PM BST** by an iOS user (Mobile Safari 15.3).

---

## Cause

The mobile team added `is_mixtape` support to the `audio_tracks` table. The web track page is referencing `isMixtape` and `mixedByName` variables that have not been declared/destructured from the track data.

---

## Fix

In `app/track/[trackId]/page.tsx`, add `isMixtape` and `mixedByName` from the track data fetch:

```typescript
// In your track data fetch/destructuring:
const isMixtape = track.is_mixtape ?? false;
const mixedByName = track.dj_name ?? null; // stored in dj_name column on audio_tracks
```

Then the line 171 template string will work correctly.

---

## DB Columns (already deployed by mobile team)

The mobile app writes these fields to `audio_tracks`:

| Column | Type | Notes |
|---|---|---|
| `is_mixtape` | `boolean` | `true` for DJ mixtape uploads |
| `dj_name` | `text` | DJ name entered at upload time |
| `tracklist` | `text` | Tracklist text block |

If these columns don't exist yet, run:

```sql
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS is_mixtape BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dj_name TEXT,
  ADD COLUMN IF NOT EXISTS tracklist TEXT;
```

---

## Suggested Track Page Behaviour

- If `is_mixtape = true`: show "Mixed by: {dj_name}" instead of "by {creator_name}"
- Optionally show an amber "MIX" badge on the track artwork
- If `tracklist` is present, render it in the track details section

---

## Related Docs

- `WEB_TEAM_MIXTAPE_SUPPORT_REQUIRED.md` — full backend + frontend spec for mixtape support
