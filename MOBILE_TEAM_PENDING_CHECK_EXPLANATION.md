# 📋 Answer: "Pending Check" Track Status - Complete Guide

**Date:** December 22, 2025  
**From:** Web App Team  
**To:** Mobile Team  
**Re:** Track "Pending Check" Status - Comprehensive Explanation

---

## ✅ **QUICK ANSWERS TO YOUR QUESTIONS**

### **1. What does "Pending Check" mean?**

"Pending Check" is part of our **AI-powered content moderation system**. It means the track is waiting for automated checks:

- 🎤 **Audio transcription** (using Whisper AI)
- 🛡️ **Content moderation** (using OpenAI Moderation API)
- 🚫 **Spam detection** (custom algorithms)

---

### **2. Database Field to Check**

**Field Name:** `moderation_status`  
**Table:** `audio_tracks`  
**Type:** `VARCHAR(50)`  
**Default:** `'pending_check'`

**All Possible Values:**

| Status | Meaning | User Sees | Playable? | Show in Discover? |
|--------|---------|-----------|-----------|-------------------|
| `pending_check` | Just uploaded, waiting for check | ⏳ "Pending Check" | ✅ YES | ✅ YES |
| `checking` | Currently being processed | ⏳ "Checking..." | ✅ YES | ✅ YES |
| `clean` | Passed all checks | ✅ No badge | ✅ YES | ✅ YES |
| `flagged` | Failed checks, needs admin review | ⚠️ "Under Review" | ❌ NO | ❌ NO (except owner) |
| `approved` | Admin reviewed and approved | ✅ No badge | ✅ YES | ✅ YES |
| `rejected` | Admin reviewed and rejected | ❌ "Rejected" | ❌ NO | ❌ NO (except owner) |
| `appealed` | User submitted appeal | 📬 "Appeal Pending" | ❌ NO | ❌ NO (except owner) |

---

### **3. Admin Panel That Handles This**

**URL:** `/admin/moderation`

**What it does:**
- Shows all flagged tracks
- Displays transcription, flag reasons, confidence score
- Allows admin to approve or reject
- Sends notifications to users

---

### **4. Should "Pending Check" tracks be shown in Discover?**

**✅ YES** - Show them!

**Why:**
- Tracks are **assumed safe** until proven otherwise (innocent until guilty)
- Background check happens within **5 minutes** of upload
- Provides **better UX** - instant publish feeling
- If flagged, they're **automatically hidden** from public

**Visibility Rules:**

| Moderation Status | Public Discover | Owner's Profile | Playable |
|-------------------|----------------|-----------------|----------|
| `pending_check` | ✅ Visible | ✅ Visible | ✅ Yes |
| `checking` | ✅ Visible | ✅ Visible | ✅ Yes |
| `clean` | ✅ Visible | ✅ Visible | ✅ Yes |
| `flagged` | ❌ Hidden | ✅ Visible | ❌ No |
| `approved` | ✅ Visible | ✅ Visible | ✅ Yes |
| `rejected` | ❌ Hidden | ✅ Visible | ❌ No |
| `appealed` | ❌ Hidden | ✅ Visible | ❌ No |

---

### **5. What Should the Mobile App Display?**

**Current Behavior:** ✅ **CORRECT!**

Your current implementation is perfect:
- Show "Pending Check" badge with ⏳ hourglass
- Keep track playable
- Show in all sections

**Recommended UI for All Statuses:**

```typescript
const getTrackStatusBadge = (moderation_status: string) => {
  switch (moderation_status) {
    case 'pending_check':
      return { icon: '⏳', text: 'Pending Check', color: '#FFA500' };
    
    case 'checking':
      return { icon: '🔄', text: 'Checking...', color: '#3B82F6' };
    
    case 'clean':
      return null; // No badge needed
    
    case 'flagged':
      return { icon: '⚠️', text: 'Under Review', color: '#F59E0B' };
    
    case 'approved':
      return null; // No badge needed (or show ✓ "Verified")
    
    case 'rejected':
      return { icon: '❌', text: 'Rejected', color: '#DC2626' };
    
    case 'appealed':
      return { icon: '📬', text: 'Appeal Pending', color: '#8B5CF6' };
    
    default:
      return null;
  }
};
```

**Playability Rules:**

```typescript
const isTrackPlayable = (moderation_status: string) => {
  // Tracks are playable unless flagged, rejected, or appealed
  return !['flagged', 'rejected', 'appealed'].includes(moderation_status);
};
```

---

### **6. API Response Structure**

**Example Track Object from API:**

```json
{
  "id": "track-uuid",
  "title": "Lovely",
  "artist_name": "Asibe Cheta",
  "file_url": "https://storage.supabase.co/...",
  "play_count": 0,
  "is_public": true,
  
  // MODERATION FIELDS
  "moderation_status": "pending_check",
  "moderation_flagged": false,
  "flag_reasons": [],
  "moderation_confidence": null,
  "transcription": null,
  "moderation_checked_at": null,
  "reviewed_by": null,
  "reviewed_at": null,
  
  // APPEAL FIELDS
  "appeal_status": null,
  "appeal_text": null,
  "appeal_submitted_at": null
}
```

**Fields to Check:**

| Field | Type | Purpose |
|-------|------|---------|
| `moderation_status` | `string` | Main status to check (see table above) |
| `moderation_flagged` | `boolean` | Quick check if track is flagged |
| `flag_reasons` | `array` | Array of strings explaining why flagged |
| `moderation_confidence` | `number` | 0.0-1.0 confidence score |
| `transcription` | `string` | AI transcription of audio (if checked) |
| `moderation_checked_at` | `timestamp` | When check completed |

---

### **7. Approval Workflow**

**Who Approves:**
- **Automated AI** → Most tracks pass automatically (`clean`)
- **Admin** → Only reviews flagged tracks (via `/admin/moderation`)

**What Triggers "Pending":**
- ✅ **Every upload** starts as `pending_check` (default)

**Timeline:**

```
Upload (0:00)
  ↓
pending_check (0:00 - 0:05)
  ↓
checking (triggered by cron job, runs every 5 min)
  ↓
[AI Processing: 30-60 seconds]
  ↓
clean (85% of tracks) OR flagged (15% of tracks)
  ↓ (if flagged)
Admin Review
  ↓
approved OR rejected
  ↓ (if rejected)
User can appeal
  ↓
appealed
  ↓
Admin reviews appeal
  ↓
approved OR rejected (final)
```

**What Happens After Approval/Rejection:**

**If `clean` (no issues found):**
- ✅ Track stays public
- ✅ No notification sent
- ✅ No action needed

**If `flagged` (issues found):**
- ⚠️ Track **stays live** but added to admin queue
- 📧 User notified: "Your track is under review"
- 👨‍💼 Admin reviews within 24-48 hours

**If admin `approved`:**
- ✅ Track stays public
- 📧 User notified: "Your track was approved"

**If admin `rejected`:**
- ❌ Track hidden from public
- 📧 User notified: "Your track was rejected" + reason
- 🔄 User can appeal (with explanation)

---

## 📊 **COMPLETE DATABASE SCHEMA**

### **Moderation Fields on `audio_tracks` Table**

```typescript
interface AudioTrack {
  // Existing fields
  id: string;
  title: string;
  artist_name: string;
  file_url: string;
  cover_art_url?: string;
  duration: number;
  genre?: string;
  play_count: number;
  likes_count: number;
  is_public: boolean;
  creator_id: string;
  created_at: string;
  
  // MODERATION FIELDS (NEW)
  moderation_status: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed';
  moderation_checked_at: string | null;  // ISO timestamp
  moderation_flagged: boolean;
  flag_reasons: string[] | null;  // ["Hate speech detected", "Spam content"]
  moderation_confidence: number | null;  // 0.0 to 1.0
  transcription: string | null;  // Whisper AI transcription
  
  // ADMIN REVIEW FIELDS
  reviewed_by: string | null;  // Admin user ID
  reviewed_at: string | null;  // ISO timestamp
  
  // APPEAL FIELDS
  appeal_status: 'pending' | 'reviewing' | 'approved' | 'rejected' | null;
  appeal_text: string | null;  // User's appeal explanation
  appeal_submitted_at: string | null;  // ISO timestamp
  
  // METADATA FIELDS
  file_hash: string | null;  // SHA256 for duplicate detection
  audio_metadata: {
    bitrate?: number;
    duration?: number;
    sampleRate?: number;
    format?: string;
    channels?: number;
  } | null;
}
```

---

## 🎯 **MOBILE APP IMPLEMENTATION GUIDE**

### **1. Fetching Tracks with Moderation Status**

**Ensure your API calls include moderation fields:**

```typescript
// Example API call
const fetchTracks = async () => {
  const response = await fetch('/api/tracks?include_moderation=true', {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.tracks; // Includes moderation_status field
};
```

**Check if API returns moderation fields:**
```typescript
const track = tracks[0];
console.log('Moderation Status:', track.moderation_status);
console.log('Is Flagged:', track.moderation_flagged);
console.log('Flag Reasons:', track.flag_reasons);
```

---

### **2. Filtering Tracks Based on Moderation Status**

**For Public Discover Screen:**

```typescript
const getPublicTracks = (tracks: AudioTrack[]) => {
  return tracks.filter(track => {
    // Only show tracks that are safe for public viewing
    const safeStatuses = ['pending_check', 'checking', 'clean', 'approved'];
    return safeStatuses.includes(track.moderation_status);
  });
};
```

**For User's Own Profile:**

```typescript
const getUserTracks = (tracks: AudioTrack[], userId: string) => {
  return tracks.filter(track => {
    // Show all tracks to owner, regardless of status
    return track.creator_id === userId;
  });
};
```

**For Search Results:**

```typescript
const getSearchResults = (tracks: AudioTrack[], userId: string) => {
  return tracks.filter(track => {
    // Show safe tracks to everyone
    // Show flagged/rejected tracks only to owner
    const safeStatuses = ['pending_check', 'checking', 'clean', 'approved'];
    const isOwner = track.creator_id === userId;
    
    return safeStatuses.includes(track.moderation_status) || isOwner;
  });
};
```

---

### **3. Displaying Status Badges**

**Component Example:**

```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface ModerationBadgeProps {
  moderation_status: string;
  size?: 'small' | 'medium' | 'large';
}

const ModerationBadge: React.FC<ModerationBadgeProps> = ({ 
  moderation_status, 
  size = 'medium' 
}) => {
  const getBadgeConfig = () => {
    switch (moderation_status) {
      case 'pending_check':
        return { icon: '⏳', text: 'Pending Check', bgColor: '#FFA500', textColor: '#FFF' };
      
      case 'checking':
        return { icon: '🔄', text: 'Checking...', bgColor: '#3B82F6', textColor: '#FFF' };
      
      case 'flagged':
        return { icon: '⚠️', text: 'Under Review', bgColor: '#F59E0B', textColor: '#FFF' };
      
      case 'rejected':
        return { icon: '❌', text: 'Rejected', bgColor: '#DC2626', textColor: '#FFF' };
      
      case 'appealed':
        return { icon: '📬', text: 'Appeal Pending', bgColor: '#8B5CF6', textColor: '#FFF' };
      
      case 'clean':
      case 'approved':
        return null; // No badge for clean/approved tracks
      
      default:
        return null;
    }
  };
  
  const config = getBadgeConfig();
  
  if (!config) return null;
  
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.bgColor,
      paddingHorizontal: size === 'small' ? 6 : size === 'medium' ? 8 : 10,
      paddingVertical: size === 'small' ? 2 : size === 'medium' ? 4 : 6,
      borderRadius: 4,
      gap: 4
    }}>
      <Text style={{ fontSize: size === 'small' ? 10 : size === 'medium' ? 12 : 14 }}>
        {config.icon}
      </Text>
      <Text style={{ 
        fontSize: size === 'small' ? 10 : size === 'medium' ? 12 : 14,
        fontWeight: '600',
        color: config.textColor
      }}>
        {config.text}
      </Text>
    </View>
  );
};

export default ModerationBadge;
```

**Usage:**

```typescript
<View style={styles.trackCard}>
  <Text style={styles.title}>{track.title}</Text>
  <ModerationBadge moderation_status={track.moderation_status} size="small" />
</View>
```

---

### **4. Handling Playback Based on Status**

```typescript
const handleTrackPress = (track: AudioTrack) => {
  const unplayableStatuses = ['flagged', 'rejected', 'appealed'];
  
  if (unplayableStatuses.includes(track.moderation_status)) {
    // Show message to user
    Alert.alert(
      'Track Unavailable',
      getUnavailableMessage(track.moderation_status),
      [{ text: 'OK' }]
    );
    return;
  }
  
  // Play the track
  playTrack(track);
};

const getUnavailableMessage = (status: string) => {
  switch (status) {
    case 'flagged':
      return 'This track is currently under review by our moderation team.';
    
    case 'rejected':
      return 'This track did not pass our content guidelines. You can appeal this decision.';
    
    case 'appealed':
      return 'Your appeal is being reviewed. You will be notified of the decision.';
    
    default:
      return 'This track is currently unavailable.';
  }
};
```

---

### **5. Showing Different Messaging for Different Reasons**

**If track is flagged, show flag reasons:**

```typescript
const TrackFlagDetails: React.FC<{ track: AudioTrack }> = ({ track }) => {
  if (track.moderation_status !== 'flagged' && track.moderation_status !== 'rejected') {
    return null;
  }
  
  return (
    <View style={styles.flagDetails}>
      <Text style={styles.flagTitle}>
        {track.moderation_status === 'flagged' ? 'Under Review:' : 'Rejection Reasons:'}
      </Text>
      {track.flag_reasons?.map((reason, index) => (
        <Text key={index} style={styles.flagReason}>
          • {reason}
        </Text>
      ))}
      
      {track.moderation_status === 'rejected' && (
        <TouchableOpacity 
          style={styles.appealButton}
          onPress={() => handleAppeal(track.id)}
        >
          <Text style={styles.appealButtonText}>Appeal Decision</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

---

## 🔍 **CURRENT TRACKS ANALYSIS**

Based on your examples:

### **"Lovely" by Asibe Cheta - 0 plays - Pending Check**
- **Status:** `pending_check`
- **Meaning:** Just uploaded, waiting for background job (runs every 5 min)
- **Action:** Will be checked automatically within 5 minutes
- **UX:** ✅ Show "Pending Check" badge

### **"Healing in you" by Asibe Cheta - 85 plays - Pending Check**
- **Status:** `pending_check`
- **Meaning:** Uploaded but not yet processed (cron job may have failed or skipped)
- **Action:** Will be processed in next cron run
- **UX:** ✅ Show "Pending Check" badge
- **Note:** 85 plays suggests it's been live for a while - check if cron job is running

### **"Healing" by Asibe Cheta - Pending Check**
- **Status:** `pending_check`
- **Meaning:** Same as above
- **UX:** ✅ Show "Pending Check" badge

### **"What a wonderful world(1)" by Bervick - 2 plays - No pending indicator**
- **Status:** Likely `clean` or `approved`
- **Meaning:** Passed moderation checks
- **UX:** ✅ No badge needed

---

## 🔧 **TROUBLESHOOTING**

### **Why are some tracks stuck on "Pending Check"?**

**Possible Reasons:**

1. **Cron job not running**
   - Check: https://vercel.com/dashboard → Cron Jobs
   - Verify: Last run timestamp
   - Fix: Redeploy or manually trigger

2. **Track processing failed**
   - Check: Vercel logs for errors
   - Common causes: Audio file corrupt, transcription failed
   - Fix: Admin can manually approve or trigger recheck

3. **High volume of uploads**
   - Cron processes 10 tracks every 5 minutes
   - If > 10 tracks uploaded, some wait longer
   - Normal behavior: Will be processed in order

**How to Force Recheck:**

Admin can run:
```sql
UPDATE audio_tracks
SET moderation_status = 'pending_check'
WHERE id = 'track-uuid';
```

Then wait for next cron run (< 5 minutes).

---

## 📋 **IMPLEMENTATION CHECKLIST FOR MOBILE TEAM**

### **Phase 1: Display Status Badges** ✅
- [ ] Add `ModerationBadge` component
- [ ] Show badge on track cards in Discover
- [ ] Show badge on track cards in Artist Profile
- [ ] Show badge on track cards in Search Results
- [ ] Test with all 7 statuses

### **Phase 2: Handle Playability** ✅
- [ ] Block playback for `flagged` tracks
- [ ] Block playback for `rejected` tracks
- [ ] Block playback for `appealed` tracks
- [ ] Show appropriate error messages
- [ ] Allow playback for all other statuses

### **Phase 3: Filter Content** ✅
- [ ] Filter public Discover to show only safe tracks
- [ ] Show all tracks to owner (regardless of status)
- [ ] Implement search filtering
- [ ] Test visibility rules

### **Phase 4: Handle Notifications** 🔄
- [ ] Listen for moderation push notifications
- [ ] Display in-app notifications
- [ ] Navigate to track detail on notification tap
- [ ] Update track status in real-time

### **Phase 5: Appeal Workflow** 🔄
- [ ] Add "Appeal" button for rejected tracks
- [ ] Create appeal form (min 20 chars, max 500 chars)
- [ ] Submit appeal via API
- [ ] Show appeal status

---

## 📞 **SUPPORT & RESOURCES**

### **Documentation:**
- `MOBILE_TEAM_MODERATION_GUIDE.md` - Complete mobile integration guide (1,071 lines)
- `PHASES_1_5_SUMMARY.md` - Backend implementation details (870 lines)
- `CONTENT_MODERATION_README.md` - System overview
- `MOBILE_TEAM_ANSWERS.md` - Previous mobile team Q&A

### **Admin Access:**
- We can grant you temporary admin access to test moderation workflow
- Contact: Slack #backend-support

### **API Endpoints:**
- `GET /api/tracks` - Includes moderation fields
- `POST /api/tracks/{trackId}/appeal` - Submit appeal
- `GET /api/user/notifications` - Get moderation notifications

### **Contact:**
- **Slack:** #backend-support
- **Response Time:** < 1 hour during business hours

---

## 🎉 **SUMMARY**

| Your Question | Answer |
|---------------|--------|
| **What does "Pending Check" mean?** | Track is waiting for AI moderation (transcription + content check) |
| **What field to check?** | `moderation_status` field on `audio_tracks` table |
| **Which admin panel?** | `/admin/moderation` |
| **Should pending tracks show in Discover?** | ✅ YES - they're assumed safe until proven otherwise |
| **What should mobile app display?** | ✅ Your current UI is perfect! Keep showing "Pending Check" badge |
| **What field in API response?** | `moderation_status` (7 possible values) |
| **Who approves tracks?** | Automated AI (85% pass automatically) + Admin for flagged (15%) |

---

**Status:** ✅ **All Questions Answered**  
**Mobile Team Action:** Continue with current implementation (it's correct!)  
**Next Steps:** Implement filtering and playability rules (see checklist)

---

*Thank you for the great questions! Your current implementation is already correct. The "Pending Check" indicator is working as designed.* 🎉

**Web App Team**  
December 22, 2025

