# Express Interest System - Web Team Implementation Guide

## 📋 Overview

This document provides complete implementation details for the **Express Interest System** on the SoundBridge web application. The mobile team has already implemented all UI components and the database schema has been successfully deployed to Supabase.

**System Purpose:** Allow service providers to express interest in opportunities posted by other service providers, with a complete workflow for managing, accepting, and rejecting interests.

---

## 🎯 Critical Business Rules

### Who Can Do What:

1. **✅ Express Interest (FREE for all)**
   - ONLY service providers can express interest
   - Regular users/fans CANNOT express interest
   - No subscription required to express interest

2. **🔔 Opportunity Alerts (SUBSCRIBERS ONLY)**
   - ONLY Premium/Unlimited subscribers can create alerts
   - Free tier users see upgrade prompts
   - Alerts are push notifications, NOT emails

3. **📝 Post Opportunities**
   - ONLY service providers can post opportunities
   - Enforced by RLS policies in database

---

## 🗄️ Database Schema

### ✅ Already Deployed Tables

The following tables have been created in Supabase with Row Level Security (RLS) enabled:

#### 1. `opportunities`
Stores job/collaboration/event opportunities.

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Opportunity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('collaboration', 'event', 'job')),
  category TEXT,

  -- Location & Budget
  location TEXT,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'GBP',

  -- Timeline
  deadline TIMESTAMPTZ,
  start_date TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'filled', 'expired', 'cancelled')) DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  keywords TEXT[],
  required_skills TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_opportunities_poster` on `poster_user_id`
- `idx_opportunities_type` on `type`
- `idx_opportunities_status` on `status`
- `idx_opportunities_created_at` on `created_at DESC`
- `idx_opportunities_keywords` GIN index on `keywords`

**RLS Policies:**
- Anyone can view active opportunities (not deleted)
- Service providers can create opportunities
- Posters can update/delete their own opportunities

---

#### 2. `opportunity_interests`
Tracks when service providers express interest in opportunities.

```sql
CREATE TABLE opportunity_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL,
  interested_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poster_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Interest details
  reason TEXT NOT NULL CHECK (reason IN ('perfect_fit', 'interested', 'learn_more', 'available')),
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',

  -- Poster's response
  custom_message TEXT,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(opportunity_id, interested_user_id)
);
```

**Indexes:**
- `idx_opportunity_interests_opportunity` on `opportunity_id`
- `idx_opportunity_interests_interested_user` on `interested_user_id`
- `idx_opportunity_interests_poster` on `poster_user_id`
- `idx_opportunity_interests_status` on `status`
- `idx_opportunity_interests_created_at` on `created_at DESC`

**RLS Policies:**
- Users can view interests they created
- Posters can view interests on their opportunities
- Service providers can insert interests
- Posters can update interests (accept/reject)

**Reason Values:**
- `perfect_fit` - "Perfect Fit"
- `interested` - "Very Interested"
- `learn_more` - "Want Details"
- `available` - "Available Now"

---

#### 3. `opportunity_alerts`
Allows subscribers to get notified of similar opportunities.

```sql
CREATE TABLE opportunity_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Alert preferences
  keywords TEXT[],
  categories TEXT[],
  location TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Source
  created_from_opportunity_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_opportunity_alerts_user` on `user_id`
- `idx_opportunity_alerts_enabled` on `enabled`
- `idx_opportunity_alerts_keywords` GIN index on `keywords`

**RLS Policies:**
- Users can view their own alerts
- ONLY subscribers (premium/unlimited) can create alerts
- Users can update/delete their own alerts

---

### Database Functions

#### `match_opportunity_alerts()`
Finds users with matching alert profiles for notification.

```sql
CREATE OR REPLACE FUNCTION match_opportunity_alerts(
  p_opportunity_id UUID,
  p_keywords TEXT[],
  p_location TEXT,
  p_category TEXT
)
RETURNS TABLE(user_id UUID, alert_id UUID);
```

**Usage:**
```typescript
const { data: matchingUsers } = await supabase.rpc('match_opportunity_alerts', {
  p_opportunity_id: opportunityId,
  p_keywords: ['gospel', 'vocalist'],
  p_location: 'London',
  p_category: 'collaboration'
});
```

---

## 🔌 Required API Endpoints

### 1. Opportunities Management

#### `GET /api/opportunities`
Fetch all active opportunities.

**Query Parameters:**
- `type` (optional): Filter by type (collaboration/event/job)
- `category` (optional): Filter by category
- `location` (optional): Filter by location
- `page` (optional): Pagination
- `limit` (optional): Results per page

**Response:**
```typescript
{
  opportunities: [
    {
      id: string;
      poster_user_id: string;
      title: string;
      description: string;
      type: 'collaboration' | 'event' | 'job';
      category: string | null;
      location: string | null;
      budget_min: number | null;
      budget_max: number | null;
      budget_currency: string;
      deadline: string | null;
      start_date: string | null;
      status: 'active' | 'filled' | 'expired' | 'cancelled';
      is_featured: boolean;
      keywords: string[];
      required_skills: string[];
      created_at: string;
      posted_by: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
    }
  ];
  total: number;
  page: number;
  limit: number;
}
```

**Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('opportunities')
  .select(`
    *,
    posted_by:profiles!poster_user_id(id, username, display_name, avatar_url)
  `)
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .range(start, end);
```

---

#### `POST /api/opportunities`
Create a new opportunity (service providers only).

**Request Body:**
```typescript
{
  title: string;
  description: string;
  type: 'collaboration' | 'event' | 'job';
  category?: string;
  location?: string;
  budget_min?: number;
  budget_max?: number;
  budget_currency?: string;
  deadline?: string; // ISO 8601
  start_date?: string; // ISO 8601
  keywords?: string[];
  required_skills?: string[];
}
```

**Response:**
```typescript
{
  opportunity: {
    id: string;
    // ... all opportunity fields
  };
}
```

**Implementation:**
```typescript
// 1. Verify user is service provider
const { data: serviceProvider } = await supabase
  .from('service_provider_profiles')
  .select('user_id')
  .eq('user_id', userId)
  .single();

if (!serviceProvider) {
  return { error: 'Only service providers can post opportunities' };
}

// 2. Create opportunity
const { data: opportunity, error } = await supabase
  .from('opportunities')
  .insert({
    poster_user_id: userId,
    ...requestBody,
    status: 'active'
  })
  .select()
  .single();

// 3. Trigger alert notifications for matching users
const matchingUsers = await supabase.rpc('match_opportunity_alerts', {
  p_opportunity_id: opportunity.id,
  p_keywords: opportunity.keywords || [],
  p_location: opportunity.location,
  p_category: opportunity.type
});

// 4. Send push notifications to matching users
for (const match of matchingUsers.data) {
  await sendPushNotification({
    userId: match.user_id,
    title: 'New Opportunity Matches Your Interests! 🎯',
    body: `"${opportunity.title}" - ${opportunity.location}`,
    data: {
      type: 'opportunity_match',
      opportunityId: opportunity.id
    }
  });
}
```

---

#### `GET /api/opportunities/:id`
Get a single opportunity by ID.

**Response:**
```typescript
{
  opportunity: {
    id: string;
    // ... all opportunity fields
    posted_by: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      headline: string | null;
    };
  };
}
```

---

#### `PATCH /api/opportunities/:id`
Update opportunity (poster only).

**Request Body:**
```typescript
{
  title?: string;
  description?: string;
  status?: 'active' | 'filled' | 'expired' | 'cancelled';
  // ... any updatable fields
}
```

---

#### `DELETE /api/opportunities/:id`
Soft delete opportunity (poster only).

**Implementation:**
```typescript
const { error } = await supabase
  .from('opportunities')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', opportunityId)
  .eq('poster_user_id', userId);
```

---

### 2. Express Interest

#### `POST /api/opportunities/:id/interests`
Express interest in an opportunity (service providers only).

**Request Body:**
```typescript
{
  reason: 'perfect_fit' | 'interested' | 'learn_more' | 'available';
  message?: string; // max 500 chars
  enable_alerts?: boolean; // Only for subscribers
}
```

**Response:**
```typescript
{
  interest: {
    id: string;
    opportunity_id: string;
    interested_user_id: string;
    poster_user_id: string;
    reason: string;
    message: string | null;
    status: 'pending';
    created_at: string;
  };
  alert_created?: boolean; // If enable_alerts was true and successful
}
```

**Implementation:**
```typescript
// 1. Verify user is service provider
const { data: serviceProvider } = await supabase
  .from('service_provider_profiles')
  .select('user_id')
  .eq('user_id', userId)
  .single();

if (!serviceProvider) {
  return { error: 'Only service providers can express interest' };
}

// 2. Get opportunity details
const { data: opportunity } = await supabase
  .from('opportunities')
  .select('*, posted_by:profiles!poster_user_id(*)')
  .eq('id', opportunityId)
  .single();

// 3. Create interest
const { data: interest, error } = await supabase
  .from('opportunity_interests')
  .insert({
    opportunity_id: opportunityId,
    interested_user_id: userId,
    poster_user_id: opportunity.poster_user_id,
    reason: requestBody.reason,
    message: requestBody.message || null,
    status: 'pending'
  })
  .select()
  .single();

// 4. Send push notification to poster
await sendPushNotification({
  userId: opportunity.poster_user_id,
  title: 'New Interest in Your Opportunity',
  body: `${currentUser.display_name} is interested in "${opportunity.title}"`,
  data: {
    type: 'interest_received',
    interestId: interest.id,
    opportunityId: opportunityId
  }
});

// 5. Create alert if requested (subscribers only)
let alertCreated = false;
if (requestBody.enable_alerts) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profile.subscription_tier !== 'free') {
    const { error: alertError } = await supabase
      .from('opportunity_alerts')
      .insert({
        user_id: userId,
        created_from_opportunity_id: opportunityId,
        keywords: opportunity.keywords || [],
        categories: [opportunity.type],
        location: opportunity.location,
        enabled: true
      });

    alertCreated = !alertError;
  }
}

return { interest, alert_created: alertCreated };
```

---

#### `GET /api/opportunities/:id/interests`
Get all interests for an opportunity (poster only).

**Response:**
```typescript
{
  interests: [
    {
      id: string;
      opportunity_id: string;
      reason: string;
      message: string | null;
      status: 'pending' | 'accepted' | 'rejected';
      created_at: string;
      interested_user: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        headline: string | null;
        location: string | null;
      };
    }
  ];
}
```

**Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('opportunity_interests')
  .select(`
    *,
    interested_user:profiles!interested_user_id(
      id, username, display_name, avatar_url, headline, location
    )
  `)
  .eq('opportunity_id', opportunityId)
  .eq('poster_user_id', userId)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

---

#### `GET /api/users/me/interests`
Get current user's interest applications.

**Query Parameters:**
- `status` (optional): Filter by status (pending/accepted/rejected)

**Response:**
```typescript
{
  interests: [
    {
      id: string;
      opportunity_id: string;
      reason: string;
      message: string | null;
      status: 'pending' | 'accepted' | 'rejected';
      custom_message: string | null; // Poster's acceptance message
      created_at: string;
      accepted_at: string | null;
      rejected_at: string | null;
      opportunity: {
        id: string;
        title: string;
        type: 'collaboration' | 'event' | 'job';
        location: string | null;
      };
      poster: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
    }
  ];
}
```

**Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('opportunity_interests')
  .select(`
    *,
    opportunity:opportunities(id, title, type, location),
    poster:profiles!poster_user_id(id, username, display_name, avatar_url)
  `)
  .eq('interested_user_id', userId)
  .order('created_at', { ascending: false });
```

---

#### `PATCH /api/interests/:id/accept`
Accept an interest (poster only).

**Request Body:**
```typescript
{
  custom_message: string; // Required, max 1000 chars
}
```

**Response:**
```typescript
{
  interest: {
    id: string;
    status: 'accepted';
    accepted_at: string;
    custom_message: string;
    // ... other fields
  };
}
```

**Implementation:**
```typescript
// 1. Update interest status
const { data: interest, error } = await supabase
  .from('opportunity_interests')
  .update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    custom_message: requestBody.custom_message
  })
  .eq('id', interestId)
  .eq('poster_user_id', userId)
  .select(`
    *,
    interested_user:profiles!interested_user_id(*),
    opportunity:opportunities(*)
  `)
  .single();

// 2. Send push notification to interested user
await sendPushNotification({
  userId: interest.interested_user_id,
  title: 'Your Interest Was Accepted! 🎉',
  body: `${currentUser.display_name} accepted your interest in "${interest.opportunity.title}"`,
  data: {
    type: 'interest_accepted',
    interestId: interestId,
    opportunityId: interest.opportunity_id
  }
});

// 3. Optional: Create message thread (if Messages system exists)
// await createOrGetMessageThread({
//   participants: [userId, interest.interested_user_id],
//   initialMessage: requestBody.custom_message
// });
```

---

#### `PATCH /api/interests/:id/reject`
Reject an interest (poster only).

**Request Body:**
```typescript
{
  rejection_reason?: string; // Optional
}
```

**Implementation:**
```typescript
// 1. Update interest status
const { data: interest, error } = await supabase
  .from('opportunity_interests')
  .update({
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejection_reason: requestBody.rejection_reason || null
  })
  .eq('id', interestId)
  .eq('poster_user_id', userId)
  .select(`
    *,
    interested_user:profiles!interested_user_id(*),
    opportunity:opportunities(*)
  `)
  .single();

// 2. Send automated rejection notification
await sendPushNotification({
  userId: interest.interested_user_id,
  title: 'Interest Update',
  body: `Update on your interest in "${interest.opportunity.title}"`,
  data: {
    type: 'interest_rejected',
    interestId: interestId
  }
});
```

---

### 3. Opportunity Alerts

#### `POST /api/alerts`
Create an opportunity alert (subscribers only).

**Request Body:**
```typescript
{
  keywords?: string[];
  categories?: ('collaboration' | 'event' | 'job')[];
  location?: string;
  created_from_opportunity_id?: string;
}
```

**Implementation:**
```typescript
// 1. Verify user is subscriber
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier')
  .eq('id', userId)
  .single();

if (profile.subscription_tier === 'free') {
  return { error: 'Alerts are only available for Premium/Unlimited subscribers' };
}

// 2. Create alert
const { data: alert, error } = await supabase
  .from('opportunity_alerts')
  .insert({
    user_id: userId,
    keywords: requestBody.keywords || [],
    categories: requestBody.categories || [],
    location: requestBody.location || null,
    created_from_opportunity_id: requestBody.created_from_opportunity_id || null,
    enabled: true
  })
  .select()
  .single();
```

---

#### `GET /api/alerts`
Get user's alerts.

**Response:**
```typescript
{
  alerts: [
    {
      id: string;
      keywords: string[];
      categories: string[];
      location: string | null;
      enabled: boolean;
      created_at: string;
    }
  ];
}
```

---

#### `PATCH /api/alerts/:id`
Update an alert (toggle enabled, etc.).

**Request Body:**
```typescript
{
  enabled?: boolean;
  keywords?: string[];
  categories?: string[];
  location?: string;
}
```

---

#### `DELETE /api/alerts/:id`
Delete an alert.

---

## 🔔 Push Notification Events

Implement the following push notification events:

### Event Types:

1. **`opportunity.interest.created`**
   - **Recipient:** Opportunity poster
   - **Trigger:** When someone expresses interest
   - **Payload:**
   ```typescript
   {
     title: 'New Interest in Your Opportunity',
     body: '[User Name] is interested in "[Opportunity Title]"',
     data: {
       type: 'interest_received',
       interestId: string,
       opportunityId: string
     }
   }
   ```

2. **`opportunity.interest.accepted`**
   - **Recipient:** Interested user
   - **Trigger:** When poster accepts interest
   - **Payload:**
   ```typescript
   {
     title: 'Your Interest Was Accepted! 🎉',
     body: '[Poster Name] accepted your interest in "[Opportunity Title]"',
     data: {
       type: 'interest_accepted',
       interestId: string,
       opportunityId: string
     }
   }
   ```

3. **`opportunity.interest.rejected`**
   - **Recipient:** Interested user
   - **Trigger:** When poster rejects interest
   - **Payload:**
   ```typescript
   {
     title: 'Interest Update',
     body: 'Update on your interest in "[Opportunity Title]"',
     data: {
       type: 'interest_rejected',
       interestId: string
     }
   }
   ```

4. **`opportunity.alert.match`**
   - **Recipient:** Subscribers with matching alerts
   - **Trigger:** When new opportunity is posted
   - **Payload:**
   ```typescript
   {
     title: 'New Opportunity Matches Your Interests! 🎯',
     body: '"[Opportunity Title]" - [Location]',
     data: {
       type: 'opportunity_match',
       opportunityId: string,
       alertId: string
     }
   }
   ```

---

## 🔒 Authorization & Security

### Service Provider Check:

```typescript
async function isServiceProvider(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('service_provider_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  return !!data;
}
```

### Subscriber Check:

```typescript
async function isSubscriber(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  return data?.subscription_tier !== 'free';
}
```

### RLS Enforcement:

- All database operations use RLS policies
- Service provider checks enforced in INSERT policies
- Subscriber checks enforced for alert creation
- Users can only view/modify their own data

---

## 📱 Integration Points

### Messages System (If Exists):

When interest is accepted, optionally create/continue message thread:

```typescript
// After accepting interest
await createOrGetMessageThread({
  participants: [posterId, interestedUserId],
  opportunityId: opportunityId,
  initialMessage: customMessage
});
```

### User Profile:

Display service provider badge and opportunity count on profiles.

---

## 🎨 UI/UX Consistency

### Color Scheme:
- Primary: `#EC4899` (Pink) → `#7C3AED` (Purple) gradients
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Orange)
- Error: `#EF4444` (Red)

### Status Colors:
- Pending: `#F59E0B` (Orange)
- Accepted: `#10B981` (Green)
- Rejected: `#6B7280` (Gray)

---

## ✅ Testing Checklist

### Opportunities:
- [ ] Service providers can create opportunities
- [ ] Regular users cannot create opportunities
- [ ] Opportunities appear in feed immediately
- [ ] Soft delete works (deleted_at)
- [ ] Filtering by type/category/location works
- [ ] Pagination works correctly

### Express Interest:
- [ ] Service providers can express interest
- [ ] Regular users cannot express interest
- [ ] Cannot express interest twice (UNIQUE constraint)
- [ ] Poster receives push notification
- [ ] Interest appears in poster's dashboard

### Accept/Reject:
- [ ] Only poster can accept/reject
- [ ] Custom message sent on acceptance
- [ ] Push notification sent to interested user
- [ ] Status updates correctly
- [ ] Timestamps set correctly

### Alerts:
- [ ] Only subscribers can create alerts
- [ ] Free users see upgrade prompt
- [ ] Matching algorithm works correctly
- [ ] Push notifications sent to matching users
- [ ] Can enable/disable alerts
- [ ] Can delete alerts

---

## 🚀 Deployment Notes

1. **Database Schema:** ✅ Already deployed to Supabase
2. **RLS Policies:** ✅ Already enabled and tested
3. **Indexes:** ✅ Created for performance
4. **Functions:** ✅ `match_opportunity_alerts()` ready

### Environment Variables Needed:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key (for admin operations)
PUSH_NOTIFICATION_KEY=your_expo_push_key
```

---

## 📞 Support & Questions

**Mobile Team Contact:** [Your contact info]

**Database Schema:** `OPPORTUNITY_INTERESTS_SCHEMA.sql` (already deployed)

**Mobile Implementation:** Complete with 5 new components + 1 modified component

**Questions?** Check the following files in the mobile repo:
- `EXPRESS_INTEREST_IMPLEMENTATION_SUMMARY.md` - Complete implementation summary
- `OPPORTUNITIES_AND_INTEREST.md` - Original requirements document
- `src/components/ExpressInterestModal.tsx` - Reference implementation
- `src/components/AcceptInterestModal.tsx` - Accept flow reference
- `src/components/MyApplicationsSection.tsx` - User applications UI
- `src/components/OpportunityInterestsSection.tsx` - Dashboard reference
- `src/components/OpportunityAlertsSection.tsx` - Alerts management

---

## 🎯 Success Criteria

- [ ] All endpoints return consistent response formats
- [ ] RLS policies prevent unauthorized access
- [ ] Push notifications delivered reliably
- [ ] Service provider/subscriber checks enforced
- [ ] Alert matching algorithm accurate
- [ ] Performance acceptable (< 500ms average response time)
- [ ] Error handling comprehensive
- [ ] Web UI matches mobile design language

---

**Document Version:** 1.0
**Last Updated:** 2025-12-27
**Status:** Ready for Implementation
