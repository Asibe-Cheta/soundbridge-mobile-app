# Mobile Team — Community Entry & Welcome Flow (Web / Backend Complete)

**Date:** 2026-06-07  
**Status:** ✅ Live on Sound Bridge production (verified end-to-end)  
**Supabase project:** `aunxdbqukbxyyiusaeqi` (Sound Bridge — **not** GlobalReady Mobile)  
**Related:** `COMMUNITY_ENTRY_EXPERIENCE.MD`, `MOBILE_TEAM_CREATOR_ROLE_AND_AGREEMENT_RESPONSE.MD`, `PARTNER_REFERRAL_LINK.MD`

---

## Summary for mobile

When a new user arrives via a **creator’s fan page**, **partner referral link**, or **digital card QR** (which resolves to the fan page), they should see a **one-time welcome screen** after onboarding — not during signup.

| Concern | Web (done) | Mobile (your work) |
|---------|------------|-------------------|
| Persist entry creator through signup + onboarding | Cookies + localStorage + API body fallback | AsyncStorage / deep-link payload until onboarding completes |
| Set `community_entry_creator_id` on profile | `complete-onboarding` + `complete-profile` APIs | Same APIs — pass creator in request body |
| Partner referral tracking | `record_referral_signup` RPC via `complete-onboarding` | Pass referral code in body or user metadata |
| One-time welcome screen | `/welcome/[username]` | Full-screen welcome after onboarding |
| Follow on welcome CTA | `POST /api/user/community-entry/complete` `{ action: "follow" }` | Same API |
| Skip follow → feed | Same API `{ action: "explore" }` | Same API |
| Sound Academy institutional signup | **No** welcome screen | Unchanged — no community entry |

**Product rule:** Normal onboarding (role selection, no creator agreement) is unchanged for all entry points. Welcome is a **post-onboarding moment only**.

---

## 1. Database (migration already applied prod)

```sql
-- profiles
community_entry_creator_id uuid REFERENCES profiles(id)  -- null = organic signup
community_entry_shown_at   timestamptz                   -- null until welcome dismissed
```

**Semantics:**

- `community_entry_creator_id` — which creator the user “joined through” (fan page, referral partner’s user_id, etc.)
- `community_entry_shown_at` — set when user taps **Follow** or **Explore SoundBridge** on welcome screen. Once set, welcome never shows again.

Partner referrals also set `community_entry_creator_id` inside `record_referral_signup` (to the partner’s `user_id`).

---

## 2. Entry points — what mobile must persist

### A. Fan landing page / digital card

URL pattern: `https://soundbridge.live/[username]/home`  
Example: `https://soundbridge.live/asibe_cheta/home`

When user taps **“Join [Creator Name]'s community on SoundBridge”**:

1. **App installed** → open app with deep link carrying creator username (and ideally creator UUID).
2. **App not installed** → store creator username in **deferred deep link**; read after install + onboarding.

Persist locally until onboarding completes:

| Key (web equivalent) | Value |
|----------------------|-------|
| `soundbridge_community_entry_creator` | creator username (lowercase) |
| `soundbridge_community_entry_creator_id` | creator UUID (optional but preferred) |

Web stores these in **localStorage + cookies** for 30 days. Mobile should use **AsyncStorage** (or equivalent) with the same keys if possible for debugging parity.

### B. Partner referral link

URL pattern: `https://soundbridge.live/join?ref=danedmund`  
(Also works via user metadata: `referred_by_code`, `referral_code`, or `ref`)

Persist referral code until onboarding completes:

| Key | Value |
|-----|-------|
| `soundbridge_referral_code` | partner referral code (lowercase) |
| `soundbridge_signup_source` | e.g. `sound_academy` for institutional flow only |

On onboarding completion, backend calls `record_referral_signup` which:

1. Creates `referral_signups` row
2. Sets `profiles.community_entry_creator_id` to partner’s `user_id` (if not already set)

### C. Sound Academy — exclude from welcome

If `signup_source === 'sound_academy'`:

- Grant institutional Premium via existing RPC (unchanged)
- **Do not** set community entry / do not show welcome screen

---

## 3. When to write `community_entry_creator_id`

Backend applies attribution at **two** moments (mobile should hit at least one):

| When | API | Body fields (send from mobile storage) |
|------|-----|----------------------------------------|
| Quick setup / profile step | `POST /api/user/complete-profile` | `community_creator_username`, `community_creator_id` |
| Onboarding finish | `POST /api/user/complete-onboarding` | `communityCreatorUsername`, `communityCreatorId` |

**Important:** Mobile cannot rely on cookies. **Always send creator username/id in the JSON body** from local storage. Web had a prod bug where cookie-only attribution failed across `www` vs apex; body fallback fixed it.

Attribution is **idempotent** — only writes if `community_entry_creator_id` is currently null. Self-referrals are ignored.

### `complete-onboarding` request (mobile)

```json
{
  "userId": "<auth user uuid>",
  "communityCreatorUsername": "asibe_cheta",
  "communityCreatorId": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e"
}
```

Also pass referral if present (or ensure it is in Supabase `user_metadata`):

```json
{
  "referralCode": "danedmund"
}
```

Backend reads cookies **or** body; mobile should use body + metadata.

### `complete-onboarding` response

```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "welcomeUsername": "asibe_cheta"
}
```

- `welcomeUsername` is **non-null** when welcome should show now
- If null, no welcome pending (organic signup or already shown)

After success, clear local attribution keys (referral + community entry).

---

## 4. Community welcome screen (mobile UI)

### When to show

After onboarding completes, if **all** are true:

```ts
profile.onboarding_completed === true
&& profile.community_entry_creator_id != null
&& profile.community_entry_shown_at == null
```

### Recommended mobile flow

```ts
async function afterOnboardingComplete() {
  // Option A: use welcomeUsername from complete-onboarding response
  const welcomeUsername = completeOnboardingResponse.welcomeUsername;

  // Option B: poll authoritative API (handles resume / app kill)
  const status = await fetch(`${API_BASE}/api/user/community-welcome-status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(r => r.json());

  if (status.needsWelcome && status.welcomeUsername) {
    navigation.replace('CommunityWelcome', { username: status.welcomeUsername });
    return;
  }

  navigation.replace('MainTabs');
}
```

### Screen copy (match web)

- **Headline:** `Welcome to [Creator Name]'s community.`
- **Body:** `You are now connected with [Creator Name] on SoundBridge. Follow them to get notified about new music, events and everything they create.`
- **Primary CTA:** `Follow [Creator Name]`
- **Secondary link:** `Explore SoundBridge`

Design: full screen, dark brand background, large avatar with gradient ring, creator display name + genre/subtitle.

### Actions — use server API (do not only write locally)

**`POST /api/user/community-entry/complete`**  
Auth: Bearer token (CORS enabled)

**Follow:**

```json
{ "action": "follow", "creatorId": "<community_entry_creator_id uuid>" }
```

**Explore (no follow):**

```json
{ "action": "explore", "creatorId": "<community_entry_creator_id uuid>" }
```

**Success response:**

```json
{
  "success": true,
  "redirectTo": "/creator/asibe_cheta?welcome_follow=1"
}
```

Mobile navigation mapping:

| `action` | Navigate to |
|----------|-------------|
| `follow` | Creator profile screen for that username |
| `explore` | Main feed / discover |

The API atomically:

1. Inserts `follows` row (follow action only; idempotent on duplicate)
2. Sets `community_entry_shown_at = now()`
3. Returns suggested redirect path

Clear local attribution storage after success.

---

## 5. Follow status on creator profile

Use existing follows API with **Bearer auth** (fixed prod 2026-06-07):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/follows?following_id={creatorUuid}` | Check if following → `{ isFollowing: true/false }` |
| `POST` | `/api/follows` body `{ following_id }` | Follow |
| `DELETE` | `/api/follows?following_id={creatorUuid}` or body `{ following_id }` | Unfollow |

**Auth headers:** `Authorization: Bearer {accessToken}` and/or `x-supabase-token: {accessToken}`

After welcome follow, profile should show **Following** (not **+ Follow**). Web uses `?welcome_follow=1` to optimistically set UI before GET completes.

---

## 6. Fan landing CTA (web done — mobile parity)

On fan landing / in-app equivalent, CTA text:

> **Join [Creator Name]'s community on SoundBridge**

Subtext:

> Get notified every time they release new music or announce an event near you.

Deep link should carry `username` (and `creatorId` if available).

---

## 7. APIs reference (all live, CORS `*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/user/complete-onboarding` | POST | Bearer | Finish onboarding; apply referral + community attribution |
| `/api/user/complete-profile` | POST | Bearer | Early attribution during quick setup |
| `/api/user/community-welcome-status` | GET | Bearer | `{ needsWelcome, welcomeUsername }` |
| `/api/user/community-entry/complete` | POST | Bearer | Follow or explore; marks welcome shown |
| `/api/follows` | GET/POST/DELETE | Bearer | Follow state + toggle |

---

## 8. Mobile implementation checklist

### Persistence
- [ ] Fan page / QR deep link stores creator username (+ id) through signup and onboarding
- [ ] Referral code persists through entire onboarding (all role types)
- [ ] Attribution sent in **API body** on `complete-onboarding` (and optionally `complete-profile`)
- [ ] Local storage cleared after onboarding completes

### Welcome screen
- [ ] Shows once when `community_entry_creator_id` set and `community_entry_shown_at` null
- [ ] Creator avatar, name, genre/subtitle load correctly
- [ ] **Follow** calls `community-entry/complete` with `action: "follow"` → creator profile
- [ ] **Explore SoundBridge** calls with `action: "explore"` → main feed (no follow row)
- [ ] Never shows again after either action
- [ ] `GET /api/user/community-welcome-status` handles app resume / killed state

### Follow UI
- [ ] Creator profile uses Bearer auth on `/api/follows`
- [ ] After welcome follow, button shows **Following**

### Exclusions
- [ ] Sound Academy flow unchanged — no welcome screen
- [ ] Creator agreement still **not** in onboarding (see creator role handoff)
- [ ] Normal onboarding role selection unchanged

---

## 9. Prod verification (2026-06-07)

Test flow: fan page → web signup → Music lover onboarding → welcome → Follow

| Check | Result |
|-------|--------|
| `community_entry_creator_id` set | ✅ `bd8a455d-...` (asibe_cheta) |
| `community_entry_shown_at` set after welcome | ✅ timestamp recorded |
| `follows` row created | ✅ follower → creator |
| Creator profile button | ✅ **Following** (after follows API auth fix `b8d14514`) |

```sql
-- Community entry
SELECT u.email, p.community_entry_creator_id, c.username AS entry_creator_username,
       p.community_entry_shown_at, p.onboarding_completed
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.profiles c ON c.id = p.community_entry_creator_id
WHERE u.email = 'asibecheta2@gmail.com';

-- Follow row
SELECT f.* FROM follows f
JOIN auth.users u ON u.id = f.follower_id
WHERE u.email = 'asibecheta2@gmail.com';
```

---

## 10. Commits on web (reference)

| Commit | Change |
|--------|--------|
| `7d4a6d31` | Community entry welcome flow, migration, fan landing attribution |
| `667ae8c5` | Cookie domain, body fallback, welcome redirect after onboarding |
| `171e7f33` | Service-role follow on welcome; Following button on profile |
| `b8d14514` | `/api/follows` Bearer auth fix (profile follow state) |
| `fe5b551f` | Creator role mapping (separate but same onboarding finish API) |

---

## 11. Suggested mobile implementation order

1. **Deep link + storage** — persist creator username/id and referral code from fan page / join links  
2. **Onboarding finish** — pass attribution in `complete-onboarding` body; read `welcomeUsername` from response  
3. **Welcome screen** — UI + `community-entry/complete` API  
4. **Resume gate** — `community-welcome-status` on app open after login  
5. **Follows API** — Bearer auth on profile follow button  

---

## Questions?

- Full product spec: `COMMUNITY_ENTRY_EXPERIENCE.MD`  
- Creator role + upload agreement (separate flows): `MOBILE_TEAM_CREATOR_ROLE_AND_AGREEMENT_RESPONSE.MD`  
- Partner referral + Sound Academy: `PARTNER_REFERRAL_LINK.MD`
