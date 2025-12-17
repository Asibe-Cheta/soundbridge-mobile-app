# 📱 Mobile Team - Content Moderation Implementation Plan

**Date:** December 17, 2025  
**From:** Mobile Development Team  
**To:** Web Development Team  
**Re:** Content Moderation System Integration

---

## ✅ Documentation Received & Reviewed

Thank you for the comprehensive documentation! We've reviewed all the guides:

- ✅ `MOBILE_TEAM_MODERATION_GUIDE.md` - Complete implementation guide
- ✅ `MODERATION_SYSTEM_INDEX.md` - System overview and index
- ✅ `PHASES_6_8_DEPLOYMENT.md` - Admin dashboard and notifications
- ✅ `CRON_JOB_SETUP.md` - Background moderation job
- ✅ `WHISPER_SETUP_GUIDE.md` - Transcription service

**Status:** Ready to begin implementation! 🚀

---

## 📊 Impact Assessment

### What Changed on Backend

1. **Database Schema:**
   - New fields on `audio_tracks` table (moderation status, flags, confidence)
   - New notification type: `'moderation'`
   - New field on `profiles`: `expo_push_token`

2. **Moderation Flow:**
   - Tracks uploaded with `moderation_status = 'pending_check'`
   - Automated checking every 5 minutes
   - Admin review for flagged content
   - Multi-channel notifications (email, in-app, push)

3. **User Experience:**
   - Tracks are immediately live after upload ✅
   - Automated checks happen in background
   - Users notified if action needed
   - Appeal workflow for rejected content

---

## 🎯 Implementation Priority

### Phase 1: Critical (High Priority) - Week 1

**Must implement first - Required for basic functionality:**

1. **Store Expo Push Token** ⏰ 2 hours
   - Register push notifications on login
   - Save token to `profiles.expo_push_token`
   - Handle permission requests

2. **Display Moderation Status** ⏰ 4 hours
   - Add moderation badges to track cards
   - Show status on track detail screens
   - Use consistent colors and icons

3. **Filter Content by Status** ⏰ 2 hours
   - Hide rejected tracks from public feed
   - Show all tracks (with status) in own profile
   - Add query filters for moderation status

4. **Handle Push Notifications** ⏰ 3 hours
   - Listen for incoming notifications
   - Navigate to tracks when tapped
   - Show notifications when app is open

**Total Time: ~11 hours (1.5 days)**

---

### Phase 2: Important (Medium Priority) - Week 2

**Enhanced UX and information:**

5. **Track Detail Moderation Info** ⏰ 3 hours
   - Show detailed moderation status
   - Display flag reasons (if flagged)
   - Show approval/rejection messages

6. **In-App Notifications List** ⏰ 4 hours
   - Fetch notifications from database
   - Display moderation notifications
   - Mark as read when tapped
   - Real-time updates (Supabase subscriptions)

7. **My Tracks Filters** ⏰ 2 hours
   - Add filter buttons (All, Under Review, Rejected, Approved)
   - Filter tracks by moderation status
   - Show counts for each status

**Total Time: ~9 hours (1 day)**

---

### Phase 3: Nice to Have (Low Priority) - Week 3

**Future enhancements:**

8. **Appeal Workflow** ⏰ 6 hours
   - Create appeal screen
   - Submit appeal API call
   - Show appeal confirmation
   - Display appeal status

9. **Real-Time Updates** ⏰ 2 hours
   - Subscribe to track updates
   - Auto-refresh when status changes
   - Show toast notifications

10. **Analytics for Users** ⏰ 3 hours
    - Show moderation stats on profile
    - Track approval rate
    - Display recent activity

**Total Time: ~11 hours (1.5 days)**

---

## 🏗️ Architecture Review

### Mobile App's Current Approach

**Good news:** We already use direct Supabase queries, so integration is straightforward!

```typescript
// Current pattern (works perfectly for moderation)
const { data } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('creator_id', userId);
```

**For moderation, we'll add:**
```typescript
// Updated query to include moderation fields
const { data } = await supabase
  .from('audio_tracks')
  .select(`
    *,
    moderation_status,
    moderation_flagged,
    flag_reasons,
    moderation_confidence
  `)
  .eq('creator_id', userId);
```

### No Architecture Changes Needed! ✅

- ✅ Already using direct Supabase client
- ✅ Already have notification system
- ✅ Already have push notification infrastructure
- ✅ Just need to add moderation-specific UI and logic

---

## 📝 Implementation Checklist

### Phase 1: Critical Features

#### 1. Push Notifications Setup

**File:** `src/services/NotificationService.ts`

- [ ] Add function to register Expo push token
- [ ] Call on app launch and after login
- [ ] Save token to `profiles.expo_push_token`
- [ ] Handle permission requests gracefully
- [ ] Test token storage in Supabase

**Code snippet needed:**
```typescript
import * as Notifications from 'expo-notifications';

const registerPushToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id);
};
```

#### 2. Moderation Badges Component

**File:** `src/components/ModerationBadge.tsx` (NEW)

- [ ] Create reusable badge component
- [ ] Support all status types (pending_check, checking, clean, flagged, approved, rejected)
- [ ] Use consistent colors and icons
- [ ] Only show to track owner

**Badge colors:**
```typescript
const MODERATION_COLORS = {
  pending_check: '#9CA3AF', // Gray
  checking: '#3B82F6',      // Blue
  clean: '#10B981',         // Green
  flagged: '#F59E0B',       // Orange
  approved: '#10B981',      // Green
  rejected: '#EF4444'       // Red
};
```

#### 3. Update Track Queries

**Files to update:**
- `src/screens/DiscoverScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/lib/supabase.ts` (dbHelpers)

- [ ] Add moderation fields to all track queries
- [ ] Filter public feeds to only show `clean` or `approved` tracks
- [ ] Show all statuses on own profile
- [ ] Add moderation status to TypeScript interfaces

**Public feed filter:**
```typescript
.in('moderation_status', ['clean', 'approved'])
```

#### 4. Push Notification Handlers

**File:** `src/App.tsx` or `src/services/NotificationService.ts`

- [ ] Set up notification handler
- [ ] Listen for notifications when app is open
- [ ] Handle notification taps (navigate to track)
- [ ] Show local notification for moderation updates

---

### Phase 2: Important Features

#### 5. Track Detail Moderation Section

**File:** `src/screens/TrackDetailsScreen.tsx` or `src/screens/SongDetailScreen.tsx`

- [ ] Add moderation status section (only for track owner)
- [ ] Show detailed status messages
- [ ] Display flag reasons if flagged
- [ ] Add "Appeal" button if rejected
- [ ] Show success banner if approved

**UI mockup:**
```
⚠️ Under Review
Your track is being reviewed by our moderation team.
Flagged for:
• Potential spam pattern detected
• Low confidence score (0.72)

You'll be notified of the decision soon.
```

#### 6. Notifications List Screen

**File:** `src/screens/NotificationsScreen.tsx` (may need to update)

- [ ] Fetch notifications including moderation type
- [ ] Display moderation icon (🔍)
- [ ] Navigate to track when tapped
- [ ] Mark as read
- [ ] Real-time updates via Supabase subscriptions

#### 7. My Tracks Filters

**File:** `src/screens/ProfileScreen.tsx` or create new `MyTracksScreen.tsx`

- [ ] Add filter buttons
- [ ] Filter tracks by status
- [ ] Show counts for each filter
- [ ] Update query based on selected filter

---

### Phase 3: Nice to Have Features

#### 8. Appeal Screen

**File:** `src/screens/AppealScreen.tsx` (NEW)

- [ ] Create new screen
- [ ] Show track info and flag reasons
- [ ] Text input for appeal explanation
- [ ] Character limit (500)
- [ ] Submit button
- [ ] Confirmation message

**API endpoint needed from web team:**
```
POST /api/tracks/{trackId}/appeal
Body: { appealText: string }
```

⚠️ **Note:** Web team mentioned this endpoint needs to be created.

#### 9. Real-Time Status Updates

**File:** Various track screens

- [ ] Subscribe to track updates
- [ ] Refresh UI when status changes
- [ ] Show toast notification
- [ ] Unsubscribe on unmount

#### 10. User Analytics

**File:** `src/screens/ProfileScreen.tsx`

- [ ] Show moderation stats card
- [ ] Display approval rate
- [ ] Show recent moderation activity
- [ ] Add to analytics dashboard if exists

---

## 🔍 Questions for Web Team

### Clarifications Needed

1. **Appeal Endpoint Status**
   - Is `POST /api/tracks/{trackId}/appeal` already implemented?
   - Or do we need to wait for this?
   - Can we use direct Supabase for appeals instead?

2. **Notification Format**
   - What's the exact structure of moderation push notifications?
   - Do they match the format in the guide?
   - Can we see a sample notification payload?

3. **Track Visibility**
   - Should `flagged` tracks be visible in public feeds?
   - Or only `clean` and `approved`?
   - What about `pending_check` status?

4. **Testing**
   - Is there a test environment we can use?
   - Can you flag a test track for us to test the flow?
   - Do we have test push tokens?

5. **Backwards Compatibility**
   - What about existing tracks (before moderation system)?
   - Do they have `moderation_status = null` or `'clean'`?
   - Should we handle null values?

---

## 🧪 Testing Plan

### Unit Tests

- [ ] Push token registration
- [ ] Moderation badge rendering for all statuses
- [ ] Content filtering logic
- [ ] Notification parsing

### Integration Tests

- [ ] Upload track → verify status is `pending_check`
- [ ] Receive push notification → navigate to track
- [ ] View flagged track → see flag reasons
- [ ] Filter tracks by status
- [ ] Submit appeal (when endpoint ready)

### Manual Testing

- [ ] Upload test track
- [ ] Wait for moderation check (~5 minutes)
- [ ] Verify status updates
- [ ] Check push notification received
- [ ] Test all UI states (pending, flagged, approved, rejected)
- [ ] Test appeal workflow

### Edge Cases

- [ ] No internet connection during notification
- [ ] Notification permission denied
- [ ] Track deleted while under review
- [ ] Multiple tracks flagged at once
- [ ] Very long flag reasons (UI overflow)

---

## 📦 Dependencies

### New Packages Required

**None! All dependencies already in place:**
- ✅ `expo-notifications` - Already using
- ✅ `@supabase/supabase-js` - Already using
- ✅ `react-native-async-storage` - Already using

### Existing Services to Update

- ✅ `NotificationService.ts` - Add push token registration
- ✅ `supabase.ts` (dbHelpers) - Add moderation field selections
- ✅ Track screens - Add moderation UI
- ✅ TypeScript types - Add moderation fields

---

## 🎨 UI/UX Design Notes

### Design Consistency

**Colors** (from web team guide):
```typescript
const MODERATION_COLORS = {
  pending_check: '#9CA3AF', // Gray
  checking: '#3B82F6',      // Blue  
  clean: '#10B981',         // Green
  flagged: '#F59E0B',       // Orange
  approved: '#10B981',      // Green
  rejected: '#EF4444'       // Red
};
```

**Icons:**
```typescript
const MODERATION_ICONS = {
  pending_check: '⏳',
  checking: '🔍',
  clean: '✓',
  flagged: '⚠️',
  approved: '✓',
  rejected: '✗'
};
```

### User-Facing Messages

**Upload Success:**
```
✅ Track Uploaded!

Your track is now live and will be automatically checked
for community guidelines within 5 minutes.
```

**Under Review:**
```
⚠️ Under Review

Your track has been flagged for manual review by our team.
You'll be notified of the decision within 24 hours.
```

**Approved:**
```
✅ Approved!

Your track has been approved and is now available to all users.
```

**Rejected:**
```
❌ Not Approved

Your track did not meet our community guidelines.
You can appeal this decision if you believe it was made in error.
```

---

## 📅 Implementation Timeline

### Week 1 (Phase 1 - Critical)
**Dec 18-22, 2025**

- Day 1-2: Push notification setup and testing
- Day 3: Moderation badges and status display
- Day 4: Content filtering implementation
- Day 5: Testing and bug fixes

**Deliverable:** Basic moderation support (push notifications, status display, content filtering)

---

### Week 2 (Phase 2 - Important)
**Dec 25-29, 2025** (Holiday week - adjusted timeline)

- Day 1-2: Track detail moderation sections
- Day 3: In-app notifications integration
- Day 4: My Tracks filters
- Day 5: Testing and refinement

**Deliverable:** Enhanced moderation UX (detailed info, notifications, filters)

---

### Week 3 (Phase 3 - Optional)
**Jan 1-5, 2026**

- Day 1-2: Appeal workflow (if endpoint ready)
- Day 3: Real-time updates
- Day 4: User analytics
- Day 5: Final testing and documentation

**Deliverable:** Complete moderation feature set

---

## 🤝 Collaboration Points

### What We Need From Web Team

1. **Confirmation:**
   - ✅ Backend is fully deployed and working
   - ✅ Cron job is running every 5 minutes
   - ✅ Push notification sending is working

2. **Testing Support:**
   - 🙏 Create a test track that gets flagged
   - 🙏 Send us a sample push notification
   - 🙏 Give us admin access to test full flow

3. **API Clarification:**
   - 🙏 Confirm appeal endpoint status
   - 🙏 Share exact notification payload format

4. **Documentation:**
   - ✅ Already provided (excellent!)
   - 📝 Any updates, please let us know

### What Web Team Can Expect From Us

1. **Timeline:**
   - Phase 1 (Critical): End of Week 1 (Dec 22)
   - Phase 2 (Important): End of Week 2 (Dec 29)
   - Phase 3 (Optional): End of Week 3 (Jan 5)

2. **Communication:**
   - Daily progress updates in Slack
   - Screenshots of UI implementation
   - Questions as they arise

3. **Testing:**
   - Comprehensive testing before release
   - Beta testing with TestFlight
   - Bug reports and fixes

4. **Documentation:**
   - Update mobile codebase comments
   - Create mobile-specific moderation docs
   - User-facing help articles (if needed)

---

## 🚀 Ready to Start!

### Immediate Next Steps

1. ✅ Review all documentation (DONE)
2. ⏳ Get answers to clarification questions
3. ⏳ Set up test environment
4. ⏳ Begin Phase 1 implementation
5. ⏳ Create development branch: `feature/content-moderation`

### Development Branch Strategy

```bash
# Create feature branch
git checkout -b feature/content-moderation

# Implement Phase 1
git commit -m "feat: Add push notification registration for moderation"
git commit -m "feat: Add moderation badges to track cards"
git commit -m "feat: Filter tracks by moderation status"
git commit -m "feat: Handle moderation push notifications"

# Create PR for Phase 1
git push origin feature/content-moderation
# Open PR: "Content Moderation Integration - Phase 1 (Critical)"

# After Phase 1 approved and merged, continue with Phase 2
```

---

## 📊 Success Metrics

### Phase 1 Complete When:
- ✅ Push tokens saved to database
- ✅ Moderation badges show on own tracks
- ✅ Rejected tracks hidden from public feed
- ✅ Push notifications navigate to tracks
- ✅ No errors in production logs

### Phase 2 Complete When:
- ✅ Track details show moderation info
- ✅ In-app notifications display moderation updates
- ✅ My Tracks filters work correctly
- ✅ Real-time updates refresh UI
- ✅ All UI states tested

### Phase 3 Complete When:
- ✅ Appeal workflow functional
- ✅ Analytics display correctly
- ✅ All edge cases handled
- ✅ Documentation complete
- ✅ Beta testers confirm functionality

---

## 💬 Communication Channels

### For Questions:
- **Slack:** #mobile-dev or #moderation-implementation
- **Email:** mobile-team@soundbridge.com
- **GitHub Issues:** Label with `moderation`

### For Updates:
- **Daily Standup:** Progress reports
- **Slack Updates:** Major milestones
- **PR Reviews:** Code review requests

---

## 🎉 Final Thoughts

**Excellent documentation, web team!** 🙌

The `MOBILE_TEAM_MODERATION_GUIDE.md` is incredibly thorough and has everything we need. The code examples, UI recommendations, and testing checklist are perfect.

**We're excited to implement this!** The moderation system looks well-designed and the integration should be straightforward given our existing architecture.

**Estimated Total Implementation Time:**
- Phase 1 (Critical): ~11 hours
- Phase 2 (Important): ~9 hours  
- Phase 3 (Optional): ~11 hours
- **Total: ~31 hours (~4 working days)**

With testing, refinement, and potential blockers, we estimate **2-3 weeks** for complete implementation of all phases.

---

**Let's do this! 🚀**

Mobile Development Team  
December 17, 2025

---

## 📎 Reference Documents

1. `MOBILE_TEAM_MODERATION_GUIDE.md` - Main implementation guide
2. `MODERATION_SYSTEM_INDEX.md` - System overview
3. `PHASES_6_8_DEPLOYMENT.md` - Backend deployment details
4. `CRON_JOB_SETUP.md` - Background job documentation
5. `WHISPER_SETUP_GUIDE.md` - Transcription service info

All documents reviewed and understood! ✅

