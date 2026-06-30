# Mobile Team → Web Team: Fan Page Welcome Flow Not Showing (Questions)

**Date:** 2026-06-08  
**Status:** Mobile bug fixes applied locally — need web confirmation on Join CTA URLs  
**Related:** `MOBILE_TEAM_COMMUNITY_ENTRY_RESPONSE.MD`, `COMMUNITY_ENTRY_EXPERIENCE.MD`

---

## What we observed (prod test)

A new user tapped a creator's **fan page link**, completed **signup + onboarding on the mobile app**, and expected the **one-time Community Welcome screen** for that creator. Instead they landed on the main feed (`TestFeedScreen`).

Web signup → welcome flow **works**. Mobile did not.

---

## Root causes we found and fixed on mobile

### 1. Deep link formats not fully parsed (likely primary bug)

Mobile now persists `community_entry` attribution for:

| URL pattern | Was handled before? |
|-------------|---------------------|
| `https://soundbridge.live/[username]/home` | ✅ Yes |
| `https://soundbridge.live/artist/[username]` | ✅ Yes |
| `soundbridge://artist/[username]` | ❌ **No** — parsed as unknown route |
| `https://soundbridge.live/[username]` (no `/home`) | ❌ **No** — treated as unknown section |
| `https://soundbridge.live/join?creator=[username]` | ❌ **No** — only `?ref=` was handled |

If the fan page **Join** button uses any of the ❌ formats, mobile never stored the creator username before onboarding — so `complete-onboarding` had nothing to send and `community_entry_creator_id` stayed null.

### 2. Attribution cleared too early

Mobile cleared AsyncStorage after `complete-onboarding` even when `welcomeUsername` was null and profile had no `community_entry_creator_id`. Fixed: only clear after welcome is confirmed or no attribution was present.

### 3. Welcome gate relied only on profile field

`App.tsx` only showed `CommunityWelcome` when `userProfile.community_entry_creator_id` was already set. If the profile row lagged, user went straight to feed. Fixed: also use `GET /api/user/community-welcome-status` + local pending flag.

### 4. API fallback

`complete-onboarding` now falls back to the same `fetch(`${config.apiUrl}/api/user/complete-onboarding`)` pattern as `complete-profile` if `apiFetch` fails.

---

## Questions for web team (please confirm)

### A. Exact Join CTA URL on fan landing (mobile)

When a user taps **"Join [Creator Name]'s community on SoundBridge"** on `soundbridge.live/[username]/home`, what is the **exact href** for:

1. **App already installed** (iOS / Android)
2. **App not installed** (deferred install)

We need the literal URL(s), e.g.:

- `https://soundbridge.live/asibe_cheta/home` (same page + universal link?)
- `https://soundbridge.live/artist/asibe_cheta`
- `https://soundbridge.live/asibe_cheta`
- `soundbridge://artist/asibe_cheta`
- `https://soundbridge.live/join?creator=asibe_cheta` (or `?username=` / `?u=`?)

### B. Query param name for creator on `/join`

If Join uses `/join` with a creator query param, which key is canonical?

- `creator`
- `username`
- `u`
- `community_creator`
- other: ___________

Mobile now checks all of the above — please confirm the one web actually sends.

### C. `complete-onboarding` body field names

Mobile sends (when attribution exists in local storage):

```json
{
  "userId": "<uuid>",
  "communityCreatorUsername": "asibe_cheta",
  "communityCreatorId": "<uuid-if-resolved>",
  "referralCode": "<if partner join>"
}
```

Please confirm these are still the exact keys the API expects (per `MOBILE_TEAM_COMMUNITY_ENTRY_RESPONSE.MD`).

### D. Expected API responses for fan-page signup

For a **new mobile signup** via fan page, after `POST /api/user/complete-onboarding` with `communityCreatorUsername` set:

1. Should `profiles.community_entry_creator_id` always be set in the same response transaction?
2. Should `welcomeUsername` always be non-null in the JSON response when welcome is pending?
3. What does `GET /api/user/community-welcome-status` return in the first 30s after onboarding — before welcome is dismissed?

### E. Web vs mobile signup split

If the user **views the fan page in mobile Safari** but **signs up inside the native app** (without the universal link opening the app first), web cookies/localStorage attribution won't exist on mobile.

- Does web expect mobile to rely **only** on the universal link / custom scheme opening the app **before** signup?
- Or is there a server-side way to pass `community_entry_creator_id` from a web-started signup to mobile (same account)?

### F. Test account verification

For the failing test user, can web run:

```sql
SELECT
  u.email,
  p.community_entry_creator_id,
  p.community_entry_shown_at,
  p.onboarding_completed,
  c.username AS entry_creator_username
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.profiles c ON c.id = p.community_entry_creator_id
WHERE u.email = '<test-user-email>';
```

If `community_entry_creator_id` is **null**, attribution never reached the backend (deep link or API body issue on mobile).  
If it is **set** but `community_entry_shown_at` is null, the issue was mobile welcome routing only (our App.tsx fix).

---

## Mobile fixes ready for OTA (after web confirms URLs)

- Deep link parsing for `soundbridge://artist/[username]`, `/[username]`, `/join?creator=`
- Case-insensitive username → creator UUID lookup (`ilike`)
- `complete-onboarding` + `community-welcome-status` post-onboarding gate
- Pending welcome creator ID when profile row lags

---

## Web reference (working flow)

Per your prod test (`asibecheta2@gmail.com`):

- `community_entry_creator_id` set ✅
- `community_entry_shown_at` set after welcome ✅
- `follows` row created ✅

Mobile is aligning to this — we need the **exact fan page Join URL** you emit on mobile web so our parser matches 100%.
