# 🎯 SoundBridge RevenueCat Setup Guide

**Last Updated:** December 4, 2025
**Mobile Team**

---

## ✅ What's Been Completed

The mobile app team has successfully implemented the RevenueCat integration. Here's what's done:

### Code Implementation ✅
- ✅ Installed `react-native-purchases` SDK
- ✅ Created `RevenueCatService.ts` with full subscription management
- ✅ Updated `AuthContext.tsx` to initialize/logout RevenueCat
- ✅ Completely rewrote `UpgradeScreen.tsx` to use RevenueCat
- ✅ Added RevenueCat API key configuration to environment.ts

### Features Implemented ✅
- ✅ Automatic RevenueCat initialization on user login
- ✅ Subscription package purchasing
- ✅ Restore purchases functionality
- ✅ Pro entitlement checking
- ✅ Cross-device subscription sync
- ✅ Automatic logout on user sign out

---

## 📋 What You Need to Do (RevenueCat Dashboard)

Follow these steps **IN ORDER** to complete the RevenueCat setup:

---

## Step 1: Configure Products in RevenueCat Dashboard

### 1.1 Log into RevenueCat
- Go to: https://app.revenuecat.com
- Select your **"Soundbridge"** project

### 1.2 Add iOS Products
1. Click **"Products"** in the left sidebar (under "Product Setup")
2. Click **"+ New"** or **"Add Product"**

**Product 1: Premium Monthly**
- **Product ID:** `com.soundbridge.premium.monthly`
- **Store:** App Store
- **Type:** Auto-renewable subscription
- **Subscription Duration:** 1 month
- Click **"Create"**

**Product 2: Premium Yearly**
- **Product ID:** `com.soundbridge.premium.yearly`
- **Store:** App Store
- **Type:** Auto-renewable subscription
- **Subscription Duration:** 1 year
- Click **"Create"**

> **Note:** These product IDs must match exactly what you created in App Store Connect!

---

## Step 2: Create Entitlements

### 2.1 What are Entitlements?
Entitlements represent the access users get (e.g., "pro" features). They're separate from products.

### 2.2 Create "pro" Entitlement
1. Go to **"Entitlements"** (left sidebar under "Product Setup")
2. Click **"+ New"** or **"Add Entitlement"**
3. **Identifier:** `pro` (lowercase, exactly like this!)
4. **Description:** "SoundBridge Pro subscription access"
5. Click **"Create"**

> **CRITICAL:** The identifier MUST be `pro` because the mobile app checks for `customerInfo.entitlements.active['pro']`

---

## Step 3: Create Offerings & Packages

### 3.1 Create Default Offering
1. Go to **"Offerings"** (left sidebar)
2. Click **"+ New"** or **"Create Offering"**
3. **Offering ID:** `default`
4. **Description:** "SoundBridge Pro Subscription Plans"
5. Click **"Create"**
6. Toggle **"Set as current"** to ON

### 3.2 Add Packages to the Offering

Click **"Add Package"** on your `default` offering:

**Package 1: Monthly**
- **Package Identifier:** `monthly` (exactly this!)
- **Attached Entitlements:** Select `pro`
- **iOS Product:** Select `com.soundbridge.premium.monthly`
- **Android Product:** (leave empty for now)
- Click **"Save"**

**Package 2: Annual**
- **Package Identifier:** `annual` (exactly this!)
- **Attached Entitlements:** Select `pro`
- **iOS Product:** Select `com.soundbridge.premium.yearly`
- **Android Product:** (leave empty for now)
- Click **"Save"**

> **CRITICAL:** Package identifiers MUST be `monthly` and `annual` because the mobile app uses these in `UpgradeScreen.tsx` (lines 92-93).

---

## Step 4: Get Your API Keys

### 4.1 Find Your Public API Key
1. Go to **"API Keys"** (left sidebar → under "Project settings")
2. Find the **"Apple App Store"** section
3. Copy the **"Public app-specific API key"**
   - It looks like: `appl_AbCdEfGhIjKlMnOpQrStUvWxYz`

### 4.2 Save the API Key
You'll need to give me this key to add to the app configuration.

**Save it somewhere safe for now!**

---

## Step 5: Update Mobile App with API Key

### 5.1 Option A: Give Me the Key (Recommended)
Once you have the API key from Step 4, **send it to me** and I'll update the environment configuration file for you.

### 5.2 Option B: Update It Yourself
Edit `src/config/environment.ts` and replace `YOUR_REVENUECAT_API_KEY_HERE` with your actual key:

```typescript
development: {
  // ... other config
  revenueCatApiKey: 'appl_YourActualKeyHere',
},
staging: {
  // ... other config
  revenueCatApiKey: 'appl_YourActualKeyHere',
},
production: {
  // ... other config
  revenueCatApiKey: 'appl_YourActualKeyHere',
},
```

---

## Step 6: Configure App Store Connect Products (If Not Done)

Make sure your products exist in **App Store Connect**:

### 6.1 Go to App Store Connect
- https://appstoreconnect.apple.com
- My Apps → SoundBridge → In-App Purchases

### 6.2 Verify Products Exist
Ensure these products are created:
- `com.soundbridge.premium.monthly`
  - Type: Auto-Renewable Subscription
  - Price: $9.99/month
  - Subscription Group: (create one if needed)

- `com.soundbridge.premium.yearly`
  - Type: Auto-Renewable Subscription
  - Price: $99/year
  - Same Subscription Group as monthly

### 6.3 Submit for Review (If Needed)
If products show "Waiting for Review," submit them for approval.

---

## Step 7: Test Setup with Sandbox Testing

### 7.1 Create Sandbox Tester
1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Create a test account (use a fake email)

### 7.2 Build for TestFlight
```bash
eas build --profile production --platform ios
```

### 7.3 Test the Flow
1. Install the TestFlight build
2. Sign in to the app
3. Go to Profile → Upgrade
4. Try purchasing Pro Monthly
5. When prompted, sign in with your **Sandbox Tester** account
6. Complete the test purchase (it's free in sandbox!)
7. Verify you get Pro access

---

## 🔧 Troubleshooting

### "No products available"
- ✅ Check that products exist in App Store Connect
- ✅ Verify product IDs match exactly in RevenueCat
- ✅ Ensure offering is set as "current" in RevenueCat
- ✅ Wait 24 hours after creating products in App Store Connect

### "Subscription service not ready"
- ✅ Check that RevenueCat API key is correct in environment.ts
- ✅ Verify you're testing on a real device or TestFlight build (not Expo Go)
- ✅ Check console logs for initialization errors

### "Purchase failed"
- ✅ Ensure you're signed in with a Sandbox Tester account
- ✅ Verify products are approved in App Store Connect
- ✅ Check that entitlement "pro" exists and is attached to packages

### "Entitlement not active after purchase"
- ✅ Verify package has `pro` entitlement attached
- ✅ Check RevenueCat dashboard → Customers to see if purchase registered
- ✅ Try restoring purchases

---

## 📊 RevenueCat Dashboard Overview

Once everything is set up, you can monitor:

### Overview Page
- **Active Subscriptions:** How many users are subscribed
- **Revenue:** Monthly recurring revenue (MRR)
- **Trials:** Active trial users

### Customers Page
- Search for specific users by App User ID (Supabase user ID)
- View purchase history
- See active entitlements

### Charts Page
- Revenue graphs
- Subscription growth
- Churn rate

---

## 🎯 Quick Checklist

Use this to verify everything is set up correctly:

- [ ] **Products added** in RevenueCat dashboard
  - [ ] `com.soundbridge.premium.monthly`
  - [ ] `com.soundbridge.premium.yearly`

- [ ] **Entitlement created** in RevenueCat
  - [ ] Identifier: `pro`

- [ ] **Offering created** in RevenueCat
  - [ ] Offering ID: `default`
  - [ ] Set as current: YES

- [ ] **Packages added** to offering
  - [ ] Package: `monthly` → Product: `com.soundbridge.premium.monthly` → Entitlement: `pro`
  - [ ] Package: `annual` → Product: `com.soundbridge.premium.yearly` → Entitlement: `pro`

- [ ] **API Key obtained** from RevenueCat
  - [ ] Copied from: API Keys → Apple App Store → Public key

- [ ] **API Key added** to mobile app
  - [ ] Updated in: `src/config/environment.ts`

- [ ] **App Store Connect products exist**
  - [ ] `com.soundbridge.premium.monthly` created
  - [ ] `com.soundbridge.premium.yearly` created

- [ ] **Sandbox tester created**
  - [ ] In App Store Connect → Users & Access

- [ ] **TestFlight build created**
  - [ ] Production build uploaded

- [ ] **Test purchase completed**
  - [ ] Purchased with sandbox tester
  - [ ] Pro entitlement activated

---

## 🚀 Next Steps After Setup

Once RevenueCat is fully configured:

1. **Test Thoroughly**
   - Test monthly subscription
   - Test yearly subscription
   - Test restore purchases
   - Test on different devices

2. **Set Up Webhooks (Optional but Recommended)**
   - Go to RevenueCat → Integrations → Webhooks
   - Add webhook URL: `https://soundbridge.live/api/webhooks/revenuecat`
   - This keeps your backend in sync with subscription changes

3. **Monitor Analytics**
   - Check RevenueCat dashboard daily
   - Monitor conversion rates
   - Track revenue growth

4. **Production Release**
   - Once testing is complete, submit to App Store
   - Enable for all users

---

## 📞 Support

### Mobile Team Questions
If you have questions about the mobile app integration, contact the mobile team.

### RevenueCat Support
- Documentation: https://www.revenuecat.com/docs
- Support: support@revenuecat.com
- Community: https://community.revenuecat.com

---

## 🎉 Summary

**What the Mobile Team Built:**
- Complete RevenueCat SDK integration
- Automatic initialization on login
- Purchase and restore functionality
- Pro entitlement checking
- Beautiful upgrade screen UI

**What You Need to Do:**
1. Configure products in RevenueCat dashboard
2. Create "pro" entitlement
3. Create "default" offering with "monthly" and "annual" packages
4. Get API key and give it to mobile team
5. Test with TestFlight build

**Timeline:**
- Dashboard setup: ~30 minutes
- Testing: ~1-2 hours
- Ready for production: Same day!

---

**Questions?** Let me know! I'm here to help get this working for you.
