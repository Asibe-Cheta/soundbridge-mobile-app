# URGENT: Follow API & Connection Request 500 Error

**Date:** March 9, 2026  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH - Two Issues**

---

## Issue 1: Connection Request Endpoint 500 Error

### Error Details

When calling the connection request endpoint:

```
POST /api/network/request
```

**Response:**
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Cannot access 'h' before initialization"
}
```

**Status:** 500 Internal Server Error

### Root Cause

This is a JavaScript runtime error on the backend - likely a variable hoisting issue where code is trying to use variable `h` before it's declared/initialized.

**Likely location:** `apps/web/app/api/network/request/route.ts` or related handler

### Action Required

Please fix the JavaScript error in the connection request handler. Common causes:
- Variable used before declaration in the same scope
- TDZ (Temporal Dead Zone) violation with `let`/`const`
- Destructuring assignment order issue

---

## Issue 2: Need Separate "Follow" vs "Connect" Functionality

### Current State

The mobile app has a "Follow" button during onboarding (Step 6), but it's calling the **connection request** endpoint. This is confusing because:

1. **Connect** = Request to connect (requires acceptance, two-way relationship)
2. **Follow** = One-way subscription (no acceptance needed, like Twitter/Instagram)

### What's Needed

We need **two distinct endpoints**:

#### 1. Connection Request (Existing - but broken with 500 error)
```
POST /api/network/request
{
  "user_id": "target-user-id",
  "message": "optional message"
}
```
- Requires mutual acceptance
- Both users see each other in connections list
- Used for professional networking

#### 2. Follow User (NEW - requested)
```
POST /api/user/{userId}/follow
```
**OR**
```
POST /api/follow
{
  "user_id": "target-user-id"
}
```

- One-way action (no acceptance needed)
- Follower sees followee's content in feed
- Followee gets notification (optional)
- Used for content subscription

### Database Schema Needed

**New Table: `user_follows`**
```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id),
  following_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

**RLS Policy:**
```sql
-- Anyone can follow anyone (public)
-- Users can only delete their own follows
CREATE POLICY "Users can manage their own follows"
  ON user_follows FOR ALL
  USING (follower_id = auth.uid());
```

### API Endpoints Needed

1. **POST /api/user/{userId}/follow** - Follow a user
2. **DELETE /api/user/{userId}/follow** - Unfollow a user  
3. **GET /api/user/{userId}/followers** - Get followers list
4. **GET /api/user/{userId}/following** - Get following list

### Request/Response Examples

**Follow User:**
```http
POST /api/user/123e4567-e89b-12d3-a456-426614174000/follow
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully followed user",
  "follower_count": 42
}
```

**Check if Following:**
```http
GET /api/user/123e4567-e89b-12d3-a456-426614174000/follow-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "is_following": true,
  "followed_at": "2026-03-09T17:00:00Z"
}
```

---

## Current Workaround

Until the follow endpoint is ready, the mobile app will:
1. Show "Follow" button (UX)
2. Call connection request endpoint (temporary)
3. Handle the 500 error gracefully

This is not ideal as users expect follow to work instantly without approval.

---

## Summary

| Issue | Priority | Action |
|-------|----------|--------|
| Connection 500 Error | 🔴 HIGH | Fix JS bug in `/api/network/request` |
| Follow Endpoint Missing | 🟡 MEDIUM | Create new follow system (table + endpoints) |

---

## Web team response: Follow vs Connect are now distinct

### 1. Connection request (Connect) – mutual, requires acceptance

- **POST /api/network/request** – Now implemented. Accepts `user_id` or `recipient_id` in body (and optional `message`). Same behavior as **POST /api/connections/request**. Use for “Connect” / professional networking (request → recipient accepts → both appear in connections).
- **POST /api/connections/request** – Canonical path; body: `{ "recipient_id": "uuid", "message"?: "..." }`.

No variable `h` or other bug in the new handler; the 500 was likely from this path not existing before. If you still see 500, share the exact request and we’ll debug.

### 2. Follow (one-way, no acceptance)

Use these for “Follow” during onboarding and elsewhere. One-way subscription; no approval step.

| Action | Method | Endpoint |
|--------|--------|----------|
| Follow user | POST | `/api/user/{userId}/follow` |
| Unfollow user | DELETE | `/api/user/{userId}/follow` |
| Check if following | GET | `/api/user/{userId}/follow` or `/api/user/{userId}/follow-status` |
| List followers | GET | `/api/user/{userId}/followers` (existing) |
| List following | GET | `/api/user/{userId}/following` (existing) |

**POST /api/user/{userId}/follow** – No body required. Returns e.g. `{ "success": true, "message": "Successfully followed user", "is_following": true, "followed_at": "...", "follower_count": 42 }`.

**GET /api/user/{userId}/follow-status** – Returns `{ "success": true, "is_following": true|false, "followed_at": "..." | null }`.

Backed by existing **`follows`** table (`follower_id`, `following_id`). No new table was added; schema already supports one-way follow.

### 3. What to use when

- **Onboarding “Follow” button** → **POST /api/user/{userId}/follow** (instant, one-way).
- **“Connect” / “Send connection request”** → **POST /api/network/request** or **POST /api/connections/request** (requires recipient to accept).

---

## Timeline Request

1. **Fix 500 error:** ASAP (blocks onboarding step 6)
2. **Follow endpoints:** This week (needed for proper UX)

---

**Prepared by:** Mobile Team  
**Date:** March 9, 2026
