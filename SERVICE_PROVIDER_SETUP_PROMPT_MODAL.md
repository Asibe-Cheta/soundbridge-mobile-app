# Task: Service Provider Setup Prompt Modal

## Overview
Implement a non-intrusive modal that encourages users to set up their service provider profile, allowing them to offer services and earn money on the platform.

---

## CRITICAL REQUIREMENTS

### 1. WHO SEES THIS MODAL
**Target Users:**
- ✅ Users who have NOT set up service provider details
- ✅ Users who are currently NOT service providers
- ❌ Users who already have service provider profile set up
- ❌ Users who explicitly dismissed and chose "Don't show again"

**Check Before Showing:**
```typescript
const shouldShowServiceProviderPrompt = () => {
  // Check existing user data
  const hasServiceProviderProfile = currentUser.accountType === 'service_provider' 
    && currentUser.serviceProviderDetails?.isComplete;
  
  const hasDismissedPermanently = currentUser.preferences?.dismissedServiceProviderPrompt === true;
  
  const lastRemindedDate = currentUser.preferences?.serviceProviderPromptLastShown;
  const daysSinceLastShown = lastRemindedDate 
    ? differenceInDays(new Date(), new Date(lastRemindedDate))
    : null;
  
  // Show if:
  // - Not a service provider yet
  // - Hasn't permanently dismissed
  // - Either never shown OR last shown 7+ days ago (if they chose "remind me later")
  return !hasServiceProviderProfile 
    && !hasDismissedPermanently 
    && (!daysSinceLastShown || daysSinceLastShown >= 7);
};
```

---

## 2. WHEN TO SHOW THE MODAL

### Trigger Moments (Choose ONE or combine strategically):

**Option A: After Profile Completion (RECOMMENDED)**
- User completes basic profile setup
- User adds their first audio upload
- User completes "Getting Started" checklist
- **Why:** They've invested time, more likely to engage

**Option B: On Specific Screen Visits**
- When user visits Connect screen for 3rd time
- When user views someone else's service provider profile
- When user views an opportunity post
- **Why:** Context shows they're exploring features

**Option C: After Engagement Milestone**
- User receives their first tip/support
- User gets 10+ profile views
- User completes 1 week on platform
- **Why:** They're seeing value, ready for next step

**RECOMMENDED IMPLEMENTATION:**
Combine A + B:
```typescript
const triggerPoints = [
  'after_first_audio_upload', // They've created content
  'third_connect_screen_visit', // They're exploring opportunities
  'viewed_service_provider_profile', // They see others doing it
];

// Show modal on FIRST occurrence of any trigger
// Then respect "Remind me later" (7 days) or "Don't show again"
```

---

## 3. MODAL DESIGN

### Design Style
- **NOT** native mobile device popup (Alert.alert)
- **YES** custom in-app UI modal
- Matches SoundBridge glassmorphism/gradient design
- Bottom sheet style (similar to Express Interest modal)
- Clean, inviting, NOT salesy or pushy

### Modal Content
```
┌─────────────────────────────────────────┐
│      [Drag handle - subtle gray]        │
│                                         │
│         💼 Earn on SoundBridge!         │
│                                         │
│  Turn your skills into income!          │
│                                         │
│  Let people know what you can do        │
│  for them:                              │
│                                         │
│  • Backup vocalist                      │
│  • Vocal coaching                       │
│  • Event MC                             │
│  • Music production                     │
│  • Audio engineering                    │
│  • And more...                          │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ✨ It's completely FREE            │ │
│  │ 💰 Keep 95% of what you earn       │ │
│  │ 🎯 Get discovered by those who     │ │
│  │    need your services              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Setup Service Provider Profile]       │
│  (Primary pink gradient button)         │
│                                         │
│  [Remind Me Later]                      │
│  (Secondary outline button)             │
│                                         │
│  [Don't Show Again]                     │
│  (Small text link, gray)                │
│                                         │
└─────────────────────────────────────────┘
```

### Alternative Copy Options

**Option 1 (Opportunity-Focused):**
```
💼 Ready to Earn?

Musicians, producers, coaches, and creators are making money on SoundBridge by offering their services.

What can you offer?
- Session work
- Coaching & lessons  
- Event services
- Production work
- Technical services

Set up your service provider profile and start earning today - it's free!
```

**Option 2 (Community-Focused):**
```
🎤 Share Your Skills!

Others are looking for talents just like yours. Whether you're a vocalist, producer, engineer, or coach - there's opportunity here.

Turn your passion into profit:
✨ Free to set up
💰 Keep 95% of earnings
🎯 Get discovered

Let people know what you can do for them!
```

**Option 3 (Direct & Simple):**
```
💡 Did You Know?

You can earn money by offering services on SoundBridge!

Backup vocalist • Vocal coach • Producer
Event MC • Audio engineer • And more...

Setup your service provider details and start getting paid for what you love doing.

It's completely free! 🎵
```

**RECOMMENDED: Use Option 2** (Community-Focused)
- Friendly, not salesy
- Emphasizes community
- Shows value proposition clearly
- Inviting tone

---

## 4. BUTTON ACTIONS

### "Setup Service Provider Profile" (Primary)
```typescript
const handleSetupProfile = async () => {
  // Track interaction
  await analytics.track('service_provider_prompt_accepted', {
    trigger: currentTrigger,
    user_id: currentUser.id,
  });
  
  // Close modal
  closeModal();
  
  // Navigate to existing service provider setup screen
  // IMPORTANT: Find existing screen in codebase
  navigation.navigate('ServiceProviderSetup'); // Or whatever it's called
  
  // Update user preferences - don't show again since they're setting up
  await supabase
    .from('users')
    .update({
      preferences: {
        ...currentUser.preferences,
        dismissedServiceProviderPrompt: true,
        serviceProviderPromptLastShown: new Date().toISOString(),
      }
    })
    .eq('id', currentUser.id);
};
```

### "Remind Me Later" (Secondary)
```typescript
const handleRemindLater = async () => {
  // Track interaction
  await analytics.track('service_provider_prompt_remind_later', {
    trigger: currentTrigger,
    user_id: currentUser.id,
  });
  
  // Close modal
  closeModal();
  
  // Update preferences - show again in 7 days
  await supabase
    .from('users')
    .update({
      preferences: {
        ...currentUser.preferences,
        serviceProviderPromptLastShown: new Date().toISOString(),
        // DON'T set dismissedServiceProviderPrompt to true
      }
    })
    .eq('id', currentUser.id);
};
```

### "Don't Show Again" (Tertiary/Link)
```typescript
const handleDontShowAgain = async () => {
  // Track interaction
  await analytics.track('service_provider_prompt_dismissed', {
    trigger: currentTrigger,
    user_id: currentUser.id,
  });
  
  // Close modal
  closeModal();
  
  // Update preferences - never show again
  await supabase
    .from('users')
    .update({
      preferences: {
        ...currentUser.preferences,
        dismissedServiceProviderPrompt: true,
        serviceProviderPromptLastShown: new Date().toISOString(),
      }
    })
    .eq('id', currentUser.id);
};
```

---

## 5. ANTI-SPAM RULES

**Frequency Limits:**
```typescript
const ANTI_SPAM_RULES = {
  // Never show more than once per session
  maxPerSession: 1,
  
  // If "Remind Me Later" → wait 7 days minimum
  remindLaterCooldown: 7, // days
  
  // Never show on user's first day (let them explore)
  minDaysSinceSignup: 1,
  
  // Don't show if user is actively doing something important
  blockedScreens: [
    'Upload', // Don't interrupt upload flow
    'Payment', // Don't interrupt payment
    'LiveStream', // Don't interrupt live content
  ],
  
  // Don't show if they just dismissed another modal
  minTimeBetweenModals: 2, // hours
};

const canShowNow = () => {
  // Check session limit
  if (sessionState.serviceProviderPromptShown) return false;
  
  // Check screen
  if (ANTI_SPAM_RULES.blockedScreens.includes(currentScreen)) return false;
  
  // Check recent modal activity
  const lastModalShown = sessionState.lastModalShownAt;
  if (lastModalShown) {
    const hoursSince = differenceInHours(new Date(), lastModalShown);
    if (hoursSince < ANTI_SPAM_RULES.minTimeBetweenModals) return false;
  }
  
  // Check days since signup
  const daysSinceSignup = differenceInDays(
    new Date(), 
    new Date(currentUser.createdAt)
  );
  if (daysSinceSignup < ANTI_SPAM_RULES.minDaysSinceSignup) return false;
  
  return true;
};
```

---

## 6. IMPLEMENTATION DETAILS

### Where to Place Logic

**Check existing codebase for:**
1. Global modal manager (if exists)
2. Onboarding flow handlers
3. User preference management system
4. Analytics/tracking system

**Create reusable hook:**
```typescript
// hooks/useServiceProviderPrompt.ts
export const useServiceProviderPrompt = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  
  useEffect(() => {
    checkAndShowPrompt();
  }, [currentScreen]); // Check on screen changes
  
  const checkAndShowPrompt = async () => {
    if (!shouldShowServiceProviderPrompt()) return;
    if (!canShowNow()) return;
    
    setShouldShow(true);
    sessionState.serviceProviderPromptShown = true;
  };
  
  return {
    shouldShow,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
  };
};
```

### Database Schema Update
```sql
-- Add to users table preferences column (if JSON) or create separate table
ALTER TABLE users 
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;

-- Or if preferences is already a column, ensure these fields:
{
  "dismissedServiceProviderPrompt": false,
  "serviceProviderPromptLastShown": "2025-12-27T...",
  "serviceProviderPromptTrigger": "after_first_audio_upload"
}
```

---

## 7. TRIGGER IMPLEMENTATION

### Recommended Trigger Strategy

**Primary Trigger: After First Audio Upload**
```typescript
// In upload completion handler
const handleUploadComplete = async () => {
  // ... existing upload logic ...
  
  // Check if this is first upload
  const uploadCount = await getUserUploadCount(currentUser.id);
  
  if (uploadCount === 1 && shouldShowServiceProviderPrompt()) {
    // Wait 2 seconds (let upload success show)
    setTimeout(() => {
      showServiceProviderPrompt('after_first_audio_upload');
    }, 2000);
  }
};
```

**Secondary Trigger: Third Visit to Connect Screen**
```typescript
// In Connect screen useEffect
useEffect(() => {
  const incrementConnectVisits = async () => {
    const visits = currentUser.preferences?.connectScreenVisits || 0;
    const newVisits = visits + 1;
    
    await updateUserPreference('connectScreenVisits', newVisits);
    
    if (newVisits === 3 && shouldShowServiceProviderPrompt()) {
      showServiceProviderPrompt('third_connect_screen_visit');
    }
  };
  
  incrementConnectVisits();
}, []);
```

**Tertiary Trigger: Viewed Service Provider Profile**
```typescript
// When user views another user's service provider profile
const handleViewProfile = (userId: string, profile: UserProfile) => {
  // ... existing view logic ...
  
  if (profile.isServiceProvider && shouldShowServiceProviderPrompt()) {
    // Show after they exit the profile (not immediately)
    navigation.addListener('focus', () => {
      showServiceProviderPrompt('viewed_service_provider_profile');
    });
  }
};
```

---

## 8. MODAL COMPONENT STRUCTURE
```typescript
// components/ServiceProviderPromptModal.tsx
import { useServiceProviderPrompt } from '@/hooks/useServiceProviderPrompt';

export const ServiceProviderPromptModal = () => {
  const {
    shouldShow,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
  } = useServiceProviderPrompt();
  
  if (!shouldShow) return null;
  
  return (
    <BottomSheetModal
      visible={shouldShow}
      onDismiss={handleRemindLater}
      height="65%" // Adjust as needed
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} />
      
      {/* Icon/Title */}
      <Text style={styles.icon}>💼</Text>
      <Text style={styles.title}>Earn on SoundBridge!</Text>
      
      {/* Description */}
      <Text style={styles.description}>
        Turn your skills into income!
        {'\n\n'}
        Let people know what you can do for them:
      </Text>
      
      {/* Service examples */}
      <View style={styles.serviceList}>
        <ServiceItem text="Backup vocalist" />
        <ServiceItem text="Vocal coaching" />
        <ServiceItem text="Event MC" />
        <ServiceItem text="Music production" />
        <ServiceItem text="Audio engineering" />
        <ServiceItem text="And more..." />
      </View>
      
      {/* Value props */}
      <ValuePropCard>
        <ValueProp icon="✨" text="It's completely FREE" />
        <ValueProp icon="💰" text="Keep 95% of what you earn" />
        <ValueProp icon="🎯" text="Get discovered by those who need your services" />
      </ValuePropCard>
      
      {/* Actions */}
      <Button
        variant="primary"
        onPress={handleSetupProfile}
      >
        Setup Service Provider Profile
      </Button>
      
      <Button
        variant="outline"
        onPress={handleRemindLater}
      >
        Remind Me Later
      </Button>
      
      <TextButton onPress={handleDontShowAgain}>
        Don't Show Again
      </TextButton>
    </BottomSheetModal>
  );
};
```

---

## 9. ANALYTICS TRACKING

Track these events for optimization:
```typescript
// When shown
analytics.track('service_provider_prompt_shown', {
  trigger: 'after_first_audio_upload',
  user_tenure_days: 3,
  user_upload_count: 1,
});

// Interactions
analytics.track('service_provider_prompt_accepted'); // Setup clicked
analytics.track('service_provider_prompt_remind_later'); // Remind later
analytics.track('service_provider_prompt_dismissed'); // Don't show again
analytics.track('service_provider_prompt_ignored'); // X button/swipe down

// Conversion
analytics.track('service_provider_profile_completed', {
  source: 'prompt_modal',
  days_since_prompt: 0,
});
```

---

## SUCCESS CRITERIA

- [ ] Modal only shows to non-service providers
- [ ] Never shows if user permanently dismissed
- [ ] Respects 7-day cooldown for "Remind Me Later"
- [ ] Never shows more than once per session
- [ ] Triggers at appropriate moments (not spammy)
- [ ] Links to EXISTING service provider setup screen
- [ ] Custom UI modal (not native alert)
- [ ] Clean, inviting design matching SoundBridge
- [ ] All three actions work correctly
- [ ] Analytics tracking implemented
- [ ] Anti-spam rules enforced
- [ ] User preferences saved correctly

---

## QUESTIONS TO ANSWER FIRST

1. **Where is the existing service provider setup screen?**
   - What's the navigation route name?
   - Does it exist or needs to be created?

2. **Where are user preferences stored?**
   - Is there a `preferences` JSON column?
   - Or separate preference management system?

3. **Is there a global modal manager?**
   - Or should this be screen-specific?

4. **What's the existing bottom sheet/modal component?**
   - Import path and usage pattern

5. **Where should trigger checks be placed?**
   - Global app wrapper?
   - Individual screens?
   - Navigation listeners?

**Please analyze codebase and answer these questions before implementing.**