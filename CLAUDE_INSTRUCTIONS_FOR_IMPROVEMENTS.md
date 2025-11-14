Please note: No need for use of emojis on this intructions, but they can either be replaced with the fitting icons for this platform or left out if not available.
# SoundBridge Mobile App - UX Enhancement Directives

**Context:** All required backend infrastructure exists. Implement the following UX improvements to make our unique value proposition visible to new users.

**Important:** Use existing code patterns, component structures, and styling conventions. Adapt these directives to match the current codebase architecture.

---

## PHASE 1: Visual Updates (No API Calls Required)

### **Directive 1: Update "Share Your Sound" Banner**

**Location:** Home screen top banner

**Changes Required:**
- Update banner text from "Share Your Sound - Get support from fans" to emphasize creator earnings
- New messaging should say: "Creators Earn Here"
- Add subtitle: "Upload free · Get discovered · Receive tips"
- Add/enhance the call-to-action button to say "Start Earning"
- Make the banner 20% more prominent (larger, bolder, or better positioned)
- Add a visual indicator for earnings (gold/yellow accent or icon)
- Ensure button navigates to the Upload screen

**Files Affected:** Home screen component, banner component (if separate)

---

### **Directive 2: Add Value Proposition Information Card**

**Location:** Home screen, positioned between "Featured Creator" section and "Trending Now" section

**Requirements:**
- Create a new card component that explains what makes SoundBridge different
- Card should display four key points:
  - "Upload music free (3 tracks)"
  - "Only see what you like"
  - "Tip artists directly"
  - "Connect with creators"
- Include a dismiss/close button (X icon in corner)
- Track dismissal state using local storage with key "hasSeenValueProp"
- Once dismissed, never show again for that user
- Style consistently with existing card components
- Use checkmarks or similar positive indicators for each point

**Files to Create/Modify:** New component for value prop card, home screen component

---

### **Directive 3: Add Contextual Text to Discovery Tab**

**Location:** Discovery/Search screen, above the search bar

**Requirements:**
- Add a subtitle text below the "Discover" header
- Text should read: "Find music, events, and creators based on YOUR preferences"
- Style as secondary/subtitle text (typically smaller, lighter color)
- Position with appropriate spacing between header and search bar
- Ensure responsive layout on different screen sizes

**Files to Modify:** Discovery/Search screen component

---

### **Directive 4: Implement First-Time User Tooltip System**

**Requirements:**
- Create a reusable tooltip/coach mark component system
- Implement three specific tooltips:

**Tooltip A - Events Section (first view):**
- Trigger: When user first views "Upcoming Events" section
- Content: "These events match YOUR preferences (Genre · Location). You'll never see irrelevant events."
- Action: "Got it" button to dismiss

**Tooltip B - Artist Profile (first view):**
- Trigger: When user first views any artist profile page
- Content: "Tip artists directly. 100% goes to the creator."
- Actions: "Show me" or "Maybe later" buttons

**Tooltip C - Collaboration Badge (first view):**
- Trigger: When user first sees "Available to Collaborate" indicator
- Content: "Connect with artists professionally. No more lost DMs - guaranteed visibility."
- Action: "Got it" button to dismiss

**Technical Requirements:**
- Store tooltip display state in local storage with keys:
  - "tooltip_events_seen"
  - "tooltip_tips_seen"
  - "tooltip_collaboration_seen"
- Each tooltip should only appear once per user lifetime
- Check storage before displaying each tooltip
- Use existing tooltip/overlay patterns if available in codebase

**Files to Create/Modify:** New tooltip component, home screen, artist profile screen

---

## PHASE 2: Dynamic Content Updates (Uses Existing APIs)

### **Directive 5: Add Personalization Labels Throughout App**

**Requirements:**
Pull user's genre preferences and location from their profile data and display contextually.

**Changes Needed:**

**A. Trending Section Header:**
- Current: "Trending Now"
- Update to: "Trending in [UserGenre] · [UserCity]" with fire emoji
- Example: "Trending in Gospel · London 🔥"

**B. Featured Creator Section:**
- Current: "Featured Creator - Discover amazing talent"
- Update to: "Featured Creator - [CreatorGenre] · [CreatorLocation]"
- Add subtitle: "Matches your taste"

**C. Events Section Header:**
- Current: "Upcoming Events"
- Update to: "Events Near You - Based on Your Preferences"
- Add subtitle showing active filters: "[Genre1] · [Genre2] · [Distance] miles"

**Data Sources:**
- User's genre preferences from user profile (stored during onboarding)
- User's location/city from user profile
- Creator's genre and location from creator profile
- User's distance preference from settings

**Files to Modify:** Home screen, section header components, any components displaying these sections

---

### **Directive 6: Add Match Indicators to Event Cards**

**Location:** All event card displays throughout the app

**Requirements:**
- Add a "match reason" indicator to each event card
- Compare event's genre/tags with user's preference genres
- Display matching tags below the event information
- Format: "✓ Matches: [Tag1] · [Tag2]"
- Show top 2 matching tags maximum
- Use green checkmark and secondary text styling
- Only show if at least one match exists

**Logic Required:**
- Filter event tags/genres against user's preferred genres
- Return intersection of the two arrays
- Take first 2 results

**Data Sources:**
- Event genre/tag fields from event data
- User preference genres from user profile

**Files to Modify:** Event card component

---

### **Directive 7: Add Collaboration Availability Indicators**

**Location:** Artist cards and artist profile screens

**Requirements:**
- Add a collaboration availability badge to all artist displays
- Only show badge if artist has set availability in their calendar
- Badge should display: Calendar emoji + "Available to Collaborate" + checkmark
- Make the badge clickable (should open collaboration request flow)
- Style with green checkmark to indicate availability
- Position below artist stats (followers, tracks)

**Data Source:**
- Artist profile field: hasAvailability (boolean)
- Artist profile field: availabilityCalendar (object with time slots)

**Files to Modify:** Artist card component, artist profile screen component

---

### **Directive 8: Implement Tipping Functionality UI**

**Locations Required:** Artist profiles, artist cards in lists, now playing screen

**Requirements:**

**A. Artist Profile Screen:**
- Add prominent "Tip Artist" button near top of profile
- Use gold/yellow accent color and money emoji icon
- Button should trigger tip modal

**B. Artist Cards in Lists:**
- Add smaller tip button (icon only: 💰)
- Position as secondary action on card
- Button should trigger tip modal

**C. Now Playing Screen:**
- Add tip button near player controls
- Format: "💰 Tip [ArtistName]" or similar
- Button should trigger tip modal

**Tip Modal Requirements:**
- Display artist avatar and name
- Show preset amount buttons: £1, £5, £10
- Include custom amount input field
- Display submit/send button
- On submit, call existing tips API endpoint
- Show success confirmation after payment
- Handle errors gracefully
- Close modal after successful tip

**API Endpoint (Already Exists):**
- POST to tips endpoint
- Parameters: artistId, amount, userId, paymentMethodId
- Use existing Stripe integration

**Files to Create/Modify:** New tip modal component, new tip button component, artist profile screen, artist card component, now playing screen

---

### **Directive 9: Display Recent Tips Count on Artist Profiles**

**Location:** Artist profile screen, below bio or near other stats

**Requirements:**
- Add a new stat display showing tip activity
- Format: "💰 Received [X] tips this month"
- Display alongside existing stats (tracks, followers)
- Fetch tip count from API on profile load
- Show count only, not amounts (privacy consideration)
- Update number in real-time if possible

**API Endpoint (Already Exists):**
- GET tips count for artist by month
- Endpoint includes timeframe parameter

**Files to Modify:** Artist profile screen component

---

### **Directive 10: Add Collaboration Request Feature**

**Location:** Artist profile screen

**Requirements:**

**A. Collaboration Request Button:**
- Add button labeled "📅 Request Collaboration"
- Position near follow button in action area
- Only display if artist has availability set to true
- Button opens collaboration request modal

**B. Collaboration Request Modal:**
- Display artist's name in modal title
- Include form with the following fields:
  - Dropdown: Project Type (options: Recording, Live Performance, Production, Other)
  - Date Picker: Proposed Date (should only show dates from artist's available slots)
  - Text Area: Message (max 500 characters)
- Include submit button: "Send Request"
- On submit, call collaboration request API
- Show confirmation after successful submission
- Handle errors appropriately

**Data Sources:**
- Artist availability calendar to populate date picker
- Current user ID for request sender

**API Endpoint (Already Exists):**
- POST to collaboration requests endpoint
- Parameters: fromUserId, toUserId, projectType, proposedDate, message

**Files to Create/Modify:** New collaboration modal component, new collaboration button component, artist profile screen

---

### **Directive 11: Add Creator Earnings Dashboard**

**Location:** User's own profile screen (only when viewing your own profile)

**Requirements:**
- Check if viewing user is the profile owner AND has creator role
- If yes, display earnings summary card
- Card should show:
  - Section title: "Your Earnings This Month"
  - Three stats in a grid:
    - Tips Received: £[Amount] with money emoji
    - Streams: [Count] with music emoji
    - New Followers: [Count] with people emoji
  - "View Details" link/button navigating to full analytics page
- Fetch earnings data from API on profile load
- Format currency appropriately (£XX.XX)
- Format numbers with thousands separators where needed

**API Endpoint (Already Exists):**
- GET creator earnings summary for current month
- Returns: tipsAmount, streamsCount, newFollowers

**Files to Create/Modify:** New earnings card component, profile screen component

---

### **Directive 12: Add Upload Limit Indicator**

**Location:** Upload screen, at the top before upload form

**Requirements:**

**For Free Tier Users:**
- Display card with title: "🎵 Free Tier Active"
- Show message: "You can upload 3 tracks free"
- Highlight remaining uploads: "([X] remaining this month)"
- If user has 2+ uploads used, show upgrade prompt:
  - Message: "Need more uploads?"
  - Button: "Upgrade to Pro - £7.99/month for 10 tracks"
  - Button navigates to subscription/upgrade screen

**For Pro Tier Users:**
- Display card with title: "⭐ Pro Tier Active"
- Show message: "Upload up to 10 tracks per month"
- Highlight remaining uploads: "([X] remaining)"

**Calculations Required:**
- Determine uploads remaining: tierLimit - uploadsThisMonth
- Check subscription tier to determine messaging
- Calculate based on current billing period

**Data Sources:**
- User subscription tier field
- User uploads this month count
- User billing period start date

**Files to Create/Modify:** New upload limit card component, upload screen component

---

## Global Styling Guidelines

**Apply these styling principles across all changes:**

**Colors:**
- Earnings/Tips: Gold/yellow accent (#FFD700 or existing brand gold)
- Collaboration: Blue accent (calendar/professional blue)
- Personalization: Brand primary color (red/pink)
- Success indicators: Green
- Secondary text: Gray/muted

**Icons to Use:**
- 💰 for tips, earnings, money
- 📅 for collaboration, calendar, availability
- ✓ for matches, confirmation, success
- 🔥 for trending, popular
- 🎵 for music, tracks
- 👥 for followers, community

**Typography:**
- Section headers with context: Medium/semibold weight
- Helper text: Secondary color, 12-14px
- CTAs: Bold, high contrast
- Stats: Larger numbers, smaller labels

**Spacing:**
- Maintain consistent spacing with existing components
- Use existing spacing tokens/constants
- Ensure responsive layouts on all screen sizes

---

## Testing Requirements

**After Implementation, Test:**

1. **Visual Consistency**
   - All new components match existing design system
   - Colors align with brand guidelines
   - Typography is consistent

2. **Data Display**
   - Personalization labels show correct user preferences
   - Match indicators display accurate event matches
   - Earnings/tips show correct numbers
   - Upload limits calculate correctly

3. **User Flows**
   - Tip modal opens and processes payments correctly
   - Collaboration request modal submits successfully
   - Tooltips appear once and don't re-appear
   - Value prop card dismissal persists across sessions

4. **Edge Cases**
   - Handle missing user preferences gracefully
   - Handle artists without availability
   - Handle zero tips/earnings display
   - Handle users at upload limit

5. **Performance**
   - API calls don't block UI
   - Loading states display appropriately
   - No unnecessary re-renders

---

## Documentation Requirements

**Create file: `MOBILE_UX_IMPROVEMENTS.md`**

Include the following sections:

1. **Summary** - Brief overview of changes made
2. **Components Created** - List of all new components with file paths
3. **Components Modified** - List of modified components with file paths
4. **API Endpoints Used** - List of all API calls made
5. **Local Storage Keys** - All AsyncStorage/localStorage keys added
6. **Testing Notes** - What was tested and results
7. **Known Issues** - Any bugs or limitations to address
8. **Web App Sync Needed** - List changes web team should replicate

**Also create: `WEB_TEAM_SYNC.md`**

Document all changes that should be replicated in the web app for consistency:
- Each visual change with description
- Each feature addition
- Screenshots/mockups if helpful

---

## Implementation Order

**Recommended sequence:**

**Day 1-2: Phase 1 (Visual only)**
- Directive 1: Banner update
- Directive 2: Value prop card
- Directive 3: Discovery context
- Directive 4: Tooltip system

**Day 3-4: Phase 2A (Display existing data)**
- Directive 5: Personalization labels
- Directive 6: Event match indicators
- Directive 7: Collaboration badges
- Directive 9: Tips count display
- Directive 12: Upload limit indicator

**Day 5-7: Phase 2B (Interactive features)**
- Directive 8: Tipping UI and modal
- Directive 10: Collaboration request
- Directive 11: Earnings dashboard

**Day 8: Testing and Documentation**
- Comprehensive testing
- Create documentation files
- Prepare web team sync notes

---

## Success Criteria

**Changes are successful when:**

✅ New users immediately understand SoundBridge is different from generic streaming apps
✅ Tipping functionality is obvious and accessible
✅ Collaboration feature is discoverable
✅ Personalization is visible throughout the app
✅ Free upload benefit is clear
✅ All features work without breaking existing functionality
✅ Performance remains optimal
✅ Documentation is complete for web team

---

**Cursor, please implement these directives in the recommended order. After completing each phase, provide a summary of changes made and any issues encountered. Create the documentation files as you go.**