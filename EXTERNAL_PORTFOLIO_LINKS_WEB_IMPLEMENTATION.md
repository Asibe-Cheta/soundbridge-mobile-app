# External Portfolio Links - Web Implementation Guide

## Feature Overview
Allow creators to add 1-2 external platform links (Instagram, YouTube, Spotify, Apple Music, SoundCloud, Personal Website) to their public-facing profiles. This enables creators to showcase their portfolio across platforms while maintaining SoundBridge as the primary monetization hub.

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [URL Validation Rules](#url-validation-rules)
4. [Frontend UI Specifications](#frontend-ui-specifications)
5. [Security & Validation](#security--validation)
6. [Analytics Integration](#analytics-integration)
7. [Testing Checklist](#testing-checklist)
8. [Implementation Steps](#implementation-steps)

---

## 1. Database Schema

### Option A: New Table (Recommended for Scalability)

```sql
CREATE TABLE external_profile_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_type VARCHAR(50) NOT NULL CHECK (platform_type IN (
    'instagram',
    'youtube',
    'spotify',
    'apple_music',
    'soundcloud',
    'website'
  )),
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_platform UNIQUE(user_id, platform_type),
  CONSTRAINT valid_display_order CHECK (display_order BETWEEN 1 AND 2)
);

-- Indexes for performance
CREATE INDEX idx_external_links_user_id ON external_profile_links(user_id);
CREATE INDEX idx_external_links_active ON external_profile_links(is_active);
CREATE INDEX idx_external_links_clicks ON external_profile_links(click_count DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_external_links_updated_at
BEFORE UPDATE ON external_profile_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Option B: JSONB Column on Profiles Table (Simpler, Less Normalized)

```sql
ALTER TABLE profiles
ADD COLUMN external_links JSONB DEFAULT '[]'::jsonb;

-- Example data structure:
-- [
--   {
--     "platform": "instagram",
--     "url": "https://instagram.com/asibe_cheta",
--     "display_order": 1,
--     "click_count": 42,
--     "created_at": "2026-01-13T16:00:00Z"
--   },
--   {
--     "platform": "youtube",
--     "url": "https://youtube.com/@asibecheta",
--     "display_order": 2,
--     "click_count": 18,
--     "created_at": "2026-01-13T16:00:00Z"
--   }
-- ]

-- Create GIN index for JSONB queries
CREATE INDEX idx_profiles_external_links ON profiles USING GIN (external_links);
```

**Recommendation:** Use **Option A (New Table)** for better data integrity, easier analytics queries, and scalability.

---

## 2. API Endpoints

### 2.1 Add External Link

**Endpoint:** `POST /api/profile/external-links`

**Authentication:** Required (creator must be authenticated)

**Request Body:**
```json
{
  "platform_type": "instagram",
  "url": "https://instagram.com/asibe_cheta",
  "display_order": 1
}
```

**Validation Rules:**
- User must be authenticated
- `platform_type` must be one of: `instagram`, `youtube`, `spotify`, `apple_music`, `soundcloud`, `website`
- `url` must match platform-specific regex pattern (see validation section)
- User cannot have more than 2 external links
- User cannot add duplicate platform types
- `display_order` must be 1 or 2

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "link-uuid-123",
    "user_id": "user-uuid-456",
    "platform_type": "instagram",
    "url": "https://instagram.com/asibe_cheta",
    "display_order": 1,
    "click_count": 0,
    "created_at": "2026-01-13T16:00:00Z"
  }
}
```

**Error Responses:**
```json
// Maximum links reached (400 Bad Request)
{
  "success": false,
  "error": "MAX_LINKS_REACHED",
  "message": "You've reached the maximum number of external links (2)"
}

// Duplicate platform (409 Conflict)
{
  "success": false,
  "error": "DUPLICATE_PLATFORM",
  "message": "You already have an Instagram link on your profile"
}

// Invalid URL (400 Bad Request)
{
  "success": false,
  "error": "INVALID_URL",
  "message": "Invalid Instagram URL format. Please check and try again."
}

// Blocked platform (403 Forbidden)
{
  "success": false,
  "error": "PLATFORM_NOT_SUPPORTED",
  "message": "This platform is not supported. Allowed platforms: Instagram, YouTube, Spotify, Apple Music, SoundCloud, Personal Website"
}
```

### 2.2 Get Creator's External Links

**Endpoint:** `GET /api/profile/:userId/external-links`

**Authentication:** Not required (public data)

**URL Parameters:**
- `userId` - The creator's user ID

**Query Parameters:**
- `activeOnly` (optional, boolean, default: true) - Only return active links

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "link-uuid-123",
      "platform_type": "instagram",
      "url": "https://instagram.com/asibe_cheta",
      "display_order": 1,
      "click_count": 42
    },
    {
      "id": "link-uuid-789",
      "platform_type": "youtube",
      "url": "https://youtube.com/@asibecheta",
      "display_order": 2,
      "click_count": 18
    }
  ]
}
```

### 2.3 Update External Link

**Endpoint:** `PUT /api/profile/external-links/:linkId`

**Authentication:** Required (must own the link)

**Request Body:**
```json
{
  "url": "https://instagram.com/new_username",
  "display_order": 2
}
```

**Validation Rules:**
- User must own the link being updated
- New URL must still match platform's regex pattern
- `display_order` must be 1 or 2

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "link-uuid-123",
    "platform_type": "instagram",
    "url": "https://instagram.com/new_username",
    "display_order": 2,
    "click_count": 42,
    "updated_at": "2026-01-13T17:00:00Z"
  }
}
```

### 2.4 Delete External Link

**Endpoint:** `DELETE /api/profile/external-links/:linkId`

**Authentication:** Required (must own the link)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "External link removed successfully"
}
```

### 2.5 Track Link Click

**Endpoint:** `POST /api/profile/external-links/:linkId/track-click`

**Authentication:** Not required (public action)

**Request Body:**
```json
{
  "referrer": "profile_view",
  "device_type": "mobile"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Click tracked"
}
```

**Rate Limiting:**
- Same user/IP can only increment click count once per 5 minutes per link (prevent spam)
- Use IP address + user agent fingerprinting to track unique clicks

---

## 3. URL Validation Rules

### 3.1 Platform-Specific Regex Patterns

```javascript
const PLATFORM_VALIDATORS = {
  instagram: {
    name: 'Instagram',
    regex: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+$/i,
    examples: [
      'https://instagram.com/username',
      'https://www.instagram.com/username',
      'https://instagr.am/username'
    ]
  },

  youtube: {
    name: 'YouTube',
    regex: /^https?:\/\/(www\.)?(youtube\.com\/(channel\/|c\/|user\/|@)|youtu\.be\/).+$/i,
    examples: [
      'https://youtube.com/@username',
      'https://youtube.com/channel/UC...',
      'https://youtube.com/c/username',
      'https://youtu.be/username'
    ]
  },

  spotify: {
    name: 'Spotify',
    regex: /^https?:\/\/open\.spotify\.com\/(artist|user)\/.+$/i,
    examples: [
      'https://open.spotify.com/artist/123abc',
      'https://open.spotify.com/user/username'
    ]
  },

  apple_music: {
    name: 'Apple Music',
    regex: /^https?:\/\/music\.apple\.com\/[a-z]{2}\/(artist|profile)\/.+$/i,
    examples: [
      'https://music.apple.com/us/artist/name/123456',
      'https://music.apple.com/gb/profile/username'
    ]
  },

  soundcloud: {
    name: 'SoundCloud',
    regex: /^https?:\/\/(www\.)?soundcloud\.com\/.+$/i,
    examples: [
      'https://soundcloud.com/username',
      'https://www.soundcloud.com/username'
    ]
  },

  website: {
    name: 'Personal Website',
    regex: /^https:\/\/.+\..+$/i, // Must be HTTPS
    examples: [
      'https://mywebsite.com',
      'https://www.portfolio.net'
    ]
  }
};

// Blocked URL patterns (return 403 if detected)
const BLOCKED_PATTERNS = [
  /tiktok\.com/i,
  /patreon\.com/i,
  /onlyfans\.com/i,
  /twitch\.tv/i,
  /ko-fi\.com/i,
  /buymeacoffee\.com/i,
  /paypal\.me/i,
  /venmo\.com/i,
  /cashapp\.com/i,
  // URL shorteners (potential phishing)
  /bit\.ly/i,
  /tinyurl\.com/i,
  /goo\.gl/i,
  /ow\.ly/i,
  /t\.co/i
];
```

### 3.2 Validation Function (Backend)

```javascript
async function validateExternalLink(platformType, url, userId) {
  // 1. Check if platform is allowed
  const validator = PLATFORM_VALIDATORS[platformType];
  if (!validator) {
    throw new ValidationError('PLATFORM_NOT_SUPPORTED',
      'This platform is not supported');
  }

  // 2. Check if URL is blocked
  for (const blockedPattern of BLOCKED_PATTERNS) {
    if (blockedPattern.test(url)) {
      // Log security event
      await logSecurityEvent({
        event: 'BLOCKED_PLATFORM_ATTEMPT',
        userId,
        platformType,
        url,
        timestamp: new Date()
      });

      throw new ValidationError('PLATFORM_BLOCKED',
        'This platform is not supported for security reasons');
    }
  }

  // 3. Validate URL format
  if (!validator.regex.test(url)) {
    throw new ValidationError('INVALID_URL',
      `Invalid ${validator.name} URL format. Please check and try again.`);
  }

  // 4. Sanitize URL (remove tracking parameters, normalize)
  const sanitizedUrl = sanitizeUrl(url);

  // 5. Check for phishing patterns
  if (await isPotentialPhishing(sanitizedUrl)) {
    await logSecurityEvent({
      event: 'PHISHING_ATTEMPT',
      userId,
      url: sanitizedUrl,
      timestamp: new Date()
    });

    throw new ValidationError('SUSPICIOUS_URL',
      'This URL appears suspicious and cannot be added');
  }

  // 6. Check link count limit
  const existingLinks = await db.query(
    'SELECT COUNT(*) as count FROM external_profile_links WHERE user_id = $1',
    [userId]
  );

  if (existingLinks.rows[0].count >= 2) {
    throw new ValidationError('MAX_LINKS_REACHED',
      "You've reached the maximum number of external links (2)");
  }

  // 7. Check for duplicate platform
  const duplicateCheck = await db.query(
    'SELECT id FROM external_profile_links WHERE user_id = $1 AND platform_type = $2',
    [userId, platformType]
  );

  if (duplicateCheck.rows.length > 0) {
    throw new ValidationError('DUPLICATE_PLATFORM',
      `You already have a ${validator.name} link on your profile`);
  }

  return sanitizedUrl;
}

// URL Sanitization
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // Normalize protocol to https
    parsed.protocol = 'https:';

    // Remove trailing slash
    return parsed.toString().replace(/\/$/, '');
  } catch (error) {
    throw new ValidationError('INVALID_URL', 'Malformed URL');
  }
}

// Phishing Detection (Basic)
async function isPotentialPhishing(url) {
  const suspiciousPatterns = [
    /\.tk$/i,  // Free TLD often used for phishing
    /\.ml$/i,
    /\.ga$/i,
    /\.cf$/i,
    /login/i,  // Suspicious path segments
    /signin/i,
    /verify/i,
    /account/i,
    /banking/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}
```

---

## 4. Frontend UI Specifications

### 4.1 Public Profile View (Where Links Appear)

**Location:** Below bio text, above location information

**Component Structure:**
```jsx
function ExternalLinksSection({ links }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="external-links-section">
      {links
        .sort((a, b) => a.display_order - b.display_order)
        .map(link => (
          <ExternalLinkIcon
            key={link.id}
            platform={link.platform_type}
            url={link.url}
            onClickTrack={() => trackLinkClick(link.id)}
          />
        ))}
    </div>
  );
}

function ExternalLinkIcon({ platform, url, onClickTrack }) {
  const handleClick = () => {
    onClickTrack();
    // Open in new tab/external browser
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      className="external-link-icon"
      onClick={handleClick}
      aria-label={`View on ${PLATFORM_NAMES[platform]}`}
    >
      <PlatformIcon platform={platform} size={32} />
    </button>
  );
}
```

**CSS Styling:**
```css
.external-links-section {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  margin-bottom: 12px;
  align-items: center;
}

.external-link-icon {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.external-link-icon:hover {
  transform: scale(1.1);
  opacity: 0.8;
}

.external-link-icon:active {
  transform: scale(0.95);
}

/* Ensure icons are 32x32px */
.external-link-icon svg,
.external-link-icon img {
  width: 32px;
  height: 32px;
  display: block;
}
```

**Platform Icons:**
Use official brand icons or open-source icon sets. Recommended sources:
- [Simple Icons](https://simpleicons.org/) (free, MIT license)
- [Font Awesome Brands](https://fontawesome.com/icons?d=gallery&s=brands) (free tier available)
- [React Icons](https://react-icons.github.io/react-icons/) (includes brand icons)

### 4.2 Profile Settings - Portfolio Links Section

**Location:** Settings tab, new section called "Portfolio Links"

**Wireframe:**
```
┌────────────────────────────────────────┐
│  Settings                              │
├────────────────────────────────────────┤
│  ... (other settings sections)         │
│                                        │
│  Portfolio Links                       │
│  ──────────────────────────────────   │
│  Add links to showcase your work on   │
│  other platforms (max 2)               │
│                                        │
│  Current Links:                        │
│                                        │
│  ┌────────────────────────────────┐  │
│  │ 📷 Instagram                   │  │
│  │ instagram.com/asibe_cheta      │  │
│  │ 42 clicks                      │  │
│  │ [Edit] [Delete]                │  │
│  └────────────────────────────────┘  │
│                                        │
│  ┌────────────────────────────────┐  │
│  │ ▶️ YouTube                      │  │
│  │ youtube.com/@asibecheta        │  │
│  │ 18 clicks                      │  │
│  │ [Edit] [Delete]                │  │
│  └────────────────────────────────┘  │
│                                        │
│  [+ Add Link] (disabled if 2 links)   │
└────────────────────────────────────────┘
```

**Component Structure:**
```jsx
function PortfolioLinksSettings() {
  const [links, setLinks] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserLinks();
  }, []);

  const fetchUserLinks = async () => {
    try {
      const response = await fetch('/api/profile/external-links');
      const data = await response.json();
      setLinks(data.data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (links.length >= 2) {
      alert("You've reached the maximum number of external links (2)");
      return;
    }
    setShowAddModal(true);
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Are you sure you want to remove this link?')) return;

    try {
      await fetch(`/api/profile/external-links/${linkId}`, {
        method: 'DELETE'
      });
      setLinks(links.filter(link => link.id !== linkId));
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to remove link. Please try again.');
    }
  };

  return (
    <div className="portfolio-links-section">
      <h2>Portfolio Links</h2>
      <p className="help-text">
        Add links to showcase your work on other platforms (max 2)
      </p>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {links.length === 0 ? (
            <EmptyState
              icon="🔗"
              title="No external links yet"
              description="Add links to Instagram, YouTube, Spotify, and more to showcase your portfolio"
            />
          ) : (
            <div className="links-list">
              {links
                .sort((a, b) => a.display_order - b.display_order)
                .map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onEdit={() => handleEditLink(link)}
                    onDelete={() => handleDeleteLink(link.id)}
                  />
                ))}
            </div>
          )}

          <button
            className="add-link-button"
            onClick={handleAddLink}
            disabled={links.length >= 2}
          >
            + Add Link
          </button>
        </>
      )}

      {showAddModal && (
        <AddLinkModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newLink) => {
            setLinks([...links, newLink]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function LinkCard({ link, onEdit, onDelete }) {
  return (
    <div className="link-card">
      <div className="link-header">
        <PlatformIcon platform={link.platform_type} size={24} />
        <span className="platform-name">
          {PLATFORM_NAMES[link.platform_type]}
        </span>
      </div>

      <div className="link-url">{formatDisplayUrl(link.url)}</div>

      <div className="link-stats">
        {link.click_count} {link.click_count === 1 ? 'click' : 'clicks'}
      </div>

      <div className="link-actions">
        <button onClick={onEdit} className="btn-edit">Edit</button>
        <button onClick={onDelete} className="btn-delete">Delete</button>
      </div>
    </div>
  );
}

// Helper to format URL for display (remove https://, www., etc.)
function formatDisplayUrl(url) {
  return url
    .replace(/^https?:\/\/(www\.)?/, '')
    .substring(0, 40) + (url.length > 40 ? '...' : '');
}
```

### 4.3 Add/Edit Link Modal

**Component:**
```jsx
function AddLinkModal({ onClose, onSuccess, editingLink = null }) {
  const [platform, setPlatform] = useState(editingLink?.platform_type || '');
  const [url, setUrl] = useState(editingLink?.url || '');
  const [displayOrder, setDisplayOrder] = useState(editingLink?.display_order || 1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const platforms = [
    { value: 'instagram', label: 'Instagram', icon: '📷' },
    { value: 'youtube', label: 'YouTube', icon: '▶️' },
    { value: 'spotify', label: 'Spotify', icon: '🎵' },
    { value: 'apple_music', label: 'Apple Music', icon: '🍎' },
    { value: 'soundcloud', label: 'SoundCloud', icon: '☁️' },
    { value: 'website', label: 'Personal Website', icon: '🌐' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const method = editingLink ? 'PUT' : 'POST';
      const endpoint = editingLink
        ? `/api/profile/external-links/${editingLink.id}`
        : '/api/profile/external-links';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_type: platform, url, display_order })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save link');
      }

      onSuccess(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="add-link-modal">
        <h2>{editingLink ? 'Edit Link' : 'Add External Link'}</h2>

        <form onSubmit={handleSubmit}>
          {/* Platform Selector */}
          <div className="form-group">
            <label>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              required
              disabled={!!editingLink} // Can't change platform when editing
            >
              <option value="">Select platform...</option>
              {platforms.map(p => (
                <option key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* URL Input */}
          <div className="form-group">
            <label>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={platform ? getPlaceholderUrl(platform) : 'https://...'}
              required
            />
            {platform && (
              <small className="help-text">
                Example: {getExampleUrl(platform)}
              </small>
            )}
          </div>

          {/* Display Order */}
          <div className="form-group">
            <label>Display Order</label>
            <select
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              required
            >
              <option value={1}>First</option>
              <option value={2}>Second</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !platform || !url}>
              {loading ? 'Saving...' : (editingLink ? 'Update Link' : 'Add Link')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Helper functions
function getPlaceholderUrl(platform) {
  const placeholders = {
    instagram: 'https://instagram.com/username',
    youtube: 'https://youtube.com/@username',
    spotify: 'https://open.spotify.com/artist/...',
    apple_music: 'https://music.apple.com/us/artist/...',
    soundcloud: 'https://soundcloud.com/username',
    website: 'https://yourwebsite.com'
  };
  return placeholders[platform] || 'https://...';
}

function getExampleUrl(platform) {
  const examples = {
    instagram: 'https://instagram.com/asibe_cheta',
    youtube: 'https://youtube.com/@asibecheta',
    spotify: 'https://open.spotify.com/artist/123abc',
    apple_music: 'https://music.apple.com/us/artist/name/123456',
    soundcloud: 'https://soundcloud.com/username',
    website: 'https://myportfolio.com'
  };
  return examples[platform] || 'https://...';
}
```

---

## 5. Security & Validation

### 5.1 Server-Side Validation (CRITICAL)

**NEVER trust client-side validation alone. Always validate on the server.**

```javascript
// Rate Limiting (using express-rate-limit or similar)
const addLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 link additions per hour per user
  message: 'Too many link additions. Please try again later.',
  keyGenerator: (req) => req.user.id // Rate limit by user ID
});

app.post('/api/profile/external-links',
  authenticate,
  addLinkLimiter,
  async (req, res) => {
    // Validation logic here
  }
);
```

### 5.2 XSS Prevention

```javascript
// Sanitize all user inputs before saving
const sanitizeHtml = require('sanitize-html');

function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {}
  });
}

// Usage:
const sanitizedUrl = sanitizeInput(req.body.url);
```

### 5.3 SQL Injection Prevention

**Use parameterized queries ALWAYS:**

```javascript
// ❌ WRONG - Vulnerable to SQL injection
const query = `SELECT * FROM external_profile_links WHERE user_id = '${userId}'`;

// ✅ CORRECT - Parameterized query
const query = 'SELECT * FROM external_profile_links WHERE user_id = $1';
const result = await db.query(query, [userId]);
```

### 5.4 Authorization Checks

```javascript
// Middleware to verify user owns the link they're trying to modify
async function verifyLinkOwnership(req, res, next) {
  const linkId = req.params.linkId;
  const userId = req.user.id;

  const result = await db.query(
    'SELECT user_id FROM external_profile_links WHERE id = $1',
    [linkId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Link not found' });
  }

  if (result.rows[0].user_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
}

// Use in routes:
app.put('/api/profile/external-links/:linkId',
  authenticate,
  verifyLinkOwnership,
  updateLinkHandler
);
```

### 5.5 Security Event Logging

```javascript
// Log suspicious activity
async function logSecurityEvent(event) {
  await db.query(`
    INSERT INTO security_events (event_type, user_id, details, timestamp)
    VALUES ($1, $2, $3, $4)
  `, [
    event.event,
    event.userId,
    JSON.stringify({
      url: event.url,
      platform: event.platformType
    }),
    event.timestamp
  ]);

  // Alert admins for critical events
  if (event.event === 'PHISHING_ATTEMPT') {
    await sendAdminAlert({
      type: 'SECURITY',
      severity: 'HIGH',
      message: `Potential phishing attempt by user ${event.userId}`,
      details: event
    });
  }
}
```

---

## 6. Analytics Integration

### 6.1 Click Tracking Implementation

```javascript
// Backend: Track link click
async function trackLinkClick(linkId, metadata) {
  // Check rate limiting (prevent spam)
  const key = `click:${linkId}:${metadata.ip}`;
  const recentClick = await redis.get(key);

  if (recentClick) {
    // Already clicked within 5 minutes, don't increment
    return { tracked: false, reason: 'RATE_LIMITED' };
  }

  // Increment click count
  await db.query(
    'UPDATE external_profile_links SET click_count = click_count + 1 WHERE id = $1',
    [linkId]
  );

  // Log click event for analytics
  await db.query(`
    INSERT INTO external_link_clicks (link_id, user_id, referrer, device_type, ip_address, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    linkId,
    metadata.userId || null,
    metadata.referrer,
    metadata.deviceType,
    metadata.ip,
    new Date()
  ]);

  // Set rate limit (5 minutes)
  await redis.setex(key, 300, '1');

  return { tracked: true };
}
```

```sql
-- Analytics table for detailed click tracking
CREATE TABLE external_link_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES external_profile_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referrer VARCHAR(255),
  device_type VARCHAR(50),
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_link_clicks_link_id ON external_link_clicks(link_id);
CREATE INDEX idx_link_clicks_timestamp ON external_link_clicks(timestamp DESC);
```

### 6.2 Creator Dashboard Analytics

**Endpoint:** `GET /api/profile/external-links/analytics`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_clicks": 60,
    "clicks_this_month": 12,
    "links": [
      {
        "platform": "instagram",
        "url": "https://instagram.com/asibe_cheta",
        "total_clicks": 42,
        "clicks_this_month": 8,
        "click_rate": 0.12, // clicks / profile views
        "top_referrer": "profile_view"
      },
      {
        "platform": "youtube",
        "url": "https://youtube.com/@asibecheta",
        "total_clicks": 18,
        "clicks_this_month": 4,
        "click_rate": 0.05,
        "top_referrer": "profile_view"
      }
    ],
    "most_clicked_platform": "instagram",
    "click_trend": [
      { "date": "2026-01-06", "clicks": 2 },
      { "date": "2026-01-07", "clicks": 5 },
      { "date": "2026-01-08", "clicks": 3 },
      { "date": "2026-01-09", "clicks": 7 },
      { "date": "2026-01-10", "clicks": 4 },
      { "date": "2026-01-11", "clicks": 6 },
      { "date": "2026-01-12", "clicks": 8 }
    ]
  }
}
```

### 6.3 Admin Dashboard Analytics

**Endpoint:** `GET /api/admin/external-links/analytics`

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "total_creators_with_links": 1234,
    "percentage_of_creators": 45.6,
    "total_clicks": 45678,
    "average_clicks_per_link": 18.5,
    "platform_distribution": [
      { "platform": "instagram", "count": 856, "percentage": 42.3 },
      { "platform": "youtube", "count": 623, "percentage": 30.8 },
      { "platform": "spotify", "count": 312, "percentage": 15.4 },
      { "platform": "apple_music", "count": 145, "percentage": 7.2 },
      { "platform": "soundcloud", "count": 78, "percentage": 3.9 },
      { "platform": "website", "count": 8, "percentage": 0.4 }
    ],
    "return_rate": 34.5, // % of users who clicked external link and returned to SoundBridge
    "blocked_attempts": {
      "tiktok": 234,
      "patreon": 89,
      "onlyfans": 12
    }
  }
}
```

---

## 7. Testing Checklist

### 7.1 Functional Tests

**URL Validation:**
- [ ] Valid Instagram URLs are accepted
- [ ] Valid YouTube URLs are accepted (all formats: @username, /c/username, /channel/)
- [ ] Valid Spotify URLs are accepted
- [ ] Valid Apple Music URLs are accepted
- [ ] Valid SoundCloud URLs are accepted
- [ ] Valid HTTPS personal websites are accepted
- [ ] HTTP-only personal websites are rejected (must be HTTPS)
- [ ] Invalid URLs are rejected with helpful error messages
- [ ] Blocked platforms (TikTok, Patreon, etc.) are rejected
- [ ] URL shorteners (bit.ly, tinyurl) are blocked
- [ ] URLs with tracking parameters are sanitized
- [ ] Malformed URLs show appropriate error

**Business Logic:**
- [ ] Users can add up to 2 external links
- [ ] Adding a 3rd link shows "maximum links reached" error
- [ ] Users cannot add duplicate platform types
- [ ] Display order can be set to 1 or 2
- [ ] Links can be edited without changing platform type
- [ ] Links can be deleted
- [ ] Deleted links are removed from public profile immediately

**Click Tracking:**
- [ ] Clicks are tracked when link is clicked
- [ ] Same user cannot increment click count twice within 5 minutes
- [ ] Click count displays correctly on settings page
- [ ] Analytics show correct click trends

**Security:**
- [ ] Unauthenticated users cannot add/edit/delete links
- [ ] Users cannot edit/delete other users' links
- [ ] XSS attempts in URLs are blocked
- [ ] SQL injection attempts are prevented
- [ ] Rate limiting works (max 10 additions per hour)
- [ ] Blocked platform attempts are logged

### 7.2 UI/UX Tests

**Public Profile:**
- [ ] External links section appears below bio
- [ ] Icons are 32x32px with 12px spacing
- [ ] Icons use correct platform branding
- [ ] Clicking icon opens URL in new tab
- [ ] Links are sorted by display_order
- [ ] Section is hidden if creator has no links
- [ ] Mobile responsive (icons stack properly on small screens)

**Settings Page:**
- [ ] "Portfolio Links" section appears in settings
- [ ] Current links display with correct platform icons
- [ ] Click counts display correctly
- [ ] "Add Link" button is disabled when 2 links exist
- [ ] Add/Edit modal validates URLs in real-time
- [ ] Error messages are clear and helpful
- [ ] Delete confirmation dialog appears
- [ ] Loading states show during API calls

### 7.3 Performance Tests

- [ ] Public profile loads with links in < 500ms additional time
- [ ] Click tracking doesn't block navigation
- [ ] Settings page loads links in < 1 second
- [ ] Analytics queries are optimized with indexes
- [ ] Rate limiting doesn't affect legitimate users

### 7.4 Cross-Browser Tests

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### 7.5 Accessibility Tests

- [ ] Screen readers announce platform names
- [ ] Keyboard navigation works for all buttons
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Alt text provided for platform icons

---

## 8. Implementation Steps

### Phase 1: Backend (Week 1)

**Day 1-2: Database & Models**
- [ ] Create `external_profile_links` table
- [ ] Add indexes for performance
- [ ] Create migration scripts
- [ ] Add security event logging table

**Day 3-4: API Endpoints**
- [ ] Implement POST /api/profile/external-links (add link)
- [ ] Implement GET /api/profile/:userId/external-links (get links)
- [ ] Implement PUT /api/profile/external-links/:linkId (update link)
- [ ] Implement DELETE /api/profile/external-links/:linkId (delete link)
- [ ] Implement POST /api/profile/external-links/:linkId/track-click (track clicks)

**Day 5: Validation & Security**
- [ ] Implement URL validation for all platforms
- [ ] Add blocked platform detection
- [ ] Add phishing detection
- [ ] Add rate limiting
- [ ] Add authorization middleware
- [ ] Add security event logging

### Phase 2: Frontend (Week 2)

**Day 1-2: Public Profile View**
- [ ] Create ExternalLinksSection component
- [ ] Add platform icons (use icon library)
- [ ] Implement click tracking
- [ ] Style responsive layout
- [ ] Test on mobile devices

**Day 3-4: Settings Page**
- [ ] Create PortfolioLinksSettings component
- [ ] Create LinkCard component
- [ ] Create AddLinkModal component
- [ ] Implement add/edit/delete functionality
- [ ] Add client-side validation
- [ ] Add loading states and error handling

**Day 5: Polish & Testing**
- [ ] Add animations and transitions
- [ ] Implement empty states
- [ ] Test all error scenarios
- [ ] Cross-browser testing
- [ ] Accessibility testing

### Phase 3: Analytics (Week 3)

**Day 1-2: Creator Analytics**
- [ ] Create analytics queries
- [ ] Implement GET /api/profile/external-links/analytics
- [ ] Add analytics section to creator dashboard
- [ ] Create click trend charts

**Day 2-3: Admin Analytics**
- [ ] Implement GET /api/admin/external-links/analytics
- [ ] Add platform distribution charts
- [ ] Add blocked attempts tracking
- [ ] Create admin dashboard views

**Day 4-5: Testing & Deployment**
- [ ] Run full test suite
- [ ] Load testing (simulate high traffic)
- [ ] Security audit
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Deploy to production

---

## 9. Error Messages & User Communication

### User-Facing Error Messages

```javascript
const ERROR_MESSAGES = {
  MAX_LINKS_REACHED: "You've reached the maximum number of external links (2). Remove an existing link to add a new one.",

  DUPLICATE_PLATFORM: (platform) => `You already have a ${platform} link on your profile. Edit your existing link or remove it first.`,

  INVALID_URL: (platform) => `Invalid ${platform} URL format. Please check and try again. Example: ${getExampleUrl(platform)}`,

  PLATFORM_NOT_SUPPORTED: "This platform is not supported. Allowed platforms: Instagram, YouTube, Spotify, Apple Music, SoundCloud, Personal Website.",

  PLATFORM_BLOCKED: "This platform is not supported for security reasons.",

  SUSPICIOUS_URL: "This URL appears suspicious and cannot be added. If you believe this is an error, please contact support.",

  RATE_LIMITED: "Too many link additions. Please try again in a few minutes.",

  UNAUTHORIZED: "You don't have permission to modify this link.",

  LINK_NOT_FOUND: "Link not found. It may have been deleted.",

  SERVER_ERROR: "Something went wrong. Please try again later."
};
```

### Help Text

**Settings Page:**
```
Add links to showcase your work on other platforms (max 2)

Allowed platforms:
• Instagram - Share your photos and videos
• YouTube - Link to your channel
• Spotify - Show your music on Spotify
• Apple Music - Link your Apple Music profile
• SoundCloud - Share your SoundCloud tracks
• Personal Website - Link to your portfolio site (HTTPS only)
```

---

## 10. Future Enhancements (Not in Initial Release)

### Phase 2 Considerations

1. **Embedded Content**
   - Show Instagram/YouTube preview on profile (like Twitter embeds)
   - Requires platform API integration

2. **Link Verification**
   - Verify creator actually owns the linked account
   - Prevents impersonation

3. **Deeper Analytics**
   - Track which links convert to followers/tips
   - A/B test link placement

4. **Custom Platform Support**
   - Allow more niche platforms (Bandcamp, Beatport, etc.)
   - Requires research into demand

5. **Link Scheduling**
   - Temporarily replace links for events/campaigns
   - Return to default links after period

---

## Appendix A: Platform Icon Assets

### Recommended Icon Libraries

**Option 1: Simple Icons (Free, MIT License)**
- Website: https://simpleicons.org/
- Includes: Instagram, YouTube, Spotify, Apple Music, SoundCloud
- Usage: `<SimpleIcon icon="instagram" size={32} />`

**Option 2: React Icons (Free, Multiple Licenses)**
- Website: https://react-icons.github.io/react-icons/
- Includes brand icons from Font Awesome
- Usage: `import { FaInstagram } from 'react-icons/fa'`

**Option 3: Custom SVG Icons**
```jsx
// Instagram Icon
export const InstagramIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);
```

---

## Appendix B: Sample Database Queries

### Get Most Popular Platforms
```sql
SELECT
  platform_type,
  COUNT(*) as creator_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM external_profile_links), 2) as percentage,
  SUM(click_count) as total_clicks,
  AVG(click_count) as avg_clicks_per_link
FROM external_profile_links
WHERE is_active = true
GROUP BY platform_type
ORDER BY creator_count DESC;
```

### Get Top Linked Creators (by clicks)
```sql
SELECT
  p.username,
  p.id as user_id,
  COUNT(epl.id) as link_count,
  SUM(epl.click_count) as total_clicks
FROM external_profile_links epl
JOIN profiles p ON p.id = epl.user_id
WHERE epl.is_active = true
GROUP BY p.username, p.id
ORDER BY total_clicks DESC
LIMIT 10;
```

### Get Click Trend (Last 7 Days)
```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as clicks
FROM external_link_clicks
WHERE link_id = $1
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date ASC;
```

---

**Document Version:** 1.0
**Last Updated:** January 13, 2026
**Author:** Mobile Development Team
**Status:** Ready for Implementation
**Priority:** High (Pre-Launch Feature)
