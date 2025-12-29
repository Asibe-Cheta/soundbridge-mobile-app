# Task: Complete Express Interest System (Both Sides)

## Overview
Build a two-way "Express Interest" system for opportunities on the Connect screen:
1. **Creators side:** Express interest in opportunities
2. **Service Providers side:** Receive, manage, accept/reject interests

---

## PART 1: WHO CAN EXPRESS INTEREST

**CRITICAL RULE:**
- ✅ Only CREATORS (service providers) can express interest
- ✅ Expressing interest is FREE for all users
- ❌ Regular users/fans CANNOT express interest
- 🔔 Alerts for similar opportunities = SUBSCRIBERS ONLY (notifications)

**Implementation:**
```typescript
// Check before showing "Express Interest" button
const canExpressInterest = currentUser.accountType === 'service_provider';

// Show button only if user is service provider
{canExpressInterest && (
  <Button onPress={handleExpressInterest}>Express Interest</Button>
)}
```

---

## PART 2: WHERE INTERESTS ARE SENT

### Primary Destination: MESSAGES
When user expresses interest:
1. Create a new message thread (or add to existing thread)
2. Send automated message to opportunity poster:
```
   [User Name] has expressed interest in your opportunity:
   "[Opportunity Title]"
   
   [View Profile] [Accept] [Reject]
```
3. User receives confirmation in their Messages

### Secondary Destination: SERVICE PROVIDER DASHBOARD
- Notification badge on dashboard
- "Pending Interests" section showing all interests received
- Can manage all interests from one place

**Data Flow:**
```
User taps "Express Interest" 
  ↓
1. Create message thread
2. Send message to poster's inbox
3. Add to poster's dashboard "Pending Interests"
4. Send push notification to poster
5. Show success modal to interested user
```

---

## PART 3: EXPRESS INTEREST MODAL (User Side)

**[Keep previous modal design but update this section]**

#### What Happens Behind the Scenes:
```typescript
const handleExpressInterest = async () => {
  // 1. Create message thread
  const thread = await createOrGetMessageThread({
    participants: [currentUser.id, opportunityPoster.id],
    opportunityId: opportunity.id,
  });
  
  // 2. Send automated interest message
  await sendMessage({
    threadId: thread.id,
    senderId: currentUser.id,
    type: 'interest_expression',
    content: {
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      status: 'pending',
    },
  });
  
  // 3. Add to poster's dashboard
  await addToDashboard({
    userId: opportunityPoster.id,
    type: 'interest_received',
    opportunityId: opportunity.id,
    interestedUserId: currentUser.id,
    status: 'pending',
  });
  
  // 4. Send push notification
  await sendPushNotification({
    userId: opportunityPoster.id,
    title: 'New Interest in Your Opportunity',
    body: `${currentUser.name} is interested in "${opportunity.title}"`,
  });
  
  // 5. Show success modal
  setShowSuccessModal(true);
};
```

**Toggle Behavior (UPDATED):**
```typescript
// Alerts are notifications, only for SUBSCRIBERS
const canEnableAlerts = currentUser.subscriptionTier !== 'free';

if (!canEnableAlerts) {
  // Show toggle disabled + upgrade prompt
} else {
  // Toggle enabled, saves notification preferences
}
```

---

## PART 4: SERVICE PROVIDER DASHBOARD - RECEIVED INTERESTS

### Location
- Service provider dashboard (find existing dashboard in codebase)
- Add new section: "Opportunity Interests" or "Pending Applications"

### UI Design
```
┌─────────────────────────────────────────────┐
│  Opportunity Interests                 [3]  │
├─────────────────────────────────────────────┤
│                                             │
│  Looking for Gospel Vocalist for Worship   │
│  Album                                      │
│  ┌─────────────────────────────────────┐   │
│  │  👤 Sarah Johnson                   │   │
│  │  "I have 5 years experience..."     │   │
│  │  🎤 Gospel Vocalist • London        │   │
│  │                                     │   │
│  │  [View Profile]  [Reject]  [Accept]│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  👤 Michael Thompson                │   │
│  │  "I'd love to collaborate on..."    │   │
│  │  🎤 Vocalist • Birmingham           │   │
│  │                                     │   │
│  │  [View Profile]  [Reject]  [Accept]│   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Features Required

#### 1. View All Interests
```typescript
// List all interests received for each opportunity
const interests = await supabase
  .from('opportunity_interests')
  .select(`
    *,
    interested_user:users(*),
    opportunity:opportunities(*)
  `)
  .eq('poster_user_id', currentUser.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

#### 2. View Profile Button
- Opens interested user's full profile
- Shows their work samples, reviews, experience
- Use existing profile view component

#### 3. Reject Button
```typescript
const handleReject = async (interestId: string) => {
  // Update interest status
  await supabase
    .from('opportunity_interests')
    .update({ status: 'rejected', rejected_at: new Date() })
    .eq('id', interestId);
  
  // Send message to interested user
  await sendMessage({
    threadId: thread.id,
    senderId: currentUser.id,
    type: 'interest_rejected',
    content: {
      message: 'Thank you for your interest. We've decided to go in a different direction.',
    },
  });
  
  // Remove from pending list
  refreshInterests();
};
```

#### 4. Accept Button
**When tapped, show custom message modal:**
```
┌─────────────────────────────────────┐
│  Accept Interest                    │
├─────────────────────────────────────┤
│                                     │
│  Send a message to [User Name]:    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Hi [Name],                    │ │
│  │                               │ │
│  │ Great to have you interested! │ │
│  │ Let's discuss next steps...   │ │
│  │                               │ │
│  │ [Customizable text area]      │ │
│  └───────────────────────────────┘ │
│                                     │
│  Quick Templates:                   │
│  • "Let's schedule a call"          │
│  • "Can you send samples?"          │
│  • "What's your availability?"      │
│                                     │
│  [Cancel]  [Send & Accept]          │
│                                     │
└─────────────────────────────────────┘
```

**Accept Implementation:**
```typescript
const handleAccept = async (interestId: string, customMessage: string) => {
  // 1. Update interest status
  await supabase
    .from('opportunity_interests')
    .update({ 
      status: 'accepted', 
      accepted_at: new Date(),
      custom_message: customMessage,
    })
    .eq('id', interestId);
  
  // 2. Send custom acceptance message to user's Messages
  await sendMessage({
    threadId: thread.id,
    senderId: currentUser.id,
    type: 'interest_accepted',
    content: {
      message: customMessage,
      opportunityTitle: opportunity.title,
    },
  });
  
  // 3. Send push notification
  await sendPushNotification({
    userId: interestedUser.id,
    title: 'Your Interest Was Accepted! 🎉',
    body: `${currentUser.name} accepted your interest in "${opportunity.title}"`,
  });
  
  // 4. Open message thread for continued conversation
  navigateToMessages(thread.id);
};
```

---

## PART 5: INTERESTED USER'S SIDE - MANAGE INTERESTS

### Location
- Messages inbox (primary)
- Profile → "My Applications" section (secondary)

### Messages Inbox
When interest is accepted/rejected, user receives message:

**Acceptance Message:**
```
┌─────────────────────────────────────┐
│  ✅ Interest Accepted!              │
├─────────────────────────────────────┤
│                                     │
│  [Poster Name] accepted your        │
│  interest in:                       │
│  "[Opportunity Title]"              │
│                                     │
│  Their message:                     │
│  ┌───────────────────────────────┐ │
│  │ [Custom acceptance message]   │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Reply]                            │
│                                     │
└─────────────────────────────────────┘
```

**Rejection Message:**
```
┌─────────────────────────────────────┐
│  Interest Not Selected              │
├─────────────────────────────────────┤
│                                     │
│  Thank you for your interest in     │
│  "[Opportunity Title]"              │
│                                     │
│  [Poster Name] has decided to go    │
│  in a different direction.          │
│                                     │
│  Keep applying - the right          │
│  opportunity is out there!          │
│                                     │
│  [View More Opportunities]          │
│                                     │
└─────────────────────────────────────┘
```

### "My Applications" Section
```
┌─────────────────────────────────────┐
│  My Applications              [5]   │
├─────────────────────────────────────┤
│                                     │
│  Pending (3)                        │
│  ┌───────────────────────────────┐ │
│  │ Gospel Vocalist - Marcus      │ │
│  │ Applied 2 days ago            │ │
│  │ ⏳ Waiting for response       │ │
│  └───────────────────────────────┘ │
│                                     │
│  Accepted (1)                       │
│  ┌───────────────────────────────┐ │
│  │ Jazz Festival - The Lounge    │ │
│  │ ✅ Accepted 1 hour ago        │ │
│  │ [Open Messages]               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Not Selected (1)                   │
│  ┌───────────────────────────────┐ │
│  │ Session Bass Player           │ │
│  │ Not selected 3 days ago       │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## PART 6: DATABASE SCHEMA

**CRITICAL: Check existing schema first!**

### Required Tables (or add to existing):
```sql
-- Opportunity Interests
CREATE TABLE opportunity_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  interested_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  poster_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  custom_message TEXT, -- Poster's acceptance message
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  UNIQUE(opportunity_id, interested_user_id) -- Can't apply twice
);

-- Opportunity Alert Profiles (Subscribers only)
CREATE TABLE opportunity_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT[], -- ['gospel', 'vocalist', 'UK']
  categories TEXT[],
  location TEXT,
  enabled BOOLEAN DEFAULT true,
  created_from_opportunity_id UUID, -- Original opportunity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (user_id IN (
    SELECT id FROM users WHERE subscription_tier != 'free'
  )) -- Only subscribers
);
```

---

## PART 7: NOTIFICATION SYSTEM (Alerts for Subscribers)

**When new opportunity is posted:**
```typescript
const notifyMatchingUsers = async (newOpportunity) => {
  // Find users with matching alert profiles
  const matchingAlerts = await supabase
    .from('opportunity_alerts')
    .select('user_id, users(*)')
    .eq('enabled', true)
    .contains('keywords', [newOpportunity.keywords]) // Array overlap
    .or(`location.eq.${newOpportunity.location},location.is.null`);
  
  // Send push notifications
  for (const alert of matchingAlerts) {
    await sendPushNotification({
      userId: alert.user_id,
      title: 'New Opportunity Matches Your Interests! 🎯',
      body: `"${newOpportunity.title}" - ${newOpportunity.location}`,
      data: {
        type: 'opportunity_match',
        opportunityId: newOpportunity.id,
      },
    });
  }
};
```

---

## PART 8: CREATE OPPORTUNITY POST (Service Providers)

### Where to Access
- Service provider dashboard → "Post Opportunity" button
- OR dedicated "Post" tab if it exists

### Form UI
```
┌─────────────────────────────────────┐
│  Create Opportunity                 │
├─────────────────────────────────────┤
│                                     │
│  Title *                            │
│  ┌───────────────────────────────┐ │
│  │ Looking for Gospel Vocalist   │ │
│  └───────────────────────────────┘ │
│                                     │
│  Description *                      │
│  ┌───────────────────────────────┐ │
│  │ We're producing a worship     │ │
│  │ album and need a powerful...  │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Category *                         │
│  [Dropdown: Music, Audio Eng...]    │
│                                     │
│  Location                           │
│  ┌───────────────────────────────┐ │
│  │ Birmingham, UK                │ │
│  └───────────────────────────────┘ │
│                                     │
│  Budget (optional)                  │
│  ┌───────────────────────────────┐ │
│  │ £500-1000                     │ │
│  └───────────────────────────────┘ │
│                                     │
│  Deadline (optional)                │
│  [Date picker]                      │
│                                     │
│  [Cancel]  [Post Opportunity]       │
│                                     │
└─────────────────────────────────────┘
```

**Post Implementation:**
```typescript
const handlePostOpportunity = async (data) => {
  // 1. Create opportunity
  const opportunity = await supabase
    .from('opportunities')
    .insert({
      poster_user_id: currentUser.id,
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      budget: data.budget,
      deadline: data.deadline,
      status: 'active',
    })
    .select()
    .single();
  
  // 2. Notify matching users (subscribers with alerts)
  await notifyMatchingUsers(opportunity);
  
  // 3. Navigate to opportunities feed
  navigate('Connect', { tab: 'Opportunities' });
};
```

---

## IMPLEMENTATION CHECKLIST

**BEFORE writing code:**
- [ ] Check if Messages system exists
- [ ] Check if Service Provider dashboard exists
- [ ] Verify user account types (service_provider vs regular)
- [ ] Find existing notification/push system
- [ ] Locate subscription tier checking logic
- [ ] Find existing modal/bottom sheet components
- [ ] Check existing message thread structure

**Service Provider Side:**
- [ ] Dashboard section for received interests
- [ ] View profile functionality
- [ ] Reject with automated message
- [ ] Accept with custom message modal
- [ ] Quick template messages
- [ ] Send to Messages inbox
- [ ] Push notification on accept/reject

**Interested User Side:**
- [ ] Express interest button (service providers only)
- [ ] Success modal on express interest
- [ ] Receive acceptance/rejection in Messages
- [ ] "My Applications" section in profile
- [ ] View application status (pending/accepted/rejected)

**Alerts (Subscribers Only):**
- [ ] Toggle in success modal (disabled for free tier)
- [ ] Save alert profile preferences
- [ ] Match new opportunities with alert profiles
- [ ] Send push notifications for matches
- [ ] "Alerts" are notifications, NOT emails

**Post Opportunity:**
- [ ] Form to create opportunity
- [ ] Validate required fields
- [ ] Post to opportunities feed
- [ ] Trigger alerts for matching subscribers

---

## SUCCESS CRITERIA

- [ ] Only service providers can express interest
- [ ] Expressing interest is FREE for everyone
- [ ] Interests sent to Messages AND dashboard
- [ ] Service providers see all interests in dashboard
- [ ] Accept shows custom message modal
- [ ] Custom acceptance sent to user's Messages
- [ ] Reject sends automated message
- [ ] Interested users see status in "My Applications"
- [ ] Alerts (notifications) only for SUBSCRIBERS
- [ ] Alerts notify users of matching opportunities
- [ ] Service providers can create opportunities
- [ ] Everything uses existing codebase patterns
- [ ] Clean, minimal UI matching SoundBridge design