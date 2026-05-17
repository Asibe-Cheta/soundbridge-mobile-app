# SoundBridge Mobile App - AI Assistant Instructions

> **READ THIS FIRST**: You are an AI assistant working on the SoundBridge mobile app. Before making ANY changes, understand this codebase's architecture, patterns, and rules below. Follow these instructions for every task.

---

## Your Role

You are helping build a **React Native/Expo** mobile app for music creators, podcasters, and event organizers. This is a professional networking and monetization platform (like LinkedIn for the audio industry).

**Tech Stack:**
- React Native with Expo (SDK 51+)
- TypeScript (required for all new files)
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Stripe for payments
- Expo Push Notifications

---

## Critical Rules - NEVER Violate These

### 1. NO FALLBACKS for Personalized Events
The `get_personalized_events` RPC returns events near the user's location. If it returns empty, show "No events found" - **DO NOT** add fallback logic to show all events. This is a strict business requirement.

```typescript
// WRONG - Never do this
if (personalizedEvents.length === 0) {
  return getAllEvents(); // NO!
}

// CORRECT - Show empty state
if (personalizedEvents.length === 0) {
  return []; // Let UI show "No events found"
}
```

### 2. Check Existing Services Before Creating New Code
Before implementing anything, check if functionality already exists in:
- `src/services/` - Business logic services
- `src/lib/supabase.ts` - Database helpers (dbHelpers object)
- `src/contexts/` - React contexts
- `src/hooks/` - Custom hooks

### 3. Web Team Communication
If a feature needs backend changes, **DO NOT** try to implement backend code. Instead:
1. Create a `WEB_TEAM_*.md` document in the project root
2. Document what the mobile app needs
3. Include expected API request/response formats
4. Include SQL examples if relevant

### 4. Follow Existing Patterns
Look at similar screens/components before writing new code. Match the existing style.

---

## Project Structure

```
soundbridge-mobile-app/
├── App.tsx                    # Main entry, navigation, deep linking
├── app.json                   # Expo configuration
├── src/
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React contexts (Auth, Theme, Audio, Toast)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client + dbHelpers
│   │   └── apiClient.ts       # API fetch wrapper
│   ├── screens/               # All app screens
│   ├── services/              # Business logic services
│   │   ├── NotificationService.ts    # Push notifications
│   │   ├── LocationUpdateService.ts  # Location updates to backend
│   │   ├── UploadService.ts          # Audio uploads
│   │   ├── ContentPurchaseService.ts # Paid content
│   │   └── ...
│   ├── types/                 # TypeScript interfaces
│   ├── utils/                 # Utility functions
│   └── config/
│       └── environment.ts     # Environment config
├── WEB_TEAM_*.md              # Backend requirements docs
├── MOBILE_TEAM_*.md           # Mobile implementation docs
└── .env                       # Environment variables
```

---

## Key Services to Know

### NotificationService (`src/services/NotificationService.ts`)
- Push token registration with Expo
- Notification channels (events, tips, messages, moderation)
- Deep link handling when notifications are tapped
- Navigation callback for in-app routing

### LocationUpdateService (`src/services/LocationUpdateService.ts`)
- Sends user location to backend for event matching
- Throttling: 15 min / 500m rules
- Sources: onboarding, foreground, manual, significant_change
- Retry logic for failed updates

### Key Contexts
- `AuthContext` - User authentication, profile, session (`useAuth()`)
- `ThemeContext` - Dark/light mode (`useTheme()`)
- `AudioPlayerContext` - Audio playback state
- `ToastContext` - Toast notifications

---

## How to Write Code in This Codebase

### Screen Template
```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function SomeScreen() {
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('table').select('*');
      if (error) {
        console.error('❌ Error loading data:', error);
        return;
      }
      if (data) setData(data);
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### API Call Pattern
```typescript
try {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn('⚠️ No session');
    return;
  }

  const response = await fetch('https://www.soundbridge.live/api/endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('⚠️ API Error:', response.status, errorText);
    return;
  }

  const result = await response.json();
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Error:', error);
  Alert.alert('Error', 'Something went wrong');
}
```

### Supabase RPC Call
```typescript
const { data, error } = await supabase.rpc('function_name', {
  p_user_id: userId,
  p_limit: 10,
});

if (error) {
  console.error('❌ RPC error:', error.message);
  return;
}
```

### Console Log Prefixes (for debugging)
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 📍 Location
- 🔗 Deep link
- 🔔 Notification
- 📤 Sending data
- 📥 Received data

---

## Business Rules You Must Know

### Paid Events (Creator Gating)
- Anyone can create FREE events
- Only `role='creator'` can create PAID events
- Only creators with `subscription_tier='premium'|'unlimited'` can monetize

### Personalized Events (STRICT - NO FALLBACK)
- Events tab shows ONLY location-matched events
- Uses `get_personalized_events` RPC function
- If empty, show "No events found" - DO NOT show all events

### Upload Quotas
- Free: 3 uploads/month
- Premium: 7 uploads/month
- Unlimited: No limit

### Platform Fees
- Tips: 10% (free users), 8% (premium/unlimited)
- Paid content: 10% platform fee
- Paid events: 5% platform fee

---

## Deep Linking

**URL Scheme:** `soundbridge://`

| Path | Screen | Params |
|------|--------|--------|
| `event/{id}` | EventDetailsScreen | eventId |
| `track/{id}` | TrackDetailsScreen | trackId |
| `creator/{id}` | CreatorProfileScreen | creatorId |
| `messages/{id}` | ChatScreen | conversationId |
| `wallet/tips` | WalletScreen | tab: 'tips' |
| `live/{id}` | LiveSessionRoomScreen | sessionId |

**Key files:**
- `App.tsx` - `handleDeepLinkNavigation()`, `handleNotificationNavigation()`
- `NotificationService.ts` - `setNavigationCallback()`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `audio_tracks` | Uploaded audio content |
| `events` | Events with location data |
| `tips` | Tip transactions |
| `content_purchases` | Paid content purchases |
| `live_sessions` | Live audio rooms |
| `conversations` / `messages` | DM system |
| `notification_history` | Sent notifications |

### Profile Location Fields
```sql
profiles:
  - latitude (numeric)
  - longitude (numeric)
  - city (text)
  - location_updated_at (timestamptz)
  - expo_push_token (text)
  - notification_preferences (jsonb)
```

---

## Theme Colors

```typescript
const { theme } = useTheme();

theme.colors.primary        // Brand color
theme.colors.background     // Screen background
theme.colors.surface        // Card background
theme.colors.text           // Primary text
theme.colors.textSecondary  // Secondary text
theme.colors.border         // Borders
theme.colors.error          // Error states
```

---

## When Creating WEB_TEAM Documents

If you need backend changes, create a document like this:

```markdown
# Web Team: [Feature Name]

## Status: IMPLEMENTATION REQUIRED

## The Problem
[Clear description of what's needed]

## What Mobile Sends
```json
{
  "field": "value"
}
```

## What Mobile Expects Back
```json
{
  "field": "value"
}
```

## Database Requirements
[SQL schemas, RPC functions needed]

## Priority
CRITICAL / HIGH / MEDIUM / LOW
```

---

## Current Known Issues (January 2026)

1. **Event Notifications** - Backend webhook not deployed (see `WEB_TEAM_EVENT_NOTIFICATION_WEBHOOK_REQUIRED.md`)
2. **Personalized Events Bug** - Nigerian users not seeing events (see `WEB_TEAM_PERSONALIZED_EVENTS_NOT_WORKING.md`)
3. **Deep Link Navigation** - Fixed in NotificationService

---

## Before You Start Any Task

1. **Read relevant existing files** - Understand current implementation
2. **Check for existing services** - Don't duplicate functionality
3. **Check WEB_TEAM docs** - See if backend work is pending
4. **Follow patterns** - Match existing code style
5. **Ask if unclear** - Don't assume, verify with the user

---

## Quick Commands

```typescript
// Navigation
navigation.navigate('ScreenName', { param: value });

// Get auth session
const { data: { session } } = await supabase.auth.getSession();

// Get current user
const { user, userProfile } = useAuth();

// Get theme
const { theme } = useTheme();
```

---

*This document defines how you should work in this codebase. Reference it for every task.*
