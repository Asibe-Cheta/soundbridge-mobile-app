# WEB_TEAM_MODERATION_AND_COPYRIGHT_UX_ALIGNMENT.md

**Date:** 2026-02-26
**Priority:** HIGH
**For:** Web frontend team
**Context:** Mobile app has been updated with three UX changes around moderation status visibility, ISRC upload rules, and copyright reporting on track pages. This document ensures the web app matches exactly.

---

## 1. Hide `pending_check` and `checking` from Regular Users

### What mobile does now

In any moderation status badge or status indicator shown to the track owner:

```
if (status === 'pending_check' || status === 'checking') → render nothing
```

These are **internal processing states**. The uploader does not need to see them. They are only relevant to the admin panel.

### What to do on web

- Any track status badge rendered to the **owner** on their profile, track page, or dashboard: suppress `pending_check` and `checking` entirely — show no badge, not even a spinner.
- The **admin panel** may continue to show these states normally.
- If your current UI shows "Pending Check" or "Checking..." to uploaders, remove it.

### Mapping for all other statuses (shown to owner)

| `moderation_status` | Badge shown to owner |
|---|---|
| `pending_check` | — (hidden) |
| `checking` | — (hidden) |
| `clean` | ✓ Verified (only if confidence ≥ 50%) |
| `flagged` | ⚠️ Under Review |
| `approved` | ✓ Approved |
| `rejected` | ✗ Not Approved |
| `appealed` | 📬 Appeal Pending |
| `taken_down` | ⚖️ Copyright Removed (purple, `#7C3AED`) |

Non-owners see **no badge at all**.

---

## 2. ISRC Upload Rules — Mandatory for Originals, Optional for Covers

### Logic

| ACRCloud result | Cover toggled? | ISRC requirement |
|---|---|---|
| `no_match` (user claims original) | No | **Required** — must be entered and verified before upload is allowed |
| `no_match` | Yes (user ticked "this is a cover") | Optional — user may leave blank; platform assigns one via PPL |
| `match` (ACRCloud detected a released track) | — | Optional — user may enter their distributor ISRC or leave blank |
| Cover toggle only (no ACRCloud result) | Yes | Optional |

### Why

- Requiring ISRC for originals provides proof of ownership. If you have distributed the track via DistroKid, TuneCore, CD Baby, etc. you have an ISRC. This deters bad actors uploading copyrighted material while claiming it as original.
- Covers are exempt because the platform operates under a PRS/MCPS blanket licence for mechanical rights, so ISRC is not the legal mechanism for covers.

### Upload form UX for `no_match` originals

Show a blue info banner:
> **Ownership Proof Required**
> To protect against accidental copyright infringement, originals require an ISRC. Get one free from your distributor (DistroKid, TuneCore, CD Baby, etc.).

- ISRC field label shows a red `*` (required indicator)
- Placeholder: `e.g., GBUM71502800 (required for originals)`
- Block form submission if:
  - ISRC field is blank → "Please enter your ISRC code to verify ownership of this original track."
  - ISRC entered but verification still in progress → "Please wait for ISRC verification to complete"
  - ISRC entered but verification failed → "Your ISRC code could not be verified. Please check it and try again."

### Upload form UX for covers (optional)

Show hint below the field:
> No ISRC? That's fine — leave it blank. SoundBridge will assign your recording an ISRC once we complete our PPL registration.

---

## 3. Copyright Reporting on Track Pages

### What mobile does now

Every track detail page shows a **flag / report button** in the action row (alongside Like and Share), visible only to users who are **not** the track owner.

Tapping it opens a report modal with two paths when the user selects "Copyright infringement":

1. **Quick report** — submits to `/api/reports/content` for moderation queue review (existing flow)
2. **Formal DMCA/CDPA notice** — opens the full DMCA notice form (see `WEB_TEAM_DMCA_TAKEDOWN_IMPLEMENTATION.md`)

### What to do on web

- Add a report button (flag icon, or "⋯" more options menu) to every track page/card — **not shown to the track owner**.
- When "Copyright infringement" is selected, present the two sub-paths above.
- The formal DMCA notice form must collect all 17 USC 512(c)(3) fields — see `WEB_TEAM_DMCA_TAKEDOWN_IMPLEMENTATION.md` Section 3.1 for the required fields and the `POST /api/takedowns` endpoint spec.

### Taken-down track — owner view

When a track has `moderation_status = 'taken_down'`, the owner's track page must show:

- Purple `⚖️ Copyright Removed` status badge
- Info text: "Your track was removed following a copyright notice. If you believe this is a mistake, you may submit a counter-notice within 14 days."
- A **"Submit Counter-Notice"** button (purple, `#7C3AED`) that opens the DMCA 512(g) counter-notice form
  - Counter-notice fields: statement (min 20 chars), penalty-of-perjury checkbox, court jurisdiction checkbox, service address
  - Submits to `POST /api/takedowns/:id/counter-notice` (see `WEB_TEAM_DMCA_TAKEDOWN_IMPLEMENTATION.md` Section 3.3)

---

## 4. `taken_down` in Any Moderation Status Type

Wherever your TypeScript types, GraphQL schema, or API response types define `moderation_status`, add `'taken_down'` to the union:

```typescript
moderation_status:
  | 'pending_check'
  | 'checking'
  | 'clean'
  | 'flagged'
  | 'approved'
  | 'rejected'
  | 'appealed'
  | 'taken_down'   // ← add this
```

Playback must be blocked for `taken_down` (same as `rejected` and `flagged`). Error message to show the listener:
> "This track has been removed following a copyright notice. The uploader may submit a counter-notice."

---

## Summary Checklist

- [ ] Moderation badge: hide `pending_check` and `checking` from track owners in UI
- [ ] Admin panel: continue showing all statuses including `pending_check` and `checking`
- [ ] Upload form: ISRC required for `no_match` originals, optional for covers
- [ ] Upload form: show "Ownership Proof Required" blue banner + red `*` label for originals
- [ ] Track page: add report/flag button for non-owners
- [ ] Track page: copyright infringement → two sub-paths (quick report vs formal DMCA)
- [ ] Track page (owner, `taken_down`): show `⚖️ Copyright Removed` badge + counter-notice button
- [ ] Player: block playback for `taken_down` tracks with appropriate error message
- [ ] Types: add `'taken_down'` to `moderation_status` union everywhere
