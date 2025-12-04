# 📋 Mobile Team Response: Enterprise Tier Removal

**Date:** December 2, 2025  
**From:** Mobile Team  
**To:** Web App Team  
**Re:** Database Migration Clarification Request (WEB_APP_QUESTIONS.md)

---

## 🎯 Executive Summary

Thank you for the comprehensive questions about Enterprise tier removal. The mobile app currently has **some Enterprise tier references** that need to be cleaned up, but we've already implemented logic to **treat Enterprise as Pro** in critical paths. We're ready to coordinate the full removal.

---

## 📊 Current Mobile App Status

### ✅ Already Implemented (Enterprise → Pro Fallback)

The mobile app has **defensive code** that treats Enterprise tier as Pro in several places:

1. **AudioEnhancementService.ts** (Line 133-135):
   ```typescript
   // Enterprise tier not available Year 1 - treat as Pro
   if (tier === 'enterprise') {
     tier = 'pro';
   }
   ```

2. **TIER_CORRECTIONS.md** - Documented that Enterprise is not available Year 1

### ⚠️ Enterprise References Still Present (Need Cleanup)

The following files still contain Enterprise tier references that should be removed:

#### 1. **AudioEnhancementService.ts**
- Line 108: `enterprise: { ... }` in tier features object
- Line 150: `enterprise: 3` in tier levels
- Line 158: Type definition includes `'enterprise'`
- Line 199: Type definition includes `'enterprise'`
- Line 532: `enterprise: Infinity` in limits
- Line 592: Function parameter includes `'enterprise'`
- Line 658: `if (tier === 'enterprise')` check
- Line 1062: `enterprise: Infinity` in limits
- Line 1182: Function parameter includes `'enterprise'`
- Line 1314: `if (tier === 'enterprise')` check

#### 2. **AudioEnhancementScreen.tsx**
- Line 239: UI text "Upgrade to Enterprise"
- Line 248: Conditional "31-band" for Enterprise
- Line 251: Conditional EQ frequencies for Enterprise
- Line 354: "Dolby Atmos" for Enterprise
- Line 706: "Dolby Atmos" for Enterprise
- Line 1341: "Dolby Atmos" for Enterprise

#### 3. **AudioEnhancementScreen.expo.tsx**
- Line 32: Comment about Enterprise not available Year 1
- Line 33: State type includes `'enterprise'`
- Line 45: Variable type includes `'enterprise'`
- Line 235: "Dolby Atmos" for Enterprise

#### 4. **SubscriptionService.ts**
- Line 277: `case 'enterprise': return 'Enterprise Plan';`
- Line 364: `case 'enterprise':` in switch statement

#### 5. **revenueService.ts**
- Line 188: Function parameter includes `'enterprise'`
- Line 192: Pricing includes `enterprise: { monthly: 49.99, yearly: 499.99 }`
- Line 511: Limits include `enterprise: { uploads: -1, storage: 10240, bandwidth: 51200 }`
- Line 893: Limits include `enterprise: { uploads: -1, storage: 10240, bandwidth: 51200 }`
- Line 1275: Limits include `enterprise: { uploads: -1, storage: 10240, bandwidth: 51200 }`

---

## 🔍 Mobile App Database Interaction

### What We Know:

1. **Subscription Data Location:**
   - Mobile app reads subscription tier from `/api/user/subscription-status`
   - This endpoint reads from `user_subscriptions` table (not `profiles` table)
   - ✅ Already confirmed in our codebase

2. **Tier Values We Expect:**
   - Currently expecting: `'free'`, `'pro'`, or `'enterprise'`
   - After cleanup: `'free'` or `'pro'` only

3. **API Endpoints We Use:**
   - `/api/user/subscription-status` - Get current tier
   - `/api/onboarding/complete` - Complete onboarding (sets tier)
   - `/api/subscriptions/upgrade` - Upgrade to Pro
   - `/api/subscriptions/verify-iap` - Verify in-app purchase

### What We Need from Web Team:

1. **Confirmation of Tier Values:**
   - Will the API ever return `'enterprise'` after migration?
   - Should we handle `'enterprise'` as an error case, or gracefully downgrade to `'pro'`?

2. **Migration Timeline:**
   - When will the database migration be executed?
   - Should we deploy mobile app cleanup before or after database migration?

3. **Existing Enterprise Users:**
   - If there are existing Enterprise users, will they be:
     - Automatically downgraded to Pro?
     - Manually migrated?
     - Kept as Enterprise temporarily?

---

## 🛠️ Mobile App Cleanup Plan

### Phase 1: Remove Enterprise from Type Definitions
- Update all TypeScript types to remove `'enterprise'` option
- Change `'free' | 'pro' | 'enterprise'` → `'free' | 'pro'`

### Phase 2: Remove Enterprise from UI
- Remove "Upgrade to Enterprise" buttons/text
- Remove Enterprise-specific feature displays (31-band EQ, Dolby Atmos)
- Update tier selection screens to only show Free/Pro

### Phase 3: Remove Enterprise from Service Logic
- Remove Enterprise pricing from `revenueService.ts`
- Remove Enterprise limits from all service files
- Remove Enterprise case statements from switch blocks

### Phase 4: Update Onboarding Flow
- Ensure tier selection only shows Free/Pro
- Remove any Enterprise references from onboarding screens

### Phase 5: Add Defensive Handling
- Add error handling if API returns `'enterprise'` (shouldn't happen, but defensive)
- Log warnings if Enterprise tier is detected
- Gracefully fallback to Pro tier

---

## ❓ Questions for Web App Team

### 1. **Migration Coordination**
- [ ] What is the planned migration date?
- [ ] Should mobile app cleanup happen before or after database migration?
- [ ] Will there be a grace period where both old and new code work?

### 2. **API Behavior**
- [ ] After migration, will `/api/user/subscription-status` ever return `'enterprise'`?
- [ ] If an Enterprise user exists, what tier value will they receive?
- [ ] Should we handle `'enterprise'` as an error or gracefully downgrade?

### 3. **Existing Enterprise Users**
- [ ] Are there any existing Enterprise users in production?
- [ ] What will happen to them during migration?
- [ ] Will they be automatically converted to Pro, or manually handled?

### 4. **Testing**
- [ ] Can we test the migration in a staging environment?
- [ ] Will there be test users with Enterprise tier we can use for testing?

### 5. **Rollback Plan**
- [ ] Is there a rollback plan if migration fails?
- [ ] Should mobile app support both old and new tier values temporarily?

---

## ✅ Mobile Team Commitments

1. **Cleanup All Enterprise References:**
   - Remove Enterprise from all TypeScript types
   - Remove Enterprise from all UI components
   - Remove Enterprise from all service logic
   - Update onboarding to only show Free/Pro

2. **Add Defensive Handling:**
   - Handle unexpected `'enterprise'` values gracefully
   - Log warnings for monitoring
   - Fallback to Pro tier if Enterprise detected

3. **Coordinate Deployment:**
   - Deploy mobile app cleanup in sync with database migration
   - Test thoroughly before production deployment
   - Monitor for any issues after deployment

4. **Documentation:**
   - Update all relevant documentation
   - Update API integration docs
   - Update onboarding flow docs

---

## 📅 Proposed Timeline

### Option A: Mobile First (Recommended)
1. **Week 1:** Mobile app cleanup (remove Enterprise references)
2. **Week 2:** Testing and QA
3. **Week 3:** Database migration (web team)
4. **Week 4:** Monitor and fix any issues

### Option B: Database First
1. **Week 1:** Database migration (web team)
2. **Week 2:** Mobile app cleanup
3. **Week 3:** Testing and QA
4. **Week 4:** Monitor and fix any issues

**Recommendation:** Option A (Mobile First) allows us to test the mobile app with the new tier structure before the database migration, reducing risk.

---

## 🔗 Related Documents

- `TIER_CORRECTIONS.md` - Original tier corrections document
- `MOBILE_TEAM_SUBSCRIPTION_TIERS_RESPONSE.md` - Web team's tier details (contains Enterprise info)
- `ONBOARDING_NEW_FLOW.md` - Onboarding flow (only shows Free/Pro)

---

## 📞 Next Steps

1. **Web Team:** Please answer the questions above
2. **Web Team:** Confirm migration timeline
3. **Mobile Team:** Begin cleanup once timeline is confirmed
4. **Both Teams:** Coordinate testing in staging environment
5. **Both Teams:** Deploy in sync

---

**Thank you for the detailed questions! We're ready to coordinate the Enterprise tier removal.** 🙏

