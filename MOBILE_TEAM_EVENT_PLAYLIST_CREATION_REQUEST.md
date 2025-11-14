# 📋 Mobile Team Request - Event & Playlist Creation Setup

**Date:** January 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Priority:** Medium

---

## 🎯 **OVERVIEW**

The mobile app currently shows "Coming Soon" alerts when users try to create events or playlists from the Profile screen. We need clarification on:

1. **Event Creation** - Is the backend ready? What's the setup process?
2. **Playlist Creation** - How should we implement this feature?

---

## 1️⃣ **EVENT CREATION**

### **Current Status:**
- ✅ `CreateEventScreen.tsx` exists and is registered in navigation
- ✅ Screen has form fields matching database schema
- ❌ ProfileScreen still shows "Coming Soon" alert instead of navigating
- ⚠️ Need confirmation: Is backend ready for event creation?

### **What We Have:**

**CreateEventScreen Features:**
- Event title, description, date/time
- Location, venue
- Category selection (13 categories)
- Pricing (GBP, NGN)
- Max attendees
- Image upload (to `event-images` bucket)

**Database Fields Used:**
- `title`, `description`, `event_date`, `location`, `venue`
- `category`, `price_gbp`, `price_ngn`, `max_attendees`
- `image_url`, `creator_id`

### **Questions for Web App Team:**

1. **Backend Readiness:**
   - ✅ Is the `/api/events` POST endpoint ready?
   - ✅ Are RLS policies configured to allow event creation?
   - ✅ Does the `event-images` storage bucket exist?

2. **API Endpoint:**
   - What's the exact endpoint for creating events?
   - What's the request/response format?
   - Are there any required fields we're missing?

3. **Authentication:**
   - Does event creation require Bearer token auth?
   - Should we use `apiClient.ts` or direct Supabase calls?

4. **Category Values:**
   - Are these categories valid: `Music Concert`, `Birthday Party`, `Carnival`, `Get Together`, `Music Karaoke`, `Comedy Night`, `Gospel Concert`, `Instrumental`, `Jazz Room`, `Workshop`, `Conference`, `Festival`, `Other`?
   - Or should we use different category values?

5. **Date/Time Format:**
   - Should `event_date` be ISO string format?
   - How should we combine date + time?

6. **Image Upload:**
   - Does `event-images` bucket exist?
   - What are the upload permissions?
   - Should images be public or private?

### **What We Need:**

- [ ] Confirmation that backend is ready
- [ ] API endpoint documentation
- [ ] Request/response examples
- [ ] Storage bucket setup confirmation
- [ ] Category values validation

---

## 2️⃣ **PLAYLIST CREATION**

### **Current Status:**
- ❌ No playlist creation screen exists
- ❌ ProfileScreen shows "Coming Soon" alert
- ⚠️ Need guidance: How should we implement this?

### **What We Know:**

**Existing Playlist Features:**
- ✅ `PlaylistDetailsScreen.tsx` exists (view playlists)
- ✅ Database tables exist (`playlists`, `playlist_tracks`)
- ✅ API endpoints mentioned in docs: `/api/playlists/public`, `/api/playlists/[id]`, `/api/playlists/user/[userId]`
- ❌ No creation endpoint documented

**Database Schema (from docs):**
```sql
playlists:
  - id (UUID)
  - creator_id (UUID)
  - name (string)
  - description (text, nullable)
  - cover_image_url (string, nullable)
  - is_public (boolean)
  - tracks_count (integer)
  - total_duration (integer, seconds)
  - followers_count (integer)
  - created_at, updated_at

playlist_tracks:
  - id (UUID)
  - playlist_id (UUID)
  - track_id (UUID)
  - position (integer)
  - added_at (timestamp)
```

### **Questions for Web App Team:**

1. **Backend Readiness:**
   - ✅ Is there a POST endpoint for creating playlists?
   - ✅ What's the endpoint URL?
   - ✅ Are RLS policies configured?

2. **API Endpoint:**
   - What's the exact endpoint? (`/api/playlists` POST?)
   - What's the request format?
   - What's the response format?

3. **Required Fields:**
   - Is `name` required?
   - Is `description` optional?
   - Is `is_public` required? (default to `true` or `false`?)
   - Can we create empty playlists?

4. **Cover Image:**
   - Should we support cover image upload?
   - What storage bucket should we use? (`playlist-covers`?)
   - Is this optional?

5. **Adding Tracks:**
   - Should track addition be part of creation or separate?
   - What's the endpoint for adding tracks? (`/api/playlists/[id]/tracks` POST?)
   - Can we add multiple tracks at once?

6. **Limits:**
   - Are there playlist creation limits per user?
   - Are there track limits per playlist?
   - Any subscription tier restrictions?

7. **Validation:**
   - Any name length restrictions?
   - Any description length restrictions?
   - Can playlist names be duplicated by same user?

### **What We Need:**

- [ ] API endpoint for creating playlists
- [ ] Request/response format documentation
- [ ] Endpoint for adding tracks to playlists
- [ ] Storage bucket info for cover images (if applicable)
- [ ] Validation rules
- [ ] Limits/restrictions

---

## 3️⃣ **IMPLEMENTATION PLAN**

### **Once We Have Answers:**

**Event Creation:**
1. Update `ProfileScreen.tsx` to navigate to `CreateEvent` instead of showing alert
2. Update `CreateEventScreen.tsx` to use correct API endpoint
3. Test event creation end-to-end
4. Verify image upload works

**Playlist Creation:**
1. Create `CreatePlaylistScreen.tsx`
2. Add navigation route in `App.tsx`
3. Update `ProfileScreen.tsx` to navigate to playlist creation
4. Implement API calls using `apiClient.ts`
5. Add track selection/adding functionality
6. Test playlist creation end-to-end

---

## 4️⃣ **REFERENCES**

**Existing Documentation:**
- `EVENT_CREATION_ENABLED.md` - Says event creation was enabled, but code wasn't updated
- `MOBILE_TEAM_PLAYLISTS_IMPLEMENTATION.md` - Playlist viewing implementation
- `MOBILE_TEAM_UPDATE_EVENTS_MESSAGES_PLAYLISTS.md` - General updates

**Code Files:**
- `src/screens/CreateEventScreen.tsx` - Event creation screen (exists but may need API updates)
- `src/screens/PlaylistDetailsScreen.tsx` - Playlist viewing screen
- `src/screens/ProfileScreen.tsx` - Shows "Coming Soon" alerts (lines 446-451)

---

## 5️⃣ **URGENCY**

**Priority:** Medium  
**Blocking:** User experience (users see "Coming Soon" instead of functionality)  
**Timeline:** Would like to implement within 1-2 weeks

---

## 📞 **NEXT STEPS**

Please provide:
1. ✅ Confirmation on event creation backend readiness
2. ✅ API endpoint documentation for both features
3. ✅ Any setup requirements or prerequisites
4. ✅ Testing instructions

**Thank you!** 🙏

---

**Contact:** Mobile Team  
**Last Updated:** January 2025

