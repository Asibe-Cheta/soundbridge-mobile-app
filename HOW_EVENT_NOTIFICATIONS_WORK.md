# How Event Notifications Work - Brief Explanation

**Date:** January 8, 2026

---

## Simple Overview

When someone creates an event on SoundBridge, the app automatically notifies nearby users who might be interested.

---

## The Flow

### 1. Event Created
```
Organizer creates event:
"Gospel Concert in London on Feb 15"
```

### 2. System Finds Nearby Users
```
Automatically searches for users who:
✅ Live in London (or within 20km)
✅ Like "Gospel Concert" category
✅ Have notifications enabled
✅ Haven't received 3 notifications today (daily limit)
✅ Are within their notification hours (e.g., 8 AM - 10 PM)
```

### 3. Push Notification Sent
```
📱 User receives notification:

Title: "New Gospel Concert in London!"
Body: "Gospel Concert on Sat, Feb 15, 7:00 PM"
```

### 4. User Taps Notification
```
App opens directly to event details screen
User can see:
- Event information
- Buy tickets
- Get directions
- Share with friends
```

---

## Key Benefits

**For Event Organizers:**
- ✅ Automatic free publicity
- ✅ Reaches interested people nearby
- ✅ No need to manually promote

**For Users:**
- ✅ Discover events they'd like
- ✅ Only see relevant events (nearby + their interests)
- ✅ Not spammed (max 3 per day)
- ✅ Can control notification times

---

## Example Scenario

**Sarah (Organizer):**
1. Creates "Gospel Concert" event in London
2. Adds date, location, ticket price
3. Event automatically publicized ✅

**John (User in London):**
1. Lives in London
2. Likes "Gospel Concert" category
3. Receives notification on his phone 📱
4. Taps notification
5. Sees event details and buys ticket 🎫

**Mike (User in Manchester):**
1. Lives in Manchester (263km away)
2. Likes "Gospel Concert" category
3. Does NOT receive notification ❌ (too far away) (but mike can always set to receive from any far location, but by default, he won't)

---

## User Settings

Users control what they receive:

```
Settings → Notifications → Event Notifications

✅ Enable event notifications
🕐 Notification hours: 8 AM - 10 PM
🎵 Preferred categories:
   ✅ Gospel Concert
   ✅ Music Concert
   ✅ Jazz Room
   ⬜ Birthday Party
   ⬜ Comedy Night
```

---

## Technical Summary

```
Event Created
    ↓
Backend Webhook Triggered
    ↓
Find Nearby Users (20km radius + same city)
    ↓
Filter by Category Preferences
    ↓
Check Time Windows & Daily Quota
    ↓
Send Push Notifications via Expo
    ↓
Users Receive on Mobile Devices
    ↓
Tap → Navigate to Event Details
```

---

## That's It!

**Simple:** Create event → Nearby interested users notified → They buy tickets

**Automatic:** No manual promotion needed

**Smart:** Only notifies relevant users, respects preferences

**Effective:** Free publicity for every event created
