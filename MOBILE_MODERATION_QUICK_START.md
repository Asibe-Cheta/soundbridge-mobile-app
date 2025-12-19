# 🚀 Content Moderation - Mobile Quick Start Guide

**Start Date:** December 18, 2025  
**Target Completion:** January 5, 2026  
**Current Phase:** Phase 1 - Critical Features  

---

## ✅ Pre-Implementation Checklist

Before starting, ensure:

- [x] All documentation reviewed
- [ ] Test environment access confirmed
- [ ] Supabase schema changes verified in database
- [ ] Test push notification token obtained
- [ ] Development branch created: `feature/content-moderation`
- [ ] Questions sent to web team (if any)

---

## 📅 Week 1: Phase 1 - Critical Features

### Day 1: Push Notification Setup (3 hours)

**Morning:**
- [ ] Review `src/services/NotificationService.ts`
- [ ] Add `registerPushToken()` function
- [ ] Add permission request handling
- [ ] Test token generation in dev

**Afternoon:**
- [ ] Integrate with auth flow (call after login)
- [ ] Save token to `profiles.expo_push_token` in Supabase
- [ ] Verify token saved (check Supabase dashboard)
- [ ] Test on iOS and Android devices

**Files to modify:**
- `src/services/NotificationService.ts`
- `src/contexts/AuthContext.tsx` (add call after login)

**Test:**
```bash
# Check token in Supabase
SELECT id, username, expo_push_token 
FROM profiles 
WHERE id = 'your-user-id';
```

---

### Day 2: Moderation Badge Component (4 hours)

**Morning:**
- [ ] Create `src/components/ModerationBadge.tsx`
- [ ] Define color constants
- [ ] Define icon constants  
- [ ] Implement badge rendering logic
- [ ] Add styles

**Afternoon:**
- [ ] Integrate badge into `TrackCard` component
- [ ] Only show badge to track owner (add `isOwner` prop)
- [ ] Test all status types visually
- [ ] Adjust styling to match app theme

**Files to create:**
- `src/components/ModerationBadge.tsx`

**Files to modify:**
- `src/components/TrackCard.tsx` (if exists)
- Track list components in various screens

**Test cases:**
- [ ] Badge shows for own tracks
- [ ] Badge hidden for other users' tracks
- [ ] All 6 statuses render correctly (pending_check, checking, clean, flagged, approved, rejected)
- [ ] Colors match design
- [ ] Icons display correctly

---

### Day 3: Update TypeScript Types & Queries (4 hours)

**Morning:**
- [ ] Update `AudioTrack` interface in `src/types/database.ts`
- [ ] Add moderation fields to type definition
- [ ] Update all `dbHelpers` functions in `src/lib/supabase.ts`
- [ ] Add moderation fields to SELECT queries

**TypeScript interface to update:**
```typescript
interface AudioTrack {
  // ... existing fields
  moderation_status: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected';
  moderation_flagged: boolean;
  flag_reasons: string[] | null;
  moderation_confidence: number | null;
  transcription: string | null;
  moderation_checked_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}
```

**Afternoon:**
- [ ] Test queries return moderation fields
- [ ] Fix TypeScript errors throughout codebase
- [ ] Run `npm run type-check` (if available)

**Files to modify:**
- `src/types/database.ts`
- `src/lib/supabase.ts`

---

### Day 4: Content Filtering (2 hours)

**Morning:**
- [ ] Update `DiscoverScreen.tsx` - filter public tracks
- [ ] Update `HomeScreen.tsx` - filter public tracks
- [ ] Add filter: `.in('moderation_status', ['clean', 'approved'])`

**Afternoon:**
- [ ] Update `ProfileScreen.tsx` - show all statuses for own tracks
- [ ] Test public feed only shows approved content
- [ ] Test own profile shows all tracks with badges

**Files to modify:**
- `src/screens/DiscoverScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/ProfileScreen.tsx`

**Test:**
- [ ] Create test track (mark as rejected in Supabase)
- [ ] Verify it doesn't show in public feed
- [ ] Verify it shows in own profile with "rejected" badge

---

### Day 5: Push Notification Handlers (3 hours)

**Morning:**
- [ ] Configure notification handler in `App.tsx`
- [ ] Add listener for received notifications
- [ ] Add listener for tapped notifications
- [ ] Parse notification data

**Afternoon:**
- [ ] Implement navigation to track on tap
- [ ] Test notification when app is open
- [ ] Test notification when app is closed
- [ ] Test notification navigation

**Files to modify:**
- `src/App.tsx` (or main app file)
- `src/services/NotificationService.ts`

**Test with web team:**
- [ ] Request web team to send test notification
- [ ] Verify notification received
- [ ] Tap notification → verify navigation works
- [ ] Check notification data format

---

### 🎯 Week 1 Deliverable

**PR: "Content Moderation Integration - Phase 1 (Critical)"**

**Includes:**
- ✅ Push token registration
- ✅ Moderation badges on tracks
- ✅ Content filtering by status
- ✅ Push notification handling
- ✅ TypeScript types updated

**Screenshots needed:**
- Badge on own track (each status)
- Public feed (no rejected tracks)
- Own profile (showing rejected track with badge)
- Notification received

---

## 📅 Week 2: Phase 2 - Important Features

### Day 6: Track Detail Moderation Section (3 hours)

**Tasks:**
- [ ] Add moderation section to `TrackDetailsScreen.tsx` / `SongDetailScreen.tsx`
- [ ] Show detailed status for track owner
- [ ] Display flag reasons (if flagged/rejected)
- [ ] Add appeal button (if rejected)
- [ ] Style moderation alerts

**Test:**
- [ ] View own flagged track → see details
- [ ] View own rejected track → see appeal button
- [ ] View own approved track → see success banner
- [ ] View other user's track → no moderation info shown

---

### Day 7: In-App Notifications Fetch & Display (4 hours)

**Tasks:**
- [ ] Update notifications query to include moderation type
- [ ] Add moderation icon to notification items
- [ ] Handle notification tap (navigate to track)
- [ ] Mark notification as read
- [ ] Test with sample data

**Test:**
- [ ] Create sample moderation notification in database
- [ ] Verify it displays in notifications list
- [ ] Tap notification → navigate to track
- [ ] Verify marked as read

---

### Day 8: Real-Time Notifications (2 hours)

**Tasks:**
- [ ] Set up Supabase Realtime subscription
- [ ] Subscribe to notifications table
- [ ] Show local notification when new notification received
- [ ] Update notification list in real-time
- [ ] Unsubscribe on unmount

**Test:**
- [ ] Insert notification in Supabase (manually)
- [ ] Verify app receives update
- [ ] Verify local notification shown
- [ ] Verify notification added to list

---

### Day 9: My Tracks Filters (2 hours)

**Tasks:**
- [ ] Add filter buttons to profile/tracks screen
- [ ] Implement filter logic (All, Under Review, Rejected, Approved)
- [ ] Update query based on filter
- [ ] Show track counts for each filter

**Test:**
- [ ] Tap each filter → verify correct tracks shown
- [ ] Check counts match actual data
- [ ] Verify "All" shows all tracks

---

### Day 10: Testing & Bug Fixes (3 hours)

**Tasks:**
- [ ] Run full regression test
- [ ] Fix any bugs found
- [ ] Test on iOS and Android
- [ ] Update documentation

---

### 🎯 Week 2 Deliverable

**PR: "Content Moderation Integration - Phase 2 (Important)"**

**Includes:**
- ✅ Track detail moderation info
- ✅ In-app notifications integration
- ✅ Real-time notification updates
- ✅ My Tracks filters

---

## 📅 Week 3: Phase 3 - Optional Features

### Day 11-12: Appeal Workflow (6 hours)

**Tasks:**
- [ ] Create `AppealScreen.tsx`
- [ ] Design appeal form UI
- [ ] Implement character limit (500)
- [ ] Submit appeal (API call or Supabase)
- [ ] Show confirmation
- [ ] Navigate back

**Blocker:** Check if web team created appeal endpoint
- [ ] If yes: Use `POST /api/tracks/{trackId}/appeal`
- [ ] If no: Create Supabase table for appeals

---

### Day 13: User Analytics (3 hours)

**Tasks:**
- [ ] Add moderation stats to profile screen
- [ ] Calculate approval rate
- [ ] Show recent moderation activity
- [ ] Style analytics cards

---

### Day 14-15: Final Testing & Documentation (6 hours)

**Tasks:**
- [ ] End-to-end testing
- [ ] Edge case testing
- [ ] Update mobile documentation
- [ ] Create user guide (if needed)
- [ ] Beta testing preparation

---

### 🎯 Week 3 Deliverable

**PR: "Content Moderation Integration - Phase 3 (Complete)"**

**Includes:**
- ✅ Appeal workflow
- ✅ User analytics
- ✅ Complete testing
- ✅ Documentation

---

## 🐛 Common Issues & Solutions

### Issue: Push token not saving

**Check:**
- Notification permissions granted?
- Supabase connection working?
- User authenticated?

**Solution:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.log('User not authenticated');
  return;
}
```

---

### Issue: Moderation fields not in query result

**Check:**
- Did you add fields to SELECT?
- Are fields in database?

**Solution:**
```typescript
.select(`
  *,
  moderation_status,
  moderation_flagged,
  flag_reasons
`)
```

---

### Issue: Badge not showing

**Check:**
- Is `isOwner` prop correct?
- Is `moderation_status` defined?
- Is component imported?

**Debug:**
```typescript
console.log('Track owner:', track.creator_id);
console.log('Current user:', currentUserId);
console.log('Is owner:', isOwner);
console.log('Moderation status:', track.moderation_status);
```

---

### Issue: Notification not received

**Check:**
- Is push token saved?
- Did web team send notification?
- Are permissions granted?

**Test:**
```bash
# Send test notification via Expo
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxx]",
    "title": "Test",
    "body": "Test notification"
  }'
```

---

## 📝 Daily Progress Report Template

```markdown
## Progress Report - Day X

**Date:** [Date]
**Tasks Completed:**
- [x] Task 1
- [x] Task 2
- [ ] Task 3 (in progress)

**Blockers:**
- None / [Blocker description]

**Questions for Web Team:**
- [Question 1]
- [Question 2]

**Screenshots:**
- [Attach screenshots]

**Next Steps:**
- [ ] Task for tomorrow
```

---

## 🎯 Success Criteria Quick Check

### Phase 1 Complete? ✅
- [ ] Can register push token
- [ ] Badge shows on own tracks
- [ ] Public feed filters out rejected tracks
- [ ] Notifications navigate to tracks
- [ ] No console errors

### Phase 2 Complete? ✅
- [ ] Track details show moderation info
- [ ] Notifications list works
- [ ] Real-time updates work
- [ ] Filters work correctly
- [ ] UI looks polished

### Phase 3 Complete? ✅
- [ ] Can submit appeal
- [ ] Analytics display
- [ ] All edge cases handled
- [ ] Beta tested
- [ ] Documentation done

---

## 🚦 Traffic Light Status

**Update this daily:**

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 - Push Tokens | 🟢 | Complete |
| Phase 1 - Badges | 🟡 | In progress |
| Phase 1 - Filtering | 🔴 | Not started |
| Phase 1 - Notifications | 🔴 | Not started |
| Phase 2 | 🔴 | Not started |
| Phase 3 | 🔴 | Not started |

**Legend:**
- 🟢 Complete
- 🟡 In Progress
- 🔴 Not Started
- ⚫ Blocked

---

## 📞 Quick Contacts

**Web Team Lead:** [Name]  
**Backend Questions:** #backend-team  
**Testing Support:** [Name]  
**Design Questions:** #design-team  

---

**Let's ship this! 🚀**

*Last updated: December 17, 2025*

