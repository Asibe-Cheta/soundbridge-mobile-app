# 📱 Mobile App Payment System Update Plan

**Date:** December 3, 2025  
**Based on:** `MOBILE_TEAM_PAYMENT_SYSTEM_UPDATE.md` (Web Team)  
**Status:** Ready for Implementation

---

## 🎯 **Current Mobile App Payment Architecture**

### **IAP (In-App Purchases) - Subscriptions**
- ✅ **Library:** `expo-iap` (version ^3.1.6)
- ✅ **Service:** `src/services/InAppPurchaseService.ts`
- ✅ **Status:** Fully implemented and working
- ✅ **Backend Endpoint:** `/api/subscriptions/verify-iap`
- ✅ **Subscription Status Endpoint:** `/api/user/subscription-status` (currently used)
- ✅ **Product IDs:**
  - iOS: `com.soundbridge.pro.monthly`, `com.soundbridge.pro.yearly`
  - Android: `soundbridge_pro_monthly`, `soundbridge_pro_yearly`
- ✅ **Enterprise Removed:** Already cleaned up in previous task

### **Stripe - Other Payments**
- ✅ **Library:** `@stripe/stripe-react-native` (version 0.50.3)
- ✅ **Used For:**
  1. **Tips** - `TipModal.tsx`, `TipService.ts`, `LiveTippingService.ts`
  2. **Event Tickets** - `TicketPurchaseModal.tsx` (may need verification)
- ✅ **Provider:** `StripeProvider` configured in `App.tsx`
- ✅ **Environment Variable:** `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 📋 **Update Plan - Tailored to Mobile App**

### **Phase 1: Update Subscription Status Endpoint** ⚠️ **CRITICAL**

**Current Implementation:**
- Uses: `/api/user/subscription-status`
- Service: `SubscriptionService.ts`
- Response structure: `{ subscription: {...}, usage: {...} }`

**New Endpoint (Per Web Team):**
- Endpoint: `/api/subscription/status` (note: no `/user/` in path)
- Response structure: `{ success: true, data: { subscription: {...}, usage: {...}, limits: {...}, features: {...}, moneyBackGuarantee: {...} } }`

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Update `getSubscriptionStatus()` method
   - Change endpoint from `/api/user/subscription-status` to `/api/subscription/status`
   - Update response parsing to handle new structure: `data.data.subscription`
   - Add optional chaining for defensive coding
   - Handle new fields: `money_back_guarantee_eligible`, `money_back_guarantee_end_date`, `refund_count`

2. `src/services/revenueService.ts`
   - Update `getSubscription()` method
   - Change endpoint to `/api/subscription/status`
   - Update response parsing

3. `src/screens/AudioEnhancementScreen.expo.tsx`
   - Update endpoint from `/api/user/subscription-status` to `/api/subscription/status`
   - Update response parsing

**Key Changes:**
```typescript
// ❌ OLD
const response = await fetch('https://www.soundbridge.live/api/user/subscription-status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
const tier = data.subscription?.tier || 'free';

// ✅ NEW
const response = await fetch('https://www.soundbridge.live/api/subscription/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
// Defensive: Use optional chaining - subscription might be null for free users
const tier = data?.data?.subscription?.tier || 'free';
```

---

### **Phase 2: Update Upload Limits Display** ⚠️ **IMPORTANT**

**Current Issue:**
- `UpgradeScreen.tsx` shows "10 total uploads" for Pro (incorrect)
- Should show "10 uploads per month" with reset information

**Files to Update:**
1. `src/screens/UpgradeScreen.tsx`
   - Change Pro features list:
     - ❌ "10 total uploads"
     - ✅ "10 uploads per month (resets monthly)"
   - Update description to clarify monthly reset

2. Any other screens showing upload limits:
   - Search for "unlimited uploads" or "10 uploads" text
   - Update to reflect monthly limit

**Key Changes:**
```typescript
// ❌ OLD
features: [
  '10 total uploads',
  'Unlimited searches & messages',
  // ...
]

// ✅ NEW
features: [
  '10 uploads per month (resets on 1st)',
  'Unlimited searches & messages',
  // ...
]
```

---

### **Phase 3: Update Feature Flags Handling** ⚠️ **IMPORTANT**

**New Response Structure:**
```json
{
  "data": {
    "features": {
      "unlimitedUploads": false,      // ← Pro does NOT have unlimited
      "unlimitedSearches": true,
      "unlimitedMessages": true,
      "advancedAnalytics": true,
      "customBranding": true,
      "prioritySupport": true,
      "revenueSharing": true,
      "whiteLabel": false
    }
  }
}
```

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Add `features` to `SubscriptionStatus` interface
   - Parse `data.data.features` from response
   - Export features for use in UI

2. Any screens checking for "unlimited uploads":
   - Use `features.unlimitedUploads === false` to show monthly limit
   - Don't assume Pro = unlimited

**Key Changes:**
```typescript
// ✅ NEW Interface
export interface SubscriptionStatus {
  // ... existing fields
  features?: {
    unlimitedUploads: boolean;
    unlimitedSearches: boolean;
    unlimitedMessages: boolean;
    advancedAnalytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    revenueSharing: boolean;
    whiteLabel: boolean;
  };
  moneyBackGuarantee?: {
    eligible: boolean;
    withinWindow: boolean;
    daysRemaining: number;
  };
}
```

---

### **Phase 4: Add Subscription Status Polling After IAP Purchase** ⚠️ **IMPORTANT**

**Current Implementation:**
- `InAppPurchaseService.ts` verifies purchase
- But doesn't poll for subscription activation

**Files to Update:**
1. `src/services/InAppPurchaseService.ts`
   - After successful verification, add polling logic
   - Poll `/api/subscription/status` every 2 seconds (max 15 attempts = 30 seconds)
   - Show "Activating Pro..." message while polling
   - When `subscription.tier === 'pro'`, return success
   - If timeout, return error with manual refresh option

2. `src/screens/UpgradeScreen.tsx`
   - Show loading state during polling
   - Display "Activating Pro..." message
   - Handle timeout with manual refresh button

**Key Changes:**
```typescript
// ✅ NEW: Add polling after verification
private async pollSubscriptionStatus(
  userToken: string, 
  maxAttempts = 15
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const response = await fetch('https://soundbridge.live/api/subscription/status', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const data = await response.json();
    
    // Defensive: Use optional chaining
    if (data?.data?.subscription?.tier === 'pro') {
      return true; // Success!
    }
  }
  
  return false; // Timeout
}
```

---

### **Phase 5: Update Usage Statistics Display** ⚠️ **IMPORTANT**

**Current Implementation:**
- `SubscriptionService.ts` has `getUsageStatistics()` method
- Uses endpoint: `/api/user/usage-statistics`

**New Endpoint (Per Web Team):**
- Endpoint: `/api/user/usage-statistics` (same, but verify structure)
- OR: Usage data now included in `/api/subscription/status` response

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Update `getUsageStatistics()` to use new structure
   - Or use usage data from `/api/subscription/status` response
   - Ensure usage shows actual data (not zeros for upgraded users)

2. `src/screens/BillingScreen.tsx`
   - Verify usage statistics display correctly
   - Show actual upload counts, not reset to 0

**Key Changes:**
```typescript
// ✅ Usage should be cumulative (extension of free tier)
// Don't reset to 0 when user upgrades
const usage = {
  music_uploads: 6,        // All tracks ever uploaded
  total_plays: 97,         // All plays across all tracks
  total_followers: 0,      // All followers
  // ... not reset to 0 when upgrading
};
```

---

### **Phase 6: Add Money-Back Guarantee Information** ⚠️ **NEW FEATURE**

**New Fields in Response:**
```json
{
  "data": {
    "moneyBackGuarantee": {
      "eligible": true,
      "withinWindow": true,
      "daysRemaining": 5
    }
  }
}
```

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Add `moneyBackGuarantee` to `SubscriptionStatus` interface
   - Parse from response

2. `src/screens/BillingScreen.tsx`
   - Display money-back guarantee information
   - Show "7-day money-back guarantee" badge if eligible
   - Show countdown if within window
   - Add "Request Refund" button if eligible

3. `src/screens/UpgradeScreen.tsx`
   - Display money-back guarantee information on Pro plan card
   - Show "🛡️ 7-day money-back guarantee" text

**Key Changes:**
```typescript
// ✅ NEW: Display money-back guarantee
{subscription?.moneyBackGuarantee?.eligible && (
  <View style={styles.guaranteeBadge}>
    <Text>🛡️ 7-day money-back guarantee</Text>
    {subscription.moneyBackGuarantee.withinWindow && (
      <Text>Days remaining: {subscription.moneyBackGuarantee.daysRemaining}</Text>
    )}
  </View>
)}
```

---

### **Phase 7: Handle Subscription Status Values** ⚠️ **CRITICAL**

**New Status Values:**
- `'active'` - Subscription is active (has Pro features)
- `'cancelled'` - User cancelled (no Pro features)
- `'expired'` - Subscription expired (no Pro features)
- `'past_due'` - Payment failed, grace period (still has Pro features for 7 days)

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Update `SubscriptionStatus` interface to include all status values
   - Add helper method: `hasProAccess()` that checks both `tier === 'pro'` AND `status === 'active'`
   - Update `formatStatus()` to handle all statuses

2. All screens checking for Pro access:
   - Use `hasProAccess()` instead of just checking `tier === 'pro'`
   - Show appropriate messages for `past_due` status (payment failed, update payment method)

3. `src/screens/BillingScreen.tsx`
   - Display status badge with appropriate color
   - Show "Payment Failed" warning for `past_due` status
   - Show grace period countdown
   - Add "Update Payment Method" button for `past_due` status

**Key Changes:**
```typescript
// ✅ NEW: Check both tier AND status
export function hasProAccess(subscription: SubscriptionStatus | null): boolean {
  if (!subscription) return false;
  return subscription.tier === 'pro' && subscription.status === 'active';
}

// ❌ OLD
if (subscription?.tier === 'pro') {
  // Show Pro features
}

// ✅ NEW
if (hasProAccess(subscription)) {
  // Show Pro features
}
```

---

### **Phase 8: Add Defensive Coding (Optional Chaining)** ⚠️ **CRITICAL**

**Why:** The API may return `subscription: null` for free users, or subscription data may not be loaded yet.

**Files to Update:**
- **ALL** files accessing subscription data
- Use optional chaining: `data?.data?.subscription?.tier`
- Never assume subscription exists

**Key Pattern:**
```typescript
// ❌ OLD (Will crash if subscription is null)
const tier = data.data.subscription.tier;

// ✅ NEW (Safe)
const tier = data?.data?.subscription?.tier || 'free';
```

---

### **Phase 9: Update Limits Display** ⚠️ **IMPORTANT**

**New Response Structure:**
```json
{
  "data": {
    "limits": {
      "uploads": {
        "used": 6,
        "limit": 10,
        "remaining": 4,
        "is_unlimited": false,
        "period": "monthly"
      },
      "searches": {
        "used": 2,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      },
      "messages": {
        "used": 1,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      }
    }
  }
}
```

**Files to Update:**
1. `src/services/SubscriptionService.ts`
   - Add `limits` to `SubscriptionStatus` interface
   - Parse from response

2. `src/screens/BillingScreen.tsx`
   - Display upload limits with "X/10 used this month"
   - Show "Resets on 1st of each month" for Pro users
   - Show "3 lifetime uploads" for Free users

**Key Changes:**
```typescript
// ✅ Display limits correctly
{subscription?.limits?.uploads && (
  <View>
    <Text>
      {subscription.limits.uploads.used} / {subscription.limits.uploads.limit} uploads used
    </Text>
    {subscription.limits.uploads.period === 'monthly' && (
      <Text>Resets on the 1st of each month</Text>
    )}
  </View>
)}
```

---

## 📝 **Summary of Changes**

### **Critical (Must Do):**
1. ✅ Update subscription status endpoint: `/api/user/subscription-status` → `/api/subscription/status`
2. ✅ Add defensive coding (optional chaining) everywhere
3. ✅ Handle subscription status values (`active`, `cancelled`, `expired`, `past_due`)
4. ✅ Check both `tier === 'pro'` AND `status === 'active'` for Pro access

### **Important (Should Do):**
5. ✅ Update upload limits display (10/month, not unlimited)
6. ✅ Update feature flags handling (`unlimitedUploads: false`)
7. ✅ Add subscription status polling after IAP purchase
8. ✅ Update usage statistics to show actual data

### **Nice to Have:**
9. ✅ Add money-back guarantee information display
10. ✅ Update limits display with new structure

---

## 🔍 **Files That Need Updates**

### **Services:**
1. `src/services/SubscriptionService.ts` - **MAJOR UPDATE**
2. `src/services/revenueService.ts` - **MINOR UPDATE**
3. `src/services/InAppPurchaseService.ts` - **ADD POLLING**

### **Screens:**
4. `src/screens/UpgradeScreen.tsx` - **UPDATE FEATURES LIST**
5. `src/screens/BillingScreen.tsx` - **UPDATE STATUS & LIMITS DISPLAY**
6. `src/screens/AudioEnhancementScreen.expo.tsx` - **UPDATE ENDPOINT**

### **Components:**
7. Any components checking subscription status - **ADD DEFENSIVE CODING**

---

## ✅ **Testing Checklist**

- [ ] Subscription status endpoint returns correct structure
- [ ] Upload limits show correctly (10/month for Pro, 3 lifetime for Free)
- [ ] Feature flags work correctly (`unlimitedUploads: false`)
- [ ] Subscription polling works after IAP purchase
- [ ] Usage statistics show actual data (not zeros)
- [ ] Money-back guarantee information displays correctly
- [ ] Subscription status values handled correctly (`active`, `cancelled`, `expired`, `past_due`)
- [ ] Pro access requires both `tier === 'pro'` AND `status === 'active'`
- [ ] Defensive coding prevents crashes when subscription is null
- [ ] Limits display shows correct information

---

## 🎯 **Consistency with Web App**

**Key Points:**
- Both web (Stripe) and mobile (IAP) create subscriptions in same `user_subscriptions` table
- Both use same subscription status endpoint: `/api/subscription/status`
- Both have same tier structure: `'free'` or `'pro'` only
- Both have same upload limits: 3 lifetime (Free), 10/month (Pro)
- Both have same feature flags structure
- Both have same money-back guarantee system

**Mobile-Specific:**
- Mobile uses IAP for subscriptions (not Stripe)
- Mobile uses Stripe for tips and event tickets (same as web)
- Mobile needs polling after IAP purchase (web doesn't need this)
- Mobile needs to handle IAP receipt verification

---

**Ready to proceed with implementation?** 🚀

