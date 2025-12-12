

# SoundBridge Mobile App - Pricing Tier Implementation Guide

**Version:** 1.0
**Date:** December 11, 2025
**For:** iOS & Android Development Teams

---

## Table of Contents

1. [Overview](#overview)
2. [Pricing Structure](#pricing-structure)
3. [App Store Products](#app-store-products)
4. [RevenueCat Integration](#revenuecat-integration)
5. [API Endpoints](#api-endpoints)
6. [Feature Implementation](#feature-implementation)
7. [UI/UX Changes](#uiux-changes)
8. [Testing Checklist](#testing-checklist)
9. [Environment Variables](#environment-variables)

---

## Overview

SoundBridge is implementing a new three-tier subscription model to replace the old two-tier system. This is a **clean launch** with no legacy pricing to support.

**Key Changes:**
- **OLD:** Free + Premium (£9.99/month)
- **NEW:** Free + Premium (£6.99/month) + Unlimited (£12.99/month)

**No Existing Subscribers:** All previous subscriptions were sandbox/test only. No migration logic needed.

---

## Pricing Structure

### Tier 1: FREE (£0)

**Upload Limits:**
- 3 tracks lifetime (total, never resets)

**Features:**
- Basic profile creation
- Receive tips (95% revenue)
- Sell event tickets (95% revenue)
- Create posts (30-second audio clips max)
- Basic analytics only
- Profile URL: `soundbridge.live/user/[user_id]`

### Tier 2: PREMIUM (£6.99/month or £69.99/year)

**Upload Limits:**
- 7 tracks per billing period (resets monthly)

**Features (all Free features PLUS):**
- "Pro" badge on profile
- Custom profile URL: `soundbridge.live/[username]`
- Featured on Discover 1x/month
- Advanced analytics (demographics, geo, behavior)
- 60-second audio clips in posts
- AI collaboration matching (weekly)
- Priority support
- Priority in feed algorithm

**Annual Pricing:** £69.99/year (16% discount from £83.88)

### Tier 3: UNLIMITED (£12.99/month or £129.99/year)

**Upload Limits:**
- UNLIMITED tracks (no limit)

**Features (all Premium features PLUS):**
- "Unlimited" badge (distinct from "Pro")
- Featured on Discover 2x/month
- Top priority in feed algorithm
- Social media post generator (AI)
- Custom promo codes for events
- Email list export
- Highest priority support

**Annual Pricing:** £129.99/year (17% discount from £155.88)

---

## App Store Products

Justice will create these products in App Store Connect and Google Play Console. Reference these SKU IDs in your app:

### iOS (App Store Connect)

Create **4 subscription products:**

| Product ID | Name | Type | Price |
|------------|------|------|-------|
| `soundbridge_premium_monthly` | SoundBridge Premium Monthly | Auto-renewable subscription | £6.99/month |
| `soundbridge_premium_annual` | SoundBridge Premium Annual | Auto-renewable subscription | £69.99/year |
| `soundbridge_unlimited_monthly` | SoundBridge Unlimited Monthly | Auto-renewable subscription | £12.99/month |
| `soundbridge_unlimited_annual` | SoundBridge Unlimited Annual | Auto-renewable subscription | £129.99/year |

**Subscription Group:** `soundbridge_subscriptions`

**Free Trial:** No free trial initially (can be added later)

**Localization:**
- Display names: "Premium", "Unlimited"
- Descriptions should highlight key benefits (custom URL, analytics, unlimited uploads)

### Android (Google Play Console)

Create **4 subscription products** with matching IDs:

| Product ID | Name | Base Plan | Price |
|------------|------|-----------|-------|
| `soundbridge_premium_monthly` | SoundBridge Premium | Monthly | £6.99/month |
| `soundbridge_premium_annual` | SoundBridge Premium | Annual | £69.99/year |
| `soundbridge_unlimited_monthly` | SoundBridge Unlimited | Monthly | £12.99/month |
| `soundbridge_unlimited_annual` | SoundBridge Unlimited | Annual | £129.99/year |

**Subscription Type:** Auto-renewing

---

## RevenueCat Integration

### Configuration

Justice will configure RevenueCat with the following:

**Offerings:**
```
soundbridge_premium
├── monthly: soundbridge_premium_monthly
└── annual: soundbridge_premium_annual

soundbridge_unlimited
├── monthly: soundbridge_unlimited_monthly
└── annual: soundbridge_unlimited_annual
```

**Entitlements:**
- `premium_features` (granted by Premium and Unlimited)
- `unlimited_features` (granted by Unlimited only)

### Code Implementation

**Initialize RevenueCat (on app launch):**

```javascript
// React Native example
import Purchases from 'react-native-purchases';

// iOS: App Store API key
// Android: Google Play API key
const apiKey = Platform.select({
  ios: 'appl_YOUR_IOS_KEY',
  android: 'goog_YOUR_ANDROID_KEY',
});

await Purchases.configure({ apiKey, appUserID: user.id });
```

**Fetch Offerings:**

```javascript
const offerings = await Purchases.getOfferings();

const premiumOffering = offerings.all['soundbridge_premium'];
const unlimitedOffering = offerings.all['soundbridge_unlimited'];

// Display packages
premiumOffering.availablePackages.forEach(pkg => {
  console.log(pkg.product.identifier); // soundbridge_premium_monthly
  console.log(pkg.product.price); // £6.99
  console.log(pkg.product.priceString); // "£6.99"
});
```

**Purchase Flow:**

```javascript
const pkg = premiumOffering.monthly; // or annual

try {
  const { customerInfo } = await Purchases.purchasePackage(pkg);

  // Check entitlements
  if (customerInfo.entitlements.active['premium_features']) {
    // User now has Premium or Unlimited
    updateLocalState('premium'); // or 'unlimited'
  }
} catch (error) {
  if (error.userCancelled) {
    // User cancelled purchase
  } else {
    // Handle error
  }
}
```

**Check Subscription Status (on app launch):**

```javascript
const customerInfo = await Purchases.getCustomerInfo();

const isPremium = customerInfo.entitlements.active['premium_features'] !== undefined;
const isUnlimited = customerInfo.entitlements.active['unlimited_features'] !== undefined;

let tier = 'free';
if (isUnlimited) {
  tier = 'unlimited';
} else if (isPremium) {
  tier = 'premium';
}

// Update local state
dispatch(setSubscriptionTier(tier));
```

**Restore Purchases:**

```javascript
const { customerInfo } = await Purchases.restorePurchases();

// Check entitlements after restore
if (customerInfo.entitlements.active['unlimited_features']) {
  updateLocalState('unlimited');
} else if (customerInfo.entitlements.active['premium_features']) {
  updateLocalState('premium');
} else {
  updateLocalState('free');
}
```

---

## API Endpoints

The backend has implemented the following API endpoints that the mobile app should use:

### 1. **Check Upload Limit**

**Endpoint:** `GET /api/upload/check-limit`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "can_upload": true,
  "uploads_used": 2,
  "uploads_limit": 3,
  "limit_type": "lifetime",
  "reset_date": null,
  "subscription_tier": "free",
  "message": "You've uploaded 2 of 3 free tracks"
}
```

**Usage:**
- Call before showing upload screen
- If `can_upload` is `false`, show upgrade prompt

### 2. **Advanced Analytics**

**Endpoint:** `GET /api/analytics/advanced?period=30d`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Query Params:**
- `period`: "7d" | "30d" | "90d" | "1y" | "all"

**Response:**
```json
{
  "overview": {
    "totalPlays": 1250,
    "uniqueListeners": 450,
    "totalListeningTime": 12500,
    "avgCompletionRate": 72.5,
    "totalCountries": 15
  },
  "geographic": {
    "topCountries": [
      {"country_name": "United Kingdom", "play_count": 450}
    ]
  },
  "engagement": {
    "totalLikes": 150,
    "totalShares": 45,
    "engagementRate": 12.5
  }
}
```

**Error (403 Forbidden) if Free tier:**
```json
{
  "error": "Advanced analytics is only available for Premium and Unlimited users",
  "upgrade_required": true,
  "current_tier": "free"
}
```

### 3. **Custom Username**

**Check Eligibility:**
`GET /api/profile/custom-username`

**Response:**
```json
{
  "can_change": true,
  "reason": "You can set your custom username",
  "current_username": null,
  "subscription_tier": "premium"
}
```

**Set Username:**
`POST /api/profile/custom-username`

**Body:**
```json
{
  "username": "john-doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Username updated successfully",
  "username": "john-doe",
  "profile_url": "https://soundbridge.live/john-doe"
}
```

**Check Availability:**
`PUT /api/profile/custom-username/check-availability`

**Body:**
```json
{
  "username": "john-doe"
}
```

**Response:**
```json
{
  "available": false,
  "reason": "Username is already taken"
}
```

### 4. **Stream Event Tracking**

**Endpoint:** `POST /api/analytics/stream-event`

**Body:**
```json
{
  "trackId": "uuid",
  "durationListened": 120,
  "totalDuration": 180,
  "platform": "ios",
  "deviceType": "mobile"
}
```

**Usage:**
- Call when user finishes listening to a track (or pauses for >3 seconds)
- Tracks listening behavior for analytics

---

## Feature Implementation

### Upload Limit Enforcement

**Before Upload:**

```javascript
const checkLimit = async () => {
  const response = await fetch('/api/upload/check-limit', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });

  const data = await response.json();

  if (!data.can_upload) {
    // Show upgrade modal
    showUpgradeModal({
      title: 'Upload Limit Reached',
      message: data.message,
      tier: data.subscription_tier
    });
    return false;
  }

  return true;
};

// In upload flow
if (await checkLimit()) {
  // Proceed with upload
} else {
  // Block upload
}
```

**After Upload:**

```javascript
// Increment counter locally (optimistic update)
dispatch(incrementUploadCount());

// Server will increment via upload API
```

### Custom Username (Premium/Unlimited Only)

**Settings Screen:**

```javascript
const CustomUsernameField = () => {
  const { tier } = useSubscription();

  if (tier === 'free') {
    return (
      <LockedFeature
        title="Custom Profile URL"
        message="Upgrade to Premium to get a custom profile URL"
        onUpgrade={() => navigation.navigate('Pricing')}
      />
    );
  }

  return (
    <UsernameInput
      onCheck={async (username) => {
        const res = await checkUsernameAvailability(username);
        return res.available;
      }}
      onSave={async (username) => {
        await saveUsername(username);
      }}
    />
  );
};
```

### Audio Clip Length (Posts)

**Post Creation:**

```javascript
const MAX_AUDIO_LENGTH = {
  free: 30, // 30 seconds
  premium: 60, // 60 seconds
  unlimited: 60 // 60 seconds
};

const validateAudioClip = (audioDuration, userTier) => {
  const maxLength = MAX_AUDIO_LENGTH[userTier];

  if (audioDuration > maxLength) {
    Alert.alert(
      'Audio Too Long',
      `Audio clips are limited to ${maxLength} seconds for ${userTier} users. Upgrade to ${userTier === 'free' ? 'Premium' : 'Unlimited'} for longer clips.`,
      [
        { text: 'Trim', onPress: () => trimAudio(maxLength) },
        { text: 'Upgrade', onPress: () => navigation.navigate('Pricing') }
      ]
    );
    return false;
  }

  return true;
};
```

### Advanced Analytics (Premium/Unlimited Only)

**Analytics Screen:**

```javascript
const AnalyticsScreen = () => {
  const { tier } = useSubscription();

  if (tier === 'free') {
    return (
      <UpgradePrompt
        icon="bar-chart"
        title="Advanced Analytics"
        description="Unlock detailed demographics, geographic data, listening behavior, and engagement metrics."
        features={[
          'Listener demographics (age, gender)',
          'Geographic breakdown (countries, cities)',
          'Peak listening times',
          'Engagement metrics',
          'Trend graphs',
          'Export data (CSV/PDF)'
        ]}
        onUpgrade={() => navigation.navigate('Pricing')}
      />
    );
  }

  // Show advanced analytics
  return <AdvancedAnalyticsDashboard />;
};
```

### Tier Badges

**Profile Header:**

```javascript
const TierBadge = ({ tier }) => {
  if (tier === 'free') return null;

  const badgeConfig = {
    premium: {
      text: 'Pro',
      colors: ['#8b5cf6', '#ec4899'],
      icon: 'star'
    },
    unlimited: {
      text: 'Unlimited',
      colors: ['#f59e0b', '#ec4899'],
      icon: 'zap'
    }
  };

  const config = badgeConfig[tier];

  return (
    <LinearGradient colors={config.colors} style={styles.badge}>
      <Icon name={config.icon} size={12} color="white" />
      <Text style={styles.badgeText}>{config.text}</Text>
    </LinearGradient>
  );
};

// Use in ProfileHeader, PostCard, SearchResult, etc.
<View style={styles.nameContainer}>
  <Text style={styles.name}>{user.name}</Text>
  <TierBadge tier={user.subscription_tier} />
</View>
```

---

## UI/UX Changes

### 1. Pricing Page

**Layout:** Three-column cards (stack on mobile)

```javascript
const PricingScreen = () => {
  const [period, setPeriod] = useState('monthly'); // or 'annual'

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: { monthly: '£0', annual: '£0' },
      features: [
        '3 track uploads (lifetime)',
        'Basic profile & networking',
        'Receive tips (keep 95%)',
        'Create & sell event tickets',
        'Browse & discover music',
        'Basic analytics'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      id: 'premium',
      name: 'Premium',
      badge: 'Pro',
      price: { monthly: '£6.99', annual: '£69.99' },
      annualSavings: '16%',
      features: [
        'Everything in Free',
        '7 tracks per month',
        'Featured on Discover 1x/month',
        'Advanced analytics',
        'Priority in feed',
        'Pro badge',
        'Custom profile URL',
        '60-second audio previews',
        'AI collaboration matching',
        'Priority support'
      ],
      cta: 'Upgrade to Premium',
      highlighted: true
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      badge: 'Unlimited',
      price: { monthly: '£12.99', annual: '£129.99' },
      annualSavings: '17%',
      features: [
        'Everything in Premium',
        'UNLIMITED track uploads',
        'Featured 2x per month',
        'Top priority in feed',
        'Advanced promotional tools',
        'Social media post generator',
        'Custom promo codes',
        'Email list export',
        'API access (Coming Soon)',
        'White-label profile (Coming Soon)'
      ],
      cta: 'Upgrade to Unlimited',
      highlighted: false
    }
  ];

  return (
    <ScrollView>
      <PeriodToggle value={period} onChange={setPeriod} />
      {tiers.map(tier => (
        <TierCard key={tier.id} {...tier} period={period} />
      ))}
    </ScrollView>
  );
};
```

### 2. Upload Counter

**Upload Screen:**

```javascript
const UploadCounter = ({ tier, uploadsUsed, uploadsLimit, resetDate }) => {
  if (tier === 'unlimited') {
    return (
      <Text style={styles.unlimited}>Unlimited uploads</Text>
    );
  }

  const percentage = (uploadsUsed / uploadsLimit) * 100;
  const remaining = uploadsLimit - uploadsUsed;

  return (
    <View style={styles.counter}>
      <Text style={styles.counterText}>
        {tier === 'free'
          ? `${uploadsUsed} of ${uploadsLimit} uploads used`
          : `${uploadsUsed} of ${uploadsLimit} uploads this month`
        }
      </Text>
      <ProgressBar progress={percentage} />
      {tier === 'premium' && resetDate && (
        <Text style={styles.resetDate}>
          Resets on {formatDate(resetDate)}
        </Text>
      )}
      {remaining === 0 && (
        <Button
          title={`Upgrade to ${tier === 'free' ? 'Premium' : 'Unlimited'}`}
          onPress={() => navigation.navigate('Pricing')}
        />
      )}
    </View>
  );
};
```

### 3. Subscription Management

**Settings Screen:**

```javascript
const SubscriptionSection = () => {
  const { tier, period, renewalDate, status } = useSubscription();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Subscription</Text>

      <Card>
        <View style={styles.tierInfo}>
          <Text style={styles.tierName}>
            {tier === 'free' ? 'Free Plan' : tier === 'premium' ? 'Premium' : 'Unlimited'}
          </Text>
          {tier !== 'free' && <TierBadge tier={tier} />}
        </View>

        {tier !== 'free' && (
          <>
            <Text style={styles.billing}>
              £{period === 'monthly' ? (tier === 'premium' ? '6.99' : '12.99') : (tier === 'premium' ? '69.99' : '129.99')}/
              {period === 'monthly' ? 'month' : 'year'}
            </Text>
            <Text style={styles.renewal}>
              {status === 'active' ? `Renews on ${formatDate(renewalDate)}` : 'Subscription cancelled'}
            </Text>

            <Button title="Change Plan" onPress={() => navigation.navigate('Pricing')} />
            <Button title="Cancel Subscription" variant="secondary" onPress={handleCancel} />
            <Button title="Update Payment Method" variant="tertiary" onPress={handleUpdatePayment} />
          </>
        )}

        {tier === 'free' && (
          <Button title="Upgrade to Premium" onPress={() => navigation.navigate('Pricing')} />
        )}
      </Card>

      <Button title="Restore Purchases" variant="link" onPress={handleRestore} />
    </View>
  );
};
```

---

## Testing Checklist

### Subscription Flow

- [ ] Free user can browse pricing page
- [ ] Free user can subscribe to Premium (monthly)
- [ ] Free user can subscribe to Premium (annual)
- [ ] Free user can subscribe to Unlimited (monthly)
- [ ] Free user can subscribe to Unlimited (annual)
- [ ] Premium user can upgrade to Unlimited
- [ ] Unlimited user can downgrade to Premium (takes effect at end of period)
- [ ] User can cancel subscription
- [ ] Cancelled subscription continues until renewal date, then reverts to Free
- [ ] Restore purchases works correctly

### Upload Limits

- [ ] Free user can upload 3 tracks, blocked at 4th
- [ ] Premium user can upload 7 tracks/month, blocked at 8th
- [ ] Premium upload counter resets on renewal date
- [ ] Unlimited user can upload unlimited tracks (no blocks)
- [ ] Upload counter displays correctly

### Feature Access

- [ ] Free user sees basic analytics only
- [ ] Premium user sees advanced analytics
- [ ] Unlimited user sees advanced analytics
- [ ] Free user cannot set custom username (field hidden)
- [ ] Premium user can set custom username
- [ ] Unlimited user can set custom username
- [ ] Custom username validation works (availability check, character limits)
- [ ] Free user's audio posts limited to 30 seconds
- [ ] Premium user's audio posts limited to 60 seconds

### Badges

- [ ] Free user has no badge
- [ ] Premium user has "Pro" badge on profile, posts, search results
- [ ] Unlimited user has "Unlimited" badge (visually distinct from Pro)

### Edge Cases

- [ ] User subscribes on 31st of month (renewal date handled correctly for 30-day months)
- [ ] User deletes account while subscribed
- [ ] User restores purchase on new device (tier syncs correctly)
- [ ] Offline mode caches tier correctly (syncs when back online)
- [ ] Payment fails (grace period, notifications)

---

## Environment Variables

Justice will provide the following environment variables after setting up Stripe and RevenueCat:

### Required Environment Variables

```bash
# RevenueCat API Keys
REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxx
REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxx

# Stripe Product IDs (for webhook validation)
STRIPE_PREMIUM_MONTHLY_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_PREMIUM_ANNUAL_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_UNLIMITED_MONTHLY_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_UNLIMITED_ANNUAL_PRODUCT_ID=prod_xxxxxxxxxxxxx

# Webhook Secret (for server-side validation)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
REVENUECAT_WEBHOOK_SECRET=xxxxxxxxxxxxx

# Cron Secret (for background jobs)
CRON_SECRET=xxxxxxxxxxxxx
```

### Stripe Product IDs to Create

Justice needs to create **4 subscription products** in Stripe Dashboard:

1. **Premium Monthly**
   - Name: "SoundBridge Premium Monthly"
   - Price: £6.99/month
   - Billing: Recurring monthly

2. **Premium Annual**
   - Name: "SoundBridge Premium Annual"
   - Price: £69.99/year
   - Billing: Recurring yearly

3. **Unlimited Monthly**
   - Name: "SoundBridge Unlimited Monthly"
   - Price: £12.99/month
   - Billing: Recurring monthly

4. **Unlimited Annual**
   - Name: "SoundBridge Unlimited Annual"
   - Price: £129.99/year
   - Billing: Recurring yearly

After creating these products, copy the **Product IDs** (starting with `prod_`) and provide them as environment variables.

---

## Summary

**What Mobile Team Needs to Do:**

1. Update RevenueCat integration to reference new product IDs
2. Implement 3-tier pricing page (Free, Premium, Unlimited)
3. Add tier badges to profiles, posts, search results
4. Enforce upload limits (Free: 3 lifetime, Premium: 7/month, Unlimited: unlimited)
5. Gate features by tier (analytics, custom URL, audio length)
6. Implement upgrade prompts throughout app
7. Test all subscription flows (purchase, cancel, restore, upgrade, downgrade)

**What Justice Will Handle:**

- App Store Connect configuration (iOS products)
- Google Play Console configuration (Android products)
- RevenueCat setup (offerings, entitlements)
- Stripe products creation
- Environment variables

**Questions?**

If any part of this guide is unclear, reach out to the backend team for clarification.

**Let's build this! 🚀**

