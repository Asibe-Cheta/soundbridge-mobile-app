# 🔗 SoundBridge Share Links & Deep Linking Guide

**Date:** December 15, 2025  
**Status:** ✅ FULLY CONFIGURED

---

## 📋 Overview

SoundBridge supports **Universal Links** (web URLs that open the app) and **App Scheme Links** (direct app links). When users share content from the app, they generate shareable links that work across platforms and automatically open the SoundBridge app if installed.

---

## 🌐 Link Formats

### **1. Universal Links (Web URLs)**
These are web URLs that work in browsers AND automatically open the app if installed on the device.

**Domain:** `soundbridge.live`

#### **Track Links**
```
https://soundbridge.live/track/[track-id]
```

**Example:**
```
https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4
```

**Share Message:**
```
🎵 Check out "Electric Dreams" by Asibe Cheta on SoundBridge!

https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4
```

---

#### **Album Links**
```
https://soundbridge.live/album/[album-id]
```

**Example:**
```
https://soundbridge.live/album/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

**Share Message:**
```
🎵 Check out "Midnight Sessions" by Asibe Cheta on SoundBridge!

10 tracks • 45m

https://soundbridge.live/album/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

---

#### **Creator Profile Links**
```
https://soundbridge.live/creator/[creator-id]
```

**Example:**
```
https://soundbridge.live/creator/bd8a455d-a54d-45c5-968d-e4cf5e8d928e
```

**Share Message:**
```
👤 Check out Asibe Cheta on SoundBridge!

Follow for amazing music and updates.

https://soundbridge.live/creator/bd8a455d-a54d-45c5-968d-e4cf5e8d928e
```

---

#### **Event Links**
```
https://soundbridge.live/event/[event-id]
```

**Example:**
```
https://soundbridge.live/event/12345678-90ab-cdef-1234-567890abcdef
```

---

#### **Playlist Links** *(Future)*
```
https://soundbridge.live/playlist/[playlist-id]
```

---

### **2. App Scheme Links (Direct App Links)**
These bypass the browser and open the app directly.

**Scheme:** `soundbridge://`

#### **Available Deep Links:**
```
soundbridge://track/[track-id]
soundbridge://album/[album-id]
soundbridge://creator/[creator-id]
soundbridge://event/[event-id]
soundbridge://messages
soundbridge://messages/[conversation-id]
soundbridge://wallet
soundbridge://collaboration/[request-id]
```

**Examples:**
```
soundbridge://track/ff707546-6f34-4a31-895a-103612ceb9c4
soundbridge://album/a1b2c3d4-5678-90ab-cdef-1234567890ab
soundbridge://creator/bd8a455d-a54d-45c5-968d-e4cf5e8d928e
soundbridge://messages
soundbridge://wallet
```

---

## 📱 How It Works

### **When a User Taps a Link:**

#### **If SoundBridge App is Installed:**
1. **Universal Link** (`https://soundbridge.live/*`)
   - iOS/Android detects the app is installed
   - Link opens in the app (NOT the browser)
   - App navigates to the specific screen
   - Content loads and displays

2. **App Scheme Link** (`soundbridge://`)
   - Opens the app directly
   - Navigates to the specific screen

#### **If SoundBridge App is NOT Installed:**
1. **Universal Link** (`https://soundbridge.live/*`)
   - Opens in the web browser
   - Shows the SoundBridge web player (if configured)
   - **OR** Shows "Download App" page with App Store/Play Store links

2. **App Scheme Link** (`soundbridge://`)
   - Shows "No app found to open this link"
   - User must install the app first

---

## 🎯 Link Behavior by Content Type

### **Track Links**
- **Opens:** `TrackDetailsScreen`
- **Displays:** Track info, play button, artist, stats
- **Actions:** Play track, like, share, add to playlist

### **Album Links** ✅ NEW!
- **Opens:** `AlbumDetailsScreen`
- **Displays:** Album cover, tracks list, artist, stats
- **Actions:** Play all, play individual tracks, like, share

### **Creator Links**
- **Opens:** `CreatorProfileScreen`
- **Displays:** Creator profile, tracks, events, stats
- **Actions:** Follow, tip, message, view tracks

### **Event Links**
- **Opens:** `EventDetailsScreen`
- **Displays:** Event info, venue, tickets
- **Actions:** Purchase ticket, RSVP, get directions

### **Messages Links**
- **Opens:** `MessagesScreen` or `ChatScreen`
- **Displays:** Conversations list or specific chat
- **Actions:** Send messages, view history

### **Wallet Link**
- **Opens:** `WalletScreen`
- **Displays:** Balance, transactions, withdrawal
- **Actions:** View earnings, withdraw funds

---

## 🔧 Technical Implementation

### **Configuration Files**

#### **app.json**
```json
{
  "expo": {
    "scheme": "soundbridge",
    "ios": {
      "associatedDomains": [
        "applinks:soundbridge.live",
        "applinks:www.soundbridge.live"
      ]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "soundbridge.live",
              "pathPrefix": "/"
            },
            {
              "scheme": "https",
              "host": "www.soundbridge.live",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        },
        {
          "action": "VIEW",
          "data": [{ "scheme": "soundbridge" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

### **Deep Link Handler (App.tsx)**

```typescript
const handleDeepLinkNavigation = (path: string, queryParams?: Record<string, any>) => {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];

  switch (firstSegment) {
    case 'track':
      if (segments[1]) {
        navigationRef.current.navigate('TrackDetails', { trackId: segments[1] });
      }
      break;
      
    case 'album':
      if (segments[1]) {
        navigationRef.current.navigate('AlbumDetails', { albumId: segments[1] });
      }
      break;
      
    case 'creator':
      if (segments[1]) {
        navigationRef.current.navigate('CreatorProfile', { creatorId: segments[1] });
      }
      break;
      
    case 'event':
      if (segments[1]) {
        navigationRef.current.navigate('EventDetails', { eventId: segments[1] });
      }
      break;
      
    case 'messages':
      if (segments[1]) {
        navigationRef.current.navigate('Messages', { conversationId: segments[1] });
      } else {
        navigationRef.current.navigate('Messages');
      }
      break;
      
    case 'wallet':
      navigationRef.current.navigate('Wallet');
      break;
      
    case 'collaboration':
      if (segments[1]) {
        navigationRef.current.navigate('CollaborationRequests', { requestId: segments[1] });
      }
      break;
      
    default:
      console.log('Unknown deep link path:', path);
  }
};
```

---

### **Share Implementation**

#### **Track Share (AudioPlayerScreen.tsx)**
```typescript
const handleShare = async () => {
  if (!currentTrack) return;
  
  try {
    const shareUrl = `https://soundbridge.live/track/${currentTrack.id}`;
    const message = `🎵 Check out "${currentTrack.title}" by ${currentTrack.creator?.display_name || 'Unknown Artist'} on SoundBridge!\n\n${shareUrl}`;
    
    await Share.share({
      message: message,
      url: shareUrl,
      title: `${currentTrack.title} - SoundBridge`,
    });
  } catch (error) {
    console.error('Error sharing track:', error);
    Alert.alert('Share Failed', 'Unable to share this track. Please try again.');
  }
};
```

#### **Album Share (AlbumDetailsScreen.tsx)**
```typescript
const handleShare = async () => {
  try {
    const shareUrl = `https://soundbridge.live/album/${album?.id}`;
    const message = `🎵 Check out "${album?.title}" by ${album?.creator?.display_name || album?.creator?.username} on SoundBridge!\n\n${album?.tracks_count} tracks • ${formatDuration(album?.total_duration || 0)}\n\n${shareUrl}`;

    await Share.share({
      message,
      url: shareUrl,
      title: `${album?.title} - SoundBridge`,
    });
  } catch (error) {
    console.error('Error sharing album:', error);
  }
};
```

---

## 🧪 Testing Deep Links

### **iOS Testing**
```bash
# Test track link
xcrun simctl openurl booted "https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4"

# Test album link
xcrun simctl openurl booted "https://soundbridge.live/album/a1b2c3d4-5678-90ab-cdef-1234567890ab"

# Test creator link
xcrun simctl openurl booted "https://soundbridge.live/creator/bd8a455d-a54d-45c5-968d-e4cf5e8d928e"

# Test app scheme
xcrun simctl openurl booted "soundbridge://track/ff707546-6f34-4a31-895a-103612ceb9c4"
```

### **Android Testing**
```bash
# Test track link
adb shell am start -a android.intent.action.VIEW -d "https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4"

# Test album link
adb shell am start -a android.intent.action.VIEW -d "https://soundbridge.live/album/a1b2c3d4-5678-90ab-cdef-1234567890ab"

# Test app scheme
adb shell am start -a android.intent.action.VIEW -d "soundbridge://track/ff707546-6f34-4a31-895a-103612ceb9c4"
```

---

## 🌍 Web Integration Requirements

For Universal Links to work properly, you need to host two files on your domain:

### **1. iOS: Apple App Site Association (AASA)**
**File:** `https://soundbridge.live/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.soundbridge.mobile",
        "paths": [
          "/track/*",
          "/album/*",
          "/creator/*",
          "/event/*",
          "/playlist/*"
        ]
      }
    ]
  }
}
```

**Requirements:**
- Must be served with `Content-Type: application/json`
- Must be accessible via HTTPS
- No redirects allowed
- Must be at root domain (not subdomain)

---

### **2. Android: Digital Asset Links**
**File:** `https://soundbridge.live/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.soundbridge.mobile",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

**Requirements:**
- Must be served with `Content-Type: application/json`
- Must be accessible via HTTPS
- SHA256 fingerprint must match your app signing certificate

---

## 📊 Share Analytics (Future Enhancement)

Track how users are sharing content:

```typescript
// When user shares
await analyticsService.trackEvent('content_shared', {
  content_type: 'track', // or 'album', 'creator', 'event'
  content_id: trackId,
  share_method: 'native', // or 'copy_link', 'social_media'
  platform: Platform.OS,
});

// When link is opened
await analyticsService.trackEvent('deep_link_opened', {
  link_type: 'track',
  content_id: trackId,
  source: 'share', // or 'notification', 'social_media', 'web'
  platform: Platform.OS,
});
```

---

## 🎨 Share Preview (Open Graph Tags)

For rich previews on social media, your web pages should include Open Graph tags:

```html
<!-- Track Page -->
<meta property="og:type" content="music.song">
<meta property="og:title" content="Electric Dreams - Asibe Cheta">
<meta property="og:description" content="Listen to Electric Dreams by Asibe Cheta on SoundBridge">
<meta property="og:image" content="https://soundbridge.live/covers/track-123.jpg">
<meta property="og:url" content="https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4">
<meta property="og:site_name" content="SoundBridge">

<!-- Twitter Card -->
<meta name="twitter:card" content="player">
<meta name="twitter:site" content="@soundbridge">
<meta name="twitter:title" content="Electric Dreams - Asibe Cheta">
<meta name="twitter:description" content="Listen on SoundBridge">
<meta name="twitter:image" content="https://soundbridge.live/covers/track-123.jpg">
<meta name="twitter:player" content="https://soundbridge.live/embed/track/ff707546-6f34-4a31-895a-103612ceb9c4">
```

---

## 🚀 Future Enhancements

1. **QR Codes**
   - Generate QR codes for tracks, albums, creators
   - Scan QR codes to open content in app

2. **Short Links**
   - `https://sb.link/t/abc123` (shorter, trackable)
   - Custom vanity URLs for creators

3. **Social Media Integrations**
   - Direct share to Instagram Stories
   - Direct share to TikTok
   - Direct share to Twitter with embedded player

4. **Referral Tracking**
   - Track who shared what and who opened it
   - Reward creators for viral content
   - Track conversion from share to app install

5. **Dynamic Links**
   - Firebase Dynamic Links or Branch.io
   - Better app install attribution
   - Preserve deep link after app install

6. **Web Player Embeds**
   - Embeddable players for websites
   - `<iframe src="https://soundbridge.live/embed/track/..."></iframe>`

---

## ✅ Implementation Checklist

### **Mobile App** ✅
- [x] Configure app.json with scheme and associated domains
- [x] Implement deep link handler in App.tsx
- [x] Add track share with URL
- [x] Add album share with URL
- [x] Add album deep link case
- [x] Test deep links on iOS simulator
- [x] Test deep links on Android emulator

### **Web (Backend Required)** ⏳
- [ ] Host AASA file at `/.well-known/apple-app-site-association`
- [ ] Host assetlinks.json at `/.well-known/assetlinks.json`
- [ ] Create web pages for `/track/[id]`, `/album/[id]`, `/creator/[id]`
- [ ] Add Open Graph meta tags to web pages
- [ ] Add Twitter Card meta tags
- [ ] Implement web player (or "Download App" page)
- [ ] Set up redirects for www subdomain

### **Testing** ⏳
- [ ] Test universal links on real iOS device
- [ ] Test universal links on real Android device
- [ ] Test app scheme links
- [ ] Test share functionality across different apps (Messages, WhatsApp, Twitter, etc.)
- [ ] Test link previews in social media
- [ ] Test what happens when app is not installed

---

## 📝 Summary

**Current Status:**
- ✅ App-side deep linking fully configured
- ✅ Share functionality implemented for tracks and albums
- ✅ Album deep links added to navigation
- ⏳ Web-side configuration needed (AASA, assetlinks.json)
- ⏳ Web pages for content needed

**Link Formats:**
- **Tracks:** `https://soundbridge.live/track/[id]`
- **Albums:** `https://soundbridge.live/album/[id]` *(NEW!)*
- **Creators:** `https://soundbridge.live/creator/[id]`
- **Events:** `https://soundbridge.live/event/[id]`

**When users share a song/album, they get:**
- A nicely formatted message with emoji, title, artist
- A clickable link that opens the app (if installed)
- A web fallback (if configured on backend)

---

**Next Steps:**
1. Coordinate with your web team to set up AASA and assetlinks.json files
2. Create web landing pages for tracks, albums, creators
3. Test on real devices once web files are deployed
4. Implement analytics to track share performance

**The mobile app is ready! The rest is backend/web configuration.** 🚀

