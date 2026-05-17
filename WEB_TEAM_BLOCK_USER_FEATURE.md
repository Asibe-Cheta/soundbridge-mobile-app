# WEB TEAM: Block User Feature — Backend + Web UI Required

**From:** Mobile team
**Date:** 2026-04-08
**Priority:** High — mobile app is live and wired up, but all block actions will fail until backend endpoints exist

---

## Context

We've fully built the block user feature on mobile. The UI is live:
- Block / Unblock from any creator's profile (3-dot menu)
- Block / Unblock from any post (3-dot menu)
- Blocked Users list screen (accessible via Settings → Privacy & Security → Manage Blocked Users)
- Unblock from the list

Everything on mobile is ready. We just need the backend endpoints and the web UI equivalent.

---

## Part 1 — Backend API Endpoints Required

All endpoints live under `/api/users/block`.

---

### POST `/api/users/block` — Block a user

**Auth:** Required (Bearer token)

**Request body:**
```json
{
  "blockedUserId": "uuid",
  "reason": "optional string, max 500 chars"
}
```

**Success response (`200`):**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "id": "uuid",
    "blocker_id": "uuid",
    "blocked_id": "uuid",
    "reason": "optional string or null",
    "created_at": "ISO timestamp"
  }
}
```

**Error responses:**
- `400` — `{ "error": "cannot block yourself" }` if `blockedUserId === auth.uid()`
- `401` — not authenticated
- `404` — target user not found
- `409` — already blocked

---

### DELETE `/api/users/block?userId={blockedUserId}` — Unblock a user

**Auth:** Required (Bearer token)

**Query param:** `userId` — the ID of the user to unblock

**Success response (`200`):**
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

**Error responses:**
- `400` — missing `userId`
- `401` — not authenticated
- `404` — block record not found (user was not blocked)

---

### GET `/api/users/block?list=blocked` — Get the current user's blocked users list

**Auth:** Required (Bearer token)

**Query param:** `list=blocked`

**Success response (`200`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "block_record_uuid",
      "reason": "optional string or null",
      "created_at": "ISO timestamp",
      "blocked": {
        "id": "uuid",
        "display_name": "John Doe",
        "username": "johndoe",
        "avatar_url": "https://... or null"
      }
    }
  ],
  "count": 1
}
```

**Error responses:**
- `401` — not authenticated

---

### GET `/api/users/block?checkUserId={userId}` — Check block status between current user and another user

**Auth:** Required (Bearer token)

**Query param:** `checkUserId` — the ID of the other user

**Success response (`200`):**
```json
{
  "success": true,
  "isBlocked": true,
  "isBlockedBy": false,
  "isBlocking": true,
  "block": {
    "id": "uuid",
    "reason": "optional or null",
    "created_at": "ISO timestamp"
  }
}
```

Fields:
- `isBlocking` — current user has blocked `checkUserId`
- `isBlockedBy` — `checkUserId` has blocked the current user
- `isBlocked` — either direction is blocked (convenience field = `isBlocking || isBlockedBy`)
- `block` — only present when `isBlocking` is true

**Error responses:**
- `401` — not authenticated

---

## Part 2 — Database Schema

Create a `user_blocks` table:

```sql
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Index for fast lookups of "who have I blocked?" and "am I blocked by someone?"
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
```

**RLS Policies:**
```sql
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocks (as blocker)
CREATE POLICY "Users can view their own blocks"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can only insert blocks where they are the blocker
CREATE POLICY "Users can block others"
  ON user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can only delete their own blocks
CREATE POLICY "Users can unblock"
  ON user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);
```

---

## Part 3 — Web UI (mirror of what we built on mobile)

Please implement the equivalent on the web app:

### 3.1 — Block option on user profiles
On the public profile page (`soundbridge.live/u/[username]` or similar), add a 3-dot / overflow menu for users viewing someone else's profile. Menu should include:
- **Block [name]** — opens a confirmation modal
- **Report [name]** (if not already there)

The block confirmation modal should show:
- The user's avatar + name
- What blocking does (bullet points — they can't message you, see your posts, etc.)
- Optional reason field (500 char max)
- Cancel / Block buttons

If the user is already blocked, the menu item should say **Unblock [name]** and tapping it unblocks immediately (no reason needed, just a confirm dialog).

### 3.2 — Block option on posts
On post cards in the feed, the 3-dot menu should include a "Block [username]" option (in addition to any existing Report option).

### 3.3 — Blocked Users management page
Add a page at **Settings → Privacy & Security → Blocked Users** (or similar path) that:
- Lists all blocked users (avatar, display name, @username)
- Has an "Unblock" button per row
- Shows empty state if no one is blocked
- Pulls from `GET /api/users/block?list=blocked`

### 3.4 — Content filtering (important)
When a block exists between two users (in either direction), the backend should filter them out of:
- Feed / discovery results
- Search results
- Chat / messaging (block sending messages)
- Event attendee lists

This can be done at the API query layer by joining against `user_blocks` and excluding matches. Mobile doesn't handle this filtering client-side — we rely on the backend to not return blocked content.

---

## Summary

| Part | Owner | Blocking mobile? |
|---|---|---|
| `POST /api/users/block` | Web team (backend) | Yes — block action silently fails |
| `DELETE /api/users/block` | Web team (backend) | Yes — unblock action silently fails |
| `GET /api/users/block?list=blocked` | Web team (backend) | Yes — Blocked Users screen shows empty |
| `GET /api/users/block?checkUserId=` | Web team (backend) | Yes — block status always shows unblocked |
| `user_blocks` table + RLS | Web team (DB) | Yes — all of the above depend on it |
| Web UI — profile block menu | Web team (frontend) | No — web-only |
| Web UI — Blocked Users page | Web team (frontend) | No — web-only |
| Content filtering in API queries | Web team (backend) | Partial — mobile will show blocked users' content until this is done |

Please prioritise the backend endpoints and DB schema first — that unblocks the mobile feature immediately.

— Mobile team
