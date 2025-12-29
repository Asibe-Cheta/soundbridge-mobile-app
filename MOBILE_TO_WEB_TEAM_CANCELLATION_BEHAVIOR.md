# Mobile Team → Web Team: Subscription Cancellation & Grace Period Implementation

**Date:** 2025-12-29
**From:** Mobile Team
**To:** Web Team (Backend API & Webhook Handlers)
**Subject:** Critical Implementation - Subscription Downgrade Grace Period System

---

## Executive Summary

We've implemented a **90-day grace period system** for users who downgrade from Premium/Unlimited to Free tier. This document outlines the required backend changes to support this feature.

**Key Points:**
- No refunds, no trials (Free plan is the trial)
- 90-day grace period when downgrading
- Storage-based tier system (30MB Free, 2GB Premium, 10GB Unlimited)
- Excess content becomes private after grace period expires
- Abuse prevention: Max 1 grace period per year, max 3 downgrades per year

---

## Database Schema Changes Required

### 1. Add Grace Period Fields to `profiles` Table

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS storage_at_downgrade BIGINT,
ADD COLUMN IF NOT EXISTS grace_periods_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_grace_period_used TIMESTAMPTZ;
```

**Field Descriptions:**
- `downgraded_at`: Timestamp when user downgraded from paid → free
- `grace_period_ends`: `downgraded_at + 90 days` (NULL = no active grace period)
- `storage_at_downgrade`: Storage used (bytes) at time of downgrade
- `grace_periods_used`: Counter for abuse prevention
- `last_grace_period_used`: Last time grace period was granted

### 2. Add Privacy Field to `posts` Table

```sql
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
```

**Purpose:** Mark excess tracks as private (owner-only) after grace period expires.

### 3. Create Subscription Changes Tracking Table

```sql
CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_at_change BIGINT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_changes_user
ON subscription_changes(user_id, changed_at DESC);
```

**Purpose:** Track tier changes for analytics and abuse prevention.

---

## Backend API Changes Required

### 1. Webhook Handler: `subscription.canceled` or `subscription.expired`

**When RevenueCat/Stripe sends subscription cancellation webhook:**

```typescript
// Pseudo-code for webhook handler
async function handleSubscriptionCanceled(event) {
  const userId = event.user_id;
  const currentTier = event.previous_tier; // 'premium' or 'unlimited'

  // Calculate current storage usage
  const storageUsed = await calculateUserStorageUsage(userId);

  // Check if user is eligible for grace period
  const isEligible = await checkGracePeriodEligibility(userId);

  if (isEligible) {
    // Grant 90-day grace period
    const now = new Date();
    const gracePeriodEnds = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    await db.profiles.update({
      where: { id: userId },
      data: {
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        downgraded_at: now,
        grace_period_ends: gracePeriodEnds,
        storage_at_downgrade: storageUsed,
        grace_periods_used: { increment: 1 },
        last_grace_period_used: now,
      }
    });

    // Log subscription change
    await db.subscription_changes.create({
      data: {
        user_id: userId,
        from_tier: currentTier,
        to_tier: 'free',
        changed_at: now,
        storage_at_change: storageUsed,
        reason: 'subscription_canceled',
      }
    });

    // Send grace period confirmation email
    await sendGracePeriodEmail(userId, gracePeriodEnds, storageUsed);

  } else {
    // No grace period (user abused system or multiple downgrades)
    await db.profiles.update({
      where: { id: userId },
      data: {
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        downgraded_at: now,
        grace_period_ends: now, // Immediate expiration
      }
    });

    // Immediately mark excess content as private
    await markExcessContentPrivate(userId);
  }
}
```

### 2. Grace Period Eligibility Check

```typescript
async function checkGracePeriodEligibility(userId: string): Promise<boolean> {
  const profile = await db.profiles.findUnique({
    where: { id: userId },
    select: {
      grace_periods_used,
      last_grace_period_used,
    }
  });

  // First time downgrading = eligible
  if (!profile.grace_periods_used || profile.grace_periods_used === 0) {
    return true;
  }

  // Last grace period was over 12 months ago = eligible
  if (profile.last_grace_period_used) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    if (profile.last_grace_period_used < twelveMonthsAgo) {
      return true;
    }
  }

  // Count downgrades in last 12 months
  const recentChanges = await db.subscription_changes.count({
    where: {
      user_id: userId,
      changed_at: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      },
      from_tier: {
        in: ['premium', 'unlimited']
      },
      to_tier: 'free'
    }
  });

  // More than 3 downgrades in 12 months = not eligible
  if (recentChanges >= 3) {
    return false;
  }

  return false;
}
```

### 3. Cron Job: Expire Grace Periods (Run Daily)

```typescript
// Run this daily to check for expired grace periods
async function expireGracePeriods() {
  const now = new Date();

  // Find users whose grace period expired today
  const expiredUsers = await db.profiles.findMany({
    where: {
      grace_period_ends: {
        lte: now,
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }
  });

  for (const user of expiredUsers) {
    // Mark excess content as private
    await markExcessContentPrivate(user.id);

    // Send notification email
    await sendGracePeriodExpiredEmail(user.id);

    console.log(`Grace period expired for user ${user.id}`);
  }
}

async function markExcessContentPrivate(userId: string) {
  const FREE_TIER_LIMIT = 30 * 1024 * 1024; // 30MB

  // Get all user's tracks sorted by priority
  const tracks = await db.audio_tracks.findMany({
    where: {
      creator_id: userId,
      deleted_at: null,
    },
    orderBy: [
      { play_count: 'desc' },     // Most played first
      { created_at: 'desc' },      // Then most recent
    ],
    select: {
      id: true,
      file_size: true,
    }
  });

  // Select tracks that fit in 30MB
  let totalSize = 0;
  const publicTrackIds: string[] = [];
  const privateTrackIds: string[] = [];

  for (const track of tracks) {
    if (totalSize + track.file_size <= FREE_TIER_LIMIT) {
      publicTrackIds.push(track.id);
      totalSize += track.file_size;
    } else {
      privateTrackIds.push(track.id);
    }
  }

  // Update privacy status
  if (privateTrackIds.length > 0) {
    await db.posts.updateMany({
      where: {
        id: { in: privateTrackIds }
      },
      data: {
        is_private: true
      }
    });
  }

  if (publicTrackIds.length > 0) {
    await db.posts.updateMany({
      where: {
        id: { in: publicTrackIds }
      },
      data: {
        is_private: false
      }
    });
  }

  console.log(`User ${userId}: ${publicTrackIds.length} public, ${privateTrackIds.length} private`);
}
```

### 4. API Endpoint Updates

#### `/api/upload/quota` - Current Implementation Issue

**CRITICAL BUG FIX:** The endpoint currently returns `tier: 'pro'` (legacy name) instead of `tier: 'premium'`.

**Required Change:**

```typescript
// BEFORE (❌ WRONG - returns legacy tier name)
return {
  tier: userProfile.subscription_tier, // Returns 'pro'
  upload_limit: calculateUploadLimit(userProfile.subscription_tier),
  // ...
};

// AFTER (✅ CORRECT - normalize tier names)
function normalizeTierName(tier: string): string {
  if (tier === 'pro') return 'premium';
  if (tier === 'enterprise') return 'unlimited';
  return tier;
}

return {
  tier: normalizeTierName(userProfile.subscription_tier), // Returns 'premium'
  upload_limit: calculateUploadLimit(userProfile.subscription_tier),
  // ...
};
```

#### `/api/posts/feed` - Respect Privacy Status

**Update feed queries to exclude private posts:**

```typescript
// When fetching posts for discovery/feed
const posts = await db.posts.findMany({
  where: {
    is_private: false, // Only show public posts
    deleted_at: null,
  },
  // ...
});

// When user views their own profile, show all posts
const posts = await db.posts.findMany({
  where: {
    user_id: profileUserId,
    deleted_at: null,
    // No is_private filter - show all to owner
  },
  // ...
});

// When viewing someone else's profile, hide private
const posts = await db.posts.findMany({
  where: {
    user_id: profileUserId,
    deleted_at: null,
    is_private: false, // Hide private posts from others
  },
  // ...
});
```

---

## Email Templates Required

### 1. Grace Period Confirmation Email

**Subject:** Your Premium Subscription Has Ended - What Happens Next

**Body:**
```
Hi [Name],

Your Premium subscription has been canceled. Here's what you need to know:

✓ Your Content is Safe
• All [X]GB of your tracks remain accessible
• No content has been deleted or hidden
• You have 90 days to decide what to keep public

What Changes:
• Free tier includes 30MB of public storage
• You currently have [X]GB ([Y]× the limit)
• Cannot upload new tracks until under 30MB

Your Options:
1. Keep favorite tracks (30MB worth) public, rest private
2. Delete tracks to get under 30MB
3. Re-subscribe anytime to restore full access

Grace Period: 90 days (until [DATE])

[Choose Which Tracks Stay Public] [Re-subscribe to Premium]
```

### 2. Grace Period Reminder (Week 11)

**Subject:** 7 Days to Choose Public Tracks

**Body:**
```
Hi [Name],

Your grace period ends in 7 days ([DATE]).

Action Required:
Choose which tracks (up to 30MB) stay public.

If you don't choose:
• Your [N] most recent tracks will auto-select
• Remaining [M] tracks become private
• You can still access private tracks anytime
• Re-subscribe to restore public access

[Choose Tracks Now] [Upgrade to Premium]
```

### 3. Grace Period Expired

**Subject:** Grace Period Ended - Your Storage Update

**Body:**
```
Hi [Name],

Your 90-day grace period has ended.

What Happened:
• [N] tracks (30MB) are public: [Track names]
• [M] tracks ([X]GB) are now private
• You can still play/download all your content

Private tracks:
• Not visible to others
• Not searchable/discoverable
• Accessible only to you
• Can be restored anytime

Restore Public Access:
Upgrade to Premium (£6.99/mo) to make all tracks public again + upload new content.

[Upgrade to Premium] [Manage Storage]
```

---

## Mobile App Implementation Status

✅ **Completed:**
1. Database migration SQL (`migrations/add_grace_period_fields.sql`)
2. Updated `StorageQuotaService.ts` with grace period logic
3. Created `CancellationWarningModal.tsx` component
4. Created `GracePeriodBanner.tsx` for upload screens
5. Created `SelectPublicTracksScreen.tsx` for track selection
6. Removed all trial messaging from mobile app

---

## Testing Checklist for Web Team

### Webhook Testing:
- [ ] Test subscription cancellation webhook triggers grace period
- [ ] Verify `grace_period_ends` = `downgraded_at + 90 days`
- [ ] Confirm `storage_at_downgrade` records current usage
- [ ] Check grace period email is sent

### Abuse Prevention:
- [ ] User downgrades for 2nd time in 12 months → no grace period
- [ ] User downgrades 4 times in 12 months → blocked
- [ ] Grace period counter increments correctly

### Cron Job:
- [ ] Daily cron job expires grace periods correctly
- [ ] Excess content marked as private
- [ ] Grace period expired email sent

### API Endpoints:
- [ ] `/api/upload/quota` returns `'premium'` not `'pro'`
- [ ] Feed excludes `is_private: true` posts
- [ ] User profile shows all posts (including private) to owner

### Edge Cases:
- [ ] User re-subscribes during grace period → grace period cleared
- [ ] User with 0 tracks cancels → no errors
- [ ] User with exactly 30MB → all tracks stay public

---

## Critical Questions for Web Team

1. **Webhook Timing:** When does RevenueCat send `subscription.canceled`?
   - Immediately on cancellation?
   - At end of billing period?
   - Need to know when to start grace period

2. **Email Service:** Which email provider do you use?
   - SendGrid?
   - AWS SES?
   - Need template format

3. **Cron Jobs:** How do you run scheduled tasks?
   - Vercel Cron?
   - AWS Lambda?
   - Need implementation details

4. **Database Access:** Do you use Prisma/TypeORM/raw SQL?
   - Need to match your ORM syntax

5. **Tier Normalization:** Why does backend use `'pro'` instead of `'premium'`?
   - Legacy database values?
   - Can we update database or must normalize in code?

---

## Implementation Priority

### Phase 1: Critical (Must Have - Week 1)
1. ✅ Fix `/api/upload/quota` tier normalization (`'pro'` → `'premium'`)
2. Add grace period fields to database
3. Update subscription cancellation webhook handler
4. Create grace period eligibility check function

### Phase 2: Important (Should Have - Week 2)
1. Implement daily cron job for expiring grace periods
2. Update feed/search queries to respect `is_private`
3. Send grace period confirmation email

### Phase 3: Nice to Have (Could Have - Week 3)
1. Grace period reminder emails (Week 11, Week 6, etc.)
2. Admin dashboard to view grace period users
3. Analytics tracking for downgrades/re-subscriptions

---

## Contact & Questions

**Mobile Team Lead:** [Your Name]
**Email:** [Your Email]
**Slack:** @mobile-team

**For Questions:**
- Database schema: Ask about field types/indexes
- Webhook logic: Clarify grace period start time
- Email templates: Request copy approval
- API changes: Coordinate deployment

---

## Appendix: SQL Migration File

See full migration in: `migrations/add_grace_period_fields.sql`

Includes:
- Table alterations
- Indexes for performance
- Helper functions (`is_eligible_for_grace_period`, `get_storage_status`)
- Comments for documentation

---

**End of Document**

Last Updated: 2025-12-29
Version: 1.0
