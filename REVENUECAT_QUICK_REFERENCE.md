# RevenueCat Quick Reference Card

## 🔑 Critical Values (MUST MATCH EXACTLY!)

### Package Identifiers (in RevenueCat)
```
monthly  ← Monthly subscription package
annual   ← Yearly subscription package
```

### Entitlement Identifier (in RevenueCat)
```
pro  ← Must be lowercase "pro"
```

### Product IDs (App Store Connect & RevenueCat)
```
iOS:
  com.soundbridge.premium.monthly
  com.soundbridge.premium.yearly

Android (future):
  soundbridge_pro_monthly
  soundbridge_pro_yearly
```

### Offering ID (in RevenueCat)
```
default  ← Set as "current"
```

---

## 📋 Setup Checklist (30 minutes)

### RevenueCat Dashboard
1. ✅ Products → Add `com.soundbridge.premium.monthly` & `com.soundbridge.premium.yearly`
2. ✅ Entitlements → Create `pro`
3. ✅ Offerings → Create `default` (set as current)
4. ✅ Packages → Add `monthly` + `annual` (attach `pro` entitlement to both)
5. ✅ API Keys → Copy iOS public key

### Mobile App
6. ✅ Give API key to mobile team (or add to `src/config/environment.ts`)

### App Store Connect
7. ✅ Verify products exist with same IDs
8. ✅ Create Sandbox Tester account

### Testing
9. ✅ Build: `eas build --profile production --platform ios`
10. ✅ Test purchase with Sandbox Tester on TestFlight

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Package: "Pro Monthly" | Package: "monthly" |
| Package: "$rc_monthly" | Package: "monthly" |
| Entitlement: "Pro" | Entitlement: "pro" |
| Product: "soundbridge_pro_monthly" (iOS) | Product: "com.soundbridge.premium.monthly" |

---

## 🔍 Testing Purchase Flow

```
1. Open app → Sign in
2. Profile → Upgrade
3. Select Pro Monthly/Yearly
4. Tap "Upgrade Now"
5. Sign in with Sandbox Tester when prompted
6. Approve purchase (Face ID/Touch ID)
7. Success message appears
8. Profile shows "Pro" tier
```

---

## 📊 Where to Find Things

### RevenueCat Dashboard
- **Products:** Left sidebar → Products
- **Entitlements:** Left sidebar → Entitlements
- **Offerings:** Left sidebar → Offerings
- **API Keys:** Left sidebar → API keys (under Project settings)
- **Customers:** Left sidebar → Customers (to see test purchases)

### App Store Connect
- **Products:** My Apps → SoundBridge → In-App Purchases
- **Sandbox Testers:** Users and Access → Sandbox Testers

---

## 🐛 Quick Debug

### No products showing in app?
```bash
# Check console logs:
"🚀 Loading RevenueCat products..."
"✅ Loaded products: 2"  ← Should see 2 products
```

### Purchase not working?
1. Are you on TestFlight build? (Not Expo Go)
2. Did you sign in with Sandbox Tester?
3. Check RevenueCat dashboard → Customers → Search for your user

### Entitlement not activating?
1. Go to RevenueCat → Offerings → default
2. Click on "monthly" package
3. Verify "pro" entitlement is attached
4. Same for "annual" package

---

## 🎯 Mobile App Code Locations

| Feature | File Location |
|---------|---------------|
| RevenueCat Service | `src/services/RevenueCatService.ts` |
| Environment Config | `src/config/environment.ts` |
| Upgrade Screen | `src/screens/UpgradeScreen.tsx` |
| Auth Integration | `src/contexts/AuthContext.tsx` (lines 614-628, 391-400) |

---

## 💡 Pro Tips

1. **Always test with Sandbox Tester** - Never use your real Apple ID
2. **Check dashboard after purchase** - Go to Customers tab to verify
3. **Package IDs are NOT product IDs** - They're different things!
4. **Entitlements unlock features** - Not products
5. **Set offering as "current"** - Or it won't show in app

---

## 📞 Need Help?

- Mobile team questions → Ask mobile team
- RevenueCat dashboard → https://www.revenuecat.com/docs
- Can't find setting → Use search in RevenueCat dashboard (top right)

---

**Your Next Action:** Get your API key from RevenueCat and send it to the mobile team! 🚀
