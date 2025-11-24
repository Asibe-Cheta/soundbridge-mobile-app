# Backend Requirements for UI/UX Restructure - Professional Networking Focus

**Date:** November 23, 2025  
**From:** Mobile App Team  
**To:** Web App Team  
**Priority:** High  
**Status:** Planning Phase

---

## 📋 Executive Summary

The mobile app is being restructured to emphasize professional networking (LinkedIn-style) over music streaming. This requires significant backend infrastructure to support:

- **Post/Feed System** - Professional posts with text, images, audio previews, and event links
- **Connection System** - Mutual connections, connection requests, and networking features
- **Engagement System** - Reactions, comments, and sharing
- **Profile Enhancements** - Professional headlines, experience, skills, and endorsements
- **Feed Algorithm** - Personalized feed with connection-based and location-based recommendations

**Estimated Timeline:** This is a major feature addition. We recommend breaking it into phases (see Implementation Phases section).

---

## 🗄️ Database Schema Changes

### New Tables Required

#### 1. `posts` Table
Stores professional posts/updates from users.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  visibility VARCHAR(20) NOT NULL DEFAULT 'connections' CHECK (visibility IN ('connections', 'public')),
  post_type VARCHAR(20) DEFAULT 'update' CHECK (post_type IN ('update', 'opportunity', 'achievement', 'collaboration', 'event')),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_post_type ON posts(post_type);
CREATE INDEX idx_posts_event_id ON posts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**
- `id` - Unique post identifier
- `user_id` - Post author
- `content` - Post text (max 500 characters)
- `visibility` - 'connections' or 'public'
- `post_type` - Type of post (update, opportunity, achievement, collaboration, event)
- `event_id` - Optional link to event
- `created_at` - Post creation timestamp
- `updated_at` - Last update timestamp
- `deleted_at` - Soft delete timestamp

#### 2. `post_attachments` Table
Stores images and audio previews attached to posts.

```sql
CREATE TABLE post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  attachment_type VARCHAR(20) NOT NULL CHECK (attachment_type IN ('image', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  duration INTEGER, -- for audio, in seconds (max 60)
  thumbnail_url TEXT, -- for audio previews
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT post_attachments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_attachments_post_id ON post_attachments(post_id);
CREATE INDEX idx_post_attachments_type ON post_attachments(attachment_type);
```

**Fields:**
- `id` - Unique attachment identifier
- `post_id` - Parent post
- `attachment_type` - 'image' or 'audio'
- `file_url` - Storage URL
- `file_name` - Original filename
- `file_size` - File size in bytes
- `mime_type` - MIME type
- `duration` - Audio duration in seconds (max 60)
- `thumbnail_url` - Thumbnail for audio previews

**File Size Limits:**
- Images: Max 5MB (JPG, PNG, WEBP)
- Audio: Max 10MB, Max 60 seconds (MP3, WAV)

#### 3. `post_reactions` Table
Stores user reactions to posts (Support, Love, Fire, Congrats).

```sql
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('support', 'love', 'fire', 'congrats')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One reaction per user per post (can change reaction type)
  UNIQUE(post_id, user_id),
  CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX idx_post_reactions_type ON post_reactions(reaction_type);
```

**Fields:**
- `id` - Unique reaction identifier
- `post_id` - Post being reacted to
- `user_id` - User who reacted
- `reaction_type` - Type of reaction (support, love, fire, congrats)
- `created_at` - Reaction timestamp

**Business Logic:**
- One reaction per user per post (user can change reaction type)
- Deleting a post deletes all reactions

#### 4. `post_comments` Table
Stores comments on posts with threading support (1 level deep).

```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- NULL for top-level, UUID for replies
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_parent_fkey FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX idx_post_comments_parent ON post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);
CREATE INDEX idx_post_comments_deleted_at ON post_comments(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**
- `id` - Unique comment identifier
- `post_id` - Parent post
- `user_id` - Comment author
- `parent_comment_id` - NULL for top-level comments, UUID for replies
- `content` - Comment text
- `created_at` - Comment timestamp
- `updated_at` - Last update timestamp
- `deleted_at` - Soft delete timestamp

**Business Logic:**
- Support 1 level of threading (replies to comments, no nested replies)
- Soft delete for comments

#### 5. `comment_likes` Table
Stores likes on comments.

```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
```

#### 6. `connections` Table
Stores mutual connections between users (LinkedIn-style).

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'blocked')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure user_id < connected_user_id to prevent duplicates
  CHECK (user_id < connected_user_id),
  UNIQUE(user_id, connected_user_id),
  CONSTRAINT connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT connections_connected_user_id_fkey FOREIGN KEY (connected_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_connected_user_id ON connections(connected_user_id);
CREATE INDEX idx_connections_status ON connections(status);
```

**Fields:**
- `id` - Unique connection identifier
- `user_id` - First user (always smaller UUID)
- `connected_user_id` - Second user (always larger UUID)
- `status` - 'connected' or 'blocked'
- `connected_at` - Connection timestamp

**Business Logic:**
- Mutual connections only (both users must accept)
- Store with `user_id < connected_user_id` to prevent duplicates
- Query both directions: `WHERE user_id = X OR connected_user_id = X`

#### 7. `connection_requests` Table
Stores pending connection requests.

```sql
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT, -- Optional message with request
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One pending request per pair
  UNIQUE(requester_id, recipient_id) WHERE status = 'pending',
  CONSTRAINT connection_requests_requester_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT connection_requests_recipient_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (requester_id != recipient_id)
);

CREATE INDEX idx_connection_requests_requester ON connection_requests(requester_id);
CREATE INDEX idx_connection_requests_recipient ON connection_requests(recipient_id);
CREATE INDEX idx_connection_requests_status ON connection_requests(status);
CREATE INDEX idx_connection_requests_pending ON connection_requests(recipient_id, status) WHERE status = 'pending';
```

**Fields:**
- `id` - Unique request identifier
- `requester_id` - User sending request
- `recipient_id` - User receiving request
- `status` - 'pending', 'accepted', 'rejected', 'cancelled'
- `message` - Optional message
- `created_at` - Request timestamp
- `updated_at` - Last update timestamp

**Business Logic:**
- When accepted, create entry in `connections` table and update request status
- Only one pending request per pair at a time

#### 8. `profile_experience` Table
Stores work/project experience (LinkedIn-style).

```sql
CREATE TABLE profile_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE,
  end_date DATE, -- NULL for current
  description TEXT,
  collaborators UUID[], -- Array of user IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profile_experience_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profile_experience_user_id ON profile_experience(user_id);
CREATE INDEX idx_profile_experience_dates ON profile_experience(start_date DESC, end_date DESC);
```

**Fields:**
- `id` - Unique experience identifier
- `user_id` - Profile owner
- `title` - Project/title name
- `role` - User's role in project
- `start_date` - Start date
- `end_date` - End date (NULL for current)
- `description` - Optional description
- `collaborators` - Array of user IDs (tagged collaborators)

#### 9. `profile_skills` Table (Many-to-Many)
Stores user skills (tags/pills).

```sql
CREATE TABLE profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, skill),
  CONSTRAINT profile_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profile_skills_user_id ON profile_skills(user_id);
CREATE INDEX idx_profile_skills_skill ON profile_skills(skill);
```

#### 10. `profile_instruments` Table (Many-to-Many)
Stores user instruments (tags/pills).

```sql
CREATE TABLE profile_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, instrument),
  CONSTRAINT profile_instruments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profile_instruments_user_id ON profile_instruments(user_id);
CREATE INDEX idx_profile_instruments_instrument ON profile_instruments(instrument);
```

### Profile Table Updates

Add new columns to existing `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_headline TEXT CHECK (char_length(professional_headline) <= 120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_active_start INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_active_end INTEGER; -- NULL for current
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genres TEXT[]; -- Array of genre strings
```

**New Fields:**
- `professional_headline` - Max 120 characters (e.g., "Gospel Singer & Songwriter")
- `years_active_start` - Year started
- `years_active_end` - Year ended (NULL for current)
- `genres` - Array of genre strings

### Future Tables (Phase 3)

#### `endorsements` Table
```sql
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(endorser_id, endorsee_id, skill),
  CONSTRAINT endorsements_endorser_fkey FOREIGN KEY (endorser_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT endorsements_endorsee_fkey FOREIGN KEY (endorsee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (endorser_id != endorsee_id)
);
```

#### `recommendations` Table
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT recommendations_recommender_fkey FOREIGN KEY (recommender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT recommendations_recommendee_fkey FOREIGN KEY (recommendee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (recommender_id != recommendee_id)
);
```

---

## 🔌 API Endpoints Required

### Posts Endpoints

#### `POST /api/posts`
Create a new post.

**Request Body:**
```json
{
  "content": "Just wrapped recording my debut EP! 🎵",
  "visibility": "connections", // or "public"
  "post_type": "update", // "update", "opportunity", "achievement", "collaboration", "event"
  "event_id": "optional-event-uuid",
  "attachments": [
    {
      "type": "image",
      "file": "base64-encoded-image-or-url"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "post-uuid",
    "user_id": "user-uuid",
    "content": "Just wrapped recording my debut EP! 🎵",
    "visibility": "connections",
    "post_type": "update",
    "created_at": "2025-11-23T10:00:00Z",
    "attachments": [...],
    "author": {
      "id": "user-uuid",
      "name": "Sarah Johnson",
      "avatar_url": "...",
      "role": "Gospel Singer"
    }
  }
}
```

**Validation:**
- Content required (max 500 characters)
- Must have content OR attachment
- Image max 5MB (JPG, PNG, WEBP)
- Audio max 10MB, max 60 seconds (MP3, WAV)
- Visibility must be 'connections' or 'public'

#### `GET /api/posts/feed`
Get feed posts for authenticated user.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 15, max: 50)
- `type` - Filter by post type (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-uuid",
        "content": "...",
        "visibility": "connections",
        "post_type": "update",
        "created_at": "2025-11-23T10:00:00Z",
        "author": {
          "id": "user-uuid",
          "name": "Sarah Johnson",
          "avatar_url": "...",
          "role": "Gospel Singer"
        },
        "attachments": [...],
        "reactions": {
          "support": 45,
          "love": 12,
          "fire": 8,
          "congrats": 0,
          "user_reaction": "support" // null if user hasn't reacted
        },
        "comment_count": 5,
        "is_connected": true // Whether user is connected to author
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 150,
      "has_more": true
    }
  }
}
```

**Feed Algorithm:**
1. Posts from connections (visibility: 'connections' or 'public')
2. Posts from nearby professionals (location-based, visibility: 'public')
3. Recommended opportunities (tagged as 'opportunity')
4. Suggested content (based on genre, role, interests)

#### `GET /api/posts/:id`
Get single post with full details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "post-uuid",
    "content": "...",
    "author": {...},
    "attachments": [...],
    "reactions": {...},
    "comments": [
      {
        "id": "comment-uuid",
        "content": "...",
        "author": {...},
        "created_at": "...",
        "like_count": 5,
        "user_liked": false,
        "replies": [...]
      }
    ],
    "event": {...} // If linked to event
  }
}
```

#### `DELETE /api/posts/:id`
Delete a post (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**Authorization:** Only post author can delete

#### `POST /api/posts/:id/reactions`
Add or update reaction to a post.

**Request Body:**
```json
{
  "reaction_type": "support" // "support", "love", "fire", "congrats"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reaction": {
      "id": "reaction-uuid",
      "reaction_type": "support"
    },
    "updated_counts": {
      "support": 46,
      "love": 12,
      "fire": 8,
      "congrats": 0
    }
  }
}
```

**Business Logic:**
- If user already reacted, update reaction type
- If user reacted with same type, remove reaction (toggle)

#### `DELETE /api/posts/:id/reactions`
Remove reaction from a post.

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_counts": {
      "support": 45,
      "love": 12,
      "fire": 8,
      "congrats": 0
    }
  }
}
```

#### `GET /api/posts/:id/comments`
Get comments for a post.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Comments per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-uuid",
        "content": "...",
        "author": {...},
        "created_at": "...",
        "like_count": 5,
        "user_liked": false,
        "replies": [
          {
            "id": "reply-uuid",
            "content": "...",
            "author": {...},
            "created_at": "...",
            "like_count": 2,
            "user_liked": false
          }
        ]
      }
    ],
    "pagination": {...}
  }
}
```

#### `POST /api/posts/:id/comments`
Add a comment to a post.

**Request Body:**
```json
{
  "content": "Great work! Looking forward to hearing more."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "comment-uuid",
      "content": "...",
      "author": {...},
      "created_at": "...",
      "like_count": 0,
      "user_liked": false,
      "replies": []
    }
  }
}
```

#### `POST /api/posts/:id/comments/:commentId/replies`
Reply to a comment.

**Request Body:**
```json
{
  "content": "Thank you!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply-uuid",
      "content": "...",
      "author": {...},
      "created_at": "...",
      "like_count": 0,
      "user_liked": false
    }
  }
}
```

#### `POST /api/posts/:id/share`
Share a post (creates notification, returns shareable link).

**Response:**
```json
{
  "success": true,
  "data": {
    "share_url": "https://www.soundbridge.live/posts/post-uuid",
    "message": "Post shared successfully"
  }
}
```

### Connection Endpoints

#### `POST /api/connections/request`
Send a connection request.

**Request Body:**
```json
{
  "recipient_id": "user-uuid",
  "message": "Optional message with request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "request-uuid",
      "recipient_id": "user-uuid",
      "status": "pending",
      "created_at": "..."
    }
  }
}
```

**Validation:**
- Cannot send request to self
- Cannot send if already connected
- Cannot send if pending request exists

#### `GET /api/connections/requests`
Get pending connection requests for authenticated user.

**Query Parameters:**
- `type` - 'sent' or 'received' (default: 'received')

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request-uuid",
        "requester": {
          "id": "user-uuid",
          "name": "John Doe",
          "avatar_url": "...",
          "role": "Music Producer",
          "mutual_connections": 5
        },
        "message": "Optional message",
        "created_at": "..."
      }
    ]
  }
}
```

#### `POST /api/connections/:requestId/accept`
Accept a connection request.

**Response:**
```json
{
  "success": true,
  "data": {
    "connection": {
      "id": "connection-uuid",
      "connected_user": {...},
      "connected_at": "..."
    }
  }
}
```

**Business Logic:**
- Create entry in `connections` table
- Update request status to 'accepted'
- Send notification to requester

#### `POST /api/connections/:requestId/reject`
Reject a connection request.

**Response:**
```json
{
  "success": true,
  "message": "Connection request rejected"
}
```

**Business Logic:**
- Update request status to 'rejected'
- Do not create connection

#### `GET /api/connections`
Get user's connections.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Connections per page (default: 20)
- `search` - Search by name (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "user-uuid",
        "name": "John Doe",
        "avatar_url": "...",
        "role": "Music Producer",
        "location": "London, UK",
        "connected_at": "..."
      }
    ],
    "pagination": {...}
  }
}
```

#### `GET /api/connections/suggestions`
Get suggested connections.

**Query Parameters:**
- `limit` - Number of suggestions (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "user-uuid",
        "name": "Jane Smith",
        "avatar_url": "...",
        "role": "Gospel Singer",
        "location": "London, UK",
        "mutual_connections": 5,
        "reason": "You both know John Doe" // or "Based on your location", "Similar profession"
      }
    ]
  }
}
```

**Algorithm:**
- Mutual connections (highest priority)
- Location proximity
- Genre/interest overlap
- Similar role/profession

#### `GET /api/connections/mutual/:userId`
Get mutual connections with a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "mutual_connections": [
      {
        "id": "user-uuid",
        "name": "John Doe",
        "avatar_url": "...",
        "role": "Music Producer"
      }
    ],
    "count": 5
  }
}
```

### Profile Endpoints

#### `POST /api/profile/headline`
Update professional headline.

**Request Body:**
```json
{
  "headline": "Gospel Singer & Songwriter"
}
```

**Validation:**
- Max 120 characters

#### `GET /api/profile/experience`
Get user's experience entries.

**Response:**
```json
{
  "success": true,
  "data": {
    "experience": [
      {
        "id": "exp-uuid",
        "title": "Debut EP Production",
        "role": "Producer",
        "start_date": "2025-01-01",
        "end_date": "2025-03-01",
        "description": "...",
        "collaborators": [...]
      }
    ]
  }
}
```

#### `POST /api/profile/experience`
Add or update experience entry.

**Request Body:**
```json
{
  "id": "exp-uuid", // Optional, if updating
  "title": "Debut EP Production",
  "role": "Producer",
  "start_date": "2025-01-01",
  "end_date": "2025-03-01", // null for current
  "description": "Optional description",
  "collaborators": ["user-uuid-1", "user-uuid-2"]
}
```

#### `DELETE /api/profile/experience/:id`
Delete an experience entry.

#### `POST /api/profile/skills`
Update user skills.

**Request Body:**
```json
{
  "skills": ["Vocals", "Production", "Mixing", "Songwriting"]
}
```

#### `POST /api/profile/instruments`
Update user instruments.

**Request Body:**
```json
{
  "instruments": ["Piano", "Guitar", "Drums"]
}
```

### Network/Feed Endpoints

#### `GET /api/network/opportunities`
Get opportunity posts (tagged as 'opportunity').

**Query Parameters:**
- `location` - Filter by location (optional)
- `genre` - Filter by genre (optional)
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "post-uuid",
        "content": "Seeking acoustic artists for December lineup...",
        "author": {...},
        "location": "Manchester, UK",
        "date": "2025-12-10",
        "created_at": "..."
      }
    ],
    "pagination": {...}
  }
}
```

---

## 📁 File Upload & Storage

### Storage Requirements

#### Separate Storage Buckets
- **Post Attachments Bucket:** `post-attachments`
  - Images: `post-attachments/images/{post_id}/{filename}`
  - Audio: `post-attachments/audio/{post_id}/{filename}`
- **Music Tracks Bucket:** `music-tracks` (existing, unchanged)

### Upload Endpoints

#### `POST /api/posts/upload-image`
Upload image for post attachment.

**Request:**
- Multipart form data
- Field: `file` (image file)
- Field: `post_id` (optional, if attaching to existing post)

**Response:**
```json
{
  "success": true,
  "data": {
    "file_url": "https://storage.supabase.co/...",
    "file_name": "image.jpg",
    "file_size": 2048000,
    "mime_type": "image/jpeg"
  }
}
```

**Validation:**
- Max 5MB
- Allowed types: JPG, PNG, WEBP
- Auto-compress/optimize images
- Generate thumbnails

#### `POST /api/posts/upload-audio`
Upload audio preview for post attachment.

**Request:**
- Multipart form data
- Field: `file` (audio file)
- Field: `post_id` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "file_url": "https://storage.supabase.co/...",
    "file_name": "preview.mp3",
    "file_size": 5120000,
    "mime_type": "audio/mpeg",
    "duration": 45, // in seconds
    "thumbnail_url": "https://storage.supabase.co/..." // Generated thumbnail
  }
}
```

**Validation:**
- Max 10MB
- Max 60 seconds duration
- Allowed types: MP3, WAV
- Extract duration
- Generate audio waveform/thumbnail

### Image Processing
- Compress images (reduce file size)
- Convert to WebP where supported
- Generate thumbnails
- Validate dimensions

### Audio Processing
- Extract duration
- Validate max 60 seconds
- Generate waveform/thumbnail
- Convert format if needed

---

## 🔔 Real-Time Features

### Supabase Real-Time Subscriptions

#### Post Updates
```typescript
// New posts in feed
supabase
  .channel('posts:feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: 'visibility=eq.public'
  }, (payload) => {
    // Handle new post
  })
  .subscribe();
```

#### Reactions
```typescript
// Real-time reaction updates
supabase
  .channel('post_reactions')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'post_reactions',
    filter: 'post_id=eq.POST_ID'
  }, (payload) => {
    // Handle reaction change
  })
  .subscribe();
```

#### Comments
```typescript
// Real-time comment updates
supabase
  .channel('post_comments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'post_comments',
    filter: 'post_id=eq.POST_ID'
  }, (payload) => {
    // Handle new comment
  })
  .subscribe();
```

#### Connection Requests
```typescript
// Real-time connection requests
supabase
  .channel('connection_requests')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'connection_requests',
    filter: 'recipient_id=eq.USER_ID'
  }, (payload) => {
    // Handle new connection request
  })
  .subscribe();
```

### Real-Time Requirements
- Enable Supabase real-time for all new tables
- Set up RLS policies for real-time subscriptions
- Handle connection state (online/offline)
- Optimize subscription performance

---

## 🔍 Search Functionality

### Search Endpoint

#### `GET /api/search`
Search across posts, professionals, opportunities.

**Query Parameters:**
- `q` - Search query (required)
- `type` - Filter type: 'posts', 'professionals', 'opportunities', 'all' (default: 'all')
- `location` - Filter by location (optional)
- `genre` - Filter by genre (optional)
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "professionals": [...],
    "opportunities": [...],
    "pagination": {...}
  }
}
```

### Search Implementation
- Full-text search on post content
- Search user profiles (name, role, headline)
- Search opportunities (content, location)
- Use PostgreSQL full-text search or Elasticsearch
- Index relevant columns for performance

---

## 🔒 Row Level Security (RLS) Policies

### Posts Table RLS

```sql
-- Users can view posts from connections or public posts
CREATE POLICY "Users can view connection posts"
ON posts FOR SELECT
USING (
  visibility = 'public' OR
  user_id IN (
    SELECT connected_user_id FROM connections WHERE user_id = auth.uid()
    UNION
    SELECT user_id FROM connections WHERE connected_user_id = auth.uid()
  )
);

-- Users can only insert their own posts
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (user_id = auth.uid());
```

### Post Reactions RLS

```sql
-- Users can view all reactions
CREATE POLICY "Users can view reactions"
ON post_reactions FOR SELECT
USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
ON post_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
ON post_reactions FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON post_reactions FOR DELETE
USING (user_id = auth.uid());
```

### Post Comments RLS

```sql
-- Users can view comments on visible posts
CREATE POLICY "Users can view comments"
ON post_comments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM posts WHERE
      visibility = 'public' OR
      user_id IN (
        SELECT connected_user_id FROM connections WHERE user_id = auth.uid()
        UNION
        SELECT user_id FROM connections WHERE connected_user_id = auth.uid()
      )
  )
);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON post_comments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON post_comments FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON post_comments FOR DELETE
USING (user_id = auth.uid());
```

### Connections RLS

```sql
-- Users can view their own connections
CREATE POLICY "Users can view own connections"
ON connections FOR SELECT
USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- Users can insert connections (via API, not direct)
-- Disable direct inserts, use API endpoint only
```

### Connection Requests RLS

```sql
-- Users can view requests they sent or received
CREATE POLICY "Users can view own requests"
ON connection_requests FOR SELECT
USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- Users can insert requests they send
CREATE POLICY "Users can insert own requests"
ON connection_requests FOR INSERT
WITH CHECK (requester_id = auth.uid());

-- Recipients can update requests (accept/reject)
CREATE POLICY "Recipients can update requests"
ON connection_requests FOR UPDATE
USING (recipient_id = auth.uid());
```

### Profile Experience RLS

```sql
-- Users can view all experience (public profiles)
CREATE POLICY "Users can view experience"
ON profile_experience FOR SELECT
USING (true);

-- Users can only insert their own experience
CREATE POLICY "Users can insert own experience"
ON profile_experience FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own experience
CREATE POLICY "Users can update own experience"
ON profile_experience FOR UPDATE
USING (user_id = auth.uid());

-- Users can only delete their own experience
CREATE POLICY "Users can delete own experience"
ON profile_experience FOR DELETE
USING (user_id = auth.uid());
```

---

## 📊 Feed Algorithm

### Feed Ranking Logic

The feed should prioritize content in this order:

1. **Connection Posts (Highest Priority)**
   - Posts from users you're connected to
   - Visibility: 'connections' or 'public'
   - Sorted by: Recent activity (reactions, comments) + recency

2. **Nearby Professional Posts**
   - Posts from professionals in your location
   - Visibility: 'public'
   - Sorted by: Location proximity + recency

3. **Opportunity Posts**
   - Posts tagged as 'opportunity'
   - Filtered by: Location, genre, role match
   - Sorted by: Relevance score + recency

4. **Recommended Content**
   - Based on: Genre overlap, role similarity, mutual connections
   - Sorted by: Relevance score

### Feed Algorithm Implementation

```sql
-- Example feed query (simplified)
WITH user_connections AS (
  SELECT connected_user_id as user_id FROM connections WHERE user_id = $1
  UNION
  SELECT user_id FROM connections WHERE connected_user_id = $1
),
relevant_posts AS (
  SELECT 
    p.*,
    CASE
      WHEN p.user_id IN (SELECT user_id FROM user_connections) THEN 100
      WHEN p.post_type = 'opportunity' THEN 50
      ELSE 10
    END as relevance_score
  FROM posts p
  WHERE 
    p.deleted_at IS NULL AND
    (
      p.visibility = 'public' OR
      p.user_id IN (SELECT user_id FROM user_connections)
    )
  ORDER BY relevance_score DESC, p.created_at DESC
  LIMIT $2 OFFSET $3
)
SELECT * FROM relevant_posts;
```

### Personalization Factors
- User's connections
- User's location
- User's genre preferences
- User's role/profession
- User's interaction history (reactions, comments)
- Mutual connections
- Post engagement (reactions, comments)

---

## 🔔 Notifications

### New Notification Types

1. **New Connection Request**
   - Trigger: Connection request created
   - Recipient: Request recipient
   - Action: Navigate to Network tab

2. **Connection Accepted**
   - Trigger: Connection request accepted
   - Recipient: Request sender
   - Action: Navigate to Network tab

3. **New Comment on Post**
   - Trigger: Comment created on user's post
   - Recipient: Post author
   - Action: Navigate to post

4. **New Reaction on Post**
   - Trigger: Reaction added to user's post
   - Recipient: Post author
   - Action: Navigate to post (optional, can be batched)

5. **New Reply to Comment**
   - Trigger: Reply to user's comment
   - Recipient: Comment author
   - Action: Navigate to post

6. **New Opportunity Post**
   - Trigger: Opportunity post created (if matches user preferences)
   - Recipient: Users matching criteria (location, genre, role)
   - Action: Navigate to post

### Notification Endpoints

#### `GET /api/notifications`
Get user notifications.

**Query Parameters:**
- `type` - Filter by type (optional)
- `unread_only` - Only unread (default: false)
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "type": "connection_request",
        "title": "New Connection Request",
        "message": "John Doe wants to connect",
        "read": false,
        "created_at": "...",
        "action_url": "/network"
      }
    ],
    "unread_count": 5
  }
}
```

---

## ⚡ Performance Considerations

### Database Indexes

Ensure these indexes exist:

```sql
-- Posts
CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_visibility_created_at ON posts(visibility, created_at DESC);
CREATE INDEX idx_posts_post_type_created_at ON posts(post_type, created_at DESC);

-- Connections
CREATE INDEX idx_connections_user_id_status ON connections(user_id, status);
CREATE INDEX idx_connections_connected_user_id_status ON connections(connected_user_id, status);

-- Connection Requests
CREATE INDEX idx_connection_requests_recipient_status ON connection_requests(recipient_id, status) WHERE status = 'pending';

-- Post Reactions
CREATE INDEX idx_post_reactions_post_id_type ON post_reactions(post_id, reaction_type);

-- Post Comments
CREATE INDEX idx_post_comments_post_id_created_at ON post_comments(post_id, created_at DESC);
```

### Caching Strategy

- Cache user profile data (don't refetch for every post)
- Cache connection lists
- Cache feed for 1-2 minutes (then refresh)
- Use Redis for frequently accessed data

### Query Optimization

- Use pagination (limit 15 posts per page)
- Use `SELECT` only needed columns
- Use joins efficiently
- Avoid N+1 queries (use batch loading)

### Image Optimization

- Serve WebP format where supported
- Generate multiple sizes (thumbnail, medium, full)
- Lazy load images in feed
- Use CDN for image delivery

---

## 🧪 Testing Requirements

### Unit Tests
- Post creation validation
- Connection request logic
- Feed algorithm
- RLS policies

### Integration Tests
- API endpoints
- File uploads
- Real-time subscriptions
- Notification triggers

### Performance Tests
- Feed loading (should load in <1 second)
- Search performance
- File upload performance
- Real-time subscription performance

---

## 📅 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
1. Database schema creation
2. RLS policies setup
3. Basic API endpoints (posts, connections)
4. File upload endpoints

### Phase 2: Engagement Features (Week 3)
1. Reactions API
2. Comments API
3. Real-time subscriptions
4. Notifications

### Phase 3: Feed & Discovery (Week 4)
1. Feed algorithm implementation
2. Search functionality
3. Connection suggestions
4. Opportunity recommendations

### Phase 4: Profile Enhancements (Week 5)
1. Professional headline
2. Experience entries
3. Skills and instruments
4. Profile API updates

### Phase 5: Optimization & Polish (Week 6)
1. Performance optimization
2. Caching implementation
3. Error handling
4. Documentation

---

## ❓ Questions for Clarification

1. **Feed Algorithm Complexity:** Simple (connections first) or advanced (ML-based relevance)?
2. **Connection System:** Mutual acceptance only, or also one-way follows?
3. **Post Visibility:** Only 'connections' and 'public', or more granular (e.g., 'followers')?
4. **Audio Previews:** 60-second clips extracted from full tracks, or separate uploads?
5. **Real-time:** Use Supabase real-time or custom WebSocket solution?
6. **Search:** PostgreSQL full-text search or Elasticsearch?
7. **Notifications:** Real-time push or polling?
8. **File Storage:** Supabase Storage or separate CDN (Cloudflare, AWS S3)?

---

## 📝 Notes

- All endpoints should follow existing API patterns
- Use existing authentication system
- Maintain backward compatibility where possible
- Document all new endpoints in API documentation
- Consider rate limiting for post creation and reactions
- Implement proper error handling and validation
- Use consistent response formats

---

**This is a major feature addition. We recommend starting with Phase 1 and iterating based on feedback.**

**Estimated Total Development Time:** 5-6 weeks for full implementation

**Priority:** High - This is a core feature for the professional networking identity

---

**Thank you for your collaboration!** 🙏

