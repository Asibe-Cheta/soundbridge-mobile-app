# Web Team Clarifications - Express Interest System

## Response to Web Team Questions

---

## Q1: Does the `service_provider_profiles` table exist and match the expected structure?

### ✅ YES - Table Exists

The `service_provider_profiles` table **already exists** in the Supabase database. The mobile app is currently using it.

### Expected Structure:

```sql
-- Minimum required fields for service provider check:
service_provider_profiles (
  user_id UUID REFERENCES profiles(id),
  -- Other fields may exist but are not required for this feature
)
```

### How to Check:

```typescript
// Simple service provider check query
const { data, error } = await supabase
  .from('service_provider_profiles')
  .select('user_id')
  .eq('user_id', userId)
  .single();

const isServiceProvider = !!data && !error;
```

### What You Need:

- **Read access** to `service_provider_profiles.user_id`
- That's it! Just checking existence is enough.

### If Table Doesn't Match:

Please provide the actual schema and we'll adjust the queries. The mobile team can work with any structure as long as we can identify service providers.

---

## Q2: Do we have a push notification system set up for web, or do we need to build one?

### Current Situation:

The mobile app uses **Expo Push Notifications**. For web, you have three options:

### Option 1: ✅ RECOMMENDED - Web Push Notifications (PWA)

Use the **Web Push API** for browser notifications:

```typescript
// Example implementation
import * as webPush from 'web-push';

// Setup (one-time)
webPush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send notification
async function sendWebPushNotification(subscription: PushSubscription, payload: object) {
  await webPush.sendNotification(subscription, JSON.stringify(payload));
}
```

**Benefits:**
- Native browser notifications
- Works on desktop and mobile web
- Better than email for real-time updates

**Setup Required:**
- Generate VAPID keys
- Add service worker to web app
- Store user push subscriptions in database

---

### Option 2: In-App Notifications Only (No External Push)

If you don't want to implement push notifications immediately:

```typescript
// Create in-app notification system
CREATE TABLE web_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  type TEXT, -- 'interest_received', 'interest_accepted', etc.
  title TEXT,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Poll for notifications when user is active
const { data: notifications } = await supabase
  .from('web_notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)
  .order('created_at', { ascending: false });
```

**Benefits:**
- Simpler implementation
- No external dependencies
- Works immediately

**Drawbacks:**
- Only shows when user is on the site
- Not true "push" notifications

---

### Option 3: Email Notifications (Fallback)

Use email as notification delivery:

```typescript
import { sendEmail } from './emailService';

await sendEmail({
  to: user.email,
  subject: 'New Interest in Your Opportunity',
  template: 'interest-received',
  data: {
    opportunityTitle,
    interestedUserName,
    dashboardUrl: `${baseUrl}/dashboard/interests`
  }
});
```

---

### 🎯 RECOMMENDATION:

**Phase 1:** Start with **Option 2 (In-App Notifications)**
- Quick to implement
- Gets the feature working
- No external dependencies

**Phase 2:** Add **Option 1 (Web Push)** later for better UX
- Implement progressively
- Better user engagement
- Aligns with mobile experience

### What Mobile Team Can Help With:

We can share our notification payload formats and timing logic so web notifications match mobile behavior exactly.

---

## Q3: Should we implement message thread creation on interest acceptance now?

### 🟡 OPTIONAL - Not Required for MVP

The message thread integration is **optional** for the initial release.

### Current Mobile Implementation:

The mobile app has **placeholders** for message integration but doesn't require it to work:

```typescript
// Mobile code (AcceptInterestModal.tsx, line 168)
{
  text: 'Open Messages',
  onPress: () => navigation.navigate('Messages' as never),
}
```

### Two Paths Forward:

#### Path A: ✅ RECOMMENDED - Skip Messages for Now

**Implementation:**
```typescript
// On accept, just update the interest status
await supabase
  .from('opportunity_interests')
  .update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    custom_message: customMessage
  })
  .eq('id', interestId);

// Send notification (in-app or push)
await notifyUser({
  userId: interestedUserId,
  title: 'Your Interest Was Accepted! 🎉',
  body: posterName + ' accepted your interest',
  customMessage: customMessage // Include acceptance message in notification
});
```

**Display Acceptance Message:**
- Show in "My Applications" section
- Display custom message in the UI
- "Contact" button → Opens user's email or profile

**Benefits:**
- Simpler implementation
- Gets feature live faster
- Still provides full functionality

---

#### Path B: Integrate Messages System (If It Exists)

**Only do this if:**
1. Messages system already exists on web
2. You have the API/schema for it
3. You have time for integration

**Implementation:**
```typescript
// After accepting interest
const thread = await createOrGetMessageThread({
  participants: [posterId, interestedUserId],
  metadata: {
    opportunityId: opportunityId,
    interestId: interestId
  }
});

await sendMessage({
  threadId: thread.id,
  senderId: posterId,
  content: customMessage,
  type: 'interest_accepted'
});

// Navigate user to messages
return { thread_id: thread.id };
```

---

### 🎯 RECOMMENDATION:

**Start without Messages integration.** The core Express Interest feature works perfectly fine by:
1. Storing acceptance message in `custom_message` field
2. Showing it in "My Applications" section
3. Users can then contact each other via email/profile

**Add Messages later** as a Phase 2 enhancement if needed.

---

## Q4: What's the pagination strategy for opportunities listing?

### Recommended Pagination Strategy:

#### Option 1: ✅ RECOMMENDED - Cursor-Based Pagination

Best for real-time feeds with frequent updates.

```typescript
// First page
const { data: opportunities, error } = await supabase
  .from('opportunities')
  .select('*, posted_by:profiles!poster_user_id(id, username, display_name, avatar_url)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(20);

// Next page (using last item's created_at)
const lastCreatedAt = opportunities[opportunities.length - 1].created_at;

const { data: nextPage } = await supabase
  .from('opportunities')
  .select('*, posted_by:profiles!poster_user_id(id, username, display_name, avatar_url)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .lt('created_at', lastCreatedAt)
  .limit(20);
```

**Benefits:**
- Handles real-time updates gracefully
- No duplicate items when new opportunities are posted
- Consistent performance

---

#### Option 2: Offset-Based Pagination (Simpler)

Good for smaller datasets or admin panels.

```typescript
const page = 1; // From query params
const limit = 20;
const offset = (page - 1) * limit;

// Get total count
const { count } = await supabase
  .from('opportunities')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active')
  .is('deleted_at', null);

// Get page data
const { data: opportunities } = await supabase
  .from('opportunities')
  .select('*, posted_by:profiles!poster_user_id(*)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

return {
  opportunities,
  total: count,
  page,
  limit,
  totalPages: Math.ceil(count / limit)
};
```

**Benefits:**
- Simpler to implement
- Shows total page count
- Familiar UX (page numbers)

**Drawbacks:**
- Can show duplicates if items are added
- Slower on large datasets

---

### 🎯 RECOMMENDATION:

**Use Option 2 (Offset-Based)** for initial implementation:
- Easier to implement
- Sufficient for most use cases
- Can switch to cursor-based later if needed

**Settings:**
- Default limit: 20 items per page
- Max limit: 100 items per page
- Default sort: `created_at DESC` (newest first)

---

## Q5: Are there existing UI components we should reuse, or build from scratch?

### Components You Should Reuse:

#### ✅ Likely Existing Components:

1. **Card/List Components**
   - Reuse existing card layouts for opportunities
   - Match mobile's card design (rounded corners, shadows, gradients)

2. **Modal/Dialog Components**
   - Use for "Express Interest" form
   - Use for "Accept Interest" custom message modal

3. **Form Components**
   - Text inputs, textareas, selects
   - Button styles and loading states

4. **Badge Components**
   - For status indicators (Pending, Accepted, Rejected)
   - For opportunity types (Collaboration, Event, Job)

5. **Avatar Components**
   - User profile pictures
   - Placeholder avatars

6. **Tab Components**
   - For "My Applications" (Pending/Accepted/Not Selected tabs)

7. **Empty State Components**
   - "No opportunities yet" states
   - "No applications yet" states

---

### 🎨 New Components to Build:

#### 1. OpportunityCard
```typescript
interface OpportunityCardProps {
  opportunity: Opportunity;
  onExpressInterest: (id: string) => void;
  showExpressInterestButton: boolean; // Only for service providers
}
```

**Design:**
- Gradient background (purple theme)
- Title, description, type badge
- Posted by info with avatar
- "Express Interest" button (gradient)
- Matches mobile design from `OpportunityCard.tsx`

---

#### 2. ExpressInterestModal
```typescript
interface ExpressInterestModalProps {
  open: boolean;
  opportunity: Opportunity;
  onClose: () => void;
  onSubmit: (data: InterestData) => void;
  isSubscriber: boolean;
}
```

**Design (Uber-style):**
- 4 reason cards in 2x2 grid
- Selected card has primary border + checkmark
- Optional message textarea (500 chars)
- Alerts toggle (disabled for free users)
- Submit button with gradient

Reference: `src/components/ExpressInterestModal.tsx`

---

#### 3. InterestCard (Dashboard)
```typescript
interface InterestCardProps {
  interest: Interest;
  onViewProfile: (userId: string) => void;
  onAccept: (interestId: string) => void;
  onReject: (interestId: string) => void;
}
```

**Design:**
- User info with avatar
- Reason badge
- Optional message in quote box
- 3 action buttons (View Profile, Reject, Accept)

Reference: `src/components/OpportunityInterestsSection.tsx`

---

#### 4. AcceptInterestModal
```typescript
interface AcceptInterestModalProps {
  open: boolean;
  interest: Interest;
  onClose: () => void;
  onSubmit: (customMessage: string) => void;
}
```

**Design:**
- User preview at top
- 3 quick message templates
- Custom message textarea (1000 chars)
- "Send & Accept" button

Reference: `src/components/AcceptInterestModal.tsx`

---

#### 5. MyApplicationsSection
```typescript
interface MyApplicationsProps {
  userId: string;
}
```

**Design:**
- 3 tabs (Pending, Accepted, Not Selected)
- Application cards with status badges
- Color-coded by status (orange/green/gray)
- "Open Messages" button for accepted

Reference: `src/components/MyApplicationsSection.tsx`

---

### 🎨 Design System Alignment:

**Colors (from mobile):**
```css
--primary-pink: #EC4899;
--primary-purple: #7C3AED;
--success-green: #10B981;
--warning-orange: #F59E0B;
--error-red: #EF4444;
--neutral-gray: #6B7280;
```

**Gradients:**
```css
/* Primary gradient */
background: linear-gradient(90deg, #EC4899 0%, #7C3AED 100%);

/* Card background */
background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%);
```

**Typography:**
- Titles: 18px, Bold (700)
- Body: 14px, Regular (400)
- Small: 12px, Medium (500)

---

### 🎯 RECOMMENDATION:

1. **Audit your existing component library** for cards, modals, forms, tabs
2. **Build 5 new specialized components** listed above
3. **Match mobile design** using the references provided
4. **Use existing color/typography system** if available, or adopt mobile's colors

---

## Additional Notes

### TypeScript Interfaces:

All TypeScript interfaces are provided in the main implementation doc. Here are the key ones:

```typescript
interface Opportunity {
  id: string;
  poster_user_id: string;
  title: string;
  description: string;
  type: 'collaboration' | 'event' | 'job';
  category: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: 'active' | 'filled' | 'expired' | 'cancelled';
  created_at: string;
  posted_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Interest {
  id: string;
  opportunity_id: string;
  interested_user_id: string;
  poster_user_id: string;
  reason: 'perfect_fit' | 'interested' | 'learn_more' | 'available';
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  custom_message: string | null;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}
```

---

### Error Handling:

```typescript
// Example error response format
{
  error: {
    code: 'FORBIDDEN',
    message: 'Only service providers can express interest',
    details: {}
  }
}

// Common error codes to handle:
- 'FORBIDDEN' - User not authorized
- 'NOT_FOUND' - Opportunity/Interest not found
- 'DUPLICATE' - Already expressed interest
- 'VALIDATION_ERROR' - Invalid input
- 'SUBSCRIPTION_REQUIRED' - Premium feature for free user
```

---

### Testing Endpoints:

Create a **test user account** with these properties:
```json
{
  "user_id": "test-123",
  "is_service_provider": true,
  "subscription_tier": "premium"
}
```

This allows testing all features including subscriber-only alerts.

---

## Summary of Recommendations

| Question | Recommendation | Priority |
|----------|---------------|----------|
| Q1: Service Provider Table | ✅ Use existing table, just query `user_id` | Required |
| Q2: Push Notifications | Start with in-app notifications, add web push later | Start Simple |
| Q3: Messages Integration | Skip for MVP, add later if needed | Optional |
| Q4: Pagination | Use offset-based (20 per page) | Required |
| Q5: UI Components | Reuse existing, build 5 new specialized components | Required |

---

## Next Steps

1. ✅ Confirm `service_provider_profiles` table structure
2. ✅ Decide on notification approach (we recommend in-app first)
3. ✅ Implement offset-based pagination
4. ✅ Audit existing components you can reuse
5. ✅ Build the 5 specialized components
6. ✅ Start with core features (express interest + accept/reject)
7. ⏳ Add Messages integration later (Phase 2)
8. ⏳ Add Web Push later (Phase 2)

---

## Contact Mobile Team

If you need:
- Specific component code references
- Design mockups/screenshots
- Database query examples
- Help with Supabase RLS policies

**Mobile Implementation Files Available:**
- All component source code
- Database schema (already deployed)
- Complete TypeScript interfaces
- Step-by-step implementation guide

**Response Time:** Same day for urgent questions

---

**Document Version:** 1.0
**Date:** 2025-12-27
**Status:** Ready for Review
