# Post Reactions UI Enhancement - LinkedIn Style with Long-Press

## Overview
Update the post interaction UI from the current emoji-based reactions to a clean, professional LinkedIn-style interface with long-press reaction functionality.

---

## CRITICAL: Review Existing Code First

**BEFORE making any changes, you MUST:**

### 1. Locate Current Post Component
Find where posts are rendered. Look for:
- Post component file (e.g., `Post.tsx`, `PostCard.tsx`, `FeedItem.tsx`)
- Post reactions/interactions section
- Current emoji reaction UI (👏 ❤️ 🔥 🎉 shown in screenshots)
- Existing "Share" functionality

**Search patterns:**
```bash
# Find post components
grep -r "SoundBridge going live" .
grep -r "reactions" .
grep -r "emoji" .
grep -r "applause\|heart\|fire\|party" .

# Find share functionality
grep -r "share" .
grep -r "Share" .
```

### 2. Document Current Structure
Before coding, answer these questions:
- Where is the post component located? (file path)
- What framework/library is used? (React Native? React? Flutter?)
- How are reactions currently stored? (database schema)
- What does the reaction data model look like?
- Is there existing Share functionality? (what does it do?)
- How are user interactions tracked? (API endpoints)
- What state management is used? (Redux? Context? Zustand?)

### 3. Check Database Schema
Locate reaction storage:
```sql
-- Example: Find reactions table/collection
-- Look for tables like:
reactions
post_reactions
post_interactions
user_reactions
```

**Fields to check:**
- `reaction_type` (or similar) - what values exist?
- `user_id`, `post_id` - relationship structure
- Timestamps, counts

### 4. Find Share Implementation
Locate existing share functionality:
- Share button component
- Share action/function
- Share modal/sheet (if any)
- What happens when user shares? (native share? copy link? social share?)

---

## Design Requirements

### Current UI (To Replace)
**What's shown in screenshot:**
```
Post content
👏 0  ❤️ 0  🔥 0  🎉 0
💬 2 comments
```

**Problems:**
- ❌ Emoji reactions displayed by default (cluttered)
- ❌ All reactions visible even with 0 count
- ❌ Not professional looking
- ❌ Doesn't match "LinkedIn for audio creators" positioning

---

### New UI (Target Design)

#### **Default State (No Long-Press):**
```
┌─────────────────────────────────────────┐
│ Post content here                       │
│                                         │
│ [audio player if applicable]           │
└─────────────────────────────────────────┘

┌──────┬──────────┬─────────┬─────────┐
│ 👍   │ 💬       │ 🔁      │ ↗       │
│ Like │ Comment  │ Repost  │ Share   │
└──────┴──────────┴─────────┴─────────┘

15 reactions  •  8 comments  •  3 reposts
```

**Key Features:**
- ✅ Clean button row (like LinkedIn)
- ✅ Icon + Label for each action
- ✅ Summary line below (only if counts > 0)
- ✅ Professional appearance
- ✅ No emoji clutter

---

#### **Long-Press "Like" State (Reaction Picker):**
```
┌─────────────────────────────────────────┐
│ Post content here                       │
└─────────────────────────────────────────┘

     ┌────────────────────────────────┐
     │  👍   ❤️   🔥   👏   🎵      │
     │ Like Love Fire Clap Vibes     │
     └────────────────────────────────┘
┌──────┬──────────┬─────────┬─────────┐
│ 👍   │ 💬       │ 🔁      │ ↗       │
│ Like │ Comment  │ Repost  │ Share   │
└──────┴──────────┴─────────┴─────────┘
```

**Long-Press Behavior:**
1. User presses and holds "Like" button (500ms hold)
2. Reaction picker appears above button row
3. User can slide finger to select reaction
4. Release finger to confirm selection
5. Picker dismisses, button shows selected reaction

**Available Reactions:**
- 👍 **Support** (default, generic approval) - `reaction_type: "support"`
- ❤️ **Love** (strong positive emotion) - `reaction_type: "love"`
- 🔥 **Fire** (impressive, hot track) - `reaction_type: "fire"`
- 👏 **Congrats** (appreciation, well done) - `reaction_type: "congrats"`

**⚠️ IMPORTANT:** These are the EXACT reaction types used in the API. Do not use "like", "applause", or "vibes" - they will be rejected by the backend.

---

#### **After User Reacts:**
```
┌──────┬──────────┬─────────┬─────────┐
│ 🔥   │ 💬       │ 🔁      │ ↗       │
│ Fire │ Comment  │ Repost  │ Share   │
└──────┴──────────┴─────────┴─────────┘

15 reactions  •  8 comments  •  3 reposts
   └─ You and 14 others reacted
```

**User Has Reacted:**
- ✅ Like button shows THEIR reaction emoji (🔥 in example)
- ✅ Button label shows reaction name ("Fire")
- ✅ Button highlighted/colored (accent color)
- ✅ Summary shows "You and X others"
- ✅ Tap again to un-react
- ✅ Long-press to change reaction

---

#### **Reaction Breakdown (Optional - Click Summary):**
```
When user clicks "15 reactions" summary:

┌────────────────────────────────────┐
│ Reactions                      ✕   │
├────────────────────────────────────┤
│ 🔥 Fire          8                 │
│ ❤️ Love          4                 │
│ 👍 Like          2                 │
│ 🎵 Vibes         1                 │
│                                    │
│ [List of users who reacted...]    │
└────────────────────────────────────┘
```

---

## Mobile-Specific Implementation Considerations

### 1. Touch Gesture Handling

**Long-Press Detection:**
```javascript
// React Native Example
import { Pressable, GestureResponderEvent } from 'react-native';

const LONG_PRESS_DURATION = 500; // milliseconds
let longPressTimer: NodeJS.Timeout | null = null;

const handlePressIn = () => {
  longPressTimer = setTimeout(() => {
    // Trigger haptic feedback
    triggerHaptic('light');
    setShowReactionPicker(true);
  }, LONG_PRESS_DURATION);
};

const handlePressOut = (e: GestureResponderEvent) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  
  // If picker is showing, handle reaction selection
  if (showReactionPicker) {
    const { locationX } = e.nativeEvent;
    // Calculate which reaction was selected based on touch position
    handleReactionSelection(locationX);
  }
};

// Prevent default press action when long-press is detected
const handlePress = () => {
  if (!showReactionPicker && !longPressTimer) {
    handleQuickSupport();
  }
};
```

**Touch Tracking for Reaction Picker:**
- Track finger position during long-press
- Highlight reaction under finger
- Select reaction on release
- Handle edge cases (finger moves outside picker, etc.)

### 2. Platform-Specific Haptic Feedback

**iOS (React Native):**
```javascript
import * as Haptics from 'expo-haptics';

const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS === 'ios') {
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  }
};
```

**Android (React Native):**
```javascript
import { Vibration } from 'react-native';

const triggerHaptic = (style: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS === 'android') {
    // Android haptic feedback patterns
    const patterns = {
      light: [0, 10],
      medium: [0, 20],
      heavy: [0, 30],
    };
    Vibration.vibrate(patterns[style]);
  }
};
```

**Flutter:**
```dart
import 'package:flutter/services.dart';

void triggerHaptic(HapticFeedbackType type) {
  switch (type) {
    case HapticFeedbackType.lightImpact:
      HapticFeedback.lightImpact();
      break;
    case HapticFeedbackType.mediumImpact:
      HapticFeedback.mediumImpact();
      break;
    case HapticFeedbackType.heavyImpact:
      HapticFeedback.heavyImpact();
      break;
  }
}
```

### 3. Safe Area Handling

**React Native:**
```javascript
import { SafeAreaView } from 'react-native-safe-area-context';

// Ensure reaction picker doesn't overlap with notches/home indicators
<SafeAreaView edges={['top', 'bottom']}>
  <ReactionPicker />
</SafeAreaView>
```

**Flutter:**
```dart
import 'package:flutter/widgets.dart';

SafeArea(
  child: ReactionPicker(),
)
```

### 4. Performance Optimization for Mobile

**Debouncing API Calls:**
```javascript
import { debounce } from 'lodash';

// Prevent rapid-fire API calls
const debouncedReaction = debounce(async (reactionType) => {
  await handleReaction(reactionType);
}, 300); // 300ms debounce
```

**Optimistic Updates:**
```javascript
// Update UI immediately, rollback on error
const handleReaction = async (reactionType) => {
  // Optimistic update
  const previousState = { ...reactions };
  setReactions(prev => ({
    ...prev,
    [reactionType]: prev[reactionType] + 1,
    user_reaction: reactionType,
  }));

  try {
    const response = await fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: reactionType }),
    });

    if (!response.ok) {
      throw new Error('Failed to react');
    }

    const data = await response.json();
    // Update with server response
    setReactions(data.data.updated_counts);
  } catch (error) {
    // Rollback on error
    setReactions(previousState);
    showErrorToast('Failed to react. Please try again.');
  }
};
```

**Memory Management:**
- Clean up timers on unmount
- Cancel pending API requests on component unmount
- Use `useRef` for timers to avoid stale closures

### 5. Offline Handling

**Queue Reactions for Offline:**
```javascript
// Store reactions in local queue when offline
const queueReaction = (postId, reactionType) => {
  const queue = JSON.parse(localStorage.getItem('reactionQueue') || '[]');
  queue.push({ postId, reactionType, timestamp: Date.now() });
  localStorage.setItem('reactionQueue', JSON.stringify(queue));
};

// Process queue when back online
const processReactionQueue = async () => {
  const queue = JSON.parse(localStorage.getItem('reactionQueue') || '[]');
  for (const item of queue) {
    try {
      await handleReaction(item.reactionType);
      // Remove from queue on success
      queue.splice(queue.indexOf(item), 1);
    } catch (error) {
      console.error('Failed to process queued reaction:', error);
    }
  }
  localStorage.setItem('reactionQueue', JSON.stringify(queue));
};
```

### 6. Network Error Handling

**Retry Logic:**
```javascript
const handleReactionWithRetry = async (reactionType, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) {
        throw error; // Last retry failed
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### 7. Accessibility for Mobile

**Screen Reader Support:**
```javascript
// React Native
<Pressable
  accessible={true}
  accessibilityLabel="Support button. Double tap to react with support."
  accessibilityRole="button"
  accessibilityHint="Long press to see more reaction options"
>
  <Text>👍 Support</Text>
</Pressable>
```

**Flutter:**
```dart
Semantics(
  label: 'Support button',
  hint: 'Double tap to react with support. Long press for more options',
  button: true,
  child: ReactionButton(),
)
```

---

## Technical Implementation Guidelines

### 1. Component Structure

**Update Post Component:**
```
PostComponent
├── PostHeader (author, timestamp, menu)
├── PostContent (text, audio, images)
├── PostInteractions (NEW - replace current reactions)
│   ├── InteractionButtons
│   │   ├── LikeButton (with long-press)
│   │   ├── CommentButton
│   │   ├── RepostButton
│   │   └── ShareButton
│   ├── ReactionPicker (shows on long-press)
│   └── InteractionSummary (counts)
└── PostFooter (if any)
```

---

### 2. Interaction Buttons Design

**Button Specs (LinkedIn Style):**
```
Style:
- Height: 40-44px
- Background: Transparent (default), Accent color tint (when active)
- Border: None
- Padding: 8-12px horizontal
- Gap between icon & text: 4-6px
- Font: Medium weight, 14px
- Color: Gray (default), Accent color (active)

Layout:
- Flex row, evenly distributed
- Equal width buttons
- Centered icon + text
- Touchable/Pressable with haptic feedback

States:
- Default: Gray icon + text
- Hover (web): Light gray background
- Active/Pressed: Slightly darker background
- User Reacted: Accent color icon + text + tint background
```

---

### 3. Long-Press Reaction Picker

**Picker Specs:**
```
Trigger:
- Long-press "Like" button for 500ms
- Haptic feedback on trigger (if available)

Appearance:
- Position: Above interaction buttons, centered on Like button
- Animation: Slide up + fade in (150ms)
- Background: Card/elevated background (white/dark mode aware)
- Shadow/elevation: Medium depth
- Border-radius: 12px
- Padding: 12px horizontal, 8px vertical

Reactions Layout:
- Horizontal row of 5 reactions
- Each reaction: 44x44px touchable area
- Icon size: 28-32px
- Label below icon: 11px, gray
- Spacing: 8px between reactions
- Hover (current selection): Scale 1.2x

Interaction:
- Long-press initiates picker
- User can drag finger across reactions
- Current hover reaction scales/highlights
- Release finger = select reaction
- Tap outside = dismiss picker

Dismiss:
- User releases finger (selects reaction)
- User taps outside picker
- Timeout after 5 seconds (auto-dismiss)
- Animation: Fade out (100ms)
```

---

### 4. Like Button Behavior

**Default State (Not Reacted):**
```
Icon: 👍 (gray)
Label: "Like" (gray)
Background: Transparent
```

**User Reacted (Any Reaction):**
```
Icon: [Selected reaction emoji] (accent color)
Label: [Reaction name] (accent color)
Background: Accent color tint (10% opacity)
```

**Actions:**
- **Single Tap (Not Reacted):** Apply default "Support" reaction (`reaction_type: "support"`)
- **Single Tap (Already Reacted):** Remove reaction (un-react) - sends DELETE request
- **Long Press (Not Reacted):** Show reaction picker
- **Long Press (Already Reacted):** Show reaction picker (change reaction)

**⚠️ Important:** The default quick reaction is "Support" (👍), not "Like". This matches the API's `support` reaction type.

---

### 5. API / Data Structure

**Reaction Object (Database Schema):**
```sql
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL 
    CHECK (reaction_type IN ('support', 'love', 'fire', 'congrats')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One reaction per user per post (can change reaction type)
  UNIQUE(post_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX idx_post_reactions_type ON post_reactions(reaction_type);
CREATE INDEX idx_post_reactions_post_id_type ON post_reactions(post_id, reaction_type);
```

**Reaction Object (JavaScript/TypeScript):**
```typescript
interface PostReaction {
  id: string;  // UUID
  post_id: string;  // UUID
  user_id: string;  // UUID
  reaction_type: 'support' | 'love' | 'fire' | 'congrats';
  created_at: string;  // ISO 8601 timestamp
}

// Reaction counts object (aggregated)
interface ReactionCounts {
  support: number;
  love: number;
  fire: number;
  congrats: number;
  user_reaction: 'support' | 'love' | 'fire' | 'congrats' | null;
}
```

**Business Rules:**
- ✅ One reaction per user per post (enforced by UNIQUE constraint)
- ✅ Users can change their reaction type (UPDATE existing record)
- ✅ Deleting a post automatically deletes all reactions (CASCADE)
- ✅ Reaction counts are calculated in application logic (not database triggers)

**Reaction Types Enum (CORRECTED - Use These Exact Values):**
```javascript
const REACTION_TYPES = {
  SUPPORT: {
    id: 'support',  // ⚠️ Must be 'support', NOT 'like'
    emoji: '👍',
    label: 'Support',
    color: '#DC2626' // SoundBridge accent red
  },
  LOVE: {
    id: 'love',
    emoji: '❤️',
    label: 'Love',
    color: '#EC4899' // SoundBridge accent pink
  },
  FIRE: {
    id: 'fire',
    emoji: '🔥',
    label: 'Fire',
    color: '#F5A623' // Orange
  },
  CONGRATS: {
    id: 'congrats',  // ⚠️ Must be 'congrats', NOT 'applause'
    emoji: '👏',
    label: 'Congrats',
    color: '#7B68EE' // Purple
  }
};

// ⚠️ CRITICAL: Only these 4 reaction types are supported by the API
// The backend will reject any other values with a 400 error
```

**API Endpoints (ACTUAL Implementation):**

#### **Add/Update Reaction**
```
POST /api/posts/[id]/reactions
Content-Type: application/json
Authorization: Required (via cookies/headers)

Request Body:
{
  "reaction_type": "support" | "love" | "fire" | "congrats"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "reaction": {
      "id": "uuid",
      "reaction_type": "fire"
    },
    "updated_counts": {
      "support": 5,
      "love": 3,
      "fire": 8,
      "congrats": 1
    }
  }
}

Error Responses:
- 400: Invalid reaction_type (must be one of: support, love, fire, congrats)
- 401: Authentication required
- 404: Post not found
- 500: Internal server error

Behavior:
- If user already reacted with same type → removes reaction (toggle off)
- If user reacted with different type → updates reaction type
- If user hasn't reacted → creates new reaction
- Sends notification to post author (if not own post)
```

#### **Remove Reaction**
```
DELETE /api/posts/[id]/reactions
Authorization: Required

Response (200 OK):
{
  "success": true,
  "data": {
    "updated_counts": {
      "support": 4,
      "love": 3,
      "fire": 7,
      "congrats": 1
    }
  }
}

Error Responses:
- 401: Authentication required
- 500: Internal server error
```

#### **Get Reaction Counts (from Post Data)**
```
Reaction counts are included in the post object when fetching posts:
GET /api/posts/feed
GET /api/posts/[id]

Response includes:
{
  "reactions": {
    "support": 5,
    "love": 3,
    "fire": 8,
    "congrats": 1,
    "user_reaction": "fire" | null  // Current user's reaction, if any
  }
}
```

**⚠️ Important Notes:**
- Base URL: Use your app's API base URL (e.g., `https://api.soundbridge.live` or relative `/api`)
- Authentication: Uses cookie-based auth (credentials: 'include' in fetch)
- CORS: API supports CORS with appropriate headers
- Rate Limiting: Consider implementing client-side rate limiting to prevent spam

---

### 6. Interaction Summary Line

**Display Rules:**
```
Show summary ONLY if any count > 0

Format:
- "X reactions" (if reactions > 0)
- "X comments" (if comments > 0)
- "X reposts" (if reposts > 0)
- Separate with " • "

Examples:
- "15 reactions • 8 comments • 3 reposts"
- "8 comments" (no reactions or reposts)
- "5 reactions • 2 reposts" (no comments)
- [Hidden] (if all counts are 0)

If User Reacted:
- "You and 14 others reacted • 8 comments"
- "You reacted • 2 comments"
```

**Click Behavior:**
- Click "X reactions" → Open reaction breakdown modal
- Click "X comments" → Scroll to/open comments section
- Click "X reposts" → Show who reposted (optional)

---

### 7. Share Button Integration

**IMPORTANT: Preserve Existing Share Functionality**

**Current Share Implementation:**
- [ ] Locate existing share button/functionality
- [ ] What does it do? (native share sheet? copy link? social share?)
- [ ] Is there a ShareModal/ShareSheet component?
- [ ] What data is passed to share function?

**Integration:**
```
The new "Share" button should:
1. Use same icon/styling as other interaction buttons
2. Call existing share functionality
3. Maintain current share behavior (don't change logic)
4. Keep same analytics/tracking (if any)

Example (if existing share function is `handleShare`):
<InteractionButton
  icon="↗"
  label="Share"
  onPress={() => handleShare(post)}
/>
```

---

### 8. Comment Button

**Behavior:**
```
On Press:
- Open comments section (if collapsed)
- Scroll to comments section (if below fold)
- Focus comment input field
- Show keyboard (mobile)

Count Display:
- Shows total comment count
- Updates in real-time when comments added
- Format: "8 comments" in summary line
```

---

### 9. Repost Button

**Behavior (If Implemented):**
```
On Press:
- Show repost confirmation (optional)
- Create repost record
- Update repost count
- Show success feedback

Count Display:
- Shows total repost count
- Format: "3 reposts" in summary line

If Not Implemented Yet:
- Disable button (gray out)
- Show "Coming soon" tooltip
- OR hide button until feature ready
```

---

### 10. Animations & Feedback

**Required Animations:**
```
Like Button Press:
- Scale: 0.95 → 1.0 (100ms)
- Haptic feedback (light impact)

Reaction Selected:
- Emoji scale: 1.0 → 1.3 → 1.0 (300ms bounce)
- Haptic feedback (medium impact)
- Color transition (200ms)

Reaction Picker:
- Slide up + fade in: 150ms ease-out
- Fade out: 100ms ease-in

Reaction Hover (in picker):
- Scale: 1.0 → 1.2 (100ms)
- Background glow (optional)
```

**Haptic Feedback (If Available):**
```javascript
// Example for React Native
import * as Haptics from 'expo-haptics';

// On long-press trigger
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On reaction select
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

---

## UI/UX Best Practices

### 1. Accessibility
```
- All buttons have accessible labels
- Screen reader support: "Like button", "15 reactions", etc.
- Minimum touch target: 44x44px
- Sufficient color contrast (WCAG AA)
- Support keyboard navigation (web)
- VoiceOver/TalkBack tested (mobile)
```

### 2. Dark Mode Support
```
- All colors adapt to dark mode
- Icons remain visible in both themes
- Reaction picker background: elevated surface
- Text colors: dynamic (light/dark aware)
```

### 3. Responsive Design
```
Mobile (< 600px):
- Full width interaction buttons
- Reaction picker: full width, slight padding

Tablet (600-1024px):
- Constrained width (max 500px)
- Centered reaction picker

Desktop (> 1024px):
- Post card max width
- Hover states on buttons
- Reaction picker: above button
```

### 4. Loading States
```
While Fetching Reactions:
- Show skeleton/placeholder counts
- Disable interaction buttons
- Spinner on active operation

After Reaction:
- Optimistic update (immediate UI change)
- Rollback if API fails
- Show error toast on failure
```

### 5. Error Handling

**Network Error:**
```
- Show error toast: "Failed to react. Try again."
- Rollback optimistic update
- Retry button (optional)
- Queue reaction for retry when back online (mobile)
```

**Rate Limiting:**
```
- Show message: "Please wait before reacting again"
- Disable button temporarily (2-3 seconds)
- Implement client-side debouncing (300ms minimum between reactions)
```

**Already Reacted (conflict):**
```
- Fetch latest reaction state from server
- Update UI to match server state
- Show toast: "Your reaction was updated"
```

**Invalid Reaction Type:**
```
- API returns 400 error
- Show error toast: "Invalid reaction type"
- Log error for debugging
- Do not update UI
```

**Authentication Error (401):**
```
- Redirect to login screen (if not logged in)
- Show error toast: "Please log in to react"
- Clear any cached authentication tokens
```

**Post Not Found (404):**
```
- Show error toast: "This post no longer exists"
- Remove post from feed (if applicable)
- Log error for monitoring
```

**Server Error (500):**
```
- Show error toast: "Something went wrong. Please try again later."
- Rollback optimistic update
- Log error with full details for debugging
- Optionally queue reaction for retry
```

**Timeout Handling:**
```
- Set timeout for API calls (10-15 seconds)
- Show error toast: "Request timed out. Please check your connection."
- Allow user to retry
- Consider offline queue for mobile
```

---

## Migration Plan

### Phase 1: Preparation
1. ✅ Review existing post component code
2. ✅ Document current reaction system
3. ✅ Identify database changes needed
4. ✅ Create backup of current implementation

### Phase 2: Database Updates
1. Update reactions table/collection schema
2. Add `reaction_type` field (if not exists)
3. Migrate existing reactions (map old to new types)
4. Update API endpoints

### Phase 3: UI Implementation
1. Create new InteractionButtons component
2. Implement LikeButton with long-press
3. Create ReactionPicker component
4. Update InteractionSummary display
5. Preserve existing Share functionality

### Phase 4: Testing
1. Test long-press on different devices
2. Verify haptic feedback works
3. Test dark mode appearance
4. Test accessibility features
5. Test error scenarios
6. Performance testing (large feeds)

### Phase 5: Rollout
1. Deploy to staging environment
2. Internal testing with team
3. Beta test with select users
4. Monitor analytics/errors
5. Deploy to production
6. Monitor user feedback

---

## Testing Checklist

**Functional Testing:**
- [ ] Single tap Support button → Applies default "Support" reaction (`reaction_type: "support"`)
- [ ] Long-press Support button → Shows reaction picker
- [ ] Select reaction from picker → Applies selected reaction (support, love, fire, or congrats)
- [ ] Tap outside picker → Dismisses picker
- [ ] Tap Support again (after reacted) → Un-reacts (sends DELETE request)
- [ ] Long-press (after reacted) → Shows picker to change reaction
- [ ] Change reaction type → Updates existing reaction (sends POST with new type)
- [ ] Comment button → Opens comments
- [ ] Share button → Uses existing share functionality
- [ ] Repost button → Works as expected (or disabled if not ready)
- [ ] Reaction count → Updates in real-time after API response
- [ ] Summary line → Shows correct counts (only shows if counts > 0)
- [ ] Click summary → Opens breakdown modal (optional feature)
- [ ] Invalid reaction type → API returns 400 error (test with invalid type)
- [ ] Unauthenticated request → API returns 401 error
- [ ] Network error → Shows error toast, rolls back optimistic update

**Device Testing:**
- [ ] iOS (iPhone 12+, iPhone SE, iPhone 15 Pro Max)
- [ ] Android (Pixel, Samsung Galaxy, OnePlus)
- [ ] iPad / Tablet (both orientations)
- [ ] Desktop web (Chrome, Safari, Firefox, Edge)
- [ ] Different screen sizes (small phones, large tablets)
- [ ] Different pixel densities (Retina, non-Retina)

**Mobile-Specific Testing:**
- [ ] Long-press works on all devices (not just iOS)
- [ ] Haptic feedback works (iOS and Android)
- [ ] Reaction picker doesn't overlap with notches/home indicators
- [ ] Touch targets are at least 44x44px (accessibility requirement)
- [ ] Works in both portrait and landscape orientations
- [ ] Performance is smooth (60fps) during animations
- [ ] No memory leaks (test with many posts in feed)
- [ ] Offline mode handles reactions gracefully (queue or show error)
- [ ] Network switching (WiFi to cellular) doesn't break functionality
- [ ] App backgrounding/foregrounding doesn't break state

**Edge Cases:**
- [ ] Slow network → Loading states work, timeout handling works
- [ ] Network failure → Error handling works, optimistic updates rollback
- [ ] Rapid reactions → No duplicate requests (debouncing works)
- [ ] Very large reaction counts → Formats correctly (1.2K, 15K, 1.2M)
- [ ] Long post content → Picker doesn't overflow, positioned correctly
- [ ] Multiple posts on screen → Correct picker shows for correct post
- [ ] User reacts, then immediately changes reaction → Only one API call
- [ ] User reacts while offline → Queued or shows appropriate error
- [ ] Post deleted while user is viewing → Error handling works
- [ ] User logged out mid-interaction → Redirects to login
- [ ] Invalid reaction type sent → API error handled gracefully
- [ ] Race condition: two reactions at same time → Last one wins, no conflicts
- [ ] Very long usernames in summary → Text truncation works
- [ ] Dark mode → All colors adapt correctly
- [ ] System font size changes → Layout doesn't break

**Performance:**
- [ ] No lag on long-press (picker appears within 500ms)
- [ ] Animations smooth (60fps on all devices)
- [ ] Feed scrolling not affected (reaction picker doesn't block scroll)
- [ ] Memory usage acceptable (no leaks after many interactions)
- [ ] API calls don't block UI (async/await properly implemented)
- [ ] Optimistic updates don't cause flickering
- [ ] Reaction picker doesn't cause layout shifts
- [ ] Large feeds (100+ posts) still perform well
- [ ] Battery usage acceptable (no excessive polling or timers)

---

## Example Code Structure (Pseudocode Reference)

**NOTE: This is pseudocode for reference only. Implement in your actual framework/style.**

```javascript
// PostInteractions.tsx (Example)

import { REACTION_TYPES } from './constants';

function PostInteractions({ post, onReact, onUnreact, onComment, onShare }) {
  const [showPicker, setShowPicker] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const longPressTimer = useRef(null);

  // Long-press detection
  const handlePressIn = () => {
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('light');
      setShowPicker(true);
    }, 500); // 500ms hold
  };

  const handlePressOut = () => {
    clearTimeout(longPressTimer.current);
  };

  // Handle reaction selection
  const handleReaction = async (reactionType) => {
    setShowPicker(false);
    
    if (userReaction === reactionType) {
      // Un-react
      await onUnreact(post.id);
      setUserReaction(null);
    } else {
      // Apply reaction
      triggerHaptic('medium');
      setUserReaction(reactionType); // Optimistic update
      await onReact(post.id, reactionType);
    }
  };

  // Default support (single tap, not long-press)
  const handleQuickSupport = () => {
    if (!showPicker) {
      handleReaction('support');  // ⚠️ Use 'support', not 'like'
    }
  };

  return (
    <View>
      {/* Reaction Picker (shows on long-press) */}
      {showPicker && (
        <ReactionPicker
          reactions={Object.values(REACTION_TYPES)}
          onSelect={handleReaction}
          onDismiss={() => setShowPicker(false)}
        />
      )}

      {/* Interaction Buttons */}
      <View style={styles.buttonRow}>
        {/* Like Button */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleQuickSupport}
          style={[
            styles.button,
            userReaction && styles.buttonActive
          ]}
        >
          <Text style={styles.icon}>
            {userReaction 
              ? REACTION_TYPES[userReaction.toUpperCase()].emoji 
              : '👍'}
          </Text>
          <Text style={styles.label}>
            {userReaction 
              ? REACTION_TYPES[userReaction.toUpperCase()].label 
              : 'Support'}  {/* ⚠️ Label is "Support", not "Like" */}
          </Text>
        </Pressable>

        {/* Comment Button */}
        <Pressable onPress={onComment} style={styles.button}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.label}>Comment</Text>
        </Pressable>

        {/* Repost Button */}
        <Pressable onPress={onRepost} style={styles.button}>
          <Text style={styles.icon}>🔁</Text>
          <Text style={styles.label}>Repost</Text>
        </Pressable>

        {/* Share Button (use existing functionality) */}
        <Pressable onPress={() => onShare(post)} style={styles.button}>
          <Text style={styles.icon}>↗</Text>
          <Text style={styles.label}>Share</Text>
        </Pressable>
      </View>

      {/* Summary Line */}
      {(post.reactions > 0 || post.comments > 0 || post.reposts > 0) && (
        <InteractionSummary
          reactions={post.reactions}
          comments={post.comments}
          reposts={post.reposts}
          userReacted={!!userReaction}
        />
      )}
    </View>
  );
}
```

---

## Final Checklist Before Starting

**Before writing any code, confirm:**

- [ ] ✅ Located current post component file
- [ ] ✅ Reviewed existing reaction system
- [ ] ✅ Checked database schema for reactions
- [ ] ✅ Identified existing Share functionality
- [ ] ✅ Understand current API endpoints
- [ ] ✅ Know what framework/libraries are used
- [ ] ✅ Have access to design system/theme
- [ ] ✅ Understand state management approach
- [ ] ✅ Can test on actual device/emulator
- [ ] ✅ Have backup of current code

**Only proceed with implementation after ALL items above are checked.**

---

## Success Criteria

**UI Appearance:**
- ✅ Looks like LinkedIn interaction buttons (clean, professional)
- ✅ No emoji clutter by default
- ✅ Reaction picker appears smoothly on long-press
- ✅ Dark mode support working
- ✅ Matches app's design system

**Functionality:**
- ✅ Single tap applies default "Support" reaction (`reaction_type: "support"`)
- ✅ Long-press shows reaction picker (500ms)
- ✅ Can select any of 4 reactions (support, love, fire, congrats)
- ✅ Can un-react by tapping again (sends DELETE request)
- ✅ Can change reaction via long-press (sends POST with new type)
- ✅ Haptic feedback works (where supported)
- ✅ Animations smooth and natural
- ✅ Optimistic UI updates with rollback on error
- ✅ API calls use correct reaction types (no invalid types)

**Integration:**
- ✅ Existing Share functionality preserved
- ✅ Comment button works as before
- ✅ Reaction counts update correctly
- ✅ API calls successful
- ✅ Real-time updates work
- ✅ No performance degradation

**User Experience:**
- ✅ Intuitive to use (no tutorial needed)
- ✅ Fast and responsive
- ✅ Accessible (screen readers work)
- ✅ Error handling graceful
- ✅ Loading states clear

---

## Authentication & API Configuration

### Authentication Method
- **Type:** Cookie-based authentication
- **Implementation:** Include `credentials: 'include'` in fetch requests
- **Headers:** API automatically handles authentication via cookies
- **Error Handling:** 401 responses indicate authentication required

### API Base URL
```javascript
// Development
const API_BASE_URL = 'http://localhost:3000/api';

// Production
const API_BASE_URL = 'https://www.soundbridge.live/api';

// Or use relative paths (recommended)
const API_BASE_URL = '/api';
```

### Request Headers
```javascript
const headers = {
  'Content-Type': 'application/json',
  // Authentication handled via cookies
};

const fetchOptions = {
  method: 'POST',
  headers,
  credentials: 'include', // ⚠️ Required for cookie-based auth
  body: JSON.stringify({ reaction_type: 'support' }),
};
```

### CORS Configuration
- API supports CORS with appropriate headers
- No additional CORS configuration needed on client
- Preflight requests (OPTIONS) are handled automatically

---

## Real-Time Updates (Optional Enhancement)

### Supabase Realtime (If Implemented)
```javascript
// Subscribe to reaction changes for a specific post
const subscription = supabase
  .channel(`post:${postId}:reactions`)
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'post_reactions',
      filter: `post_id=eq.${postId}`,
    },
    (payload) => {
      // Update reaction counts in real-time
      updateReactionCounts(payload);
    }
  )
  .subscribe();
```

**Benefits:**
- Users see reactions from others immediately
- No need to refresh or poll
- Better user experience

**Considerations:**
- May not be implemented yet (check with backend team)
- Requires WebSocket connection
- May impact battery life on mobile (use sparingly)

---

## Notes

- This replaces the emoji reaction UI shown in the SoundBridge app screenshots
- Maintains existing Share functionality (don't modify Share logic)
- Adds professional LinkedIn-style interaction buttons
- Implements Facebook-style long-press reaction picker
- Music-specific reactions: Fire, Congrats (for achievements)
- Clean, scalable, professional appearance
- Matches "LinkedIn for audio creators" positioning

**⚠️ CRITICAL CORRECTIONS:**
- Reaction types are: `support`, `love`, `fire`, `congrats` (NOT "like", "applause", "vibes")
- Default quick reaction is "Support" (👍), not "Like"
- API endpoint: `POST /api/posts/[id]/reactions` (not `/api/posts/:postId/react`)
- One reaction per user per post (can change type, but only one active at a time)

**Reference Screenshots:**
- Image 1: Current SoundBridge feed (emoji reactions to replace)
- Images 2-6: Social media examples (Twitter, LinkedIn, Facebook)

**Target:** LinkedIn's clean button UI + Facebook's reaction variety + Music platform context

**Color Scheme:**
- Accent color: `#DC2626` (red) or `linear-gradient(45deg, #DC2626, #EC4899)` (red to pink)
- Use these colors for active states, highlights, and accents

---

## Additional Feed Page Layout Enhancements

### Issue: Messaging Widget Not Visible & Layout Problems

Based on the current SoundBridge feed page, there are critical layout issues that need to be addressed:

**Problems Identified:**
1. ❌ Right sidebar messaging widget is not visible
2. ❌ Posts column is too wide, taking up too much space
3. ❌ No room for right sidebar to display properly
4. ❌ Three-column layout not balanced correctly

---

### Required Layout Fixes

#### 1. Reduce Feed Column Width
**Current Problem:** Feed column is too wide (`max-w-xl` = 576px)

**Solution:**
```tsx
// Change from max-w-xl to max-w-lg
<main className="flex-1 max-w-lg mx-auto pt-4">
  {/* Posts content */}
</main>

// Or even narrower if needed
<main className="flex-1 max-w-md mx-auto pt-4">  {/* 448px */}
```

**Why:**
- Makes room for right sidebar
- Better visual balance
- Posts still readable at 512px width
- More professional LinkedIn-style layout

---

#### 2. Fix Right Sidebar Layout
**Current Problem:** Messaging widget at bottom not visible

**File:** `apps/web/src/components/feed/FeedRightSidebar.tsx`

**Current Structure:**
```tsx
<aside className="w-80 flex-shrink-0 hidden xl:block sticky top-24">
  <div className="space-y-4 flex flex-col">
    {/* Quick Actions */}
    {/* Opportunities */}
    {/* Connection Suggestions */}
    <div className="mt-auto pt-4">
      <MessagingWidget />  {/* Not visible! */}
    </div>
  </div>
</aside>
```

**Solution:** Separate scrollable content from fixed messaging widget:
```tsx
<aside className="w-80 flex-shrink-0 hidden xl:block">
  <div 
    className="flex flex-col" 
    style={{ height: 'calc(100vh - 120px)' }}
  >
    {/* Scrollable top section */}
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      {/* Quick Actions */}
      {/* Opportunities */}
      {/* Connection Suggestions */}
    </div>
    
    {/* Fixed messaging widget at bottom */}
    <div className="flex-shrink-0 pt-4 border-t border-gray-700/50">
      <MessagingWidget />
    </div>
  </div>
</aside>
```

**Why This Works:**
- ✅ Sidebar has fixed height
- ✅ Top content scrolls independently
- ✅ Messaging widget always visible at bottom
- ✅ No content gets cut off

---

#### 3. Overall Layout Grid
**Current:** Flex layout with unbalanced widths

**Suggested:** CSS Grid for better control:
```tsx
// apps/web/app/feed/page.tsx
<div className="container mx-auto px-4 pt-8 pb-6 max-w-7xl">
  <div className="grid grid-cols-[280px_1fr_320px] gap-6 xl:grid-cols-[280px_1fr_320px]">
    <FeedLeftSidebar />      {/* 280px */}
    <main className="max-w-lg mx-auto pt-4">  {/* 512px max */}
      {/* Posts content */}
    </main>
    <FeedRightSidebar />     {/* 320px */}
  </div>
</div>
```

**Grid Breakdown:**
- Left sidebar: `280px` (fixed)
- Center feed: `1fr` with `max-w-lg` (512px max)
- Right sidebar: `320px` (fixed, `w-80`)
- Total: ~1112px minimum width
- Gap: `24px` between columns

---

### Additional UX Enhancements

#### 4. Sticky Post Input Box
**Enhancement:** Keep "Share an update" box always visible when scrolling

```tsx
<div className="sticky top-24 z-10 bg-[#1a0f2e] pb-4 mb-4">
  <Card className="p-4">
    {/* Share an update input */}
  </Card>
</div>
```

**Why:**
- ✅ Quick access to post creation
- ✅ Doesn't require scrolling back to top
- ✅ Common pattern on social platforms

---

#### 5. Infinite Scroll Loading State
**Enhancement:** Better loading indicator at feed bottom

```tsx
{/* At bottom of feed */}
{hasMore && (
  <div className="flex justify-center py-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      <p className="text-sm text-gray-400">Loading more posts...</p>
    </div>
  </div>
)}

{!hasMore && posts.length > 0 && (
  <div className="text-center py-8 text-gray-500">
    <p className="text-sm">You've reached the end of your feed</p>
    <Button variant="outline" className="mt-4" onClick={refreshFeed}>
      Refresh Feed
    </Button>
  </div>
)}
```

---

#### 6. Empty Feed State
**Enhancement:** Show helpful message when no posts

```tsx
{posts.length === 0 && !loading && (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center gap-4">
      <Users className="h-16 w-16 text-gray-600" />
      <div>
        <h3 className="text-xl font-semibold mb-2">
          Your feed is empty
        </h3>
        <p className="text-gray-400 mb-6">
          Start connecting with creators to see their posts here
        </p>
        <Button asChild>
          <Link href="/network">
            <Users className="mr-2 h-4 w-4" />
            Find Connections
          </Link>
        </Button>
      </div>
    </div>
  </Card>
)}
```

---

#### 7. Scroll to Top Button
**Enhancement:** Add floating button when scrolled down

```tsx
{showScrollTop && (
  <button
    onClick={scrollToTop}
    className="fixed bottom-8 right-8 z-50 p-3 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all"
    aria-label="Scroll to top"
  >
    <ChevronUp className="h-5 w-5 text-white" />
  </button>
)}
```

**Trigger Logic:**
```tsx
const [showScrollTop, setShowScrollTop] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 500);
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

---

#### 8. Post Skeleton Loaders
**Enhancement:** Better loading experience during initial fetch

```tsx
function PostSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );
}

// Usage
{loading && (
  <>
    {[...Array(3)].map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </>
)}
```

---

#### 9. Live Audio Sessions Badge
**Enhancement:** Add live indicator when rooms are active

```tsx
<Card className="bg-gradient-to-r from-red-900/20 to-pink-900/20 border-red-500/30">
  <div className="flex items-center gap-4 p-4">
    {/* Animated live indicator */}
    <div className="relative">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
    </div>
    
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold">Live Audio Sessions</h3>
        <Badge variant="destructive" className="ml-auto">
          12 Active
        </Badge>
      </div>
      <p className="text-sm text-gray-400">
        Join live rooms • Host your own • Connect in real-time
      </p>
    </div>
  </div>
</Card>
```

---

#### 10. Quick Filter Tabs
**Enhancement:** Add filter tabs at top of feed

```tsx
<div className="flex gap-2 mb-6 overflow-x-auto pb-2">
  <Button
    variant={filter === 'all' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilter('all')}
  >
    All Posts
  </Button>
  <Button
    variant={filter === 'connections' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilter('connections')}
  >
    <Users className="h-4 w-4 mr-2" />
    Connections
  </Button>
  <Button
    variant={filter === 'music' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilter('music')}
  >
    <Music className="h-4 w-4 mr-2" />
    Music
  </Button>
  <Button
    variant={filter === 'opportunities' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilter('opportunities')}
  >
    <Briefcase className="h-4 w-4 mr-2" />
    Opportunities
  </Button>
</div>
```

---

### Implementation Priority

**Critical (Must Fix):**
1. ✅ Reduce feed column width (`max-w-lg`)
2. ✅ Fix right sidebar messaging widget visibility
3. ✅ Implement proper grid/flex layout

**High Priority (Should Have):**
4. ✅ Sticky post input box
5. ✅ Infinite scroll loading states
6. ✅ Empty feed state

**Medium Priority (Nice to Have):**
7. ✅ Scroll to top button
8. ✅ Post skeleton loaders
9. ✅ Live audio sessions badge

**Low Priority (Future):**
10. ✅ Quick filter tabs

---

### Testing Checklist for Layout

After implementing layout fixes:

**Desktop (xl+):**
- [ ] Three columns visible (left sidebar, feed, right sidebar)
- [ ] Feed column is ~512px wide (max-w-lg)
- [ ] Right sidebar is 320px wide
- [ ] Messaging widget visible at bottom of right sidebar
- [ ] No horizontal scrolling
- [ ] All content fits viewport width

**Messaging Widget:**
- [ ] Widget visible in collapsed state (shows "^" button)
- [ ] Clicking "^" expands widget
- [ ] Widget shows conversation list when expanded
- [ ] Widget stays at bottom even when sidebar content scrolls
- [ ] Border separates widget from scrollable content

**Scrolling Behavior:**
- [ ] Left sidebar sticky
- [ ] Feed scrolls normally
- [ ] Right sidebar top content scrolls
- [ ] Messaging widget stays fixed at bottom
- [ ] Smooth scrolling experience

**Responsive:**
- [ ] Layout works on 1440px screens
- [ ] Layout works on 1920px screens
- [ ] Right sidebar hidden on screens < xl (1280px)
- [ ] No layout breaks at breakpoints

---

### Code Files to Update

**Priority 1 - Layout Fixes:**
1. `apps/web/app/feed/page.tsx` - Main feed layout grid
2. `apps/web/src/components/feed/FeedRightSidebar.tsx` - Sidebar structure
3. `apps/web/src/components/feed/MessagingWidget.tsx` - Verify visibility

**Priority 2 - UX Enhancements:**
4. `apps/web/src/components/feed/PostInput.tsx` - Sticky positioning
5. `apps/web/src/components/feed/FeedContent.tsx` - Loading states
6. `apps/web/src/components/feed/PostSkeleton.tsx` - Create new file

---

**Good luck with implementation! Remember to review existing code FIRST before making changes.** 🚀

**Fix the layout issues first, then add UX enhancements progressively.** 📐

---

## Quick Reference Guide for Mobile Team

### ⚠️ CRITICAL: Reaction Types (DO NOT CHANGE)
```javascript
// ✅ CORRECT - Use these exact values
const REACTION_TYPES = ['support', 'love', 'fire', 'congrats'];

// ❌ WRONG - These will be rejected by API
const WRONG_TYPES = ['like', 'applause', 'vibes', 'thumbs_up'];
```

### API Endpoints Summary
```
POST   /api/posts/[id]/reactions
DELETE /api/posts/[id]/reactions

Request Body (POST):
{ "reaction_type": "support" | "love" | "fire" | "congrats" }

Response:
{
  "success": true,
  "data": {
    "reaction": { "id": "...", "reaction_type": "..." },
    "updated_counts": {
      "support": 5,
      "love": 3,
      "fire": 8,
      "congrats": 1
    }
  }
}
```

### Default Quick Reaction
- **Button Label:** "Support" (NOT "Like")
- **Reaction Type:** `"support"`
- **Emoji:** 👍
- **Behavior:** Single tap applies "Support" reaction

### Long-Press Behavior
- **Duration:** 500ms
- **Trigger:** Long-press on Support button
- **Action:** Shows reaction picker with 4 options
- **Selection:** User drags finger to select, releases to confirm

### Button States
```javascript
// Default (not reacted)
{ icon: '👍', label: 'Support', color: 'gray' }

// User reacted with "fire"
{ icon: '🔥', label: 'Fire', color: '#DC2626' } // Accent color

// Active state
{ background: 'rgba(220, 38, 38, 0.1)' } // 10% opacity accent color
```

### Error Handling Checklist
- [ ] Network errors show user-friendly message
- [ ] Optimistic updates rollback on error
- [ ] 401 errors redirect to login
- [ ] 400 errors show "Invalid reaction type" message
- [ ] Timeouts handled (10-15 second timeout)
- [ ] Offline mode queues reactions or shows error

### Mobile-Specific Checklist
- [ ] Long-press works on iOS and Android
- [ ] Haptic feedback implemented (iOS + Android)
- [ ] Safe area respected (notches, home indicators)
- [ ] Touch targets ≥ 44x44px
- [ ] Works in portrait and landscape
- [ ] Performance: 60fps animations
- [ ] No memory leaks
- [ ] Offline handling implemented

### Testing Priority
1. **Critical:** Reaction types match API exactly
2. **Critical:** API endpoints are correct
3. **High:** Long-press works on all devices
4. **High:** Error handling works
5. **Medium:** Animations are smooth
6. **Medium:** Haptic feedback works
7. **Low:** Reaction breakdown modal (optional)

---

## Common Pitfalls to Avoid

### ❌ Don't Do This:
1. **Using wrong reaction types:** Don't use "like", "applause", or "vibes"
2. **Wrong API endpoint:** Don't use `/api/posts/:postId/react` (use `/api/posts/[id]/reactions`)
3. **Missing authentication:** Don't forget `credentials: 'include'` in fetch
4. **No error handling:** Don't assume API calls always succeed
5. **No optimistic updates:** Don't wait for API before updating UI
6. **Forgetting cleanup:** Don't forget to clear timers on unmount
7. **Hardcoded colors:** Don't hardcode colors, use theme/design system
8. **Ignoring accessibility:** Don't skip accessibility labels and hints

### ✅ Do This:
1. **Use exact reaction types:** `support`, `love`, `fire`, `congrats`
2. **Correct API endpoint:** `POST /api/posts/[id]/reactions`
3. **Include credentials:** Always use `credentials: 'include'`
4. **Handle all errors:** Network, timeout, 400, 401, 500
5. **Optimistic updates:** Update UI immediately, rollback on error
6. **Clean up resources:** Clear timers, cancel requests on unmount
7. **Use design system:** Follow app's color scheme and typography
8. **Test accessibility:** Screen readers, keyboard navigation, touch targets

---

## Support & Questions

If you encounter issues or have questions:

1. **Check API Documentation:** Verify endpoint and request format
2. **Review Web Implementation:** See `apps/web/src/components/posts/PostCard.tsx` for reference
3. **Test API Directly:** Use Postman/curl to verify API behavior
4. **Check Database Schema:** Ensure `post_reactions` table exists with correct columns
5. **Review Error Logs:** Check server logs for detailed error messages

**Key Files to Reference:**
- API Route: `apps/web/app/api/posts/[id]/reactions/route.ts`
- Web Component: `apps/web/src/components/posts/PostCard.tsx`
- Database Schema: `database/professional_networking_schema.sql`
- Types: `apps/web/src/lib/types/post.ts`