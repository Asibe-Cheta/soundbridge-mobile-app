# Mobile Team — Creator Role, Agreement Gate & Legal Flows (Web / Backend Complete)

**Date:** 2026-06-07  
**Status:** ✅ Live on Sound Bridge production  
**Supabase project:** `aunxdbqukbxyyiusaeqi` (Sound Bridge — **not** GlobalReady Mobile)  
**Related:** `PLATFORM_LEGAL_PROTECTION_AND_TERMS.MD`, `MOBILE_TEAM_ONBOARDING_ENDPOINTS_RESPONSE.md`

---

## Summary for mobile

Three separate legal/role concerns — **do not merge them in the app UI:**

| Flow | When | Storage | Mobile action |
|------|------|---------|---------------|
| **Creator role** | User picks Music Creator / Podcaster / etc. in onboarding | `profiles.role` + `profiles.onboarding_user_type` | Ensure role is `creator` after onboarding (see below) |
| **Creator Agreement** (5 checkboxes) | **First upload** (or first monetisation action) — **NOT** during signup onboarding | `profiles.creator_agreement_*` | Gate upload screen; show agreement UI; call become-creator API |
| **Event disclaimer** (1 checkbox) | Each time user publishes an event | `events.creator_event_disclaimer_*` | Show on event publish only |

**Product rule:** Signup onboarding must stay **friction-free**. Do **not** show the 5-checkbox Creator Agreement during onboarding. Web removed it from Quick Setup for this reason.

---

## 1. Creator role bug (fixed on backend — verify mobile)

### Problem we found in prod

Users selected **Music Creator** in mobile onboarding, but `profiles.role` stayed **`listener`**. Creator counts in admin/analytics did not grow. Root cause: mobile calls `onboarding-progress` + `complete-onboarding` but those endpoints **did not map** `onboarding_user_type` → `role`.

### Backend fix (live — commits `fe5b551f`)

| Endpoint | Now does |
|----------|----------|
| `POST /api/user/onboarding-progress` | When `userType` / `onboarding_user_type` is sent, sets `profiles.role` via mapping |
| `POST /api/user/complete-onboarding` | On finish, syncs `profiles.role` from existing `onboarding_user_type` |
| `POST /api/user/complete-profile` | Uses same mapping (web Quick Setup) |

### Role mapping (canonical)

```ts
const CREATOR_TYPES = [
  'music_creator',
  'podcast_creator',
  'industry_professional',
  'event_organiser',
] as const;

function roleFromOnboardingUserType(type: string | null | undefined): 'creator' | 'listener' {
  if (!type || type === 'music_lover') return 'listener';
  if (CREATOR_TYPES.includes(type as typeof CREATOR_TYPES[number])) return 'creator';
  return 'listener';
}
```

| `onboarding_user_type` | `profiles.role` |
|------------------------|-----------------|
| `music_creator` | `creator` |
| `podcast_creator` | `creator` |
| `industry_professional` | `creator` |
| `event_organiser` | `creator` |
| `music_lover` | `listener` |

### Prod backfill (already run)

~975 users were `listener` with a creator `onboarding_user_type`. Ops ran `scripts/backfill-creator-role-from-onboarding-type.sql`. **New signups** are fixed by the API; no mobile schema change required.

### Mobile checklist

- [ ] After onboarding as Music Creator, confirm `profiles.role === 'creator'` (not only `onboarding_user_type`).
- [ ] Prefer reading **`role`** for upload/monetisation gates, not `onboarding_user_type` alone.
- [ ] Optional: still call `POST /api/user/complete-profile` after Quick Setup with username, genres, etc. (documented in onboarding handoff). Not required for role fix if you use `onboarding-progress` + `complete-onboarding`.

---

## 2. Creator Agreement gate (5 checkboxes — mobile must implement)

### When to show

Before the user can **upload audio** (or equivalent first-create action), check:

```ts
profile.role === 'creator' && profile.creator_agreement_accepted === true
```

If false → show Creator Agreement screen (all **5** boxes must be ticked individually — no single “accept all”).

**Do not** show this during signup onboarding.

### New API — use this before opening upload

**`GET /api/user/creator-upload-access`**  
Auth: Bearer token or cookie (same as other `/api/user/*` routes)

**Response (can upload):**
```json
{
  "success": true,
  "canUpload": true,
  "needsBecomeCreator": false,
  "role": "creator",
  "creator_agreement_accepted": true,
  "reason": null
}
```

**Response (agreement required):**
```json
{
  "success": true,
  "canUpload": false,
  "needsBecomeCreator": true,
  "role": "creator",
  "creator_agreement_accepted": false,
  "reason": "agreement_required"
}
```

**Response (not a creator yet):**
```json
{
  "success": true,
  "canUpload": false,
  "needsBecomeCreator": true,
  "role": "listener",
  "creator_agreement_accepted": false,
  "reason": "not_creator"
}
```

**Mobile flow:**

```ts
async function openUploadFlow() {
  const res = await fetch(`${API_BASE}/api/user/creator-upload-access`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();

  if (data.canUpload) {
    navigation.navigate('Upload');
    return;
  }
  navigation.navigate('CreatorAgreement'); // 5-checkbox screen
}
```

**Do not** rely on a direct Supabase client read of `creator_agreement_accepted` for gating — web had silent failures; server API is authoritative.

### Accept agreement — existing API

**`POST /api/user/become-creator`**

```json
{
  "creator_agreement_accepted": true,
  "creator_agreement_version": "v1.0"
}
```

- If user is already `role: creator`, this **only** stores agreement fields (no role change).
- If user is `listener`, this upgrades to `creator` **and** stores agreement.
- All 5 checkboxes must be confirmed in UI before POST.

**DB fields set:**

| Column | Example |
|--------|---------|
| `creator_agreement_accepted` | `true` |
| `creator_agreement_accepted_at` | ISO timestamp |
| `creator_agreement_version` | `v1.0` |

### Checkbox copy (match web — `apps/web/src/constants/creatorAgreement.ts`)

1. **content_rights** — Own/have rights to uploaded content; wrongful upload → removal/termination  
2. **platform_marketplace** — SoundBridge is a platform/marketplace; no endorsement/liability for your content, services, or events  
3. **event_responsibility** — Events are your sole responsibility (organisation, safety, delivery)  
4. **independent_contractor** — Marketplace services are you as independent contractor, not SoundBridge employee/agent  
5. **terms_privacy** — Agree to Terms of Service, Privacy Policy, Creator Rights Agreement (link out)

Button label on web: **"I Agree — Start Creating"**

### Web parity (verified prod 2026-06-07)

- `/upload` → loader → redirect to Creator Agreement if `creator_agreement_accepted === false`
- After accept → `/upload` works
- Test account `asibecheta2@gmail.com` confirmed: `creator_agreement_accepted: true` after flow

---

## 3. Event disclaimer (separate — already on web)

When publishing an event, show **one** checkbox (not the 5-box creator agreement):

> By publishing this event you confirm you are solely responsible for its organisation, safety and delivery. SoundBridge promotes events on your behalf but bears no liability for any aspect of the event itself.

Stored per event: `creator_event_disclaimer_accepted`, `creator_event_disclaimer_accepted_at`.

Mobile event create/publish must send acceptance to the events API (same as web `/api/events`).

---

## 4. Service provider disclaimer

First service listing creation shows marketplace disclaimer (web: SP dashboard + become-service-provider). Mobile should gate similarly when implementing service listings — separate from creator agreement.

---

## 5. Database columns (migration already applied prod)

```sql
-- profiles (creator agreement — once per user)
creator_agreement_accepted boolean NOT NULL DEFAULT false
creator_agreement_accepted_at timestamptz
creator_agreement_version text

-- events (per event)
creator_event_disclaimer_accepted boolean NOT NULL DEFAULT false
creator_event_disclaimer_accepted_at timestamptz
```

---

## 6. Quick verification SQL

```sql
SELECT
  u.email,
  p.role,
  p.onboarding_user_type,
  p.creator_agreement_accepted,
  p.creator_agreement_accepted_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'your-test@email.com';
```

Expected after Music Creator onboarding + agreement flow:

- `role = 'creator'`
- `onboarding_user_type = 'music_creator'`
- `creator_agreement_accepted = true` (only after agreement screen)

---

## 7. Commits on web (reference)

| Commit | Change |
|--------|--------|
| `4b58dce5` | Legal protection: terms, migration, event disclaimer, become-creator page |
| `fe5b551f` | Role mapping in onboarding APIs; remove agreement from web onboarding |
| `db8545bf` | `GET /api/user/creator-upload-access`; reliable upload gate |

---

## Questions / mobile implementation order

1. Add **`GET /api/user/creator-upload-access`** check before Upload tab/screen  
2. Build **Creator Agreement** screen (5 checkboxes + `POST /api/user/become-creator`)  
3. Confirm **`role`** after onboarding (not just `onboarding_user_type`)  
4. Keep **event disclaimer** on publish only  

---

**Next (web already shipped):** Community entry / fan landing welcome flow — see `COMMUNITY_ENTRY_EXPERIENCE.MD`. Web handoff for mobile fan page flow can follow once creator/agreement parity is confirmed.


UPDATED VERSION(WEB TEAM DO NOT KNOW WHAT IS IMPLEMENTED ON YOUR END):
# Mobile Team — Creator Role, Agreement Gate & Legal Flows (Web / Backend Complete)

**Date:** 2026-06-07  
**Status:** ✅ Live on Sound Bridge production  
**Supabase project:** `aunxdbqukbxyyiusaeqi` (Sound Bridge — **not** GlobalReady Mobile)  
**Related:** `PLATFORM_LEGAL_PROTECTION_AND_TERMS.MD`, `MOBILE_TEAM_ONBOARDING_ENDPOINTS_RESPONSE.md`

---

## Summary for mobile

Three separate legal/role concerns — **do not merge them in the app UI:**

| Flow | When | Storage | Mobile action |
|------|------|---------|---------------|
| **Creator role** | User picks Music Creator / Podcaster / etc. in onboarding | `profiles.role` + `profiles.onboarding_user_type` | Ensure role is `creator` after onboarding (see below) |
| **Creator Agreement** (5 checkboxes) | **First upload** (or first monetisation action) — **NOT** during signup onboarding | `profiles.creator_agreement_*` | Gate upload screen; show agreement UI; call become-creator API |
| **Event disclaimer** (1 checkbox) | Each time user publishes an event | `events.creator_event_disclaimer_*` | Show on event publish only |

**Product rule:** Signup onboarding must stay **friction-free**. Do **not** show the 5-checkbox Creator Agreement during onboarding. Web removed it from Quick Setup for this reason.

---

## 1. Creator role bug (fixed on backend — verify mobile)

### Problem we found in prod

Users selected **Music Creator** in mobile onboarding, but `profiles.role` stayed **`listener`**. Creator counts in admin/analytics did not grow. Root cause: mobile calls `onboarding-progress` + `complete-onboarding` but those endpoints **did not map** `onboarding_user_type` → `role`.

### Backend fix (live — commits `fe5b551f`)

| Endpoint | Now does |
|----------|----------|
| `POST /api/user/onboarding-progress` | When `userType` / `onboarding_user_type` is sent, sets `profiles.role` via mapping |
| `POST /api/user/complete-onboarding` | On finish, syncs `profiles.role` from existing `onboarding_user_type` |
| `POST /api/user/complete-profile` | Uses same mapping (web Quick Setup) |

### Role mapping (canonical)

```ts
const CREATOR_TYPES = [
  'music_creator',
  'podcast_creator',
  'industry_professional',
  'event_organiser',
] as const;

function roleFromOnboardingUserType(type: string | null | undefined): 'creator' | 'listener' {
  if (!type || type === 'music_lover') return 'listener';
  if (CREATOR_TYPES.includes(type as typeof CREATOR_TYPES[number])) return 'creator';
  return 'listener';
}
```

| `onboarding_user_type` | `profiles.role` |
|------------------------|-----------------|
| `music_creator` | `creator` |
| `podcast_creator` | `creator` |
| `industry_professional` | `creator` |
| `event_organiser` | `creator` |
| `music_lover` | `listener` |

### Prod backfill (already run)

~975 users were `listener` with a creator `onboarding_user_type`. Ops ran `scripts/backfill-creator-role-from-onboarding-type.sql`. **New signups** are fixed by the API; no mobile schema change required.

### Mobile checklist

- [ ] After onboarding as Music Creator, confirm `profiles.role === 'creator'` (not only `onboarding_user_type`).
- [ ] Prefer reading **`role`** for upload/monetisation gates, not `onboarding_user_type` alone.
- [ ] Optional: still call `POST /api/user/complete-profile` after Quick Setup with username, genres, etc. (documented in onboarding handoff). Not required for role fix if you use `onboarding-progress` + `complete-onboarding`.

---

## 2. Creator Agreement gate (5 checkboxes — mobile must implement)

### When to show

Before the user can **upload audio** (or equivalent first-create action), check:

```ts
profile.role === 'creator' && profile.creator_agreement_accepted === true
```

If false → show Creator Agreement screen (all **5** boxes must be ticked individually — no single “accept all”).

**Do not** show this during signup onboarding.

### New API — use this before opening upload

**`GET /api/user/creator-upload-access`**  
Auth: Bearer token or cookie (same as other `/api/user/*` routes)

**Response (can upload):**
```json
{
  "success": true,
  "canUpload": true,
  "needsBecomeCreator": false,
  "role": "creator",
  "creator_agreement_accepted": true,
  "reason": null
}
```

**Response (agreement required):**
```json
{
  "success": true,
  "canUpload": false,
  "needsBecomeCreator": true,
  "role": "creator",
  "creator_agreement_accepted": false,
  "reason": "agreement_required"
}
```

**Response (not a creator yet):**
```json
{
  "success": true,
  "canUpload": false,
  "needsBecomeCreator": true,
  "role": "listener",
  "creator_agreement_accepted": false,
  "reason": "not_creator"
}
```

**Mobile flow:**

```ts
async function openUploadFlow() {
  const res = await fetch(`${API_BASE}/api/user/creator-upload-access`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();

  if (data.canUpload) {
    navigation.navigate('Upload');
    return;
  }
  navigation.navigate('CreatorAgreement'); // 5-checkbox screen
}
```

**Do not** rely on a direct Supabase client read of `creator_agreement_accepted` for gating — web had silent failures; server API is authoritative.

### Accept agreement — existing API

**`POST /api/user/become-creator`**

```json
{
  "creator_agreement_accepted": true,
  "creator_agreement_version": "v1.0"
}
```

- If user is already `role: creator`, this **only** stores agreement fields (no role change).
- If user is `listener`, this upgrades to `creator` **and** stores agreement.
- All 5 checkboxes must be confirmed in UI before POST.

**DB fields set:**

| Column | Example |
|--------|---------|
| `creator_agreement_accepted` | `true` |
| `creator_agreement_accepted_at` | ISO timestamp |
| `creator_agreement_version` | `v1.0` |

### Checkbox copy (match web — `apps/web/src/constants/creatorAgreement.ts`)

1. **content_rights** — Own/have rights to uploaded content; wrongful upload → removal/termination  
2. **platform_marketplace** — SoundBridge is a platform/marketplace; no endorsement/liability for your content, services, or events  
3. **event_responsibility** — Events are your sole responsibility (organisation, safety, delivery)  
4. **independent_contractor** — Marketplace services are you as independent contractor, not SoundBridge employee/agent  
5. **terms_privacy** — Agree to Terms of Service, Privacy Policy, Creator Rights Agreement (link out)

Button label on web: **"I Agree — Start Creating"**

### Web parity (verified prod 2026-06-07)

- `/upload` → loader → redirect to Creator Agreement if `creator_agreement_accepted === false`
- After accept → `/upload` works
- Test account `asibecheta2@gmail.com` confirmed: `creator_agreement_accepted: true` after flow

---

## 3. Event disclaimer (separate — already on web)

When publishing an event, show **one** checkbox (not the 5-box creator agreement):

> By publishing this event you confirm you are solely responsible for its organisation, safety and delivery. SoundBridge promotes events on your behalf but bears no liability for any aspect of the event itself.

Stored per event: `creator_event_disclaimer_accepted`, `creator_event_disclaimer_accepted_at`.

Mobile event create/publish must send acceptance to the events API (same as web `/api/events`).

---

## 4. Service provider disclaimer

First service listing creation shows marketplace disclaimer (web: SP dashboard + become-service-provider). Mobile should gate similarly when implementing service listings — separate from creator agreement.

---

## 5. Database columns (migration already applied prod)

```sql
-- profiles (creator agreement — once per user)
creator_agreement_accepted boolean NOT NULL DEFAULT false
creator_agreement_accepted_at timestamptz
creator_agreement_version text

-- events (per event)
creator_event_disclaimer_accepted boolean NOT NULL DEFAULT false
creator_event_disclaimer_accepted_at timestamptz
```

---

## 6. Quick verification SQL

```sql
SELECT
  u.email,
  p.role,
  p.onboarding_user_type,
  p.creator_agreement_accepted,
  p.creator_agreement_accepted_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'your-test@email.com';
```

Expected after Music Creator onboarding + agreement flow:

- `role = 'creator'`
- `onboarding_user_type = 'music_creator'`
- `creator_agreement_accepted = true` (only after agreement screen)

---

## 7. Commits on web (reference)

| Commit | Change |
|--------|--------|
| `4b58dce5` | Legal protection: terms, migration, event disclaimer, become-creator page |
| `fe5b551f` | Role mapping in onboarding APIs; remove agreement from web onboarding |
| `db8545bf` | `GET /api/user/creator-upload-access`; reliable upload gate |

---

## Questions / mobile implementation order

1. Add **`GET /api/user/creator-upload-access`** check before Upload tab/screen  
2. Build **Creator Agreement** screen (5 checkboxes + `POST /api/user/become-creator`)  
3. Confirm **`role`** after onboarding (not just `onboarding_user_type`)  
4. Keep **event disclaimer** on publish only  

---

**Related (also shipped on web):** Community entry / fan landing welcome flow — see `MOBILE_TEAM_COMMUNITY_ENTRY_RESPONSE.MD`.
