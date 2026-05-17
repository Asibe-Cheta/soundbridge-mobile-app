# Web Team — Audio Book Content Type Migration

## What changed on mobile

Mobile has added **Audio Book** as a new content type in the upload screen.
Audio books are stored in the existing `audio_tracks` table with:

```
content_type = 'audio_book'
```

No new table is required. The existing schema handles it:
- `title` — book / chapter title
- `description` — prefixed with narrator and chapter info if provided
- `genre` — book genre (Fiction, Non-Fiction, etc.)
- `cover_art_url` — cover image
- `file_url` — audio file
- `content_type` — **'audio_book'** (new value)
- `is_public`, `visibility`, `tags` — all standard

---

## Action required

### If `content_type` has a CHECK constraint

Check whether the column has a constraint limiting valid values:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'audio_tracks'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%content_type%';
```

If a constraint exists (e.g. `CHECK (content_type IN ('music','podcast','mixtape'))`), run:

```sql
ALTER TABLE audio_tracks
  DROP CONSTRAINT <constraint_name>;

ALTER TABLE audio_tracks
  ADD CONSTRAINT audio_tracks_content_type_check
  CHECK (content_type IN ('music', 'podcast', 'mixtape', 'audio_book'));
```

### If no constraint exists

No action needed — `'audio_book'` will insert without issue.

---

## Discover tab query

The mobile Discover "Audio Books" tab queries:

```sql
SELECT ...
FROM audio_tracks
WHERE is_public = true
  AND content_type = 'audio_book'
  AND moderation_status IN ('pending_check','checking','clean','approved')
ORDER BY created_at DESC
LIMIT 20;
```

This will return an empty list until the first audio book is uploaded — no error.
