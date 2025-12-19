# Answers to Mobile Team Questions

**Response to Mobile Team Questions - December 17, 2025**

Hi Mobile Team! 👋

Thank you for the detailed questions! Here are complete answers to all 5 questions, plus the testing support you requested.

---

## ✅ 1. Appeal Endpoint Status

**Question:** Is `POST /api/tracks/{trackId}/appeal` already implemented?

**Answer:** ✅ **YES - Just implemented for you!**

### Endpoint Details

```
POST /api/tracks/{trackId}/appeal

Headers:
  Content-Type: application/json
  Cookie: {session-cookie}

Body:
{
  "appealText": "string (20-500 characters)"
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Appeal submitted successfully. We will review it within 24-48 hours."
}
```

### Error Responses

| Status | Error Message | Reason |
|--------|--------------|--------|
| 400 | "Appeal must be at least 20 characters" | Text too short |
| 400 | "Appeal must be less than 500 characters" | Text too long |
| 400 | "Only rejected tracks can be appealed" | Track not rejected |
| 400 | "This track has already been appealed" | Already submitted appeal |
| 401 | "Unauthorized" | User not logged in |
| 403 | "You can only appeal your own tracks" | Not track owner |
| 404 | "Track not found" | Invalid track ID |

### What Happens When Appeal is Submitted

1. Track status: `rejected` → `appealed`
2. Appeal text saved to `audio_tracks.appeal_text`
3. Appeal status set to `pending`
4. In-app notification sent to admins
5. Confirmation notification sent to user
6. Admin reviews within 24-48 hours

### Example Usage

```typescript
const submitAppeal = async (trackId: string, appealText: string) => {
  const response = await fetch(`/api/tracks/${trackId}/appeal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appealText })
  });

  const data = await response.json();

  if (data.success) {
    Alert.alert('Appeal Submitted', data.message);
  } else {
    Alert.alert('Error', data.error);
  }
};
```

---

## ✅ 2. Track Visibility Rules

**Question:** Should tracks with `moderation_status = 'flagged'` be visible in public feeds?

**Answer:** Here are the **exact visibility rules:**

### Complete Visibility Matrix

| Status | Public Feed | User Profile | Search | Reason |
|--------|-------------|--------------|--------|--------|
| `pending_check` | ✅ Visible | ✅ Visible | ✅ Yes | Just uploaded, checking soon |
| `checking` | ✅ Visible | ✅ Visible | ✅ Yes | Actively being checked |
| `clean` | ✅ Visible | ✅ Visible | ✅ Yes | Passed all checks |
| **`flagged`** | **❌ Hidden** | **✅ Visible** | **❌ No** | **Under admin review** |
| `approved` | ✅ Visible | ✅ Visible | ✅ Yes | Admin approved |
| `rejected` | ❌ Hidden | ✅ Visible | ❌ No | Admin rejected |
| `appealed` | ❌ Hidden | ✅ Visible | ❌ No | User appealed rejection |

### Why This Design?

**`pending_check` and `checking` are visible because:**
- Content hasn't been checked yet
- Assume innocent until proven guilty
- Checking happens within 5 minutes (fast)
- Maintains instant upload UX

**`flagged`, `rejected`, `appealed` are hidden because:**
- May contain harmful content
- Under review or already reviewed
- User can still see and manage in their profile
- Prevents public exposure of problematic content

### Query Examples

**Public Feed:**
```typescript
const { data: publicTracks } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('is_public', true)
  .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
  .order('created_at', { ascending: false });
```

**User's Own Tracks (show all):**
```typescript
const { data: myTracks } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('creator_id', userId)
  .order('created_at', { ascending: false });
// No status filter - show everything including flagged/rejected
```

**Search Results:**
```typescript
const { data: searchResults } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('is_public', true)
  .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
  .textSearch('title', searchQuery);
```

---

## ✅ 3. Testing Support

**Question:** Can you help us test?

**Answer:** Absolutely! Here's everything you need.

### A. Create Test Flagged Track

Run this SQL in Supabase dashboard:

```sql
INSERT INTO audio_tracks (
  id,
  creator_id,
  title,
  artist_name,
  file_url,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  transcription,
  moderation_checked_at,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',  -- Replace with your test user ID
  'Test Flagged Track',
  'Test Artist',
  'https://example.com/test-audio.mp3',
  'flagged',
  true,
  ARRAY['Harassment detected', 'Spam pattern detected'],
  0.92,
  'This is a test transcription with potentially harmful content for testing purposes.',
  NOW(),
  true,
  NOW(),
  NOW()
);
```

**After creating, you can:**
- See it in your profile (visible)
- Verify it's hidden from public feed
- View flag reasons in UI
- Test appeal workflow

### B. Send Sample Push Notification

**Use this script to send a test notification:**

```javascript
// test-notification.js
const EXPO_PUSH_TOKEN = 'ExponentPushToken[your-token-here]';
const TRACK_ID = 'test-track-uuid';

async function sendTestNotification() {
  const message = {
    to: EXPO_PUSH_TOKEN,
    sound: 'default',
    title: '✅ Track Approved!',
    body: '"Test Track" is now live',
    data: {
      trackId: TRACK_ID,
      type: 'moderation',
      action: 'approved'
    },
    priority: 'high',
    channelId: 'moderation'
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });

  const result = await response.json();
  console.log('Test notification sent:', result);
}

sendTestNotification();
```

**Or use cURL:**

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[your-token-here]",
    "sound": "default",
    "title": "✅ Track Approved!",
    "body": "\"Test Track\" is now live",
    "data": {
      "trackId": "test-track-uuid",
      "type": "moderation",
      "action": "approved"
    },
    "priority": "high"
  }'
```

### C. Test User Credentials

**Staging Environment:**
- URL: https://staging.soundbridge.live
- Test user: test@soundbridge.com
- Password: (check 1Password or contact us)

**Admin Access:**
- URL: https://soundbridge.live/admin/moderation
- Admin user: (contact backend team for credentials)
- We can grant you temporary admin access for testing

---

## ✅ 4. Backwards Compatibility

**Question:** What about existing tracks (uploaded before moderation system)?

**Answer:** ✅ **Already handled!**

### Migration Applied

We ran this migration when deploying:

```sql
-- Set default values for all existing tracks
UPDATE audio_tracks
SET
  moderation_status = 'clean',
  moderation_checked_at = created_at,
  moderation_flagged = false
WHERE moderation_status IS NULL;
```

### Result

- ✅ All existing tracks have `moderation_status = 'clean'`
- ✅ They appear in public feeds normally
- ✅ No `NULL` values exist

### Mobile App Impact

**You can safely assume:**
- `moderation_status` is **never** `NULL`
- No special handling needed for old tracks
- All tracks have a valid status value

**Query safely:**
```typescript
// This will work for all tracks
const status = track.moderation_status; // Always has a value
```

---

## ✅ 5. Notification Payload Format

**Question:** Can you confirm the exact push notification payload?

**Answer:** Here's the **complete specification** for all 6 notification types:

### Standard Structure

```typescript
interface ModerationPushNotification {
  to: string;                    // Expo push token
  sound: 'default';
  title: string;                 // Notification title
  body: string;                  // Notification message
  data: {
    trackId: string;             // UUID of the track
    type: 'moderation';          // Always 'moderation'
    action: 'approved' | 'rejected' | 'flagged' | 'appeal_received' | 'appeal_approved' | 'appeal_rejected';
  };
  priority: 'high' | 'default';
  channelId?: 'moderation';      // Android channel
}
```

### 1. Track Flagged

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "⚠️ Track Under Review",
  "body": "Your track \"Song Title\" is being reviewed by our team",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "flagged"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

### 2. Track Approved

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "✅ Track Approved!",
  "body": "\"Song Title\" is now live",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "approved"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

### 3. Track Rejected

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "❌ Track Not Approved",
  "body": "\"Song Title\" was not approved. Tap to appeal.",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "rejected"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

### 4. Appeal Received

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "📬 Appeal Received",
  "body": "We're reviewing your appeal for \"Song Title\"",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "appeal_received"
  },
  "priority": "default",
  "channelId": "moderation"
}
```

### 5. Appeal Approved

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "🎉 Appeal Approved!",
  "body": "\"Song Title\" has been reinstated",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "appeal_approved"
  },
  "priority": "high",
  "channelId": "moderation"
}
```

### 6. Appeal Rejected

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "Appeal Decision",
  "body": "Decision made on your appeal for \"Song Title\"",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation",
    "action": "appeal_rejected"
  },
  "priority": "default",
  "channelId": "moderation"
}
```

### Handling in Mobile App

```typescript
import * as Notifications from 'expo-notifications';

// Listen for notifications when app is open
Notifications.addNotificationReceivedListener((notification) => {
  const { data } = notification.request.content;

  if (data.type === 'moderation') {
    console.log('Moderation notification:', data.action);

    // Refresh track data if needed
    if (data.trackId) {
      refreshTrack(data.trackId);
    }
  }
});

// Handle notification tap
Notifications.addNotificationResponseReceivedListener((response) => {
  const { data } = response.notification.request.content;

  if (data.type === 'moderation' && data.trackId) {
    // Navigate to track detail
    navigation.navigate('TrackDetail', { trackId: data.trackId });
  }
});
```

---

## 📚 Additional Resources

We've created three comprehensive documents for you:

### 1. MOBILE_TEAM_MODERATION_GUIDE.md
- Complete implementation guide (1,071 lines)
- Database schema changes
- API endpoints
- Code examples
- Testing checklist

**Link:** [MOBILE_TEAM_MODERATION_GUIDE.md](https://github.com/Asibe-Cheta/soundbridge/blob/main/MOBILE_TEAM_MODERATION_GUIDE.md)

### 2. PHASES_1_5_SUMMARY.md
- Backend implementation details (870 lines)
- Processing flow explanation
- Environment variables
- Performance metrics

**Link:** [PHASES_1_5_SUMMARY.md](https://github.com/Asibe-Cheta/soundbridge/blob/main/PHASES_1_5_SUMMARY.md)

### 3. MOBILE_TEAM_TESTING_GUIDE.md
- Complete testing utilities
- Test scripts
- Database queries
- Success criteria

**Link:** [MOBILE_TEAM_TESTING_GUIDE.md](https://github.com/Asibe-Cheta/soundbridge/blob/main/MOBILE_TEAM_TESTING_GUIDE.md)

---

## 🤝 What We're Providing

### Immediate Support

1. ✅ **Test Environment Access**
   - Staging database with test data
   - Admin dashboard access
   - Test user credentials

2. ✅ **Testing Utilities**
   - SQL scripts to create test tracks
   - Push notification test scripts
   - Database query examples

3. ✅ **Quick Response**
   - Slack: #moderation-implementation
   - Response time: < 1 hour during business hours
   - Direct support for blockers

### During Development

4. ✅ **Test Track Creation**
   - We can create flagged tracks on demand
   - Different flag types for testing
   - Different statuses to test UI

5. ✅ **Manual Notifications**
   - We can trigger test notifications
   - Different notification types
   - Verify payload format

6. ✅ **Admin Actions**
   - Approve/reject test tracks
   - Trigger state changes
   - Verify notification delivery

---

## 🎯 Ready to Start?

### You Now Have

- ✅ Answers to all 5 questions
- ✅ Complete API endpoint documentation
- ✅ Exact notification payload specifications
- ✅ Test track creation scripts
- ✅ Test notification utilities
- ✅ TypeScript type definitions
- ✅ Complete testing checklist

### Next Steps

1. Start Phase 1 implementation (push tokens, badges, filtering)
2. Use test utilities as you build
3. Reach out if you hit any blockers
4. Submit PRs when ready

### Backend Status

- ✅ All backend endpoints deployed
- ✅ Cron job running every 5 minutes
- ✅ Notifications sending successfully
- ✅ Admin dashboard functional
- ✅ Appeal endpoint live

**We're ready to support you every step of the way!** 🚀

---

## 📞 Contact

**For questions or support:**
- Slack: #moderation-implementation (for updates)
- Slack: DM @backend-lead (for urgent issues)
- Email: backend-team@soundbridge.com

**For testing:**
- Request test tracks: Slack #moderation-testing
- Request test notifications: Slack #moderation-testing
- Request admin access: DM @backend-lead

---

**Thanks for the great questions! Let us know if you need anything else.** 🙌

**Backend Team**
December 17, 2025

---

*Answers to Mobile Team Questions*
*SoundBridge Content Moderation System*
