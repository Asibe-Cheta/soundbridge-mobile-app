# URGENT: Genres API Still Returning 404

**Date:** March 9, 2026  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** 🔴 **HIGH - Still Blocking Onboarding**  
**Status:** 🚨 **NOT FIXED - 404 Error**

---

## Problem Still Occurring

The fix has **NOT** been deployed or is not working. The API endpoints are still returning **404 Not Found** with HTML content.

### Error Log (Fresh Test - March 9, 2026 16:24)

```
User selected type: music_creator
OnboardingScreen.tsx:461 🎵 Loading genres for onboarding...
OnboardingScreen.tsx:467 ❌ Genres API returned non-JSON or error: 404 text/html; charset=utf-8
```

**Screenshot:**
![Error Toast](assets/Screenshot_2026-03-09_at_16.24.43-fb93413e-9c9e-4f1e-94bd-98f40add39b8.png)

---

## What We're Seeing

### Request
```
GET https://www.soundbridge.live/api/genres?category=music
```

### Response
```
HTTP Status: 404 Not Found
Content-Type: text/html; charset=utf-8
Body: <html>...</html> (404 error page)
```

---

## Possible Causes

1. **Deploy not yet complete** - Changes may be in staging but not production
2. **Route not registered** - Next.js app router not picking up the route
3. **URL mismatch** - Mobile is calling wrong endpoint path
4. **Build cache** - Vercel/Next.js serving old build
5. **Infra/routing issue** - Reverse proxy or CDN returning 404 before hitting Next.js

---

## Immediate Action Required

### 1. Verify Deploy Status

Please confirm:
- [ ] Changes are deployed to **production** (not just staging)
- [ ] Build completed successfully on Vercel
- [ ] No build errors in the API route files

### 2. Test the Endpoint Directly

Run this command and share the **full** output:

```bash
curl -i "https://www.soundbridge.live/api/genres?category=music" 2>&1
```

**Expected:**
```
HTTP/1.1 200 OK
Content-Type: application/json
{"success":true,"genres":[...]}
```

**Currently Getting:**
```
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
<html>404 Not Found</html>
```

### 3. Check Vercel Build Logs

Look for errors in:
- `apps/web/app/api/genres/route.ts`
- `apps/web/app/api/onboarding/check-username/route.ts`

### 4. Verify File Paths

Mobile is calling:
- `GET /api/genres?category=music`
- `POST /api/onboarding/check-username`

Please confirm these exact paths exist in your Next.js app structure.

---

## Quick Diagnosis Questions

Please answer these:

1. **Is the deploy live?** What commit SHA is in production?
2. **Can you curl the endpoint successfully from your terminal?**
3. **Are there any Vercel build warnings or errors?**
4. **Is the file at `apps/web/app/api/genres/route.ts`?**
5. **Are you using Next.js App Router or Pages Router?**

---

## Mobile App Status

- KeyboardAvoidingView fix: ✅ Working
- Genre selection UI: ✅ Ready
- API integration: 🚨 **Blocked by 404**

Users still cannot see genres during onboarding.

---

## Contact

**Mobile Team:** Standing by for debugging call  
**Slack:** #soundbridge-backend  
**Time Sensitive:** Users cannot complete onboarding

---

**Previous Issue:** URGENT_GENRES_API_NOT_WORKING.md  
**Status Update:** Web team "fix" applied but NOT working in production  
**Next Action:** Web team to verify deploy and test endpoint
