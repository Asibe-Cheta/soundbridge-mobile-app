# Web Team: Mixtape / DJ Mix Content Type — Full Implementation Required

**Priority:** Medium
**Date:** 2026-03-31
**Raised by:** Mobile Team
**Context:** The mobile app now supports a third upload content type: "DJ Mixtape". This document covers frontend web app changes, DB schema changes, API contract updates, file size limits, and policy/legal infrastructure.

---

## Background

DJ Mixes are a legitimate and popular content format but they contain third-party recordings (the DJ does not own the underlying tracks). The platform supports this under a DMCA safe harbour model:

- User selects "DJ Mixtape" at upload
- User provides a tracklist
- User agrees to mixtape-specific terms (promotional/non-commercial, DMCA-compliant)
- ACRCloud fingerprinting is **skipped** — matches are expected and not a blocker
- The mix is stored and served like any other audio track

---

## 0. Web App Frontend Changes

### 0a. Upload Form — New Content Type Option

Add a third option to the upload form content type selector alongside "Music Track" and "Podcast Episode":

- **Label:** DJ Mixtape
- **Icon:** disc / vinyl (amber/orange accent colour `#F59E0B`)
- **Description:** "Upload DJ mixes and continuous sets"

When selected, show the following fields (replacing the Music-specific artist/genre fields):

| Field | Type | Required | Notes |
|---|---|---|---|
| DJ / Artist Name | Text input | Yes | e.g. "DJ Justice" |
| Genre | Chip selector | Yes | Same genre list as music |
| Tracklist | Multi-line textarea | Yes | One track per line, e.g. "Artist - Title" |
| Description | Text (existing) | No | Optional mix notes |

**Hide** for mixtape uploads:
- ISRC verification section
- Cover song toggle
- ACRCloud fingerprint status UI
- Lyrics field

### 0b. Mixtape Terms Checkbox

Replace the standard copyright checkbox with a mixtape-specific one:

> *"I confirm this mix is shared for promotional, non-commercial purposes. I understand I do not own the underlying recordings and that rights holders may request removal. SoundBridge complies with all valid DMCA takedown requests. Uploading content that infringes copyright may result in removal or account suspension."*

Link: "Learn more about our copyright policy" → copyright policy page

### 0c. Per-File Size Limit for Mixtapes

The per-file upload limit for audio is **100MB for music/podcasts** and **200MB for mixtapes**.

This must be enforced on the web app frontend (file picker validation) and the API/storage layer.

Rationale:
- A 1-hour mix at 128kbps ≈ 55–60MB
- A 1-hour mix at 320kbps ≈ 130–140MB
- 200MB covers virtually all real-world DJ mix files

### 0d. Track Display — Mixtape Badge & Tracklist

When rendering a mixtape track on profile pages, feed, or search results:

- Show an amber "Mix" badge on the track card (similar to how covers show a badge)
- In the expanded/detail view, display the tracklist below the description
- Show "Mixed by: [DJ Name]" instead of or alongside the standard artist name field

### 0e. Feed / Discovery Filtering

Mixtapes should appear in the main feed alongside music and podcasts by default. No separate section needed for v1. Consider adding a "Mixes" filter chip to the discover/search page in a future iteration.

---

## 1. DB Schema Changes Required

### Option A — Add `is_mixtape` column to `audio_tracks` (recommended)

```sql
ALTER TABLE audio_tracks
  ADD COLUMN IF NOT EXISTS is_mixtape BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dj_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tracklist TEXT; -- newline-separated track entries
```

### Option B — Use existing `description` column (temporary fallback)

If the schema change is delayed, the mobile app currently encodes mixtape data into `description` in this format:

```
Mixed by: DJ Justice

<user description if any>

TRACKLIST:
1. Artist - Track Title
2. Artist - Track Title
```

This is the current mobile behaviour until proper columns exist. Switch to dedicated columns once the schema is updated.

---

## 2. API/Payload Changes

### Current mobile payload for mixtape uploads

The mobile client sends the standard `createAudioTrack` payload with the following differences:

| Field | Value for mixtape |
|---|---|
| `genre` | User-selected genre (same chips as music) |
| `is_cover` | `false` |
| `isrc_code` | `null` (no ISRC for mixes) |
| `acrcloud_checked` | `false` / not set |
| `copyright_attested` | `false` |
| `description` | Contains "Mixed by: ...\n\nTRACKLIST:\n..." encoding |
| `is_mixtape` | `true` ← **new field, add to INSERT handling** |
| `dj_name` | DJ / Artist name ← **new field** |
| `tracklist` | Raw tracklist text ← **new field** |

Once the DB columns exist, the mobile client will send `is_mixtape`, `dj_name`, and `tracklist` as dedicated fields. Until then, the payload omits them and the data lives in `description`.

---

## 3. DMCA & Policy Infrastructure

### 3a. Register a DMCA Agent (action required — one-time)

Under the DMCA safe harbour (17 U.S.C. § 512), SoundBridge must have a **registered DMCA agent** with the US Copyright Office to benefit from safe harbour protection.

- Register at: https://www.copyright.gov/dmca-directory/
- Cost: ~$6 for 3 years
- Requires: company name, agent name, email, address

This is mandatory — without it, safe harbour protection does not apply.

### 3b. DMCA Takedown Endpoint

Create a simple intake form or endpoint for rights holders to submit takedown notices:

- `POST /api/dmca/takedown` (or a Typeform/Google Form is fine for v1)
- Fields: claimant name, contact email, infringing URL, description of claimed work, good faith statement
- On receipt: disable the track (`is_public = false`) within 24–48hrs and notify the uploader
- Restore if uploader files a counter-notice

### 3c. Copyright Policy Page Update

Update the CopyrightPolicy screen / page to include a "DJ Mixes & Remixes" section explaining:
- Mixes are shared for promotional use only
- Rights holders can request removal
- SoundBridge responds to valid DMCA notices
- DMCA contact: dmca@soundbridge.live (or wherever you set this up)

---

## 4. Summary Checklist

| Task | Type | Priority |
|---|---|---|
| Add DJ Mixtape option to upload form (DJ name, tracklist, genre, terms) | Frontend | High |
| Enforce 200MB per-file limit for mixtapes (100MB for music/podcasts) | Frontend + API | High |
| Show "Mix" badge and tracklist on track cards/detail views | Frontend | Medium |
| Add `is_mixtape`, `dj_name`, `tracklist` columns to `audio_tracks` | SQL | High |
| Accept and store these fields in track creation API | API | High |
| Register DMCA agent with US Copyright Office | Legal/ops | **Critical** |
| Create DMCA takedown intake (form or endpoint) | Backend/ops | High |
| Update copyright policy page to cover DJ mixes | Frontend | Medium |

---

## Notes

- The mobile client currently falls back to encoding mixtape data in `description` until the DB columns exist — this is temporary and will be cleaned up once schema is deployed
- ACRCloud is intentionally NOT run on mixtape uploads — this is by design, not a bug
- The `copyright_attested` field is `false` for mixtapes — the user agrees to a separate `agreedToMixtapeTerms` checkbox instead. Consider adding a `mixtape_terms_attested` boolean column if you want to track this separately
