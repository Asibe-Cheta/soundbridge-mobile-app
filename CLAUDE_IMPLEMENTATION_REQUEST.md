# Mobile App Implementation Request - Professional Networking Features

## Context

The web app team has completed all backend infrastructure for the professional networking features. We now need to implement the mobile app integration following the UI/UX restructure requirements.

## Documents Provided

1. **WEB_TEAM_PROFESSIONAL_NETWORKING_IMPLEMENTATION_COMPLETE.md** - Complete backend implementation details
   - All API endpoints are ready
   - Database schema is in place
   - RLS policies configured
   - File upload endpoints available
   - Real-time subscriptions enabled

2. **UI_UX_RESTRUCTURE.md** - Complete UI/UX requirements
   - Navigation restructure (Feed, Discover, Upload, Network, Profile)
   - Feed page with posts, reactions, comments
   - Post creation modal
   - Connection system
   - Profile enhancements

3. **BACKEND_REQUIREMENTS_FOR_UI_RESTRUCTURE.md** - Original backend requirements (reference)

## Current Mobile App State

- React Native app with Expo
- Existing navigation structure (Home, Discover, Upload, Messages, Profile)
- Supabase integration for auth and data
- Existing screens and components
- Authentication system working (including 2FA)

## Implementation Approach: Phased Development

We want to implement this in phases to allow incremental testing and easier debugging:

### Phase 1: Navigation & Feed UI Foundation (Mock Data)
- Restructure bottom navigation (Feed, Discover, Upload, Network, Profile)
- Move Messages icon to header (top right)
- Create Feed screen structure with mock posts
- Create PostCard component (UI only, mock data)
- Create CreatePostModal component (UI only, no API yet)
- Update HomeScreen → FeedScreen
- Move existing content from Home to Discover
- Keep Upload functionality unchanged

### Phase 2: Post Creation & API Integration
- Integrate CreatePostModal with API (`POST /api/posts`)
- Implement file upload for images (`POST /api/posts/upload-image`)
- Implement file upload for audio (`POST /api/posts/upload-audio`)
- Connect Feed to real API (`GET /api/posts/feed`)
- Replace mock data with real API responses
- Implement post deletion

### Phase 3: Engagement Features (Reactions & Comments)
- Implement reactions UI and API (`POST /api/posts/[id]/reactions`)
- Implement comments UI and API (`GET /api/posts/[id]/comments`, `POST /api/posts/[id]/comments`)
- Implement comment replies (`POST /api/posts/[id]/comments/[commentId]/replies`)
- Implement comment likes (`POST /api/comments/[id]/like`)
- Real-time updates for reactions and comments

### Phase 4: Connection System
- Create Network screen with all sections
- Implement connection requests (`POST /api/connections/request`)
- Implement accept/reject (`POST /api/connections/[requestId]/accept`)
- Implement connection list (`GET /api/connections`)
- Implement connection suggestions (`GET /api/connections/suggestions`)
- Real-time connection request notifications

### Phase 5: Profile Enhancements & Polish
- Add professional headline (`PUT /api/profile/headline`)
- Add experience section (`GET /api/profile/experience`, `POST /api/profile/experience`)
- Add skills management (`GET /api/profile/skills`, `POST /api/profile/skills`)
- Add instruments management (`GET /api/profile/instruments`, `POST /api/profile/instruments`)
- Update profile display with new fields
- Search functionality (`GET /api/search`)
- Performance optimization
- Error handling and edge cases

## Key Requirements

### Navigation Changes
- **Bottom Navigation:** Feed | Discover | Upload | Network | Profile
- **Header:** Messages icon (top right, replaces bell icon)
- **Upload:** Keep in center, unchanged functionality

### Feed Page
- Create Post component at top
- Live Audio Sessions banner (second position)
- Professional feed posts (from API)
- Interspersed recommendations
- Infinite scroll with pagination

### Post Creation
- Text input (max 500 characters)
- Image attachment (max 2MB: JPG, PNG, WEBP)
- Audio preview attachment (max 10MB, max 60 seconds: MP3, WAV)
- Event linking (optional)
- Visibility toggle (Connections Only vs Public)
- Post types: update, opportunity, achievement, collaboration, event

### Post Display
- Author info (profile pic, name, role, timestamp)
- Post content with attachments
- Reactions (Support, Love, Fire, Congrats)
- Comments with threading (1 level deep)
- Share functionality

### Connection System
- Send/accept/reject connection requests
- View connections list
- Connection suggestions with reasons
- Mutual connections display
- Real-time request notifications

### Profile Enhancements
- Professional headline (max 120 chars)
- Connection count
- Skills (tags/pills)
- Instruments (tags/pills)
- Experience entries (LinkedIn-style)
- Years active

## Technical Considerations

### API Base URL
```
https://soundbridge.live/api/...
```

### Authentication
- All endpoints require `Authorization: Bearer <token>` header
- Use existing Supabase session management

### File Uploads
- Images: `POST /api/posts/upload-image` (multipart/form-data)
- Audio: `POST /api/posts/upload-audio` (multipart/form-data)
- Storage bucket: `post-attachments` (public)

### Real-Time Features
- Use Supabase real-time subscriptions
- Subscribe to: posts, post_reactions, post_comments, connection_requests
- See web team's `REALTIME_SUBSCRIPTIONS_GUIDE.md` for examples

### Error Handling
- All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Pagination
- All list endpoints support pagination
- Query params: `page` (default: 1), `limit` (default varies)
- Response includes `pagination` object with `has_more` flag

## Questions for You

1. **Implementation Order:** Does the phased approach make sense, or would you prefer a different order?

2. **Mock Data:** For Phase 1, should we create realistic mock data that matches the API response format, or use simple placeholder data?

3. **Component Structure:** Should we create new components (PostCard, CreatePostModal, NetworkScreen) or modify existing ones?

4. **State Management:** Should we use React Context for feed state, connection state, etc., or local component state?

5. **Real-Time:** Should we implement real-time subscriptions from Phase 2 (with real API) or wait until Phase 3?

6. **Error Handling:** What level of error handling do you want? Toast notifications? Inline errors? Retry logic?

7. **Loading States:** Should we use skeleton loaders, spinners, or both?

8. **Image Handling:** Should we use `expo-image-picker` for images and `expo-document-picker` for audio, or different libraries?

9. **Navigation:** Should we use React Navigation's existing structure, or need any changes?

10. **Testing:** Should we test each phase before moving to the next, or build everything then test?

## What I Need From You

1. **Review the documents** - Confirm you understand the requirements
2. **Create an implementation plan** - Detailed plan for each phase
3. **Identify any concerns** - Technical challenges, missing information, etc.
4. **Start with Phase 1** - Begin with navigation restructure and Feed UI (mock data)
5. **Provide code structure** - How to organize new components, services, types

## Important Notes

- **Upload functionality must remain unchanged** - The Upload button in navigation is for full music track distribution (existing feature)
- **Post creation is separate** - Create Post is for professional updates (new feature)
- **Preserve existing functionality** - Don't break existing features
- **Follow existing code patterns** - Use existing component library, styling, navigation patterns
- **Maintain brand identity** - Purple/pink gradient, glassmorphism, dark theme

## Ready to Start?

Please:
1. Confirm you've reviewed all documents
2. Create a detailed implementation plan
3. Identify any questions or concerns
4. Start implementing Phase 1 (Navigation + Feed UI with mock data)

I'm ready to work with you step-by-step through each phase. Let me know if you need any clarification or have questions!

---

**Base URL:** `https://soundbridge.live`  
**API Documentation:** See WEB_TEAM_PROFESSIONAL_NETWORKING_IMPLEMENTATION_COMPLETE.md  
**UI Requirements:** See UI_UX_RESTRUCTURE.md

