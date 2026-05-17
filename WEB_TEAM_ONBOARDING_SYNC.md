# WEB TEAM: Cross-Platform Onboarding Sync — Bug Fix Required

**From:** Mobile team  
**Date:** 2026-04-08  
**Priority:** High — confirmed user-facing bug, affects anyone who onboards on one platform then switches to the other  
**Reported by:** Real user — completed onboarding on mobile, opened web app, was forced through onboarding again. Couldn't even pick their username because it was already taken.

---

## The Bug

A user who completed onboarding on the **mobile app** signed into the **web app** and was shown the onboarding flow again. This should never happen. `onboarding_completed` is a shared flag on the `profiles` table — it doesn't matter which platform set it.

The same bug exists in reverse: a user who completes onboarding on the **web app** would be shown onboarding again if they open the mobile app (though mobile has a fallback that reads `profiles.onboarding_completed` directly, so it may be more resilient).

---

## How Mobile Tracks Onboarding Completion

When a user finishes onboarding on mobile, we write directly to Supabase:

```sql
UPDATE profiles
SET onboarding_completed = true
WHERE id = '<user_id>';
```

In code:
```typescript
await supabase
  .from('profiles')
  .update({ onboarding_completed: true })
  .eq('id', user.id);
```

This is the **single source of truth**. The `profiles.onboarding_completed` column is what both platforms must read.

---

## What Mobile Expects From Your `/user/onboarding-status` Endpoint

Mobile calls `GET /user/onboarding-status` (with Bearer token) on every login to decide whether to show the onboarding screen. It expects:

```json
{
  "needsOnboarding": false,
  "profile": { ... }
}
```

The `needsOnboarding` field **must** be derived from `profiles.onboarding_completed`:

```typescript
// Correct logic
const needsOnboarding = !profile.onboarding_completed;
```

If your endpoint is using any other condition (e.g. checking if a separate `onboarding` table row exists, or checking specific profile fields like `username` or `display_name`), it will incorrectly return `needsOnboarding: true` for users who completed onboarding on mobile — because those supplementary records may not have been created the same way.

---

## The Fix Required

### 1 — Fix `/user/onboarding-status` endpoint

Ensure the endpoint checks `profiles.onboarding_completed` as the **primary gate**:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_completed, username, display_name, ...')
  .eq('id', userId)
  .single();

// PRIMARY CHECK — if this is true, onboarding is done regardless of platform
if (profile.onboarding_completed === true) {
  return { needsOnboarding: false, profile };
}

// Only fall through to secondary checks if onboarding_completed is false/null
return { needsOnboarding: true, profile };
```

Do **not** gate onboarding on whether a separate table row exists, or whether specific fields are populated. `profiles.onboarding_completed = true` is the authoritative signal.

### 2 — Fix the web app's onboarding gate

Whatever middleware, redirect logic, or page guard you use on the web to show/skip onboarding must also read `profiles.onboarding_completed`. If you're checking session metadata, a cookie, or a localStorage flag instead of the DB — that won't be set for users who came from mobile.

```typescript
// On web app load / after login:
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_completed')
  .eq('id', session.user.id)
  .single();

if (profile.onboarding_completed) {
  // Skip onboarding, go to home
} else {
  // Show onboarding
}
```

### 3 — Ensure `completeOnboarding` on web also sets the flag

When a user completes onboarding on the **web app**, make sure you're setting `profiles.onboarding_completed = true` in Supabase — not just creating a row in a separate table or setting a cookie. Mobile reads directly from `profiles`.

---

## Why the "Username Already Taken" Error Happens

When the web onboarding flow runs for a user who already has a username (set during mobile onboarding), the web form tries to insert/update the username again. Supabase rejects it with a unique constraint violation because the username is already in `profiles`. This is a symptom — the root cause is that onboarding is running at all.

---

## Summary

| What to fix | Where | Detail |
|---|---|---|
| `GET /user/onboarding-status` response | Web backend | Must return `needsOnboarding: false` when `profiles.onboarding_completed = true` |
| Web onboarding gate/redirect | Web frontend | Must read `profiles.onboarding_completed` from Supabase, not local state |
| `completeOnboarding` on web | Web backend/frontend | Must set `profiles.onboarding_completed = true` in Supabase when web onboarding finishes |

The fix is straightforward — `profiles.onboarding_completed` is already being set correctly by mobile. The web app just needs to respect it.

— Mobile team
