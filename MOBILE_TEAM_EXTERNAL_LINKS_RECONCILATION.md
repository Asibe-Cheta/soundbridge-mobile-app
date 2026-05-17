# External Portfolio Links - Web Implementation Reconciliation Document
## For Mobile Team Integration

**Date:** January 13, 2026
**Web Implementation Status:** ✅ Complete
**Purpose:** Enable mobile team to reconcile their implementation with web for consistency

---

## 🎯 Feature Overview

The External Portfolio Links feature allows creators to add up to **2 external platform links** to their profiles. These links are displayed on both personal and public creator profiles with comprehensive analytics tracking.

### Supported Platforms
1. Instagram
2. YouTube
3. Spotify
4. Apple Music
5. SoundCloud
6. Personal Website (HTTPS only)

### Blocked Platforms (Competitors)
- TikTok
- Patreon
- OnlyFans
- Twitch
- Ko-fi
- Buy Me a Coffee
- GoFundMe
- Kickstarter

---

## 📊 Database Schema

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

**Key Constraints:**
- Maximum 1 link per platform per creator
- Maximum 2 total links per creator (enforced in API)
- URL must be HTTP/HTTPS
- Websites must use HTTPS only

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

**Mobile Implementation Notes:**
- Set `platform` to `'ios'` or `'android'`
- Set `device_type` to `'mobile'` or `'tablet'`
- Anonymous tracking is supported (`listener_id` can be NULL)
- Use device-generated UUID for `session_id`

### RPC Function: `track_external_link_click`

```sql
CREATE OR REPLACE FUNCTION track_external_link_click(
  p_link_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_platform VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN;
```

**Usage:** Call this function atomically to track clicks and increment counter.

---

## 🔒 Row Level Security (RLS) Policies

### external_links Table

1. **Public Read Access:**
   ```sql
   -- Anyone can view external links for public creators
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
   -- Creators can manage their own links
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

## 🎨 Platform Metadata (Must Match Exactly!)

**Critical:** Mobile and web must use identical colors, icons, and validation patterns for consistency.

### Platform Configuration

```typescript
export const PLATFORM_METADATA = {
  instagram: {
    name: 'Instagram',
    icon: 'instagram',  // Mobile: Use Instagram icon from your icon library
    pattern: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+$/i,
    example: 'https://instagram.com/username',
    color: '#E4405F'    // EXACT hex color - use this!
  },
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    pattern: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
    example: 'https://youtube.com/@username or https://youtu.be/videoId',
    color: '#FF0000'
  },
  spotify: {
    name: 'Spotify',
    icon: 'music',
    pattern: /^https?:\/\/open\.spotify\.com\/(artist|album|track|playlist)\/.+$/i,
    example: 'https://open.spotify.com/artist/...',
    color: '#1DB954'
  },
  apple_music: {
    name: 'Apple Music',
    icon: 'music',
    pattern: /^https?:\/\/music\.apple\.com\/.+$/i,
    example: 'https://music.apple.com/us/artist/...',
    color: '#FA243C'
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: 'cloud',
    pattern: /^https?:\/\/(www\.)?soundcloud\.com\/.+$/i,
    example: 'https://soundcloud.com/username',
    color: '#FF5500'
  },
  website: {
    name: 'Website',
    icon: 'globe',
    pattern: /^https:\/\/.+\..+$/i,  // HTTPS only!
    example: 'https://yourwebsite.com',
    color: '#6B7280'
  }
};
```

---

## ✅ Validation Rules (Client-Side)

### URL Validation Function

**Mobile teams should implement equivalent validation:**

```typescript
export function validateExternalLink(
  platform: PlatformType,
  url: string
): ValidationResult {
  const errors: string[] = [];

  // 1. Basic URL format check
  try {
    const urlObj = new URL(url.trim());
  } catch {
    return { isValid: false, errors: ['Invalid URL format'] };
  }

  // 2. Protocol check (HTTP/HTTPS only)
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    errors.push('URL must use HTTP or HTTPS protocol');
  }

  // 3. HTTPS enforcement for websites
  if (platform === 'website' && urlObj.protocol !== 'https:') {
    errors.push('Personal websites must use HTTPS for security');
  }

  // 4. Check blocked platforms
  const hostname = urlObj.hostname.toLowerCase();
  const blockedDomains = [
    'tiktok.com', 'patreon.com', 'onlyfans.com', 'twitch.tv',
    'ko-fi.com', 'buymeacoffee.com', 'gofundme.com', 'kickstarter.com'
  ];

  for (const blocked of blockedDomains) {
    if (hostname.includes(blocked)) {
      errors.push(`${blocked} is not supported. SoundBridge is your primary monetization hub.`);
    }
  }

  // 5. Platform-specific regex validation
  const metadata = PLATFORM_METADATA[platform];
  if (!metadata.pattern.test(url)) {
    errors.push(`URL does not match expected format for ${metadata.name}. Example: ${metadata.example}`);
  }

  // 6. Length check (prevent excessively long URLs)
  if (url.length > 500) {
    errors.push('URL must be less than 500 characters');
  }

  // 7. XSS prevention - check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+=/i  // onclick=, onerror=, etc.
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      errors.push('URL contains suspicious or unsafe patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUrl: errors.length === 0 ? url.trim() : undefined
  };
}
```

### Link Limit Check

```typescript
export function canAddMoreLinks(currentLinkCount: number): boolean {
  return currentLinkCount < 2;  // Maximum 2 links
}
```

---

## 🌐 API Endpoints

### 1. GET `/api/profile/external-links`

**Fetch creator's external links**

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

**Mobile Implementation:**
```dart
// Example Dart/Flutter
Future<List<ExternalLink>> fetchExternalLinks(String userId) async {
  final response = await http.get(
    Uri.parse('${apiBaseUrl}/api/profile/external-links?userId=$userId')
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    if (data['success']) {
      return (data['data']['links'] as List)
          .map((link) => ExternalLink.fromJson(link))
          .toList();
    }
  }
  throw Exception('Failed to load external links');
}
```

### 2. POST `/api/profile/external-links`

**Add new external link**

**Authentication:** Required
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "platform_type": "instagram",
  "url": "https://instagram.com/username",
  "display_order": 1  // optional, defaults to 1
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

**Possible Errors:**
- 401: Not authenticated
- 400: Validation failed (check `error` field)
- 400: Maximum of 2 external links allowed

### 3. PUT `/api/profile/external-links/[linkId]`

**Update existing link**

**Authentication:** Required
**Note:** Cannot change `platform_type` - must delete and recreate

**Request Body:**
```json
{
  "url": "https://instagram.com/newusername",  // optional
  "display_order": 2  // optional
}
```

### 4. DELETE `/api/profile/external-links/[linkId]`

**Remove link**

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Link deleted successfully"
  }
}
```

### 5. POST `/api/analytics/external-link-click`

**Track link click (fire and forget)**

**Authentication:** Optional (works for anonymous users)

**Request Body:**
```json
{
  "linkId": "uuid",
  "sessionId": "uuid",  // optional, mobile-generated session ID
  "deviceType": "mobile",  // 'mobile' | 'tablet'
  "platform": "ios"  // 'ios' | 'android'
}
```

**Mobile Implementation:**
```dart
// Example: Track click when user taps link
Future<void> trackLinkClick(String linkId) async {
  try {
    await http.post(
      Uri.parse('${apiBaseUrl}/api/analytics/external-link-click'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'linkId': linkId,
        'sessionId': sessionId,  // Your device session UUID
        'deviceType': 'mobile',
        'platform': Platform.isIOS ? 'ios' : 'android',
      }),
    );
  } catch (e) {
    // Don't block user if tracking fails
    print('Failed to track click: $e');
  }
}

// Then open the link
await launchUrl(Uri.parse(link.url));
```

---

## 📱 UI/UX Guidelines

### Display Location

**Public Creator Profile:**
- Position: Below bio text, above tab navigation
- Layout: Horizontal row of circular icons with platform colors
- Icon size: 36-40dp/pt
- Spacing: 12dp/pt between icons
- Hover/Press: Scale up to 110% with smooth animation

**Personal Profile/Dashboard:**
- Position: In a dedicated "Portfolio" card in overview section
- Layout: Icons with labels and click counts
- Show analytics: Display click counts to profile owner

**Profile Settings:**
- Section title: "Portfolio Links"
- Description: "Add up to 2 external platform links to showcase your work on other platforms. These will be displayed on your public profile."
- Show: Current links with edit/delete options
- Add button: Disabled when 2 links exist with message "Maximum links reached (2/2)"

### Visual Design Specs

**Link Icon Button:**
```
- Shape: Circle
- Size: 36dp mobile, 40dp tablet
- Background: platform.color + '20' (20% opacity)
- Border: 1dp solid, platform.color + '40' (40% opacity)
- Icon color: platform.color (full opacity)
- Icon size: 18dp mobile, 20dp tablet
- Press state: Scale 1.1, add shadow
```

**Color References:**
- Instagram: `#E4405F`
- YouTube: `#FF0000`
- Spotify: `#1DB954`
- Apple Music: `#FA243C`
- SoundCloud: `#FF5500`
- Website: `#6B7280`

### User Flow

1. **Adding a Link:**
   - User taps "Add Link" in settings
   - Modal/Sheet appears with platform picker
   - User selects platform
   - Show example URL and validation rules
   - User enters URL
   - Real-time validation (show errors immediately)
   - Save button disabled until valid
   - On save: Show success message, close modal, refresh list

2. **Viewing Links (Public Profile):**
   - Icons appear below bio if any links exist
   - Tap icon → Track click → Open URL in external browser
   - Long press → Show platform name and click count (optional)

3. **Analytics (Profile Owner):**
   - Show click counts in settings
   - Show "Portfolio Link Performance" in advanced analytics (Premium/Unlimited only)
   - Display: Total clicks, this month's clicks, top performing links

---

## 🔄 State Management Recommendations

### Mobile State Structure

```dart
class ExternalLinksState {
  List<ExternalLink> links = [];
  bool isLoading = false;
  String? error = null;
  bool canAddMore = true;  // Computed: links.length < 2
}

class ExternalLink {
  final String id;
  final String creatorId;
  final PlatformType platformType;
  final String url;
  final int displayOrder;
  final int clickCount;
  final DateTime createdAt;
  final DateTime updatedAt;
}

enum PlatformType {
  instagram,
  youtube,
  spotify,
  appleMusic,
  soundcloud,
  website
}
```

---

## 🧪 Testing Checklist

### Functional Testing

- [ ] Can add 1st external link successfully
- [ ] Can add 2nd external link successfully
- [ ] Cannot add 3rd link (button disabled, error message shown)
- [ ] Cannot add duplicate platform (error: "You already have an Instagram link")
- [ ] Can edit existing link URL
- [ ] Cannot edit platform type (must delete and recreate)
- [ ] Can delete links
- [ ] Can reorder links (if implemented)
- [ ] Links appear on public profile
- [ ] Links appear on personal dashboard
- [ ] Click tracking works (verify in database)
- [ ] Anonymous click tracking works (no auth)

### Validation Testing

- [ ] Invalid URL format rejected
- [ ] HTTP website rejected (must be HTTPS)
- [ ] Blocked platforms rejected (TikTok, Patreon, etc.)
- [ ] Instagram URL with invalid format rejected
- [ ] YouTube short URL (youtu.be) accepted
- [ ] Spotify artist/album/track URLs accepted
- [ ] URL > 500 characters rejected
- [ ] XSS patterns rejected (javascript:, <script>, etc.)

### UI/UX Testing

- [ ] Icons display with correct colors
- [ ] Icons scale on press
- [ ] Loading states show properly
- [ ] Error messages are clear and helpful
- [ ] Success messages appear
- [ ] Modal/sheet dismisses after save
- [ ] List refreshes after add/edit/delete
- [ ] Click counts update in real-time (or on refresh)

### Analytics Testing

- [ ] Click tracking records device type correctly
- [ ] Click tracking records platform (ios/android) correctly
- [ ] Session IDs are unique per session
- [ ] Anonymous clicks recorded without user_id
- [ ] Authenticated clicks recorded with user_id
- [ ] Click count increments atomically
- [ ] Advanced analytics shows link performance (Premium+)

---

## 🚨 Security Considerations

### Client-Side Security

1. **URL Validation:** Always validate URLs before sending to API
2. **HTTPS Enforcement:** Reject HTTP URLs for personal websites
3. **XSS Prevention:** Block javascript:, data:, and other suspicious protocols
4. **Input Sanitization:** Trim whitespace, remove special characters from display

### Server-Side Security (Already Implemented)

1. **RLS Policies:** Users can only modify their own links
2. **Authentication:** Write operations require valid auth token
3. **Rate Limiting:** Consider adding rate limits for click tracking
4. **SQL Injection:** Parameterized queries used throughout

---

## 📊 Analytics Integration

### Basic Analytics (All Users)

Profile overview shows:
- Total portfolio link clicks (all time)
- Links section with individual click counts

### Advanced Analytics (Premium/Unlimited)

Advanced analytics dashboard shows:
- Total clicks
- Clicks this month
- Top 3 performing links with platform type, URL, and click count
- Chart/graph showing click trends over time (future enhancement)

**Mobile Implementation:**

When fetching advanced analytics:
```dart
final response = await http.get(
  Uri.parse('${apiBaseUrl}/api/analytics/advanced?period=30d')
);

// Response includes:
{
  "externalLinks": {
    "totalClicks": 150,
    "clicksThisMonth": 45,
    "topLinks": [
      {
        "id": "uuid",
        "platform_type": "instagram",
        "url": "https://instagram.com/username",
        "click_count": 80
      },
      // ... up to 3 links
    ]
  }
}
```

---

## 🔧 Migration & Rollout

### Web Implementation Status

✅ **Completed:**
- Database migration with external_links and external_link_clicks tables
- RPC function for atomic click tracking
- RLS policies for security
- API routes for CRUD operations and click tracking
- Validation utility with platform metadata
- UI components (manager, modal, displays)
- Public profile integration
- Personal profile integration
- Settings page integration
- Analytics API integration
- Advanced analytics component

### Mobile Team Checklist

- [ ] Review this reconciliation document
- [ ] Implement data models matching web schema
- [ ] Implement PLATFORM_METADATA with exact colors
- [ ] Implement validation function matching web rules
- [ ] Create API service layer for all endpoints
- [ ] Design and implement UI components
- [ ] Integrate into public profile view
- [ ] Integrate into personal profile view
- [ ] Integrate into settings/edit profile
- [ ] Implement click tracking on link tap
- [ ] Add analytics display
- [ ] Write unit tests for validation
- [ ] Write integration tests for API calls
- [ ] Write UI tests for user flows
- [ ] QA testing across devices
- [ ] Cross-platform testing (iOS + Android consistency)
- [ ] Final reconciliation meeting with web team

---

## 🤝 Questions & Support

For questions or clarifications about the web implementation:

**Contact:** Web Development Team
**Slack Channel:** #soundbridge-external-links
**Documentation:** `/Users/justicechetachukwuasibe/Desktop/soundbridge/`

Key files to reference:
- Validation: `apps/web/src/lib/external-links-validation.ts`
- Types: `apps/web/src/lib/types/external-links.ts`
- API Routes: `apps/web/app/api/profile/external-links/`
- Migration: `supabase/migrations/20260113120000_add_external_links.sql`

---

## 📝 Version History

- **v1.0** (2026-01-13): Initial implementation documentation
- Mobile reconciliation required by: **2026-01-20**
- Feature launch target: **2026-01-27**

---

**End of Reconciliation Document**

Please schedule a reconciliation meeting to walk through any questions and ensure alignment between web and mobile implementations.
