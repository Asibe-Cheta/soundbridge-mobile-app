# Web Team: Album Upload Restrictions + Albums Tab on Creator Profiles

**Date:** 2026-03-29
**Priority:** Medium
**Mobile status:** Already shipped

---

## 1. Remove Tier Restrictions on Album Uploads

### Current behaviour (incorrect)
The upload flow currently blocks free-tier users from creating albums entirely:
> "Albums are only available for Premium and Unlimited users"

Premium users are also capped at 7 tracks per album.

### Required behaviour
**Albums must be available to all tiers.** The only gate should be storage quota — if a user doesn't have enough storage space left, they see the normal storage-limit upgrade prompt. That logic is already in place; the separate album tier block needs to be removed.

### What to change
- Remove any check that prevents free-tier users from starting an album upload
- Remove the "7 tracks per album" cap for Premium users
- Keep storage quota validation exactly as-is — that's the correct gate

---

## 2. Albums Tab on Creator Profiles

### Current behaviour
Creator profiles show: **Drops | Tracks | About**

### Required behaviour
Add an **Albums** tab: **Drops | Tracks | Albums | About**

### Data source
```sql
SELECT id, title, cover_image_url, tracks_count, total_plays, created_at
FROM albums
WHERE creator_id = :creatorId
ORDER BY created_at DESC
LIMIT 50;
```

### UI spec
- 2-column grid of album cards
- Each card: square cover art (fallback: disc icon), album title, track count underneath
- Tapping a card navigates to the existing Album Details page for that album
- Empty state: disc icon + "No albums yet"
- Loading state: spinner while fetching

### Mobile implementation reference
See `src/screens/CreatorProfileScreen.tsx` — `loadAlbums()` function and the `activeTab === 'albums'` render block.

---

## Notes
- These changes are already live on mobile as of today
- The `albums` table already exists and is being used by the existing All Albums screen — no schema changes required
- No new API endpoints needed; direct Supabase query is sufficient
