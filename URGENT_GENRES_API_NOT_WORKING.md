# URGENT: Genres API Endpoint Not Working

**Date:** March 9, 2026  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH - Blocking Onboarding Flow**  
**Status:** ✅ **WEB FIX APPLIED** (see "Web team fix" below)

---

## Executive Summary

The `GET /api/genres` endpoint is not working and is returning HTML error pages instead of JSON. This is blocking the onboarding flow where users need to select their preferred genres.

**Impact:**
- 🚨 Onboarding Step 3 shows no genre options to users
- 🚨 Users cannot complete profile setup
- 🚨 Mobile app must rely on fallback hardcoded genres

---

## The Problem

### Error Details

When calling the genres endpoint from the mobile app:

```
GET https://www.soundbridge.live/api/genres?category=music
```

**Expected:** JSON response with genres array
**Actual:** HTML error page (starts with `<` character)

**Error Log:**
```
Error loading genres: SyntaxError: JSON Parse error: Unexpected character: <
```

**Screenshot:**
![Console Error](assets/Screenshot_2026-03-09_at_16.05.15-3b652e17-c8b9-479f-9090-ef296ddc1d21.png)

---

## What We've Verified

### 1. Endpoint Returns HTML Not JSON

The response headers show `content-type: text/html` instead of `application/json`:

```typescript
const contentType = response.headers.get('content-type');
// Returns: 'text/html; charset=utf-8' ❌
// Expected: 'application/json' ✅
```

### 2. Response Status

```
HTTP Status: 200 (OK)
Content-Type: text/html
Body: <html>...</html> (error page)
```

### 3. Other Endpoints Affected

Same issue with username check endpoint:
```
POST /api/onboarding/check-username
Error: SyntaxError: JSON Parse error: Unexpected character: <
```

---

## What We Need

### Immediate Fix Required

Please verify and fix the following endpoints:

1. **GET /api/genres?category=music**
   - Should return: `{ success: true, genres: [...] }`
   - Content-Type: `application/json`

2. **GET /api/genres?category=podcast**
   - Should return: `{ success: true, genres: [...] }`
   - Content-Type: `application/json`

3. **POST /api/onboarding/check-username**
   - Should return: `{ available: true/false }`
   - Content-Type: `application/json`

4. **POST /api/users/{userId}/genres**
   - For saving user genre preferences
   - Content-Type: `application/json`

---

## Database Status Check

### Please Verify These Exist

```sql
-- Check if genres table exists and has data
SELECT category, COUNT(*) as count 
FROM genres 
GROUP BY category;

-- Expected:
-- music    | 35 (or 49 depending on implementation)
-- podcast  | 17 (or 16 depending on implementation)

-- Check if user_genres OR user_preferred_genres table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_genres', 'user_preferred_genres');

-- Check helper functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%preferred_genres%' OR routine_name LIKE '%user_genres%';
```

---

## Implementation History (For Reference)

There appears to have been two separate implementations:

### Web Team Implementation (October 2025)
- Tables: `genres`, `user_genres`, `content_genres`
- 65 total genres (49 music + 16 podcast)
- Endpoints documented in: `MOBILE_TEAM_GENRES_SYSTEM_RESPONSE.md`

### Mobile Team Migration (December 2025)
- Tables: `genres`, `user_preferred_genres`
- 52 total genres (35 music + 17 podcast)
- Helper functions: `get_user_preferred_genres()`, `set_user_preferred_genres()`
- Documented in: `WEB_TEAM_GENRE_SYSTEM_UPDATE.md`

**Note:** There may be table naming conflicts that need resolution.

---

## Mobile App Current Workaround

We've temporarily implemented fallback genres in the mobile app to allow onboarding to continue:

```typescript
const fallbackMusicGenres = [
  { id: 'hip-hop', name: 'Hip-Hop', ... },
  { id: 'rnb', name: 'R&B', ... },
  // ... 25 hardcoded genres
];
```

**This is NOT a permanent solution** - we need the database-driven genres for:
- Consistency across platforms
- Analytics and tracking
- Dynamic genre management
- Future personalization features

---

## Required Response

Please provide:

1. ✅ Confirmation that endpoints are fixed and returning JSON
2. ✅ Updated API documentation if endpoints have changed
3. ✅ Database schema status (which tables exist and their structure)
4. ✅ Timeline for when endpoints will be live

---

## Test Commands

Once fixed, please verify with these curl commands:

```bash
# Test genres endpoint
curl -i "https://www.soundbridge.live/api/genres?category=music"

# Expected:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"success":true,"genres":[...]}

# Test username check
curl -i -X POST "https://www.soundbridge.live/api/onboarding/check-username" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'

# Expected:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"available":true} (or false)
```

---

## Contact

**Mobile Team Lead:** Available for debugging call  
**Slack:** #soundbridge-backend  
**Priority:** Blocking user onboarding - please respond ASAP

---

## Summary

| Issue | Status | Impact |
|-------|--------|--------|
| Genres API returns HTML | 🔴 Not Working | High - Blocks onboarding |
| Username check API returns HTML | 🔴 Not Working | Medium - UX degraded |
| Database tables | ❓ Unknown | Needs verification |
| Mobile fallback | 🟡 Working | Temporary band-aid |

**Next Action Required:** Web team to verify and fix API endpoints

---

## Web team fix (applied)

To prevent API routes from ever returning HTML (and to ensure correct `Content-Type: application/json`), the following was done:

1. **GET /api/genres** (`apps/web/app/api/genres/route.ts`)
   - `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'` so the route is always executed as a dynamic API handler.
   - All responses use explicit `Content-Type: application/json` and a shared `jsonResponse()` helper.
   - Supabase env vars are checked before calling `createClient`; if missing, returns JSON 503 instead of throwing.
   - Every error path returns JSON (no uncaught throws).

2. **POST /api/onboarding/check-username** (`apps/web/app/api/onboarding/check-username/route.ts`)
   - Same `dynamic` and `runtime`; all responses use `Content-Type: application/json`.
   - Body parsing is defensive (`.catch(() => ({}))`) so invalid JSON doesn’t throw uncaught.
   - All error paths return JSON.

3. **GET/POST /api/users/[userId]/genres** (`apps/web/app/api/users/[userId]/genres/route.ts`)
   - Same `dynamic`, `runtime`, and explicit `Content-Type: application/json` for consistency.

If production was still returning HTML for these paths, likely causes were: (a) an uncaught error causing Next.js to render an HTML error page, or (b) the route being statically optimized or not invoked. The changes above ensure the handlers always return JSON. After deploy, mobile can re-test with the curl commands in "Test Commands" above.

---

## Production verification (Web team – March 9, 2026)

**Live test from Web team:**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://www.soundbridge.live/api/genres?category=music"
# Result: 200 application/json
```

**Full response:** `GET https://www.soundbridge.live/api/genres?category=music` returns **200 OK**, **Content-Type: application/json**, and a valid JSON body with `{"success":true,"genres":[...],"count":35,"category":"music",...}` (35 music genres).

So the endpoint **is live and correct** in production. If the mobile app still saw 404 at 16:24, possible causes:

1. **Deploy timing** – Test was before the latest deploy finished. Please **retry now** (no code changes needed).
2. **Exact URL** – Use exactly `https://www.soundbridge.live/api/genres?category=music` (no trailing slash, `www` subdomain).
3. **Caching** – App or device cache serving an old 404. Try: force-close app, clear app cache, or reinstall; or test from a different device/network.
4. **Network / proxy** – Corporate or carrier proxy returning a cached 404. Try Wi‑Fi vs cellular, or another network.

**Action for Mobile:** Call the same URL again from the app (or from a browser/Postman on the same device). If it still returns 404, share the **exact request URL** and **response headers** from the app (e.g. from a network inspector or log), and we can check for redirects or host mismatch.

---

**Prepared by:** Mobile Team  
**Date:** March 9, 2026  
**Urgency:** HIGH - Blocking user onboarding flow
