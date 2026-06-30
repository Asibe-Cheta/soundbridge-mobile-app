# Mobile Team — Fan Page Welcome Follow-up (Web Response Acknowledged)

**Date:** 2026-06-08  
**Test account:** `asibecheta2@gmail.com`  
**Web ref:** Fan Page Welcome Follow-up response (2026-06-08)

---

## Web correction accepted: partner referral **does** trigger welcome

| Flow | Sets `community_entry_creator_id`? | Welcome screen? |
|------|-----------------------------------|-----------------|
| Fan page `/[username]/home` | ✅ Creator UUID | ✅ Yes (once) |
| `soundbridge://artist/[username]` | ✅ via mobile → API | ✅ Yes |
| Partner `/join?ref=[code]` | ✅ Partner UUID via `record_referral_signup` | ✅ Yes (partner as community face) |
| Sound Academy `?source=sound_academy` | ❌ Blocked | ❌ No |

Partner link ≠ fan page URL, but **both use the same welcome gate** when `community_entry_creator_id` is set and `community_entry_shown_at` is null.

### What creators share

| Link | URL | Purpose |
|------|-----|---------|
| **Fan page** | `https://soundbridge.live/[username]/home` | Community entry — welcome to that creator |
| **Partner referral** | `https://soundbridge.live/join?ref=[code]` | Commission attribution — welcome to partner |

For fan-page welcome testing use: **https://soundbridge.live/asibe_cheta/home**

---

## SQL for `asibecheta2@gmail.com` (run in Supabase)

```sql
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  u.raw_user_meta_data->>'referred_by_code' AS referral_code_metadata,
  u.raw_user_meta_data->>'source' AS signup_source_metadata,
  p.onboarding_completed,
  p.community_entry_creator_id,
  p.community_entry_shown_at,
  c.username AS entry_creator_username,
  c.display_name AS entry_creator_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.profiles c ON c.id = p.community_entry_creator_id
WHERE lower(u.email) = lower('asibecheta2@gmail.com');
```

| `community_entry_creator_id` | `community_entry_shown_at` | Diagnosis |
|------------------------------|----------------------------|-----------|
| **NULL** | NULL | Attribution never reached backend |
| **SET** | **SET** | Welcome already done — feed is **correct** |
| **SET** | **NULL** | Backend OK — mobile routing issue |

**Web assessment:** Prior E2E on this email likely set `community_entry_shown_at`. Reusing without reset → feed skip is expected.

### Reset for retest (same email)

```sql
-- Welcome only
UPDATE public.profiles p
SET community_entry_shown_at = NULL, updated_at = now()
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = lower('asibecheta2@gmail.com');

-- Full attribution reset
UPDATE public.profiles p
SET community_entry_creator_id = NULL, community_entry_shown_at = NULL, updated_at = now()
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = lower('asibecheta2@gmail.com');
```

Prefer **new email** or full delete for clean E2E.

---

## Root cause confirmed (mobile, 2026-06-08)

**`DeepLinkingService` was never wired up.** `App.tsx` used a separate `Linking.parse` handler that:

- Did **not** handle `soundbridge://artist/[username]`
- Did **not** handle `https://soundbridge.live/[username]/home`
- Did **not** call `communityEntryService.persistCreatorEntry`

All fan-page parsing in `DeepLinkingService.ts` was dead code. SQL `community_entry_creator_id = NULL` matches this exactly.

**Fix:** Initialize `deepLinkingService` in `App.tsx`, remove duplicate listener, route notification deep links through `deepLinkingService.handleUrl`.

## Mobile fixes (local — pending OTA)

| Fix | Purpose |
|-----|---------|
| **Wire `DeepLinkingService` in App.tsx** | Actually persist fan-page attribution on link open |
| Don't clear AsyncStorage on failed API welcome | Attribution survives until welcome dismissed |
| `AuthContext.pendingCommunityWelcomeId` | Sync welcome gate — no feed flash |
| Signup metadata `community_creator_username` | Backend fallback if AsyncStorage lost |
| Retry `complete-onboarding` if creator_id still null | Belt-and-suspenders after API |
| `record_referral_signup` RPC on onboarding | Partner `/join?ref=` path |

---

## Retest checklist

1. Run SQL above — confirm `community_entry_shown_at` is **null** before test.
2. Open **fan page** (not `/join?ref=` unless testing partner path): `https://soundbridge.live/asibe_cheta/home`
3. Tap **Join** → app opens via `soundbridge://artist/asibe_cheta`
4. Sign up + finish onboarding **in app**
5. Expect **Community Welcome**

**Will fail:** fan page in Safari only → manual app open (no cookie bridge).

---

## Status

- [ ] SQL result pasted for `asibecheta2@gmail.com`
- [ ] OTA with routing + referral RPC fixes
- [ ] Confirmed retest URL (fan `/home` vs partner `/join?ref=`)
