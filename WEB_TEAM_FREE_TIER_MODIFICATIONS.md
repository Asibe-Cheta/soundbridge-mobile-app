# Free Tier — UX & Messaging Modifications

**Date:** 2026-03-09
**Priority:** High
**Affects:** Onboarding, Billing, FAQ pages on web

---

## What Changed (Mobile)

### 1. Discover Screen Upload CTA — Simplified

The "Upload Your Music" card on the Discover screen has been replaced with a simple, pill-shaped button that reads:

> **"Upload your music/pod"**

All tier storage details (250MB, 2GB, 10GB), track count estimates, and tier comparison badges have been **removed from this touchpoint**. Tier information is intentionally surfaced only on the relevant screens (Upgrade, Billing, Upload/Storage screens).

**Why:** The Discover screen is a discovery and browsing surface — heavy tier marketing on it felt out of place and added friction. Users who want to upload will land on the Upload screen where the full quota context (UploadLimitCard) is shown.

---

### 2. Free Tier Storage — Corrected to 250MB Everywhere

Several in-app screens had stale references to an old free tier limit of **30MB**. These have been corrected to **250MB**, aligning with the canonical value in `StorageQuotaService`.

Affected components:
- `CancellationWarningModal` — storage threshold, warning text, summary row
- `TrackSelectionModal` — downgrade description text
- `ValuePropCard` (onboarding) — removed "30-40 tracks" track-count claim, now says "Upload your music & podcasts for free"

The authoritative free tier limits remain:

| Tier      | Storage | Approx. Tracks |
|-----------|---------|----------------|
| Free      | 250MB   | ~30–40 tracks  |
| Premium   | 2GB     | ~250 tracks    |
| Unlimited | 10GB    | ~1000+ tracks  |

---

## Required Web Team Actions

### Onboarding Pages
- Confirm the free tier is described as **250MB storage**, not any legacy value (30MB, unlimited, or track-count-only)
- Remove specific track count claims (e.g. "30-40 tracks") from top-level onboarding copy — keep them on the detailed pricing/upgrade page only
- Onboarding CTA for upload should be simple: "Upload your music & podcasts — free"

### Billing / Upgrade Page
- The tier comparison table should reflect:
  - **Free:** 250MB storage
  - **Premium:** 2GB storage — £6.99/mo or £69.99/yr
  - **Unlimited:** 10GB storage — £12.99/mo or £129.99/yr
- Downgrade messaging (when cancelling Premium/Unlimited) should reference **250MB** as the free tier limit, not 30MB or any other value
- The grace period wording should state: tracks over the 250MB free limit are set to **private** (not deleted) for 90 days

### FAQ Page
The following FAQ entries need to be reviewed and updated:

**"How much storage do I get for free?"**
→ Answer: 250MB, enough for approximately 30–40 high-quality audio tracks.

**"What happens if I cancel my subscription?"**
→ Answer: Your account reverts to the Free tier (250MB). Tracks within that limit remain public. Tracks exceeding 250MB are set to private for 90 days — you can re-subscribe at any time to restore them. Nothing is deleted.

**"How many tracks can I upload for free?"**
→ Answer: The free tier is storage-based (250MB), not track-count-based. At an average of ~8MB per high-quality track, that's roughly 30–40 tracks. Upgrade to Premium (2GB) or Unlimited (10GB) for more.

---

## No Backend Changes Required

All storage quota logic on the mobile side reads from `StorageQuotaService` which already has the correct 250MB value. These changes are **mobile UI / copy-only** — no database migrations or API changes are needed for this update.

---

## Contact

Raise any questions about this change with the mobile team before updating billing pages, as pricing and storage tiers must stay in sync.
