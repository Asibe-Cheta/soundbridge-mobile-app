# RevenueCat Integration Guide

This playbook walks through wiring our SoundBridge subscription tiers (Free, Pro, Enterprise) into RevenueCat so mobile builds can manage paywalls, purchases, and entitlements consistently across iOS and Android.

---

## 1. Prerequisites
- A RevenueCat project created for SoundBridge (iOS + Android apps added with bundle IDs).
- Stripe or App Store Connect/Google Play IAP products defined for each tier (`soundbridge_pro_monthly`, etc.).
- Access to our Supabase project (for mapping entitlements back to user tiers).
- Local environment variables file (`.env`) aligned with `app.config.ts` needs.

---

## 2. Register Subscription Products in App Stores
1. **Identify tiers & durations**
   - `Pro` – monthly recurring
   - `Enterprise` – yearly recurring (placeholder; adjust as needed)
2. **Create products**
   - In App Store Connect → *My Apps* → *Subscriptions* → create subscription group.
   - In Google Play Console → *Monetize* → *Products* → *Subscriptions*.
3. **Record Store Identifiers**
   - Example: `com.soundbridge.pro.monthly`, `com.soundbridge.enterprise.yearly`

---

## 3. Configure RevenueCat Products & Offerings
1. Log into [RevenueCat](https://app.revenuecat.com).
2. Select the SoundBridge project → *Products & Plans*.
3. For each app store product:
   - Create a **Product** (e.g., `pro_monthly_ios`, `pro_monthly_android`).
   - Link the corresponding store identifiers.
4. Group products into **Offerings**:
   - Default offering (`default`) → add an “entry” package referencing the Pro tier products on both platforms.
   - Optional: add trial/intro packages if marketing plans require them.
5. Note the **API Key** (public) and **Project ID** for client integration.

---

## 4. Add RevenueCat to the Mobile App
1. Install the SDK:
   ```bash
   expo install @react-native-segmented-control/segmented-control
   expo install react-native-purchases
   ```
2. Configure `app.json` / `app.config.ts` with platform-specific RevenueCat public API keys:
   ```ts
   extra: {
     revenueCat: {
       iosPublicKey: process.env.EXPO_PUBLIC_RC_IOS_KEY,
       androidPublicKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
     }
   }
   ```
3. Update `.env` / `.env.production` with:
   ```env
   EXPO_PUBLIC_RC_IOS_KEY=public_ios_api_key
   EXPO_PUBLIC_RC_ANDROID_KEY=public_android_api_key
   ```

---

## 5. Initialize RevenueCat in the App
1. Create a helper (`src/lib/revenueCat.ts`):
   ```ts
   import Purchases from 'react-native-purchases';
   import Constants from 'expo-constants';

   const { iosPublicKey, androidPublicKey } = Constants.expoConfig?.extra?.revenueCat ?? {};

   export function configureRevenueCat(userId?: string) {
     const apiKey = Platform.OS === 'ios' ? iosPublicKey : androidPublicKey;
     if (!apiKey) throw new Error('Missing RevenueCat API key');

     Purchases.configure({
       apiKey,
       appUserID: userId,
     });
   }
   ```
2. Call `configureRevenueCat` after authentication in `AuthContext` once the user session is known (ensure we pass `user.id`).

---

## 6. Display Offerings & Handle Purchases
1. Fetch offerings when rendering the upgrade screen:
   ```ts
   const offerings = await Purchases.getOfferings();
   const proPackage = offerings.current?.availablePackages.find(pkg => pkg.packageType === Purchases.PackageType.MONTHLY);
   ```
2. Initiate purchase:
   ```ts
   const purchaseResult = await Purchases.purchasePackage(proPackage);
   ```
3. RevenueCat returns purchaser info; inspect entitlements:
   ```ts
   const { entitlements } = purchaseResult.customerInfo;
   const proEntitlement = entitlements.active['pro'];
   ```
4. Update Supabase `user_subscriptions` table via our API to reflect the tier (e.g., call `/api/subscription/sync` with the new entitlement).

---

## 7. Syncing Entitlements Back to Supabase
1. Create a serverless endpoint (Supabase Edge Function or API route) that accepts RevenueCat webhook payloads.
2. In RevenueCat → *Integrations* → *Webhooks*, point to our endpoint.
3. When an entitlement is activated/refreshed:
   - Update `user_subscriptions` (`status`, `tier`, `current_period_end`).
   - Trigger any analytics/tip limits adjustments (e.g., via `check_upload_quota`).

---

## 8. Handling Restores & Logout
- **Restoring Purchases**: Add a “Restore Purchases” button that calls `Purchases.restorePurchases()` and re-syncs entitlements.
- **Logout**: call `Purchases.logOut()` in addition to Supabase `signOut` so receipts are dissociated on shared devices.

---

## 9. Testing Checklist
1. Sandbox accounts on App Store / Play Store ready.
2. Confirm RevenueCat dashboard shows transactions.
3. Ensure entitlements propagate to Supabase and app UI updates tier badges, upload limits, etc.
4. Test edge cases: expired subscriptions, renewals, restoring on new device.

---

## 10. Future Enhancements
- Support introductory pricing / trials by adding alternate packages.
- Implement in-app paywalls using RevenueCat’s `paywalls` feature.
- Add RevenueCat REST API calls to Supabase Edge Functions for more reliable server-driven syncs.

---

**Questions?** Ping the mobile guild in Slack (`#mobile-soundbridge`) or check the RevenueCat docs: <https://docs.revenuecat.com/>
