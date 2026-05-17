# WEB_TEAM_ISRC_AUTO_ASSIGNMENT.md

**Date:** 2026-02-26
**Priority:** HIGH — implement before PPL registration completes (~1–2 weeks)
**For:** Web frontend + backend team

---

## Overview

SoundBridge is registering with PPL UK as an ISRC manager. Once registered, the platform will auto-assign ISRCs to uploaded recordings under the prefix `GB-SBR-26-XXXXX` (the registrant code `SBR` is a placeholder — replace with the actual PPL-assigned code via env var `ISRC_REGISTRANT_CODE`).

The upload workflow now has branching rules based on ACRCloud fingerprint result and whether the upload is a cover. This document specifies the full logic for web to match.

---

## 1. Decision Tree

```
Upload submitted
│
├── ACRCloud → MATCH
│   ├── is_cover = true (forced)
│   ├── original_artist_name = ACRCloud detected artist (user can edit)
│   ├── original_song_title  = ACRCloud detected title  (user can edit)
│   ├── isrc_source = 'acrcloud_detected'  (use ACRCloud's detected ISRC)
│   ├── suspected_duplicate = true         (flag for manual review)
│   └── Track status: pending manual review before going public
│
├── ACRCloud → NO MATCH + user ticks "This is a cover"
│   ├── is_cover = true
│   ├── original_artist_name = user input (REQUIRED)
│   ├── original_song_title  = user input (REQUIRED)
│   ├── isrc_source = user provided their ISRC → 'user_provided'
│   │              OR no ISRC entered         → 'soundbridge_generated'
│   └── Track goes live normally after ACRCloud clear
│
└── ACRCloud → NO MATCH + not a cover (original)
    ├── is_cover = false
    ├── isrc_source = user provided their ISRC → 'user_provided'
    │              OR no ISRC entered         → 'soundbridge_generated'
    └── Track goes live normally
```

---

## 2. Backend: ISRC Generation

### 2.1 Database — Sequential Counter Table

```sql
CREATE TABLE isrc_counter (
  id            INTEGER PRIMARY KEY DEFAULT 1,  -- single row
  current_value INTEGER NOT NULL DEFAULT 0,
  last_isrc     TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO isrc_counter (id, current_value) VALUES (1, 0);
```

### 2.2 ISRC Generation Function (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION generate_soundbridge_isrc()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_registrant TEXT := current_setting('app.isrc_registrant_code', true);
  v_year       TEXT := to_char(NOW(), 'YY');
  v_counter    INTEGER;
  v_isrc       TEXT;
BEGIN
  -- Atomic increment
  UPDATE isrc_counter
  SET    current_value = current_value + 1,
         updated_at    = NOW()
  WHERE  id = 1
  RETURNING current_value INTO v_counter;

  -- Format: GB-XXX-YY-NNNNN
  v_isrc := 'GB-' || COALESCE(v_registrant, 'SBR') || '-' || v_year || '-' || LPAD(v_counter::TEXT, 5, '0');

  -- Store last generated for audit
  UPDATE isrc_counter SET last_isrc = v_isrc WHERE id = 1;

  RETURN v_isrc;
END;
$$;
```

Set the registrant code as a DB config variable or use an environment variable in the API layer. Before PPL registration is confirmed, use `SBR` as placeholder.

### 2.3 API: ISRC Assignment on Track Create

On `POST /api/tracks` (or equivalent upload endpoint), after ACRCloud result is received:

```typescript
async function assignISRC(trackPayload: TrackCreatePayload): Promise<string> {
  const { isrc_source, isrc_code, acrcloudData } = trackPayload;

  // 1. ACRCloud detected an ISRC — use it directly
  if (isrc_source === 'acrcloud_detected' && acrcloudData?.detectedISRC) {
    return acrcloudData.detectedISRC;
  }

  // 2. User provided their own verified ISRC — use it
  if (isrc_source === 'user_provided' && isrc_code) {
    return isrc_code;
  }

  // 3. No ISRC — generate a new one
  const { data } = await supabase.rpc('generate_soundbridge_isrc');
  return data; // e.g. GB-SBR-26-00042
}
```

Store the assigned ISRC and its source in the `audio_tracks` table:

```sql
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS isrc_code            TEXT,
  ADD COLUMN IF NOT EXISTS isrc_source          TEXT CHECK (isrc_source IN ('user_provided', 'acrcloud_detected', 'soundbridge_generated')),
  ADD COLUMN IF NOT EXISTS isrc_soundbridge_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_artist_name TEXT,
  ADD COLUMN IF NOT EXISTS original_song_title  TEXT,
  ADD COLUMN IF NOT EXISTS suspected_duplicate  BOOLEAN DEFAULT FALSE;
```

Set `isrc_soundbridge_generated = TRUE` when `isrc_source = 'soundbridge_generated'`.

---

## 3. Upload Form UX (Web)

### 3.1 ACRCloud MATCH state

Show in the fingerprint result panel:

> ⚠️ This recording matches a known release. Fill in the original artist and title below, then upload as a cover. If you own this recording, your upload will be queued for manual review.

- **Original Artist Name** (text input, required `*`) — auto-fill from ACRCloud `detectedArtist`, user can edit
- **Original Song Title** (text input, required `*`) — auto-fill from ACRCloud `detectedTitle`, user can edit
- Hint: "Auto-filled from audio fingerprint — edit if incorrect."
- ISRC field: optional — if user has a distributor ISRC, they may enter it
- Set `is_cover = true` and `suspected_duplicate = true` in payload

### 3.2 ACRCloud NO MATCH + "This is a cover" checked

- **Original Artist Name** (text input, required `*`) — blank, user fills manually
- **Original Song Title** (text input, required `*`) — blank, user fills manually
- ISRC field: optional — if left blank, platform auto-assigns

### 3.3 ACRCloud NO MATCH + not a cover (original)

Show a green info banner:

> ✓ **ISRC Auto-Assignment**
> SoundBridge will assign an ISRC (GB-SBR-26-XXXXX) to this recording automatically. If you already have a distributor ISRC, enter it below to use yours instead.

- ISRC field: optional, placeholder `e.g., GBUM71502800 — leave blank to auto-assign`
- No required indicator

### 3.4 Validation Rules (Frontend)

| Condition | Validation |
|---|---|
| `match` | `original_artist_name` required, `original_song_title` required |
| `no_match` + `is_cover` | `original_artist_name` required, `original_song_title` required |
| `no_match` + original | ISRC optional; if entered must verify before submit |
| Any state | If ISRC entered and still verifying → block submit with "Please wait..." |
| Any state | If ISRC entered and verification failed → block submit with "Could not verify ISRC. Check it or leave blank." |

---

## 4. Payload Fields to Send

```typescript
{
  // Existing fields ...

  is_cover: boolean,                         // true for match or cover toggle
  original_artist_name: string | null,       // required when is_cover = true
  original_song_title: string | null,        // required when is_cover = true
  isrc_code: string | null,                  // user-provided; null = auto-assign
  isrc_source: 'user_provided'               // user entered and verified
             | 'acrcloud_detected'           // ACRCloud returned a match with ISRC
             | 'soundbridge_generated',      // neither of the above — backend generates
  suspected_duplicate: boolean,              // true when match + user claims original
  acrcloudData: AcrcloudResult | null,       // full fingerprint result for backend
}
```

---

## 5. Admin Panel — Suspected Duplicates Queue

All tracks with `suspected_duplicate = true` must appear in an admin review queue before `is_public` can become `true`. Add a filter in the admin panel:

- **Filter:** `suspected_duplicate = true AND moderation_status = 'pending_check'`
- Admin actions: Approve (set `is_public = true`, `moderation_status = 'approved'`) or Reject (`moderation_status = 'rejected'`)
- Email notification to uploader on decision

---

## 6. PPL Registrant Code Swap

When PPL UK assigns the official registrant code:

1. Update `ISRC_REGISTRANT_CODE` env var (e.g., from `SBR` to the actual code, e.g., `ZVU`)
2. Run a one-time migration to update previously generated ISRCs:

```sql
UPDATE audio_tracks
SET    isrc_code = REPLACE(isrc_code, 'GB-SBR-', 'GB-ZVU-')
WHERE  isrc_soundbridge_generated = TRUE
  AND  isrc_code LIKE 'GB-SBR-%';
```

3. Update the `last_isrc` in `isrc_counter` table similarly.

No code changes needed — just the env var update and the one-time SQL migration.

---

## 7. Summary Checklist

- [ ] Add columns to `audio_tracks`: `isrc_source`, `isrc_soundbridge_generated`, `original_artist_name`, `original_song_title`, `suspected_duplicate`
- [ ] Create `isrc_counter` table with atomic increment function
- [ ] `generate_soundbridge_isrc()` SQL function with env-var registrant code
- [ ] Upload API: call `assignISRC()` after ACRCloud result, store assigned ISRC
- [ ] Upload form: show Original Artist + Original Song Title fields for `match` or `is_cover`
- [ ] Upload form: auto-fill from ACRCloud on `match`; green auto-assign banner on `no_match` original
- [ ] Upload form: ISRC optional for all paths; validation blocks only if entered-but-unverified
- [ ] Admin queue: filter `suspected_duplicate = true` tracks for manual review
- [ ] PPL swap plan: single env var + one SQL migration when code arrives
