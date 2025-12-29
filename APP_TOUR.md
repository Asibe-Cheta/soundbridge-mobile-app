# Cursor Prompt: Implement App Tour for New Users with Skip Option

## 🎯 OBJECTIVE

Implement an interactive app tour that:
1. **Shows ONLY to newly registered users** (first-time app launch after signup)
2. **Has mandatory "Skip Tour" option** on every step
3. **Guides users through key features** across Feed, Discover, and Upload screens
4. **Uses `react-native-copilot` library** for spotlight/tooltip effects
5. **Saves completion status** so tour never shows again
6. **Preserves all existing functionality**

---

## 📋 PHASE 1: DISCOVERY (DO THIS FIRST)

Before implementing anything, analyze the existing codebase:

### **1. Check User Registration Flow**

**Find:**
- Where new users complete registration/signup
- How user data is stored after signup
- Whether there's a `created_at` or `signup_date` field
- Whether AsyncStorage is already being used

**Questions to answer:**
- How do we detect a "newly registered user"?
- Is there a flag like `is_new_user` in the database?
- Can we use `created_at` timestamp to determine if user is new?
- What happens after successful signup? (Navigate where?)

**OUTPUT:** Report findings on user registration detection method.

---

### **2. Locate Key UI Elements**

**Find these components that need tour highlights:**

**Feed Screen:**
- Profile icon/avatar (top left usually)
- Search bar
- Drop/Create post button
- Tip icon on post cards
- Bottom navigation (Discover tab)

**Discover Screen:**
- Tab navigation (Music, Artists, Events, etc.)
- Trending section
- Event cards
- Search/filter options

**Upload Screen:**
- Upload button
- Track information form
- Submit/publish button

**OUTPUT:** List file paths and component names for each element.

---

### **3. Check Existing Dependencies**

**Search for:**
- AsyncStorage (or other local storage)
- Navigation library (React Navigation, etc.)
- Icon library being used (Ionicons, FontAwesome, etc.)
- Whether TypeScript or JavaScript

**OUTPUT:** List existing dependencies and versions.

---

### **4. Identify App Entry Point**

**Find:**
- Main `App.tsx` or `index.js`
- Where providers are wrapped (Navigation, Context, etc.)
- Where to add `CopilotProvider`

**OUTPUT:** File path of app entry point.

---

**STOP HERE AND REPORT ALL FINDINGS BEFORE PROCEEDING**

---

## 📦 PHASE 2: INSTALLATION

### **Install Required Package**

```bash
npm install react-native-copilot --save
# or
yarn add react-native-copilot
```

**Additional dependencies (if not present):**
```bash
npm install @react-native-async-storage/async-storage --save
```

**Verify installation:**
- Check that `react-native-copilot` appears in `package.json`
- No version conflicts with existing packages

---

## 🏗️ PHASE 3: IMPLEMENTATION STRUCTURE

### **3.1: Wrap App with CopilotProvider**

**Location:** App entry point (usually `App.tsx` or `index.js`)

**What to do:**
- Import `CopilotProvider` from `react-native-copilot`
- Wrap the ENTIRE app navigation structure
- Add custom configuration for SoundBridge branding

**Configuration options to include:**
- `overlay="svg"` - For smooth circular spotlight
- `androidStatusBarVisible={false}` - Hide status bar during tour
- `backdropColor="rgba(19, 7, 34, 0.9)"` - SoundBridge purple with transparency
- `verticalOffset={24}` - Adjust tooltip position if needed
- `arrowColor="#EC4899"` - SoundBridge pink for tooltip arrow
- `tooltipComponent={CustomTooltip}` - Use custom tooltip (create this)
- `stepNumberComponent={CustomStepNumber}` - Use custom step number (create this)

**Important:**
- `CopilotProvider` must wrap NavigationContainer (or equivalent)
- Do NOT wrap it inside any screen - it must be at app root level

---

### **3.2: Create Custom Tooltip Component**

**Location:** Create new file `src/components/TourTooltip.tsx` (or similar)

**Requirements:**

**Props to use:**
- `isFirstStep` - Boolean indicating first step
- `isLastStep` - Boolean indicating last step
- `currentStep` - Object containing current step data
- `handleNext` - Function to go to next step
- `handleStop` - Function to end tour
- `handlePrev` - Function to go to previous step (optional)

**UI Elements Required:**
- Step indicator: "Step X of Y"
- Tour message text from `currentStep.text`
- "Next" button (unless last step)
- "Got it!" or "Done" button (on last step only)
- **MANDATORY:** "Skip Tour" button/link on EVERY step
- Optional: "Back" button (except on first step)

**Styling Requirements:**
- Background: Dark purple matching SoundBridge theme
- Border radius: 16px (rounded corners)
- Padding: 16-20px
- Text color: White
- Accent color: `#EC4899` (SoundBridge pink)
- Shadow/elevation for depth
- Arrow pointing to highlighted element
- Max width: 90% of screen width
- Responsive to different screen sizes

**Button Styling:**
- Primary button (Next/Done): Pink background `#EC4899`, white text, rounded
- Secondary button (Skip): Transparent background, pink text, underline or outline
- Spacing between buttons: 12px

**Animations:**
- Fade in animation when tooltip appears
- Smooth transition when moving to next step
- Slide up from bottom (optional)

---

### **3.3: Create Custom Step Number Component**

**Location:** Same file as tooltip or separate `src/components/TourStepNumber.tsx`

**Requirements:**
- Display current step number
- Style: Circle with SoundBridge pink background
- White text
- Size: 32x32px (adjust as needed)
- Position: Top-left or top-right of tooltip

**Optional:** Can be omitted if you show "Step X of Y" in tooltip text instead.

---

### **3.4: Tour Logic Manager**

**Location:** Create `src/utils/tourManager.ts` or `src/services/tourService.ts`

**Functions to implement:**

**1. Check if user should see tour:**
```typescript
checkShouldShowTour()
// Returns: boolean
// Logic:
// - Check AsyncStorage for 'hasSeenTour' flag
// - Check AsyncStorage for 'tourSkippedAt' timestamp
// - Check if user is newly registered (within 5 minutes of signup?)
// - Return true ONLY if all conditions met:
//   - User has NOT seen tour before
//   - User registered recently
//   - Tour was not skipped
```

**2. Mark tour as completed:**
```typescript
markTourComplete()
// Actions:
// - Save to AsyncStorage: 'hasSeenTour' = 'true'
// - Save timestamp: 'tourCompletedAt' = current ISO timestamp
// - Optional: Send analytics event "tour_completed"
```

**3. Mark tour as skipped:**
```typescript
markTourSkipped(currentStep: number)
// Actions:
// - Save to AsyncStorage: 'tourSkipped' = 'true'
// - Save timestamp: 'tourSkippedAt' = current ISO timestamp
// - Save which step was skipped: 'tourSkippedAtStep' = currentStep
// - Optional: Send analytics event "tour_skipped" with step number
```

**4. Reset tour (for testing):**
```typescript
resetTour()
// Actions:
// - Clear all tour-related AsyncStorage keys
// - Used for development/testing
// - Optional: Add in Settings screen for users
```

**5. Get tour statistics:**
```typescript
getTourStats()
// Returns: Object with tour metadata
// - hasSeenTour: boolean
// - completedAt: string | null
// - skippedAt: string | null
// - skippedAtStep: number | null
```

---

## 🎯 PHASE 4: MARK TOUR ELEMENTS

### **4.1: Import Required Functions**

**In each screen that has tour steps (Feed, Discover, Upload):**

**Imports:**
- `walkthroughable` from `react-native-copilot`
- `useCopilot` hook from `react-native-copilot`
- `checkShouldShowTour`, `markTourComplete`, `markTourSkipped` from tour manager

**Create walkthroughable versions:**
```typescript
const WalkthroughableView = walkthroughable(View);
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);
const WalkthroughableText = walkthroughable(Text);
// etc.
```

---

### **4.2: Tour Steps Definition**

**Define tour flow across screens:**

**FEED SCREEN (Steps 1-3):**

**Step 1: Drop Content & Get Tipped**
- Order: 1
- Name: "create_drop_earn"
- Text: "Tap here to drop content and GET TIPPED! Share music, updates, or studio sessions. Unlike Spotify's £0.003/stream, fans tip you directly - you keep 95%. Real money, not pennies."
- Element: Create/Upload button (+ button, usually center bottom or floating action button)
- **Why this first:** Shows immediate earning potential

**Step 2: Tip Button - Where to Support Creators**
- Order: 2
- Name: "tip_button_location"
- Text: "This 💰 icon is where you tip creators. When others tip YOUR drops, you keep 95%. Tap it now to see how tipping works - this is how you actually earn on SoundBridge."
- Element: Tip icon (💰) on a post card in the feed
- **Why important:** Shows exactly WHERE to tip and reinforces earning

**Step 3: Your Profile - Business Dashboard**
- Order: 3
- Name: "profile_hub"
- Text: "Your profile is your business hub. Tap to access: Digital wallet setup (get paid!), Earnings & analytics, Create events & sell tickets, Privacy settings, and Connection management."
- Element: Profile avatar/icon (top-left)
- **Action:** When "Next" is pressed, navigate to Profile screen

---

**PROFILE SCREEN (Steps 4-7):**

**Step 4: Digital Wallet - Get Paid**
- Order: 4
- Name: "wallet_setup"
- Text: "Set up your digital wallet HERE to receive tips and event ticket payments. Withdraw earnings anytime (minimum £20 for Premium, £10 for Unlimited). This is how money reaches YOU."
- Element: Wallet/Earnings section in profile, or Settings button that leads to wallet
- **Why critical:** Shows concrete path to getting paid

**Step 5: Create Events - Targeted Audience**
- Order: 5
- Name: "create_events_targeted"
- Text: "Create events and sell tickets directly to YOUR followers. Your events appear in their feeds FIRST - targeted audience, not random. Keep 95% of ticket sales (97% for Unlimited)."
- Element: "Create Event" button or Events tab in profile
- **Why unique:** Emphasizes targeted reach + direct monetization

**Step 6: Analytics - Track Your Growth**
- Order: 6
- Name: "analytics_insights"
- Text: "See who's engaging with your drops, where your audience is, top-performing content, and earnings over time. Use this data to grow strategically and book more paid work."
- Element: Analytics/Stats section in profile
- **Why valuable:** Data-driven career decisions

**Step 7: Settings - Wallet, Privacy, Themes**
- Order: 7
- Name: "profile_settings_control"
- Text: "Control everything: Set up digital wallet, manage privacy (who sees your drops), customize theme colors, notification preferences. Your platform, your rules."
- Element: Settings icon/button in profile
- **Action:** When "Next" is pressed, navigate to Connect screen

---

**CONNECT SCREEN (Steps 8-10):**

**Step 8: Find PAID Collaboration Opportunities**
- Order: 8
- Name: "paid_collaborations"
- Text: "This isn't LinkedIn networking - find REAL paid work. Connect with producers, engineers, session musicians, and venues actively looking to hire creators like you."
- Element: Connect tab in bottom navigation or main connections feed
- **Why different:** Emphasizes PAID opportunities, not just "networking"

**Step 9: Opportunities Feed - Apply for Gigs**
- Order: 9
- Name: "opportunities_gigs"
- Text: "See job postings: 'Guitarist needed - £200', 'Mixing engineer for EP', 'Open mic host - paid'. Apply directly, negotiate rates, get booked. All in-app."
- Element: Opportunities section, job postings, or collaboration requests in Connect
- **Why powerful:** Concrete earning opportunities

**Step 10: Search Specific Collaborators**
- Order: 10
- Name: "search_collaborators"
- Text: "Need 'mixing engineer in London' or 'session drummer for R&B'? Search by role, genre, location, and budget. Find your perfect collaborator with filters."
- Element: Search bar in Connect screen with filters
- **Action:** When "Next" is pressed, navigate to Discover screen

---

**DISCOVER SCREEN (Steps 11-13):**

**Step 11: Events Near You - Perform or Attend**
- Order: 11
- Name: "local_events_perform"
- Text: "Find gigs, open mics, concerts near YOU. Buy tickets to support, or reach out to venue owners to perform. Your local music scene + earning opportunities in one place."
- Element: Events tab or "Events Near You" section
- **Why unique:** Dual purpose - attend AND perform

**Step 12: Service Providers Marketplace**
- Order: 12
- Name: "hire_services"
- Text: "Need mixing, mastering, studio time, session musicians? Browse service providers, see their rates, listen to their work, book directly. No middleman - direct payment."
- Element: Services tab or service provider listings
- **Why valuable:** Built-in marketplace with verified providers

**Step 13: Upload Music - 3 FREE Tracks**
- Order: 13
- Name: "upload_free_forever"
- Text: "Upload 3 tracks FREE - FOREVER. No annual fees (unlike DistroKid's £20/year). Premium = 7 tracks/month. Unlimited = unlimited. Start NOW with zero cost."
- Element: Upload tab in bottom navigation
- **Why compelling:** Free tier + emphasizes no hidden costs vs competitors
- **Action:** When "Next" is pressed, navigate to Upload screen

---

**UPLOAD SCREEN (Steps 14-15):**

**Step 14: Upload & Reach Your Audience**
- Order: 14
- Name: "upload_targeted_reach"
- Text: "Upload audio, add details, tag genres. Your track goes live to YOUR followers immediately + gets discovered by fans searching your genre/location. Targeted reach, not algorithm lottery."
- Element: Upload button or file picker area
- **Why important:** Emphasizes audience targeting vs random discovery

**Step 15: You're Ready to EARN**
- Order: 15
- Name: "tour_complete_earn"
- Text: "You're all set! 🎵 Remember the SoundBridge way: Drop content → Get tipped (95%) → Sell event tickets (95%) → Find paid collaborations → Withdraw earnings. This isn't Spotify - you ACTUALLY earn here. Let's go! 🚀"
- Element: Entire upload screen or completion area
- **Action:** This is the LAST step - show "Got it!" button
- **Why powerful:** Final reinforcement of earning potential - the core difference

---

### **4.3: Wrapping Elements**

**For each element identified above:**

**Before (normal component):**
```typescript
<TouchableOpacity onPress={handleProfilePress}>
  <Image source={{ uri: userAvatar }} style={styles.avatar} />
</TouchableOpacity>
```

**After (walkthroughable):**
```typescript
<WalkthroughableTouchable
  order={1}
  text="This is your profile. Tap here to view your stats, edit settings, and manage your account."
  name="profile"
>
  <TouchableOpacity onPress={handleProfilePress}>
    <Image source={{ uri: userAvatar }} style={styles.avatar} />
  </TouchableOpacity>
</WalkthroughableTouchable>
```

**Key points:**
- `order` must be sequential (1, 2, 3, etc.)
- `text` is the tooltip message shown
- `name` is unique identifier for the step
- Wrap the ENTIRE component you want to highlight
- Do NOT change the component's functionality

---

## 🚀 PHASE 5: START TOUR LOGIC

### **5.1: Trigger Tour on Feed Screen**

**Location:** Feed screen (or wherever user lands after signup)

**Implementation pattern:**

**In Feed screen component:**

**1. Use copilot hook:**
```typescript
const { start, stop, currentStep } = useCopilot();
```

**2. Check and start tour on mount:**
```typescript
useEffect(() => {
  const initializeTour = async () => {
    const shouldShow = await checkShouldShowTour();
    if (shouldShow) {
      // Small delay to let screen fully render
      setTimeout(() => {
        start();
      }, 500);
    }
  };

  initializeTour();
}, []);
```

**3. Handle navigation between screens:**

**For step that navigates (e.g., Discover tab):**
```typescript
// In Feed screen
<WalkthroughableTouchable
  order={5}
  text="Tap Discover to find trending music..."
  name="discover_tab"
>
  <TouchableOpacity 
    onPress={() => {
      navigation.navigate('Discover');
      // Tour will continue automatically on Discover screen
    }}
  >
    <Ionicons name="compass" />
    <Text>Discover</Text>
  </TouchableOpacity>
</WalkthroughableTouchable>
```

**The tour will automatically continue to step 6 on Discover screen because:**
- All steps are numbered sequentially
- Copilot tracks current step globally
- When screen changes, copilot finds next step automatically

---

### **5.2: Handle Tour Completion**

**In Custom Tooltip component:**

**When "Got it!" button pressed (last step):**
```typescript
const handleComplete = async () => {
  await markTourComplete();
  handleStop(); // Close tour
  // Optional: Show success toast/modal
};
```

---

### **5.3: Handle Tour Skip**

**In Custom Tooltip component:**

**When "Skip Tour" button/link pressed (ANY step):**
```typescript
const handleSkip = async () => {
  await markTourSkipped(currentStep.order);
  handleStop(); // Close tour immediately
  // Optional: Show toast "You can restart the tour in Settings"
};
```

**IMPORTANT:**
- Skip button must be visible and functional on EVERY step
- Skip should immediately end the tour (no confirmation needed)
- User should never be forced to complete tour

---

## 🎨 PHASE 6: STYLING CUSTOMIZATION

### **6.1: Match SoundBridge Theme**

**Colors to use:**
- Primary: `#EC4899` (Pink)
- Background Dark: `#130722` (Purple)
- Background Card: `#1a0b2e`
- Text: `#FFFFFF` (White)
- Text Muted: `rgba(255, 255, 255, 0.6)`
- Overlay: `rgba(19, 7, 34, 0.9)` (Dark purple with transparency)

**Typography:**
- Tooltip title: 18-20px, bold
- Tooltip text: 14-16px, regular
- Button text: 14-16px, semi-bold
- Step indicator: 12px, medium

**Spacing:**
- Padding inside tooltip: 20px
- Margin between text and buttons: 16px
- Gap between buttons: 12px
- Border radius: 16px

---

### **6.2: Responsive Considerations**

**Ensure tooltip works on:**
- Small screens (iPhone SE, older Androids)
- Large screens (iPad, tablets)
- Different orientations (portrait/landscape)

**Adaptive sizing:**
- Tooltip max width: 90% of screen width
- Tooltip min width: 280px
- Font sizes scale with screen size (use `em` or `rem` if possible)
- Touch targets minimum 44x44px for accessibility

---

## ⚙️ PHASE 7: ADDITIONAL FEATURES

### **7.1: Settings Integration (Optional but Recommended)**

**Add to Settings screen:**

**"Restart App Tour" button:**
- Location: Settings > Help & Support section
- Action: Calls `resetTour()` then `start()`
- Useful for users who skipped and want to see it again

**Implementation:**
```typescript
// In Settings screen
<TouchableOpacity onPress={handleRestartTour}>
  <Text>Restart App Tour</Text>
</TouchableOpacity>

const handleRestartTour = async () => {
  await resetTour();
  navigation.navigate('Feed');
  // Tour will auto-start when Feed loads
};
```

---

### **7.2: Analytics Tracking (Optional)**

**Track tour engagement:**

**Events to log:**
- `tour_started` - When tour begins
- `tour_step_viewed` - For each step (with step number/name)
- `tour_completed` - When user finishes all steps
- `tour_skipped` - When user skips (with step number where skipped)
- `tour_restarted` - When user manually restarts from settings

**Use existing analytics service (if any):**
- Firebase Analytics
- Mixpanel
- Amplitude
- Custom analytics

**Example:**
```typescript
// When step changes
useEffect(() => {
  if (currentStep) {
    analytics.logEvent('tour_step_viewed', {
      step_number: currentStep.order,
      step_name: currentStep.name,
    });
  }
}, [currentStep]);
```

---

### **7.3: Accessibility**

**Ensure tour is accessible:**

**Screen readers:**
- Add `accessibilityLabel` to highlighted elements
- Tooltip text should be screen-reader friendly
- Buttons should have clear accessibility labels

**Navigation:**
- Users can skip with one tap (no hidden menus)
- Keyboard navigation support (if applicable)
- High contrast mode compatible

**Testing:**
- Test with VoiceOver (iOS)
- Test with TalkBack (Android)
- Test with large text sizes

---

## 🧪 PHASE 8: TESTING CHECKLIST

### **8.1: Functionality Testing**

**New user flow:**
- [ ] Tour starts automatically for newly registered users
- [ ] Tour does NOT start for existing users
- [ ] Tour does NOT start if user has seen it before
- [ ] Tour does NOT start if user has skipped it before

**Navigation:**
- [ ] Tour correctly highlights elements on Feed screen
- [ ] Tapping Discover tab navigates and continues tour on Discover screen
- [ ] Tour correctly highlights elements on Discover screen
- [ ] Navigating to Upload screen continues tour correctly
- [ ] Tour completes successfully on Upload screen

**Skip functionality:**
- [ ] "Skip Tour" button visible on EVERY step
- [ ] Tapping "Skip Tour" immediately ends tour
- [ ] Skipped status saved correctly in AsyncStorage
- [ ] Tour does NOT restart after being skipped

**Completion:**
- [ ] "Got it!" button appears on last step (not "Next")
- [ ] Tapping "Got it!" marks tour as complete
- [ ] Completed status saved correctly in AsyncStorage
- [ ] Tour does NOT restart after completion

**Restart:**
- [ ] "Restart App Tour" in Settings works correctly
- [ ] Tour resets completion/skip status
- [ ] Tour starts from step 1 when restarted

---

### **8.2: UI/UX Testing**

**Visual:**
- [ ] Spotlight correctly highlights elements (not cutting off)
- [ ] Tooltip appears in correct position (not off-screen)
- [ ] Tooltip arrow points to correct element
- [ ] Overlay darkens background appropriately
- [ ] Colors match SoundBridge theme (purple/pink)
- [ ] Text is readable on all backgrounds
- [ ] Buttons are clearly visible and styled correctly

**Responsive:**
- [ ] Works on small screens (iPhone SE)
- [ ] Works on large screens (iPad/tablets)
- [ ] Works in portrait orientation
- [ ] Works in landscape orientation (if applicable)
- [ ] Tooltip resizes appropriately

**Animations:**
- [ ] Tooltip appears smoothly (fade in)
- [ ] Transition between steps is smooth
- [ ] Spotlight moves smoothly to next element
- [ ] No janky animations or delays

---

### **8.3: Edge Cases**

**Test these scenarios:**
- [ ] User taps outside tooltip (should not close tour)
- [ ] User presses device back button (should not close tour)
- [ ] App goes to background mid-tour (tour should pause/resume)
- [ ] User force-closes app mid-tour (tour should restart from beginning next time)
- [ ] Network error during tour (tour should continue normally)
- [ ] User logs out mid-tour (tour should stop)
- [ ] Multiple rapid taps on "Next" button (should not break tour)

---

## 📂 FILES YOU WILL CREATE/MODIFY

### **New Files to Create:**

**1. Tour Components:**
- `src/components/TourTooltip.tsx` - Custom tooltip component
- `src/components/TourStepNumber.tsx` - Custom step number (optional)

**2. Tour Logic:**
- `src/utils/tourManager.ts` or `src/services/tourService.ts` - Tour state management

**3. Tour Styles:**
- `src/styles/tourStyles.ts` - Shared styles for tour components (optional)

---

### **Files to Modify:**

**1. App Entry:**
- `App.tsx` or `index.js` - Add CopilotProvider

**2. Screens with Tour Steps:**
- `src/screens/FeedScreen.tsx` - Steps 1-3
- `src/screens/ProfileScreen.tsx` - Steps 4-7
- `src/screens/ConnectScreen.tsx` - Steps 8-10
- `src/screens/DiscoverScreen.tsx` - Steps 11-13
- `src/screens/UploadScreen.tsx` - Steps 14-15

**3. Settings (Optional):**
- `src/screens/SettingsScreen.tsx` - Add "Restart Tour" option

**4. Dependencies:**
- `package.json` - Add react-native-copilot

---

## 🚨 CRITICAL PRESERVATION RULES

### **DO NOT CHANGE:**

**1. Existing Functionality:**
- ❌ Do NOT modify any button/element behavior
- ❌ Do NOT change navigation flow
- ❌ Do NOT alter existing state management
- ❌ Do NOT modify API calls or data fetching

**2. Existing Components:**
- ❌ Do NOT rename components
- ❌ Do NOT restructure component hierarchy
- ❌ Do NOT change component props (unless adding walkthroughable wrapper)

**3. Existing Styles:**
- ❌ Do NOT modify existing StyleSheets
- ❌ Do NOT change existing colors/spacing (except for tour elements)
- ❌ Do NOT alter layout of existing components

### **ONLY ADD:**

**✅ Walkthroughable wrappers** around existing components
**✅ CopilotProvider** at app root
**✅ Tour components** (tooltip, step number)
**✅ Tour logic** (manager/service)
**✅ Tour trigger logic** (useEffect in Feed screen)
**✅ AsyncStorage operations** for tour state

---

## 🎯 SUCCESS CRITERIA

**Implementation is complete when:**

1. ✅ Tour starts automatically for newly registered users only
2. ✅ Tour has 15 steps across Feed, Profile, Connect, Discover, Upload screens
3. ✅ Each step correctly highlights the intended UI element
4. ✅ "Skip Tour" button is visible and functional on EVERY step
5. ✅ Tour can be completed successfully
6. ✅ Tour completion/skip status is saved persistently
7. ✅ Tour never shows again after completion or skip
8. ✅ Tour can be restarted from Settings
9. ✅ Styling matches SoundBridge purple/pink theme
10. ✅ No existing functionality is broken
11. ✅ Works on iOS and Android
12. ✅ Passes all testing checklist items

---

## 📊 DELIVERABLES

After implementation, provide:

### **1. Discovery Report:**
- User registration detection method: `_______`
- Navigation library: `_______`
- Icon library: `_______`
- AsyncStorage present: `Yes/No`
- App entry point: `_______`

### **2. Implementation Summary:**
- Files created: `[list with paths]`
- Files modified: `[list with paths]`
- Dependencies added: `[list with versions]`
- Total tour steps: `15`

### **3. Testing Report:**
- [ ] New user flow tested ✅
- [ ] Skip functionality tested ✅
- [ ] Completion flow tested ✅
- [ ] Cross-screen navigation tested ✅
- [ ] Restart from Settings tested ✅
- [ ] Responsive design tested ✅
- [ ] Edge cases tested ✅
- [ ] No breaking changes ✅

---

## 🆘 TROUBLESHOOTING GUIDE

### **Common Issues:**

**Issue 1: Tour doesn't start**
- Check: CopilotProvider is wrapping the app correctly
- Check: `checkShouldShowTour()` is returning true
- Check: `start()` is being called after screen renders
- Solution: Add console logs to debug flow

**Issue 2: Tooltip appears off-screen**
- Check: Element being highlighted is fully visible
- Check: `verticalOffset` setting in CopilotProvider
- Solution: Adjust tooltip positioning props

**Issue 3: Tour breaks when navigating**
- Check: Step numbers are sequential across screens
- Check: Copilot context is preserved during navigation
- Solution: Ensure CopilotProvider wraps NavigationContainer

**Issue 4: Skip button doesn't work**
- Check: `handleStop()` is being called correctly
- Check: AsyncStorage is saving skip status
- Solution: Verify tour manager functions are properly implemented

**Issue 5: Spotlight doesn't highlight element**
- Check: Element is wrapped with walkthroughable component
- Check: `order` prop is set correctly
- Solution: Ensure element is rendered before tour starts

---

## 💡 DEVELOPMENT TIPS

**1. Test frequently:**
- Clear AsyncStorage often during development
- Use "Restart Tour" button for quick testing
- Test on real device (not just simulator)

**2. Incremental implementation:**
- Start with one screen (Feed) and verify it works
- Add next screen only after previous screen is working
- Don't try to implement all 10 steps at once

**3. Use console logs:**
- Log when tour starts
- Log current step number
- Log when skip/complete is triggered
- Remove logs before production

**4. Styling iteratively:**
- Get functionality working first
- Style tooltip to match theme afterward
- Test on multiple screen sizes

---

## 📞 FINAL REMINDERS

- **Start with Phase 1 Discovery** - understand structure before implementing
- **Follow phases sequentially** - don't skip ahead
- **Test after each phase** - catch issues early
- **Preserve existing functionality** - tour is an addition, not a replacement
- **Skip button is mandatory** - never force users through tour
- **Only show to new users** - respect existing users' time
- **Save state persistently** - AsyncStorage is critical
- **Match SoundBridge theme** - purple/pink colors throughout
- **Test on real devices** - simulators don't always match real behavior

**Begin with Phase 1 Discovery and report your findings before proceeding to implementation!**

Good luck! 🚀🎵