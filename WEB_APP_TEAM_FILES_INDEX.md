# 📁 Web App Team - Implementation Files Index

**Date:** December 16, 2025  
**Purpose:** Complete list of all files the web app team needs for implementing feature parity  
**Status:** ✅ Ready for Distribution

---

## 🎯 START HERE

### **Primary Implementation Guide**
**File:** `WEB_APP_IMPLEMENTATION_GUIDE.md`

This is your **master guide** containing:
- ✅ Complete database schemas
- ✅ All API endpoints with request/response formats
- ✅ Deep linking URL structures
- ✅ Tier limits and validation logic
- ✅ Data structures (TypeScript interfaces)
- ✅ RLS policies
- ✅ Storage bucket configurations
- ✅ Test cases
- ✅ Implementation checklist

**Read this first!**

---

## 🗄️ Database Schema Files

### **1. Albums Database Schema**
**File:** `CREATE_ALBUMS_TABLES.sql`

**Contains:**
- Albums table definition
- Album tracks junction table
- Indexes for performance
- Triggers for auto-updating stats (track count, duration)
- Trigger for setting `published_at` timestamp
- RLS policies for albums and album_tracks
- Verification queries
- Optional test data

**Run this in:** Supabase SQL Editor

---

### **2. Playlists Database Schema**
**File:** `CREATE_PLAYLISTS_TABLES.sql`

**Contains:**
- Playlists table definition
- Playlist tracks junction table
- Indexes for performance
- Triggers for auto-updating counts
- RLS policies for playlists and playlist_tracks
- Verification queries
- Optional test data

**Run this in:** Supabase SQL Editor

---

## 📖 Feature Documentation Files

### **1. Album Feature Specification**
**File:** `ALBUM_FEATURE_SETUP.md`

**Contains:**
- Complete feature specification
- Tier system integration (Free, Premium, Unlimited)
- Album limits per tier
- Track limits per album
- Storage limits
- Design decisions (singles ↔ albums conversion, multi-album tracks, scheduled releases, drafts)
- Cost analysis
- Business logic
- Implementation phases

**Why read this:** Understand the full business requirements and tier logic

---

### **2. Share Links & Deep Linking Guide**
**File:** `SHARE_LINKS_AND_DEEP_LINKING.md`

**Contains:**
- Complete URL structure for all content types
- Share message formats
- Apple App Site Association (AASA) configuration
- Android Digital Asset Links configuration
- Open Graph tags for social media
- Twitter Card tags
- Deep link testing commands (iOS & Android)
- Implementation requirements

**Why read this:** Implement universal links and rich social previews

---

### **3. Albums Implementation Guide (Mobile)**
**File:** `ALBUMS_IMPLEMENTATION_GUIDE.md`

**Contains:**
- Step-by-step mobile implementation
- Database setup
- API helpers (dbHelpers functions)
- Upload flow
- Album details screen
- UI integration across app
- Code examples

**Why read this:** See how the mobile app implemented it (for consistency)

---

## 🔧 Additional Reference Files

### **Playlists Implementation**
**Files:**
- `PLAYLIST_CREATION_IMPLEMENTATION.md` - Playlist creation flow
- `PLAYLISTS_FIX.md` - Playlist database query fixes
- `PLAYLIST_SHARE_FIX.md` - Share feature implementation

**Why read these:** Understand playlist feature requirements and fixes applied

---

### **Today's Updates**
**Files:**
- `TODAY_FIXES_SUMMARY.md` - Summary of all recent fixes
- `FEED_AND_PROFILE_ENHANCEMENTS.md` - Feed navigation & profile picture zoom
- `ADD_TO_PLAYLIST_FREEZE_FIX.md` - Modal timing fixes
- `SHARE_FREEZE_FIX.md` - Share functionality platform-specific handling

**Why read these:** Understand recent bug fixes and platform-specific considerations

---

## 🎨 UI/UX Reference

### **Liquid Glass Design**
**File:** `LYRICS_SCREEN_IMPLEMENTATION.md`

**Contains:**
- Liquid Glass mini-player design
- Glassmorphism implementation
- Modal animations
- Apple Music-inspired design philosophy

**Why read this:** Understand the UI design language for consistency

---

## 📋 Key Implementation Details

### **Database Tables You Need:**

1. **`albums`**
   - Creator's albums
   - Status: draft, scheduled, published
   - Auto-calculated: tracks_count, total_duration

2. **`album_tracks`**
   - Junction table (many-to-many)
   - Links tracks to albums with track_number

3. **`playlists`**
   - User-created playlists
   - Public/private toggle
   - Auto-calculated: tracks_count, total_duration, followers_count

4. **`playlist_tracks`**
   - Junction table (many-to-many)
   - Links tracks to playlists with position

5. **`likes`** *(Already exists)*
   - Polymorphic: content_id + content_type
   - Supports: 'track', 'album', 'playlist', 'event'

---

### **Storage Buckets You Need:**

1. **`album-covers`**
   - Path: `{creator_id}/{album_id}.jpg`
   - Max size: 2MB
   - Public read, authenticated write (own folder only)

2. **`playlist-covers`** *(or use existing bucket)*
   - Path: `{creator_id}/{playlist_id}.jpg`
   - Max size: 2MB

---

### **Tier Limits to Enforce:**

| Tier | Albums | Tracks/Album | Uploads/Month |
|------|--------|--------------|---------------|
| Free | 0 | N/A | 3 (lifetime) |
| Premium | 2 | 7 | 7 |
| Unlimited | ∞ | ∞ | ∞ |

---

### **URL Paths to Implement:**

1. `https://soundbridge.live/track/[track-id]`
2. `https://soundbridge.live/album/[album-id]`
3. `https://soundbridge.live/playlist/[playlist-id]`
4. `https://soundbridge.live/creator/[creator-id]`
5. `https://soundbridge.live/event/[event-id]`

**Each page must:**
- Display content or "Download App" message
- Include Open Graph meta tags
- Include Twitter Card tags
- Work as universal link (open app if installed)

---

### **API Endpoints to Implement:**

**Albums:**
- `POST /api/albums` - Create album
- `GET /api/albums/:id` - Get album details
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album
- `POST /api/albums/:id/tracks` - Add track
- `DELETE /api/albums/:id/tracks/:trackId` - Remove track
- `PUT /api/albums/:id/reorder` - Reorder tracks
- `GET /api/creators/:id/albums` - Get creator's albums
- `GET /api/albums/public` - Get public albums (discovery)

**Playlists:**
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/:id` - Get playlist details
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/tracks` - Add track
- `DELETE /api/playlists/:id/tracks/:trackId` - Remove track
- `GET /api/users/:id/playlists` - Get user's playlists

**Likes:**
- `POST /api/likes/toggle` - Toggle like (polymorphic)
- `GET /api/likes/check` - Check if user liked content
- `GET /api/users/:id/likes` - Get user's likes

---

## 🚀 Implementation Order

### **Phase 1: Database (Week 1)**
1. Run `CREATE_ALBUMS_TABLES.sql`
2. Run `CREATE_PLAYLISTS_TABLES.sql`
3. Create storage buckets
4. Verify with test data

### **Phase 2: Backend API (Week 2)**
1. Implement Albums API
2. Implement Playlists API
3. Implement Likes API (polymorphic)
4. Add tier validation

### **Phase 3: Web Pages (Week 3)**
1. Create landing pages for tracks, albums, playlists, creators
2. Add Open Graph tags
3. Implement web player or "Download App" flow

### **Phase 4: Deep Linking (Week 4)**
1. Host AASA file
2. Host assetlinks.json
3. Configure HTTPS
4. Test on real devices

### **Phase 5: Testing & Launch (Week 5)**
1. API testing with Postman
2. Tier limits testing
3. RLS policies testing
4. Deep link testing
5. Social share preview testing

---

## ✅ What Mobile App Already Has

The mobile app (React Native) has fully implemented:

✅ **Albums:**
- Create/edit/delete albums
- Upload album covers
- Add/remove/reorder tracks
- Draft/scheduled/published states
- Album details screen with play all
- Albums tab in Discover screen
- "My Albums" in Profile screen
- "Go to Album" from music player

✅ **Playlists:**
- Create/edit/delete playlists
- Add/remove tracks
- Public/private playlists
- Playlist details screen
- "My Playlists" in Profile screen
- "Add to Playlist" from music player

✅ **Sharing:**
- Share tracks with deep links
- Share albums with deep links
- Share playlists with deep links
- Platform-specific handling (iOS/Android)

✅ **Deep Linking:**
- Universal links configured
- App scheme links configured
- Navigation to all content types

✅ **Likes:**
- Polymorphic likes system
- Like/unlike tracks, albums, playlists

✅ **Tier Limits:**
- Enforced on upload
- Enforced on album creation
- Clear error messages with upgrade prompts

---

## 📞 Need Help?

**Questions about:**
- Database schemas → See `CREATE_ALBUMS_TABLES.sql`, `CREATE_PLAYLISTS_TABLES.sql`
- API design → See `WEB_APP_IMPLEMENTATION_GUIDE.md` (API Endpoints section)
- Deep linking → See `SHARE_LINKS_AND_DEEP_LINKING.md`
- Business logic → See `ALBUM_FEATURE_SETUP.md`
- Mobile implementation → See `ALBUMS_IMPLEMENTATION_GUIDE.md`

**Contact:** Mobile team for any clarifications

---

## 📦 Files Summary

**Essential Files (Read These):**
1. ✅ `WEB_APP_IMPLEMENTATION_GUIDE.md` - **MASTER GUIDE**
2. ✅ `CREATE_ALBUMS_TABLES.sql` - Database schema for albums
3. ✅ `CREATE_PLAYLISTS_TABLES.sql` - Database schema for playlists
4. ✅ `SHARE_LINKS_AND_DEEP_LINKING.md` - URLs and universal links
5. ✅ `ALBUM_FEATURE_SETUP.md` - Business requirements

**Reference Files (Read If Needed):**
- `ALBUMS_IMPLEMENTATION_GUIDE.md` - Mobile implementation details
- `PLAYLIST_CREATION_IMPLEMENTATION.md` - Playlist feature details
- `TODAY_FIXES_SUMMARY.md` - Recent bug fixes
- `FEED_AND_PROFILE_ENHANCEMENTS.md` - Latest UI improvements

**Total:** 5 essential files + 4 reference files = **9 files total**

---

## 🎯 Quick Start

1. **Read** `WEB_APP_IMPLEMENTATION_GUIDE.md` (30 min)
2. **Run** `CREATE_ALBUMS_TABLES.sql` in Supabase (5 min)
3. **Run** `CREATE_PLAYLISTS_TABLES.sql` in Supabase (5 min)
4. **Create** storage buckets (10 min)
5. **Implement** API endpoints (Week 2)
6. **Build** web pages (Week 3)
7. **Configure** deep linking (Week 4)
8. **Test** everything (Week 5)

**Total Time Estimate:** 4-5 weeks for full implementation

---

## 🎉 Result

After implementing all features, the web app will have:
- ✅ Full albums feature with tier limits
- ✅ Full playlists feature
- ✅ Polymorphic likes system
- ✅ Deep linking for all content
- ✅ Shareable links with rich previews
- ✅ Feature parity with mobile app

**Let's build something amazing together! 🚀**

