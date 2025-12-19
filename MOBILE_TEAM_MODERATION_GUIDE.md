# Mobile Team - Content Moderation Implementation Guide

**SoundBridge Content Moderation System**
**For React Native/Expo Mobile App**

This guide provides everything the mobile team needs to implement content moderation features in the mobile app, integrating with the web backend's Phases 1-8 implementation.

---

## Overview

The web backend now has a complete content moderation system. The mobile app needs to:

1. ✅ Handle moderation states when uploading tracks
2. ✅ Display moderation status to users
3. ✅ Receive and display moderation notifications
4. ✅ Implement appeal workflow for rejected content
5. ✅ Filter content based on moderation status

---

## Table of Contents

1. [Database Schema Changes](#database-schema-changes)
2. [API Endpoints Available](#api-endpoints-available)
3. [Track Upload Flow Changes](#track-upload-flow-changes)
4. [Displaying Moderation Status](#displaying-moderation-status)
5. [Push Notifications Integration](#push-notifications-integration)
6. [In-App Notifications](#in-app-notifications)
7. [Appeal Workflow](#appeal-workflow)
8. [Content Filtering](#content-filtering)
9. [UI/UX Recommendations](#uiux-recommendations)
10. [Testing Checklist](#testing-checklist)

---

## 1. Database Schema Changes

### New Fields on `audio_tracks` Table

```typescript
interface AudioTrack {
  // Existing fields...
  id: string;
  title: string;
  artist_name: string;
  file_url: string;
  is_public: boolean;

  // NEW MODERATION FIELDS
  moderation_status: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected';
  moderation_flagged: boolean;
  flag_reasons: string[] | null;
  moderation_confidence: number | null; // 0.0 - 1.0
  transcription: string | null;
  moderation_checked_at: string | null; // ISO timestamp
  reviewed_by: string | null; // Admin user ID
  reviewed_at: string | null; // ISO timestamp
}
```

### Moderation Status Flow

```
Upload → pending_check → checking → [clean/flagged]
                                         ↓
                                    Admin Review
                                         ↓
                                  [approved/rejected]
```

### New `notifications` Table Fields

```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'moderation' | 'like' | 'comment' | 'follow'; // 'moderation' is new
  title: string;
  message: string;
  link: string; // e.g., "/track/123"
  read: boolean;
  created_at: string;
}
```

### New `profiles` Table Field

```typescript
interface Profile {
  // Existing fields...
  id: string;
  username: string;
  email: string;

  // NEW FIELD FOR PUSH NOTIFICATIONS
  expo_push_token: string | null; // Store user's push token here
}
```

---

## 2. API Endpoints Available

The mobile app can use these endpoints:

### Track Upload (Modified)

**Endpoint:** `POST /api/tracks/upload`

**Changes:** Track is now created with `moderation_status = 'pending_check'`

**Response:**
```json
{
  "success": true,
  "track": {
    "id": "track-uuid",
    "moderation_status": "pending_check",
    "is_public": true
  }
}
```

**Note:** Track is immediately visible to the uploader but will be checked within 5 minutes by the moderation system.

### Get Track (Modified)

**Endpoint:** `GET /api/tracks/{trackId}`

**Response includes moderation fields:**
```json
{
  "id": "track-uuid",
  "title": "My Song",
  "moderation_status": "clean",
  "moderation_flagged": false,
  "flag_reasons": null,
  "moderation_confidence": 0.95
}
```

### Get User's Tracks (Modified)

**Endpoint:** `GET /api/tracks/user/{userId}`

**Filter by moderation status:**
```
GET /api/tracks/user/{userId}?moderation_status=rejected
GET /api/tracks/user/{userId}?moderation_flagged=true
```

### Notifications Endpoint (Use Existing)

**Endpoint:** `GET /api/notifications`

**Response includes moderation notifications:**
```json
{
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "moderation",
      "title": "Content Moderation",
      "message": "Your track \"My Song\" has been approved! 🎉",
      "link": "/track/track-uuid",
      "read": false,
      "created_at": "2025-12-17T10:30:00Z"
    }
  ]
}
```

### Appeal Endpoint (New - To Be Created)

**Endpoint:** `POST /api/tracks/{trackId}/appeal`

**Request:**
```json
{
  "appealText": "I believe this was flagged by mistake because..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appeal submitted for review"
}
```

**Action:** Creates notification for admins and sends confirmation to user.

---

## 3. Track Upload Flow Changes

### Before (Old Flow)

```typescript
// Old: Track uploaded and immediately public
const uploadTrack = async (audioFile) => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const response = await fetch('/api/tracks/upload', {
    method: 'POST',
    body: formData
  });

  // Track is live immediately
  const { track } = await response.json();
  return track;
};
```

### After (New Flow with Moderation)

```typescript
// New: Track uploaded with moderation status
const uploadTrack = async (audioFile) => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const response = await fetch('/api/tracks/upload', {
    method: 'POST',
    body: formData
  });

  const { track } = await response.json();

  // Track is live but will be checked soon
  console.log('Moderation status:', track.moderation_status); // "pending_check"

  // Show user a message:
  // "Your track is live! We'll check it for content guidelines within 5 minutes."

  return track;
};
```

### Upload Success Message

Update your upload success screen to inform users:

```
✅ Track Uploaded Successfully!

Your track is now live and will be automatically checked
for content guidelines within 5 minutes. You'll be notified
if any action is needed.
```

---

## 4. Displaying Moderation Status

### Track Card Component

Add a status badge to each track card:

```typescript
interface TrackCardProps {
  track: AudioTrack;
  isOwner: boolean; // true if viewing own tracks
}

const ModerationBadge = ({ status, isOwner }) => {
  if (!isOwner) {
    // Don't show moderation status to other users
    return null;
  }

  const badges = {
    pending_check: { text: '⏳ Pending Check', color: 'gray' },
    checking: { text: '🔍 Checking...', color: 'blue' },
    clean: { text: '✓ Verified', color: 'green' },
    flagged: { text: '⚠️ Under Review', color: 'orange' },
    approved: { text: '✓ Approved', color: 'green' },
    rejected: { text: '✗ Not Approved', color: 'red' }
  };

  const badge = badges[status];

  return (
    <View style={[styles.badge, { backgroundColor: badge.color }]}>
      <Text style={styles.badgeText}>{badge.text}</Text>
    </View>
  );
};

const TrackCard = ({ track, isOwner }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.artist}>{track.artist_name}</Text>

      <ModerationBadge
        status={track.moderation_status}
        isOwner={isOwner}
      />

      {isOwner && track.moderation_status === 'rejected' && (
        <TouchableOpacity
          onPress={() => navigateToAppeal(track.id)}
          style={styles.appealButton}
        >
          <Text style={styles.appealText}>Appeal Decision</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

### Track Detail Screen

Show detailed moderation information on the track detail screen:

```typescript
const TrackDetailScreen = ({ track, isOwner }) => {
  if (!isOwner) {
    // Other users don't see moderation details
    return <NormalTrackView track={track} />;
  }

  return (
    <ScrollView>
      <TrackPlayer track={track} />

      {/* Moderation Status Section */}
      {track.moderation_status === 'flagged' && (
        <View style={styles.moderationAlert}>
          <Text style={styles.alertTitle}>⚠️ Under Review</Text>
          <Text style={styles.alertText}>
            Your track is being reviewed by our moderation team.
            You'll be notified of the decision soon.
          </Text>
          {track.flag_reasons && (
            <View style={styles.reasons}>
              <Text style={styles.reasonsTitle}>Flagged for:</Text>
              {track.flag_reasons.map((reason, idx) => (
                <Text key={idx} style={styles.reason}>• {reason}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {track.moderation_status === 'rejected' && (
        <View style={styles.moderationAlert}>
          <Text style={styles.alertTitle}>❌ Not Approved</Text>
          <Text style={styles.alertText}>
            Your track did not meet our community guidelines.
          </Text>
          {track.flag_reasons && (
            <View style={styles.reasons}>
              <Text style={styles.reasonsTitle}>Reasons:</Text>
              {track.flag_reasons.map((reason, idx) => (
                <Text key={idx} style={styles.reason}>• {reason}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.appealButton}
            onPress={() => navigateToAppeal(track.id)}
          >
            <Text style={styles.appealButtonText}>Appeal This Decision</Text>
          </TouchableOpacity>
        </View>
      )}

      {track.moderation_status === 'approved' && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ Your track has been approved!</Text>
        </View>
      )}

      {/* Rest of track details */}
    </ScrollView>
  );
};
```

---

## 5. Push Notifications Integration

### Store Expo Push Token

When user logs in or grants notification permissions, save their Expo push token:

```typescript
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

const registerForPushNotifications = async () => {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Push notification permissions not granted');
      return;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    // Save to user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', user.id);

      console.log('Push token saved to profile');
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
};

// Call this after user logs in
useEffect(() => {
  registerForPushNotifications();
}, []);
```

### Handle Incoming Push Notifications

```typescript
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen for notifications when app is open
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);

    // If it's a moderation notification, refresh user's tracks
    if (notification.request.content.data?.type === 'moderation') {
      const trackId = notification.request.content.data.trackId;
      // Refresh track data or navigate to track
      navigation.navigate('TrackDetail', { trackId });
    }
  });

  return () => subscription.remove();
}, []);

// Listen for notification taps
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);

    const data = response.notification.request.content.data;
    if (data?.trackId) {
      navigation.navigate('TrackDetail', { trackId: data.trackId });
    }
  });

  return () => subscription.remove();
}, []);
```

### Push Notification Format (Sent by Backend)

The backend sends these push notifications automatically:

```json
{
  "to": "ExponentPushToken[xxxxx]",
  "title": "✅ Track Approved!",
  "body": "\"My Song\" is now live",
  "data": {
    "trackId": "track-uuid",
    "type": "moderation"
  },
  "sound": "default",
  "priority": "high"
}
```

---

## 6. In-App Notifications

### Fetch Notifications

```typescript
const fetchNotifications = async () => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data;
};
```

### Display Moderation Notifications

```typescript
const NotificationsList = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const data = await fetchNotifications();
    setNotifications(data);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id);

    // Navigate based on link
    if (notification.link.startsWith('/track/')) {
      const trackId = notification.link.replace('/track/', '');
      navigation.navigate('TrackDetail', { trackId });
    }
  };

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.notification,
            !item.read && styles.unread
          ]}
          onPress={() => handleNotificationPress(item)}
        >
          {/* Icon based on type */}
          <View style={styles.icon}>
            {item.type === 'moderation' && (
              <Text style={styles.emoji}>🔍</Text>
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>

          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )}
    />
  );
};
```

### Real-Time Notification Updates

Subscribe to new notifications using Supabase Realtime:

```typescript
useEffect(() => {
  const { data: { user } } = await supabase.auth.getUser();

  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('New notification:', payload.new);

        // Add to notifications list
        setNotifications(prev => [payload.new, ...prev]);

        // Show local notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: payload.new.title,
            body: payload.new.message,
            data: { trackId: payload.new.link.replace('/track/', '') }
          },
          trigger: null // Show immediately
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 7. Appeal Workflow

### Appeal Screen

Create a screen for users to appeal rejected content:

```typescript
const AppealScreen = ({ route }) => {
  const { trackId } = route.params;
  const [track, setTrack] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTrack();
  }, []);

  const loadTrack = async () => {
    const { data } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    setTrack(data);
  };

  const submitAppeal = async () => {
    if (!appealText.trim()) {
      Alert.alert('Error', 'Please explain why you believe this decision should be reconsidered.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appealText })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Appeal Submitted',
          'Your appeal has been submitted for review. You\'ll be notified of the decision within 24-48 hours.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!track) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Appeal Decision</Text>

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{track.title}</Text>
        <Text style={styles.artist}>{track.artist_name}</Text>
      </View>

      {track.flag_reasons && (
        <View style={styles.reasons}>
          <Text style={styles.reasonsTitle}>Your track was flagged for:</Text>
          {track.flag_reasons.map((reason, idx) => (
            <Text key={idx} style={styles.reason}>• {reason}</Text>
          ))}
        </View>
      )}

      <Text style={styles.label}>Why do you believe this decision should be reconsidered?</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={6}
        placeholder="Explain why your track should be approved..."
        value={appealText}
        onChangeText={setAppealText}
        maxLength={500}
      />
      <Text style={styles.charCount}>{appealText.length}/500</Text>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.disabled]}
        onPress={submitAppeal}
        disabled={submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Submitting...' : 'Submit Appeal'}
        </Text>
      </TouchableOpacity>

      <View style={styles.guidelines}>
        <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
        <Text style={styles.guidelinesText}>
          Appeals are typically reviewed within 24-48 hours. Your track will be
          reinstated if our team determines it meets our community guidelines.
        </Text>
      </View>
    </ScrollView>
  );
};
```

---

## 8. Content Filtering

### Filter Rejected Tracks from Public Feed

```typescript
// When fetching public tracks, automatically filter by moderation status
const fetchPublicTracks = async () => {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('*')
    .eq('is_public', true)
    .in('moderation_status', ['clean', 'approved']) // Only show approved content
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }

  return data;
};
```

### User's Profile - Show All Tracks with Status

```typescript
// When viewing own profile, show all tracks including moderation status
const fetchMyTracks = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('audio_tracks')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }

  return data; // Includes all tracks regardless of moderation status
};
```

### Filter by Moderation Status

Add filters to "My Tracks" screen:

```typescript
const MyTracksScreen = () => {
  const [filter, setFilter] = useState('all');
  const [tracks, setTracks] = useState([]);

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Under Review', value: 'flagged' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Approved', value: 'approved' }
  ];

  const loadTracks = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', user.id);

    if (filter !== 'all') {
      query = query.eq('moderation_status', filter);
    }

    const { data } = await query.order('created_at', { ascending: false });
    setTracks(data || []);
  };

  useEffect(() => {
    loadTracks();
  }, [filter]);

  return (
    <View style={styles.container}>
      {/* Filter buttons */}
      <View style={styles.filters}>
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              filter === option.value && styles.activeFilter
            ]}
            onPress={() => setFilter(option.value)}
          >
            <Text style={styles.filterText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Track list */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrackCard track={item} isOwner={true} />
        )}
      />
    </View>
  );
};
```

---

## 9. UI/UX Recommendations

### Status Colors

Use consistent colors across the app:

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

### Moderation Status Icons

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

### User-Friendly Messages

**Upload Success:**
```
✅ Track Uploaded!

Your track is now live and will be automatically checked
for community guidelines within 5 minutes.
```

**Pending Check:**
```
⏳ Pending Check

Your track is in the queue for automatic content review.
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

### Empty States

**No Flagged Tracks:**
```
🎉 All Clear!

None of your tracks are currently under review.
```

**No Rejected Tracks:**
```
✅ Great Job!

All your tracks meet our community guidelines.
```

---

## 10. Testing Checklist

### Phase 1: Upload Flow
- [ ] Upload a track and verify `moderation_status = 'pending_check'`
- [ ] Verify track appears in user's profile immediately
- [ ] Verify upload success message mentions content check
- [ ] Wait 5 minutes and verify status changes to 'clean' or 'flagged'

### Phase 2: Moderation Status Display
- [ ] Verify moderation badges show on own tracks
- [ ] Verify moderation badges don't show on other users' tracks
- [ ] Test all status states (pending_check, checking, clean, flagged, approved, rejected)
- [ ] Verify colors and icons are correct

### Phase 3: Push Notifications
- [ ] Register Expo push token successfully
- [ ] Verify token saved to `profiles.expo_push_token`
- [ ] Upload track and wait for moderation result
- [ ] Verify push notification received when track is approved/rejected
- [ ] Tap notification and verify navigation to track detail

### Phase 4: In-App Notifications
- [ ] Verify moderation notifications appear in notifications list
- [ ] Tap notification and verify navigation to track
- [ ] Verify notification marked as read after tap
- [ ] Test real-time notification updates (use Supabase Realtime)

### Phase 5: Appeal Workflow
- [ ] Navigate to rejected track
- [ ] Tap "Appeal Decision"
- [ ] Submit appeal with text
- [ ] Verify success message
- [ ] Verify appeal notification sent to admins (check backend)

### Phase 6: Content Filtering
- [ ] Verify public feed only shows clean/approved tracks
- [ ] Verify rejected tracks don't appear in public feed
- [ ] Verify own rejected tracks still visible in profile
- [ ] Test filter options on "My Tracks" screen

### Phase 7: Edge Cases
- [ ] Test with no internet connection
- [ ] Test with expired session token
- [ ] Test appeal on already-appealed track
- [ ] Test very long appeal text (500+ characters)
- [ ] Test rapid track uploads (multiple at once)

### Phase 8: Performance
- [ ] Test loading 100+ tracks with moderation data
- [ ] Verify notifications list loads quickly
- [ ] Test real-time subscription doesn't cause memory leaks
- [ ] Verify push notifications work in background

---

## Related Documentation

For complete backend implementation details, refer to these documents:

1. **[CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md)** - Automated content moderation background job
2. **[PHASES_6_8_DEPLOYMENT.md](./PHASES_6_8_DEPLOYMENT.md)** - Admin dashboard and notification system
3. **[Database Migration](./apps/web/supabase/migrations/)** - Schema changes

---

## API Endpoints Summary

### Existing Endpoints (Modified)
- `POST /api/tracks/upload` - Returns track with `moderation_status`
- `GET /api/tracks/{trackId}` - Includes moderation fields
- `GET /api/tracks/user/{userId}` - Supports moderation filtering
- `GET /api/notifications` - Includes moderation notifications

### New Endpoints (To Be Created)
- `POST /api/tracks/{trackId}/appeal` - Submit appeal for rejected content

---

## Environment Variables (Mobile App)

Ensure these are configured in your mobile app:

```bash
# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# No new environment variables needed for moderation!
# Backend handles all moderation logic
```

---

## Support & Questions

If you have questions about implementation:

1. Check the backend documentation links above
2. Review the database schema in Supabase dashboard
3. Test API endpoints using Postman/Insomnia
4. Contact backend team for clarification

---

**Implementation Priority:**

1. **High Priority** (Do First)
   - Store Expo push token on login
   - Display moderation status on track cards
   - Filter rejected content from public feed
   - Handle push notifications

2. **Medium Priority** (Do Second)
   - Add detailed moderation info on track detail screen
   - Implement in-app notifications list
   - Add filters on "My Tracks" screen

3. **Low Priority** (Nice to Have)
   - Appeal workflow
   - Real-time notification updates
   - Moderation analytics for users

---

*Mobile Team Moderation Guide - December 17, 2025*
*SoundBridge Content Moderation System - Phases 1-8*
