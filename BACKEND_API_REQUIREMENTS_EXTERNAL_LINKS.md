# Backend API Requirements for External Portfolio Links

**Status:** ⏳ Waiting for Backend Implementation
**Priority:** High
**Mobile Implementation:** ✅ Complete (Temporarily Disabled)

---

## 🚨 Current Issue

The mobile app is crashing when loading the ProfileScreen because the external links API endpoints don't exist yet on the backend. We've temporarily disabled the feature until the backend is ready.

**Error Location:** ProfileScreen attempting to call `externalLinksService.getExternalLinks()`

---

## 📋 Required Backend Implementation

The web team's reconciliation document (`MOBILE_TEAM_EXTERNAL_LINKS_RECONCILATION.md`) specifies these API endpoints. We need ALL of these implemented on the backend at `https://www.soundbridge.live/api/`:

### 1. GET `/profile/external-links`
**Purpose:** Fetch external links for any creator (public access)

**Query Parameters:**
- `userId` (required): Creator's user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "id": "uuid",
        "creator_id": "uuid",
        "platform_type": "instagram",
        "url": "https://instagram.com/username",
        "display_order": 1,
        "click_count": 42,
        "created_at": "2026-01-13T10:00:00Z",
        "updated_at": "2026-01-13T10:00:00Z"
      }
    ]
  }
}
```

**Authentication:** NOT required (public data)

---

### 2. POST `/profile/external-links`
**Purpose:** Add new external link (authenticated creators only)

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "platform_type": "instagram",
  "url": "https://instagram.com/username",
  "display_order": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "link": { /* ExternalLink object */ }
  }
}
```

**Validation Required:**
- Maximum 2 links per creator
- Valid platform_type (instagram, youtube, spotify, apple_music, soundcloud, website)
- Valid URL format for platform
- No duplicate platform per creator
- User must be authenticated
- User must own the profile being modified

**Error Responses:**
- 401: Not authenticated
- 400: Validation failed / Maximum links reached
- 403: Cannot modify another user's profile

---

### 3. PUT `/profile/external-links/{linkId}`
**Purpose:** Update existing link

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "url": "https://instagram.com/newusername",
  "display_order": 2
}
```

**Note:** Cannot change `platform_type` - must delete and recreate

**Response:**
```json
{
  "success": true,
  "data": {
    "link": { /* Updated ExternalLink object */ }
  }
}
```

---

### 4. DELETE `/profile/external-links/{linkId}`
**Purpose:** Remove link

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Link deleted successfully"
  }
}
```

---

### 5. POST `/analytics/external-link-click`
**Purpose:** Track link clicks (fire and forget, non-blocking)

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <access_token>` (optional - works for anonymous users)

**Request Body:**
```json
{
  "linkId": "uuid",
  "sessionId": "mobile-1234567890-abc123",
  "deviceType": "mobile",
  "platform": "ios"
}
```

**Response:**
```json
{
  "success": true
}
```

**Important:** This should be FAST and non-blocking. Mobile will call it without awaiting response.

---

## 🗄️ Database Schema Required

According to the web team's document, these tables must exist:

### Table: `external_links`
```sql
CREATE TABLE external_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_type VARCHAR(50) NOT NULL CHECK (platform_type IN (
    'instagram', 'youtube', 'spotify', 'apple_music', 'soundcloud', 'website'
  )),
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_url_format CHECK (url ~* '^https?://'),
  CONSTRAINT unique_platform_per_creator UNIQUE (creator_id, platform_type)
);
```

### Table: `external_link_clicks`
```sql
CREATE TABLE external_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_link_id UUID NOT NULL REFERENCES external_links(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type VARCHAR(50),       -- 'mobile' | 'desktop' | 'tablet'
  platform VARCHAR(50),           -- 'ios' | 'android' | 'web'
  referrer_url TEXT,
  session_id UUID
);
```

### RPC Function: `track_external_link_click`
```sql
CREATE OR REPLACE FUNCTION track_external_link_click(
  p_link_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_platform VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert click record
  INSERT INTO external_link_clicks (
    external_link_id,
    creator_id,
    listener_id,
    device_type,
    platform,
    session_id
  )
  SELECT
    p_link_id,
    creator_id,
    p_user_id,
    p_device_type,
    p_platform,
    p_session_id
  FROM external_links
  WHERE id = p_link_id;

  -- Increment click count atomically
  UPDATE external_links
  SET click_count = click_count + 1
  WHERE id = p_link_id;

  RETURN TRUE;
END;
$$;
```

---

## 🔒 Row Level Security (RLS) Policies

### external_links Table

1. **Public Read Access:**
```sql
CREATE POLICY "Public can view creator external links"
  ON external_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = external_links.creator_id
      AND profiles.role = 'creator'
    )
  );
```

2. **Creator Management:**
```sql
CREATE POLICY "Creators can manage own links"
  ON external_links FOR ALL
  USING (auth.uid() = creator_id);
```

### external_link_clicks Table

1. **Anyone Can Track:**
```sql
CREATE POLICY "Anyone can record clicks"
  ON external_link_clicks FOR INSERT
  WITH CHECK (true);
```

2. **View Own Data:**
```sql
CREATE POLICY "Users view own clicks"
  ON external_link_clicks FOR SELECT
  USING (
    listener_id = auth.uid()
    OR creator_id = auth.uid()
  );
```

---

## 🧪 Testing Endpoints

Once implemented, please test with these scenarios:

### 1. Fetch Links (Public)
```bash
curl https://www.soundbridge.live/api/profile/external-links?userId=<user_id>
```
**Expected:** Returns empty array if no links, or array of links

### 2. Add Link (Authenticated)
```bash
curl -X POST https://www.soundbridge.live/api/profile/external-links \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_type": "instagram",
    "url": "https://instagram.com/soundbridge",
    "display_order": 1
  }'
```
**Expected:** Returns created link with ID

### 3. Add Duplicate Platform (Should Fail)
```bash
curl -X POST https://www.soundbridge.live/api/profile/external-links \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_type": "instagram",
    "url": "https://instagram.com/another",
    "display_order": 2
  }'
```
**Expected:** 400 error - "You already have an Instagram link"

### 4. Add 3rd Link (Should Fail)
After adding 2 links:
```bash
curl -X POST https://www.soundbridge.live/api/profile/external-links \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_type": "youtube",
    "url": "https://youtube.com/@soundbridge",
    "display_order": 3
  }'
```
**Expected:** 400 error - "Maximum of 2 external links allowed"

### 5. Track Click (Anonymous)
```bash
curl -X POST https://www.soundbridge.live/api/analytics/external-link-click \
  -H "Content-Type: application/json" \
  -d '{
    "linkId": "<link_id>",
    "sessionId": "mobile-test-123",
    "deviceType": "mobile",
    "platform": "ios"
  }'
```
**Expected:** Success response, click_count increments

---

## ✅ Verification Checklist

Before notifying mobile team that backend is ready:

- [ ] All 5 API endpoints implemented
- [ ] Database tables created with constraints
- [ ] RLS policies applied
- [ ] RPC function created and tested
- [ ] Maximum 2 links per creator enforced
- [ ] Duplicate platform detection working
- [ ] Click tracking increments atomically
- [ ] Public read access works without auth
- [ ] Authenticated operations require valid token
- [ ] User can only modify their own links
- [ ] URL validation implemented
- [ ] Error responses match specifications
- [ ] Tested with Postman/curl
- [ ] Deployed to production API (`https://www.soundbridge.live/api/`)

---

## 📱 Mobile Team Action Items

**When backend is ready:**

1. Uncomment external links loading in ProfileScreen.tsx:
   - Line 151: `// loadExternalLinks();`
   - Line 612: `// loadExternalLinks();`

2. Uncomment Portfolio section in settings:
   - Lines 1511-1516 in ProfileScreen.tsx

3. Test the feature end-to-end:
   - View public profile with links
   - Add link via settings
   - Edit link URL
   - Delete link
   - Verify click tracking
   - Test maximum 2 links enforcement

---

## 🤝 Contact

**Mobile Team:** Justice Chetachukwu Asibe
**Web/Backend Team:** See web team documentation

**Reference Documents:**
- Web implementation: See web team's codebase
- Reconciliation doc: `MOBILE_TEAM_EXTERNAL_LINKS_RECONCILATION.md`
- Mobile implementation: `EXTERNAL_LINKS_MOBILE_IMPLEMENTATION_COMPLETE.md`

---

**Status:** ⏳ Awaiting backend implementation
**Last Updated:** January 13, 2026
