# External Links Backend Issue Report

**Date:** January 13, 2026
**Reporter:** Mobile Team (Justice Chetachukwu Asibe)
**Priority:** HIGH
**Status:** 🚨 BLOCKING MOBILE FEATURE LAUNCH

---

## 🔴 Issue Summary

The external links feature is **fully implemented on mobile** but returns `401 Unauthorized` when attempting to add links via the POST endpoint. The GET endpoint works correctly, but authenticated POST operations fail.

---

## ✅ What's Working

1. **GET Endpoint (Public Access)** ✅
   - Endpoint: `GET /api/profile/external-links?userId={userId}`
   - Status: **WORKING**
   - Test Result:
     ```bash
     curl "https://www.soundbridge.live/api/profile/external-links?userId=bd8a455d-a54d-45c5-968d-e4cf5e8d928e"
     # Response: {"success":true,"data":{"links":[]}}
     ```

2. **Mobile UI/UX** ✅
   - Clean settings interface with navigation to dedicated screen
   - Platform selection with validation
   - Real-time URL validation
   - All components render correctly

---

## 🚨 What's NOT Working

### POST Endpoint Returns 401 Unauthorized

**Endpoint:** `POST /api/profile/external-links`
**Error:** `401 Unauthorized`
**Impact:** Users cannot add external links

#### Reproduction Steps

1. Navigate to Profile → Settings → External Links
2. Tap "Add External Link"
3. Select a platform (e.g., Instagram)
4. Enter a valid URL (e.g., `https://instagram.com/asibe_cheta`)
5. Tap "Add Link"
6. **ERROR:** Alert shows "Error: Unauthorized"

#### Mobile Error Logs

```javascript
ExternalLinksService.ts:98 🔗 Adding external link: instagram
ExternalLinksService.ts:125 ❌ Error adding external link: Error: Unauthorized
```

#### Request Details

```http
POST /api/profile/external-links HTTP/2
Host: www.soundbridge.live
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs... (valid Supabase access token)

{
  "platform_type": "instagram",
  "url": "https://instagram.com/asibe_cheta",
  "display_order": 1
}
```

**Response:**
```http
HTTP/2 401 Unauthorized
```

---

## 🔍 Root Cause Analysis

Based on the error pattern, the most likely issues are:

### 1. RLS Policy Not Configured ⚠️
The Row Level Security policy may not be allowing authenticated users to INSERT into the `external_links` table.

**Expected RLS Policy:**
```sql
CREATE POLICY "Creators can manage own links"
  ON external_links FOR INSERT
  USING (auth.uid() = creator_id);
```

**Verification Needed:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'external_links';

-- Check existing policies
SELECT * FROM pg_policies
WHERE tablename = 'external_links';
```

### 2. API Route Authentication Middleware Issue ⚠️
The POST endpoint may not be correctly extracting/validating the JWT token from the Authorization header.

**Check:**
- Is the API route using Supabase's `getUser()` to verify the token?
- Is the Bearer token being parsed correctly?
- Are CORS headers allowing Authorization header?

### 3. creator_id Field Mismatch ⚠️
The API might be trying to insert with a different `creator_id` than `auth.uid()`.

**Mobile sends:**
```json
{
  "platform_type": "instagram",
  "url": "https://instagram.com/asibe_cheta",
  "display_order": 1
}
```

**Backend should derive `creator_id` from:**
```javascript
const { data: { user } } = await supabase.auth.getUser(accessToken);
const creator_id = user.id;
```

---

## 📊 Test Results Summary

| Endpoint | Method | Auth Required | Status | Response |
|----------|--------|---------------|--------|----------|
| `/api/profile/external-links?userId=X` | GET | No | ✅ WORKING | `{"success":true,"data":{"links":[]}}` |
| `/api/profile/external-links` | POST | Yes | ❌ FAILS | `401 Unauthorized` |
| `/api/profile/external-links/{id}` | PUT | Yes | ⚠️ UNTESTED | - |
| `/api/profile/external-links/{id}` | DELETE | Yes | ⚠️ UNTESTED | - |
| `/api/analytics/external-link-click` | POST | Optional | ⚠️ UNTESTED | - |

---

## 🧪 Debugging Steps for Backend Team

### Step 1: Verify Database Tables Exist
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('external_links', 'external_link_clicks');
```

### Step 2: Check RLS Policies
```sql
-- View all policies on external_links table
SELECT * FROM pg_policies WHERE tablename = 'external_links';

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'external_links';
```

### Step 3: Test INSERT Manually
```sql
-- Try inserting as the authenticated user
-- This should work if RLS is configured correctly
INSERT INTO external_links (creator_id, platform_type, url, display_order)
VALUES ('bd8a455d-a54d-45c5-968d-e4cf5e8d928e', 'instagram', 'https://instagram.com/test', 1);
```

### Step 4: Check API Route Handler
Verify the POST handler in your Next.js API route:

```javascript
// Expected pattern
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Now insert with user.id as creator_id
  const body = await request.json();

  const { data, error } = await supabase
    .from('external_links')
    .insert({
      creator_id: user.id,  // ← Must match auth.uid()
      platform_type: body.platform_type,
      url: body.url,
      display_order: body.display_order
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true, data: { link: data } });
}
```

### Step 5: Check CORS Configuration
Ensure the API route allows the Authorization header:

```javascript
// In API route or middleware
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

---

## 🎯 Expected Behavior (Per Specification)

### POST /api/profile/external-links

**Request:**
```http
POST /api/profile/external-links
Authorization: Bearer <valid_token>
Content-Type: application/json

{
  "platform_type": "instagram",
  "url": "https://instagram.com/username",
  "display_order": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": "uuid-here",
      "creator_id": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
      "platform_type": "instagram",
      "url": "https://instagram.com/username",
      "display_order": 1,
      "click_count": 0,
      "created_at": "2026-01-13T20:00:00Z",
      "updated_at": "2026-01-13T20:00:00Z"
    }
  }
}
```

**Validations Required:**
- ✅ Maximum 2 links per creator
- ✅ Valid platform_type (instagram, youtube, spotify, apple_music, soundcloud, website)
- ✅ Valid URL format
- ✅ No duplicate platforms per creator
- ✅ User must be authenticated
- ✅ User must own the profile being modified

---

## 📱 Mobile Implementation Status

The mobile implementation is **100% complete** and ready to go once backend authentication is fixed:

### ✅ Completed Features

1. **Navigation & UI**
   - Clean settings button: Profile → External Links
   - Dedicated ExternalLinksScreen with proper navigation
   - Matches app design language

2. **Components**
   - ✅ ExternalLinksScreen.tsx - Main management screen
   - ✅ AddExternalLinkModal.tsx - Add/edit modal with validation
   - ✅ ExternalLinksDisplay.tsx - Public profile display component
   - ✅ ExternalLinksManager.tsx - Settings management component

3. **Service Layer**
   - ✅ ExternalLinksService.ts - Complete API integration
   - ✅ Proper authentication headers
   - ✅ Error handling
   - ✅ Click tracking

4. **Type Safety**
   - ✅ Complete TypeScript types
   - ✅ Platform metadata configuration
   - ✅ URL validation utilities

5. **User Experience**
   - ✅ Real-time URL validation
   - ✅ Platform auto-detection
   - ✅ Maximum 2 links enforcement
   - ✅ Duplicate prevention
   - ✅ Click count display
   - ✅ Loading states
   - ✅ Error messages

---

## 🚀 Action Items for Web Team

### Priority 1: Fix Authentication (URGENT)

- [ ] **Verify RLS policies exist and are correct**
  - Check: `SELECT * FROM pg_policies WHERE tablename = 'external_links'`
  - Expected: Policies allowing `auth.uid()` to INSERT/UPDATE/DELETE their own links

- [ ] **Check API route authentication middleware**
  - Verify token extraction from Authorization header
  - Verify `getUser()` call is working
  - Ensure `creator_id` is set to authenticated user's ID

- [ ] **Test POST endpoint manually**
  - Use Postman/Insomnia with a valid Bearer token
  - Verify it returns success, not 401

### Priority 2: Test All Endpoints

- [ ] POST /api/profile/external-links
- [ ] PUT /api/profile/external-links/{id}
- [ ] DELETE /api/profile/external-links/{id}
- [ ] POST /api/analytics/external-link-click

### Priority 3: Document & Notify

- [ ] Update backend status document once fixed
- [ ] Provide test credentials for mobile team verification
- [ ] Confirm deployment to production

---

## 📞 Contact & Testing

**Mobile Team:**
- Developer: Justice Chetachukwu Asibe
- Test User ID: `bd8a455d-a54d-45c5-968d-e4cf5e8d928e`

**Ready to Test:**
Mobile app is ready to test immediately once the 401 error is resolved. All error handling and UI flows are complete.

---

## 🔗 Reference Documents

- Backend Requirements: `BACKEND_API_REQUIREMENTS_EXTERNAL_LINKS.md`
- Mobile Implementation: `EXTERNAL_LINKS_MOBILE_IMPLEMENTATION_COMPLETE.md`
- Reconciliation Doc: `MOBILE_TEAM+EXTERNAL_LINKS_RECONCILATION.md`

---

**Status:** ⏳ Awaiting backend authentication fix
**Last Updated:** January 13, 2026
**Next Step:** Web team to investigate and fix POST endpoint authentication
