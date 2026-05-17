# Web Team: Admin Controls for Live Sessions

**Date:** 2026-04-08  
**From:** Mobile team  
**Priority:** Medium — needed to allow admins to end stuck/rogue live sessions without direct DB access

---

## What was built (mobile side)

Admins can now see an **"End Session"** button (red) on any live session card that isn't their own. Tapping it shows a confirmation alert, then calls `adminEndLiveSession` which updates the session `status = 'ended'` and clears active participants. The real-time subscription removes it from the list automatically.

This is gated on `userProfile.is_admin === true` — the value comes from the `profiles` table via `select('*')` in `AuthContext`.

---

## Required backend changes

### 1. Add `is_admin` column to `profiles` table

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Grant yourself admin access:
UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';
```

That's all the mobile app needs — `AuthContext` already fetches `select('*')` from `profiles`, so the field will appear automatically.

### 2. RLS policy for `adminEndLiveSession`

The mobile `adminEndLiveSession` function calls:
```sql
UPDATE live_sessions SET status = 'ended', end_time = now() WHERE id = ?
```
without the `creator_id` filter. This will be **blocked by RLS** unless you add an admin bypass policy:

```sql
-- Allow admins to update any live session
CREATE POLICY "Admins can update any live session"
  ON live_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update participants of any session
CREATE POLICY "Admins can update any session participants"
  ON live_session_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

### 3. (Optional but recommended) Admin select policy

If `live_sessions` RLS restricts SELECT to only the creator or participants, admins also need read access:

```sql
CREATE POLICY "Admins can view all live sessions"
  ON live_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

---

## Summary

| Action | Owner |
|--------|-------|
| `ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false` | Web team |
| RLS policy: admins can UPDATE `live_sessions` without `creator_id` filter | Web team |
| RLS policy: admins can UPDATE `live_session_participants` | Web team |
| Set `is_admin = true` for Justice's account | Web team |
| Admin "End Session" button in `SessionCard` | Mobile ✓ Done |
| `adminEndLiveSession` in `dbHelpers` | Mobile ✓ Done |
| `handleAdminEnd` with confirmation alert in `LiveSessionsScreen` | Mobile ✓ Done |
