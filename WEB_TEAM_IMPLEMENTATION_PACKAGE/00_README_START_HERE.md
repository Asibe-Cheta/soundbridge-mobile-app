# SoundBridge Web Team Implementation Package

**Date Created:** 2025-12-29
**From:** Mobile Team
**To:** Web/Backend Team
**Version:** 1.0

---

## 📋 Package Overview

This package contains **complete documentation** for backend implementation requirements spanning from the **storage-based tier system** through **subscription cancellation grace period** functionality.

**Total Documents:** 22 files
**Organized by Priority:** 4 levels + Communication docs

---

## 🚀 Quick Start Guide

### Step 1: Read Priority 1 (Critical) - 30 minutes
Start with these files in order:

1. **PRIORITY_1_CRITICAL/MOBILE_TO_WEB_TEAM_CANCELLATION_BEHAVIOR.md** (15 min)
   - Backend requirements for grace period system
   - Database schema, webhooks, cron jobs, API changes

2. **PRIORITY_1_CRITICAL/IMPLEMENTATION_SUMMARY_GRACE_PERIOD.md** (10 min)
   - Complete overview of what mobile built vs what backend needs

3. **PRIORITY_1_CRITICAL/migrations/add_grace_period_fields.sql** (5 min)
   - Database migration ready to run (review before executing)

### Step 2: Fix Critical Bug - 15 minutes
**IMMEDIATE ACTION REQUIRED:**

The `/api/upload/quota` endpoint currently returns:
```json
{ "tier": "pro" }  // ❌ WRONG - legacy tier name
```

It should return:
```json
{ "tier": "premium" }  // ✅ CORRECT - current tier name
```

**Impact:** Mobile app Upload and Discover screens show incorrect storage limits.

**Fix:** Add tier normalization in your API endpoint:
```typescript
function normalizeTierName(tier: string): string {
  if (tier === 'pro') return 'premium';
  if (tier === 'enterprise') return 'unlimited';
  return tier;
}
```

### Step 3: Review Current Bugs - 45 minutes
Read **PRIORITY_2_CURRENT_BUGS** folder to understand existing issues.

### Step 4: Schedule Implementation Meeting
Discuss timeline, questions, and dependencies with mobile team.

---

## 📁 Folder Structure

```
WEB_TEAM_IMPLEMENTATION_PACKAGE/
│
├── 00_README_START_HERE.md ← YOU ARE HERE
│
├── PRIORITY_1_CRITICAL/          🔴 READ FIRST
│   ├── MOBILE_TO_WEB_TEAM_CANCELLATION_BEHAVIOR.md
│   ├── IMPLEMENTATION_SUMMARY_GRACE_PERIOD.md
│   ├── CANCEL_SUBSCRIPTION_BEHAVIOUR.md
│   └── migrations/
│       └── add_grace_period_fields.sql
│
├── PRIORITY_2_CURRENT_BUGS/      🟡 IMPORTANT
│   ├── FIX_FEED_API_VISIBILITY.md
│   ├── MOBILE_TEAM_URGENT_RESPONSE_MISSING_POSTS.md
│   ├── CRITICAL_MODERATION_FIXES.md
│   ├── URGENT_CRON_JOB_NOT_RUNNING.md
│   └── MANUAL_APPROVE_STUCK_TRACKS.sql
│
├── PRIORITY_3_FEATURES/          🟢 NEW FUNCTIONALITY
│   ├── WEB_TEAM_EXPRESS_INTEREST_IMPLEMENTATION.md
│   ├── EXPRESS_INTEREST_IMPLEMENTATION_SUMMARY.md
│   ├── SERVICE_PROVIDER_PROMPT_IMPLEMENTATION_SUMMARY.md
│   └── OPPORTUNITIES_AND_INTEREST.md
│
├── PRIORITY_4_FOUNDATION/        🔵 BACKGROUND
│   ├── TIER_CORRECTIONS.md
│   ├── PHASE_2_IMPLEMENTATION_COMPLETE.md
│   ├── MOBILE_USING_SUPABASE_DIRECT.md
│   ├── 04_FEED_ARCHITECTURE_OVERVIEW.md
│   └── BUG_REPORT_SQL_ERROR.md
│
└── COMMUNICATION/                📞 COORDINATION
    ├── SEND_TO_WEB_TEAM_NOW.md
    ├── WEB_TEAM_CLARIFICATIONS_RESPONSE.md
    ├── MOBILE_TEAM_FOLLOWUP.md
    ├── MOBILE_TEAM_FOLLOW_UP_RESPONSE.md
    └── FOLLOWUP_QUESTIONS_FOR_WEB_TEAM.md
```

---

## 🎯 What's Inside Each Priority Level

### 🔴 PRIORITY 1: CRITICAL (Must Implement - Week 1-2)

#### **Subscription Cancellation & Grace Period System**

**The Problem:**
- User subscribes to Premium (2GB storage limit)
- Uploads 1.5GB of music over 6 months
- Cancels subscription → reverts to Free tier (30MB limit)
- User now has 1.5GB but Free tier only allows 30MB!

**The Solution:**
- **90-day grace period** when users downgrade Premium/Unlimited → Free
- All content stays accessible during grace period
- Upload blocked until user deletes content or re-subscribes
- After 90 days: User chooses 30MB worth of tracks to keep public
- Remaining content becomes **private** (owner-only access, not deleted)
- Abuse prevention: Max 1 grace period per year

**What Backend Must Build:**

1. **Database Changes** (Run migration SQL)
   - Add grace period fields to `profiles` table
   - Add `is_private` flag to `posts` table
   - Create `subscription_changes` tracking table

2. **Webhook Handler Update**
   - When RevenueCat sends `subscription.canceled` event
   - Check if user eligible for grace period
   - Set `grace_period_ends = NOW() + 90 days`
   - Send grace period confirmation email

3. **Cron Job** (Run daily)
   - Find users whose grace period expired
   - Auto-select best 30MB of tracks (most played + recent)
   - Mark excess tracks as `is_private = true`
   - Send grace period expired email

4. **API Updates**
   - Fix `/api/upload/quota` tier normalization
   - Update feed queries to exclude `is_private` posts
   - Respect privacy when showing user profiles

**Files to Read:**
- `MOBILE_TO_WEB_TEAM_CANCELLATION_BEHAVIOR.md` - Complete backend spec
- `IMPLEMENTATION_SUMMARY_GRACE_PERIOD.md` - Implementation overview
- `CANCEL_SUBSCRIPTION_BEHAVIOUR.md` - Full solution from Claude
- `migrations/add_grace_period_fields.sql` - Database migration

**Estimated Effort:** 3-5 days development + 2 days testing

---

### 🟡 PRIORITY 2: CURRENT BUGS (Fix ASAP - Week 1)

#### **Feed Visibility Issues**
- Posts not appearing in feed despite being approved
- API returning wrong data structure
- Mobile team bypassing API and using Supabase direct

**Files:**
- `FIX_FEED_API_VISIBILITY.md` - Feed visibility bug details
- `MOBILE_TEAM_URGENT_RESPONSE_MISSING_POSTS.md` - Missing posts issue

#### **Moderation System Problems**
- Admin panel not working correctly
- Auto-approval cron job not running
- Tracks stuck in "pending" status forever

**Files:**
- `CRITICAL_MODERATION_FIXES.md` - Moderation issues
- `URGENT_CRON_JOB_NOT_RUNNING.md` - Cron job failures
- `MANUAL_APPROVE_STUCK_TRACKS.sql` - SQL to fix stuck tracks

**Estimated Effort:** 2-3 days bug fixes

---

### 🟢 PRIORITY 3: FEATURES (New Functionality - Week 2-3)

#### **Opportunities & Express Interest System**
- Service providers can post opportunities (gigs, collaborations, etc.)
- Artists can express interest in opportunities
- Acceptance/rejection workflow
- Notifications for both parties

**What Backend Must Build:**
- Database tables: `opportunities`, `opportunity_interests`
- API endpoints: Create opportunity, express interest, accept/reject
- Email notifications
- Feed integration (show opportunities in discover feed)

**Files:**
- `WEB_TEAM_EXPRESS_INTEREST_IMPLEMENTATION.md` - Backend implementation guide
- `EXPRESS_INTEREST_IMPLEMENTATION_SUMMARY.md` - Feature overview
- `SERVICE_PROVIDER_PROMPT_IMPLEMENTATION_SUMMARY.md` - Onboarding flow
- `OPPORTUNITIES_AND_INTEREST.md` - Original specification

**Estimated Effort:** 3-4 days development

---

### 🔵 PRIORITY 4: FOUNDATION (Background Context - Reference)

#### **Storage-Based Tier System**
Original specification for storage tiers:
- **Free:** 30MB storage (~3 tracks)
- **Premium:** 2GB storage (~200 tracks)
- **Unlimited:** 10GB storage (~1000 tracks)

**Files:**
- `TIER_CORRECTIONS.md` - Original tier system spec
- `PHASE_2_IMPLEMENTATION_COMPLETE.md` - Implementation summary

#### **Architecture Documentation**
- How mobile team uses Supabase directly
- Feed architecture overview
- Known SQL errors and fixes

**Files:**
- `MOBILE_USING_SUPABASE_DIRECT.md`
- `04_FEED_ARCHITECTURE_OVERVIEW.md`
- `BUG_REPORT_SQL_ERROR.md`

**Use Case:** Reference when questions arise about system design

---

### 📞 COMMUNICATION (Coordination Docs)

These documents track ongoing communication between mobile and web teams:
- Questions from mobile team to web team
- Clarifications and responses
- Urgent requests and blockers

**Files:**
- `SEND_TO_WEB_TEAM_NOW.md` - Urgent requests
- `WEB_TEAM_CLARIFICATIONS_RESPONSE.md` - Q&A
- `MOBILE_TEAM_FOLLOWUP.md` - Follow-up questions
- `MOBILE_TEAM_FOLLOW_UP_RESPONSE.md` - Answers
- `FOLLOWUP_QUESTIONS_FOR_WEB_TEAM.md` - Open questions

---

## ⚡ Critical Actions Required

### Immediate (This Week)

1. **Fix Tier Normalization Bug** ⏱️ 15 minutes
   - Update `/api/upload/quota` to return `'premium'` instead of `'pro'`
   - Test with mobile app
   - Deploy to production

2. **Review Grace Period Database Migration** ⏱️ 1 hour
   - Read `migrations/add_grace_period_fields.sql`
   - Test in staging database
   - Prepare for production deployment

3. **Schedule Implementation Meeting** ⏱️ 1 hour
   - Discuss grace period system timeline
   - Clarify webhook integration approach
   - Agree on cron job scheduling method

### Week 1

4. **Run Database Migration** ⏱️ 30 minutes
   - Deploy grace period fields to production
   - Verify indexes created correctly
   - Test helper functions

5. **Update Subscription Webhook Handler** ⏱️ 1-2 days
   - Implement grace period eligibility check
   - Set grace period dates on cancellation
   - Log to `subscription_changes` table

6. **Fix Feed Visibility Bugs** ⏱️ 1 day
   - Update feed query logic
   - Test with mobile app
   - Deploy fixes

### Week 2

7. **Implement Grace Period Cron Job** ⏱️ 1-2 days
   - Daily job to expire grace periods
   - Mark excess content as private
   - Send expiration emails

8. **Update API Endpoints** ⏱️ 1 day
   - Respect `is_private` in feed/search
   - Test privacy logic
   - Deploy updates

### Week 3

9. **Email Templates** ⏱️ 1 day
   - Grace period confirmation email
   - Reminder emails (Week 6, Week 11)
   - Expiration notification email

10. **Opportunities Feature** ⏱️ 3-4 days
    - Database tables
    - API endpoints
    - Notifications

---

## 🔍 Testing Checklist

Before marking anything complete, verify:

### Grace Period System

- [ ] Subscription cancellation webhook triggers grace period
- [ ] `grace_period_ends = downgraded_at + 90 days`
- [ ] Grace period email sent to user
- [ ] User eligible for grace period? (Check abuse rules)
- [ ] Upload quota shows grace period status
- [ ] Cron job expires grace periods correctly
- [ ] Excess content marked as `is_private = true`
- [ ] Grace expired email sent
- [ ] Re-subscribing clears grace period
- [ ] Second cancellation within 12 months = no grace period

### API Endpoints

- [ ] `/api/upload/quota` returns `'premium'` not `'pro'`
- [ ] Feed excludes `is_private` posts
- [ ] User can see own private posts in profile
- [ ] Others cannot see private posts
- [ ] Search excludes private posts

### Edge Cases

- [ ] User with 0 tracks cancels → no errors
- [ ] User with exactly 30MB → all tracks stay public
- [ ] User re-subscribes during grace period → grace cleared
- [ ] User cancels, re-subscribes same day → grace cleared

---

## 📊 Database Schema Summary

### New Fields in `profiles` Table

```sql
downgraded_at TIMESTAMPTZ           -- When user canceled subscription
grace_period_ends TIMESTAMPTZ        -- downgraded_at + 90 days (NULL = no grace)
storage_at_downgrade BIGINT          -- Storage used at cancellation (bytes)
grace_periods_used INTEGER           -- Counter for abuse prevention
last_grace_period_used TIMESTAMPTZ   -- Last time grace period granted
```

### New Field in `posts` Table

```sql
is_private BOOLEAN DEFAULT FALSE     -- TRUE = private/unlisted, FALSE = public
```

### New Table: `subscription_changes`

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
from_tier TEXT                       -- 'premium', 'unlimited', 'free'
to_tier TEXT
changed_at TIMESTAMPTZ
storage_at_change BIGINT
reason TEXT
created_at TIMESTAMPTZ
```

**Purpose:** Track tier changes for analytics and abuse prevention

---

## 💡 Key Concepts

### Storage Tiers
- **Free:** 30MB (~3 tracks, lifetime limit)
- **Premium:** 2GB (~200 tracks, unlimited uploads)
- **Unlimited:** 10GB (~1000 tracks, unlimited uploads)

### Grace Period Logic
```
User cancels Premium
    ↓
Has storage > 30MB?
    ↓
  YES → Grant 90-day grace period
    ↓
Day 1-90: All content public, upload blocked
    ↓
Day 91: User picks 30MB to keep public
    ↓
Remaining content → private (owner-only access)
```

### Abuse Prevention
- **Max 1 grace period per 12 months**
- **Max 3 tier changes per 12 months**
- **Cycling subscriptions = blocked**

Example abuse scenario (prevented):
```
User subscribes → uploads 2GB → cancels → grace period
   ↓
Re-subscribes after 30 days → uploads 2GB → cancels → NO GRACE (within 12 months)
```

### Privacy System
- `is_private = false` → Public (everyone can see)
- `is_private = true` → Private (owner only)

**Feed/Search queries must filter:**
```sql
WHERE is_private = false
  AND deleted_at IS NULL
```

**User's own profile shows all:**
```sql
WHERE user_id = current_user
  AND deleted_at IS NULL
-- No is_private filter
```

---

## 📞 Contact & Questions

### Mobile Team Lead
**Name:** [Your Name]
**Email:** [Your Email]
**Slack:** @mobile-team
**Available:** [Your Timezone]

### For Questions About:

**Grace Period System:**
- Database schema → See `migrations/add_grace_period_fields.sql`
- Webhook logic → See `MOBILE_TO_WEB_TEAM_CANCELLATION_BEHAVIOR.md`
- Email templates → See `CANCEL_SUBSCRIPTION_BEHAVIOUR.md` (Section: Email Templates)

**Current Bugs:**
- Feed visibility → See `FIX_FEED_API_VISIBILITY.md`
- Moderation issues → See `CRITICAL_MODERATION_FIXES.md`
- Cron jobs → See `URGENT_CRON_JOB_NOT_RUNNING.md`

**New Features:**
- Opportunities system → See `WEB_TEAM_EXPRESS_INTEREST_IMPLEMENTATION.md`
- Service provider prompts → See `SERVICE_PROVIDER_PROMPT_IMPLEMENTATION_SUMMARY.md`

**Architecture:**
- Storage system → See `TIER_CORRECTIONS.md`
- Feed architecture → See `04_FEED_ARCHITECTURE_OVERVIEW.md`

### Response Time Expectations
- **Critical bugs:** 24-48 hours
- **Feature questions:** 2-3 business days
- **Clarifications:** 1 business day

---

## 🎯 Success Metrics

After implementation, we'll track:

1. **Grace Period Re-subscription Rate**
   - Target: 30% of users re-subscribe within 90 days

2. **User Satisfaction**
   - Target: <5% support tickets about grace period confusion

3. **Abuse Prevention**
   - Target: <2% of users attempting to cycle subscriptions

4. **API Performance**
   - Tier normalization fix → No more incorrect tier displays
   - Feed queries → Respect privacy correctly

---

## 📝 Implementation Timeline

### Week 1: Critical Fixes & Foundation
- Day 1-2: Fix tier normalization + review database migration
- Day 3-4: Update webhook handler for grace periods
- Day 5: Fix feed visibility bugs + test

### Week 2: Grace Period System
- Day 1-2: Implement cron job for expiring grace periods
- Day 3: Update API endpoints (privacy filtering)
- Day 4-5: Testing + bug fixes

### Week 3: Polish & New Features
- Day 1: Email templates (grace period notifications)
- Day 2-5: Opportunities feature implementation

### Week 4: Testing & Deployment
- Day 1-2: Integration testing with mobile app
- Day 3: Staging deployment
- Day 4-5: Production deployment + monitoring

---

## ⚠️ Important Notes

### No Refunds, No Trials
- User's "trial" is the Free plan (30MB)
- No 3-day trial, no 7-day refund period
- Once subscribed, no refunds (make sure this is clear to users)

### Mobile Team's Workaround
Due to backend API issues, mobile team currently:
- Uses Supabase direct access for some queries
- Normalizes tier names in mobile app code
- Will switch back to API once backend fixed

### Critical Dependencies
Grace period system depends on:
1. RevenueCat webhook working correctly
2. Cron jobs running daily without failure
3. Email service (SendGrid/AWS SES/etc.) configured
4. Database migration completed successfully

---

## 🚀 Next Steps

1. **Read Priority 1 files** (30 minutes)
2. **Fix tier normalization bug** (15 minutes)
3. **Schedule implementation meeting** with mobile team
4. **Test database migration** in staging
5. **Begin webhook handler updates**

---

## 📚 Additional Resources

### External References
- **RevenueCat Webhooks:** https://www.revenuecat.com/docs/webhooks
- **Grace Period Best Practices:** See `CANCEL_SUBSCRIPTION_BEHAVIOUR.md` - "What Other Platforms Do"
- **Supabase RLS Policies:** May need updates for `is_private` field

### Internal Documentation
- All mobile app source code: `src/` folder
- Storage quota service: `src/services/StorageQuotaService.ts`
- Upload quota service: `src/services/UploadQuotaService.ts`
- UI components: `src/components/GracePeriod*.tsx`

---

## ✅ Completion Checklist

Mark these off as you complete each phase:

### Phase 1: Critical Fixes
- [ ] Fixed `/api/upload/quota` tier normalization
- [ ] Tested with mobile app
- [ ] Deployed to production
- [ ] Verified Upload/Discover screens show correct tiers

### Phase 2: Database Setup
- [ ] Reviewed migration SQL
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Verified all fields/indexes created

### Phase 3: Grace Period Logic
- [ ] Updated webhook handler
- [ ] Implemented eligibility check
- [ ] Tested with sandbox subscriptions
- [ ] Deployed webhook updates

### Phase 4: Automation
- [ ] Created cron job for expiring grace periods
- [ ] Tested with fake expired users
- [ ] Deployed cron job
- [ ] Verified daily execution

### Phase 5: API Updates
- [ ] Updated feed queries (exclude private)
- [ ] Updated profile queries (show private to owner)
- [ ] Updated search (exclude private)
- [ ] Deployed API updates

### Phase 6: Notifications
- [ ] Created grace period confirmation email
- [ ] Created reminder emails (Week 6, Week 11)
- [ ] Created expiration email
- [ ] Tested email delivery

### Phase 7: Integration Testing
- [ ] Mobile + Backend integration tests
- [ ] End-to-end user journey tested
- [ ] Edge cases verified
- [ ] Performance tested

### Phase 8: Production
- [ ] Deployed all changes to production
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Support team trained

---

## 🎓 Understanding the System

### Why Grace Period?

**User Perspective:**
- Feels fair (90 days to decide)
- Not forced to delete content immediately
- Can re-subscribe anytime to restore access
- Private archive keeps content safe

**Business Perspective:**
- Encourages re-subscription (30% conversion target)
- Prevents abuse (1 grace per year limit)
- Reduces support burden (clear communication)
- Industry-standard approach (like Dropbox, Google Drive)

### Why Not Immediate Deletion?

Deleting user content immediately after cancellation:
- ❌ Feels punitive ("content hostage")
- ❌ Increases churn (users angry, won't return)
- ❌ Creates support burden (users demand content back)
- ❌ Reputation damage (negative reviews)

Grace period approach:
- ✅ User-friendly (respectful of their work)
- ✅ Conversion opportunity (90 days to win them back)
- ✅ Clear expectations (they know what happens)
- ✅ Fair to both parties (prevents indefinite free storage)

---

## 📖 Glossary

**Terms used in this package:**

- **Grace Period:** 90-day window after downgrade where content stays public but upload blocked
- **Storage Tier:** Free (30MB), Premium (2GB), Unlimited (10GB)
- **Tier Normalization:** Converting legacy tier names ('pro') to current names ('premium')
- **Private Content:** Posts marked `is_private = true` (owner-only access)
- **Downgrade:** Moving from Premium/Unlimited → Free tier
- **Abuse Prevention:** Rules to prevent cycling subscriptions for free storage
- **Excess Content:** Storage beyond tier limit (e.g., 1.5GB on Free tier)
- **Auto-Selection:** System automatically picks best tracks when user doesn't choose

---

**VERSION HISTORY**

- **v1.0** (2025-12-29): Initial package creation
  - 22 documents organized by priority
  - Complete grace period implementation spec
  - Tier normalization bug fix documentation
  - Current bugs and features documented

---

**END OF README**

Thank you for reviewing this package. Let's build an amazing grace period system together! 🚀

For any questions, please contact the mobile team. We're here to support you throughout implementation.
