# Comments API — Mobile Team Alignment Required

**Date:** 2026-03-27
**Priority:** High — delete endpoint missing, user field naming confirmed

---

## Status Summary

| Issue | Status |
|-------|--------|
| GET comments user field mapping | ✅ Fixed mobile-side (backend uses `author.name`) |
| POST comment missing user data | ⚠️ Still pending — see issue 2 below |
| DELETE comment endpoint | ❌ 404 — endpoint does not exist yet |

---

## Issue 1 — GET `/api/posts/:id/comments` — RESOLVED (mobile-side workaround applied)

**Confirmed actual response shape per comment:**
```json
{
  "id": "d02dc6f5-ecc7-4a7a-964a-2fd65978407f",
  "content": "Great",
  "author": {
    "id": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "name": "Asibe Cheta",
    "username": "asibe_cheta2",
    "avatar_url": "https://...supabase.co/.../avatar.jpg",
    "is_verified": true
  }
}
```

**Discrepancy from expected shape:**
- Key is `author`, not `user`
- Name field is `name`, not `display_name`
- No `likes_count`, `user_liked`, `replies_count` visible in log (may be present but truncated)

**Mobile workaround applied:** mobile now reads `comment.author ?? comment.user` and maps `name → display_name`.

**Request to web team:** For consistency with the rest of the API (Post uses `author` too), please keep `author` — no change needed here. But please confirm `likes_count`, `user_liked`, and `replies_count` are included in the response.

---

## Issue 2 — POST `/api/posts/:id/comments` — STILL PENDING

When a user submits a comment, the optimistic display shows "You" until the list refreshes (because the POST response does not include the `author` object).

**Request:** Please include the full `author` object in the POST response, matching the GET shape above.

---

## Issue 3 — DELETE `/api/comments/:id` — ENDPOINT MISSING ❌

**Confirmed:** `DELETE /api/comments/:id` returns `404 Resource not found`.

Mobile is calling this endpoint to support:
- Comment author deleting their own comment
- Post author deleting any comment on their post

**Request: Please create this endpoint.**

Expected behaviour:
- `DELETE /api/comments/:id`
- Auth required (Bearer token)
- Returns `200` or `204` on success
- Returns `403` if caller is neither the comment author nor the post author
- Returns `404` if comment not found

Mobile is already wired up and waiting for this endpoint. Once it exists, delete will work immediately with no further mobile changes required.

---

*Raised by mobile team. Comments display is now working. Blocked on delete endpoint.*
