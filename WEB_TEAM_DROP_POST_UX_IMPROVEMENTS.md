# Web Team: Drop / Post UX Improvements — Please Implement

**Date:** 2026-02-21
**From:** Mobile Team
**Priority:** Medium — parity with mobile improvements already shipped

---

## 🚨 URGENT — Backend Fix Blocking sMobile Users NOW

**The mobile app is live with the 3,000-character limit, but the backend API is rejecting posts over 500 characters.**

Error returned by `POST /api/posts`:
```json
{ "success": false, "error": "Content must be 500 characters or less" }
```

**This is actively broken for mobile users.** Any user trying to write a post longer than 500 characters gets a silent failure. Please fix the backend validation immediately — it is a one-line change:

Find the validation in your `POST /api/posts` route handler (likely something like):
```javascript
if (content.length > 500) {
  return res.status(400).json({ success: false, error: 'Content must be 500 characters or less' });
}
```
Change `500` → `3000`:
```javascript
if (content.length > 3000) {
  return res.status(400).json({ success: false, error: 'Content must be 3,000 characters or less' });
}
```

Also update the same check in any edit/update post endpoint (`PATCH /api/posts/:id` or equivalent).

---

## Context

The following improvements were made to the mobile app's "Drop" (post) creation and display experience, based on user feedback and LinkedIn UX benchmarking. Please mirror these changes on the web app.

---

## 1. Post Character Limit → Raise to 3,000

**Why:** The previous 500-character limit was too restrictive for real-world use. LinkedIn allows 3,000 characters; we now match that.

**What to change:**
- Allow up to **3,000 characters** in the post/drop composition box.
- Only show the character counter when the user is at **≥ 80% of the limit** (i.e., ≥ 2,400 characters used). Display it as `"X characters left"` in a muted colour.
- At the limit, block further input and show the counter in red.
- The "Publish" button should remain enabled as long as there is at least 10 non-whitespace characters and the count is ≤ 3,000.

---

## 2. Multiple Images per Post (up to 20)

**Why:** Users want to attach multiple photos to a drop. LinkedIn allows up to **20 images per post** (confirmed 2026). We now match that limit.

**LinkedIn image specs (2026, verified):**
- Max images per post: **20**
- Ideal file size per image: **≤ 5 MB** (files above 5 MB are accepted but LinkedIn applies heavy compression, causing visible blurriness/artifacts — so 5 MB is the practical ceiling for quality)
- Supported formats: JPG, JPEG, PNG (non-animated GIF also supported on LinkedIn, but we only support static images)
- Optimal dimensions: 1200×627px (landscape), 1080×1080px (square), 1080×1350px (portrait/mobile)

**What to change:**

### Data / Storage
- The `posts` table currently stores a single `image_url` column. To support multiple images you have two options:
  - **Option A (Recommended):** Add a `image_urls TEXT[]` (array) column to the `posts` table alongside the existing `image_url`. On insert, write all image URLs to `image_urls`. Keep `image_url` populated with the first image for backwards compatibility.
  - **Option B:** Store a JSON array in a new `media JSONB` column.
- All images continue to go into the existing **`post-attachments`** Supabase Storage bucket.

### Upload
- Each selected image is uploaded individually to `post-attachments/{user_id}/{uuid}.{ext}` and its public URL is collected.
- Maximum **20 images** per post; reject selection beyond that with a user-facing message.
- Per-image file size limit: **5 MB** (matches the existing `MAX_IMAGE_SIZE = 5 * 1024 * 1024` in UploadService). Reject oversized images with a clear error message: *"X photo(s) exceed the 5 MB limit and were skipped."*
- Accepted types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/avif`.

### Display — Image Grid Layout
Render the image grid in the post card using the following layout rules (same as LinkedIn):

| # of images | Layout |
|---|---|
| 1 | Single full-width image, 16:9 aspect ratio |
| 2 | Two equal-width columns side by side, square crop |
| 3 | One large image on the left (fills full height) + two stacked on the right |
| 4+ | 2-column grid (2 per row); last cell shows `+N more` overlay if images > 4 |

Tapping any image opens a full-screen viewer.

### Composer UI
- Show a photo icon / button in the toolbar. When images are attached, show a badge with the count (e.g. `3`).
- Once images are selected, render the grid preview inside the composer (scrollable).
- Below the grid, show an **"Add more photos (X / 20)"** button while the count is below 20.
- Each image thumbnail should have an **✕ remove button** in the top-right corner.
- Make sure the scroll area below the text input has enough room to show the image grid — the composition area should be a `ScrollView` (or equivalent), not a fixed-height container.

---

## 3. Scrollable Text Area in Composer

**Why:** With longer posts (up to 3,000 chars) and media below, the text input needs to scroll independently within the composition screen.

**What to change:**
- The outer post composition container should be scrollable (vertical scroll).
- The text input itself should **not** have a fixed maximum height — let it grow naturally and let the outer scroll view handle overflow.
- Ensure there is at least **80px of bottom padding/spacer** below the media grid so content isn't clipped by the toolbar.

---

## 4. "See More / See Less" Inline Text Expansion on Post Cards

**Why:** Currently on the web, long post text is truncated (approximately 8 lines) but the "See more" button either navigates away or does nothing useful. It should expand the text inline.

**What to change:**
- Truncate long post text to **8 lines** by default.
- Only show the "See more" button when the post content exceeds approximately **200 characters** (or when the browser/RN detects that the text is actually being truncated — whichever approach is more reliable on web).
- Tapping/clicking **"See more"** expands the text to show the full content **inline within the card** — no navigation, no modal.
- Once expanded, the button label changes to **"See less"**.
- Tapping **"See less"** collapses the text back to 8 lines.
- This state is local to the card component and resets if the card unmounts.

---

## 5. Image Compression + File Size — Use `browser-image-compression`

**Why:** The mobile app now uses `expo-image-manipulator` to compress images to ~200–600 KB before upload (resize to 1200px wide, JPEG at 80% quality). The web app should do the same — both for consistency and because raw phone photos (3–8 MB) are too large to upload unprocessed.

**Recommended package:** [`browser-image-compression`](https://www.npmjs.com/package/browser-image-compression)
- ~2 million downloads/week, actively maintained
- Runs in a **Web Worker** (non-blocking — UI stays responsive during compression)
- Supports resize + quality control, JPEG/PNG/WebP output
- ~30 KB bundle size

**Install:**
```bash
npm install browser-image-compression
```

**Usage (mirrors mobile implementation exactly):**
```javascript
import imageCompression from 'browser-image-compression';

const compressImage = async (file) => {
  return imageCompression(file, {
    maxSizeMB: 1,             // target ≤ 1 MB output (typically yields 200–600 KB)
    maxWidthOrHeight: 1200,   // resize longest dimension to 1200px (matches mobile)
    useWebWorker: true,       // non-blocking
    fileType: 'image/jpeg',   // convert PNG → JPEG (matches mobile)
  });
};

// In your image pick handler:
const compressedFiles = await Promise.all(pickedFiles.map(compressImage));
// Then upload compressedFiles to Supabase post-attachments bucket
```

**What to change:**
- Remove any hard file-size rejection below 5 MB (compression makes it unnecessary for normal photos)
- Keep a 50 MB raw file guard as a sanity check (same as mobile), rejecting truly oversized files before compression
- Show a "Optimising photos…" indicator while compression runs (it's fast but visible on slow devices)
- After compression, the 5 MB upload limit in `UploadService` will never be hit in practice

**Note:** If the web team is already doing server-side image processing via a Next.js API route or Supabase Edge Function, use **`sharp`** there instead — it's C-native and significantly faster. But client-side `browser-image-compression` is simpler and matches our mobile architecture.

---

## Supabase Storage — No Changes Needed

The `post-attachments` bucket already exists and is configured correctly. No bucket-level policy changes are required for the 5 MB limit. The only database change needed is for multiple images (item 2 above — `image_urls TEXT[]` column on the `posts` table).

If the web team adds the `image_urls` column, please notify the mobile team so we can update our Supabase query to read from it.

---

## Summary Checklist

- [ ] 🚨 **URGENT:** Change `POST /api/posts` backend validation from 500 → 3,000 chars (mobile users blocked NOW)
- [ ] Raise post character limit to 3,000 on web UI; counter only visible at ≥ 80% used
- [ ] Support up to 20 images per post in the composer (grid preview, add/remove, badge)
- [ ] Upload each image to `post-attachments` bucket; collect all public URLs
- [ ] Add `image_urls TEXT[]` to `posts` table (keep existing `image_url` for backwards compat)
- [ ] Render multi-image grid in post cards (1/2/3/4+ layout rules above)
- [ ] Make composition area scrollable; add bottom spacer below media
- [ ] "See more" / "See less" inline text expand on post cards
- [ ] Install `browser-image-compression`; compress picked images to ≤ 1 MB / 1200px before upload (mirrors mobile)
