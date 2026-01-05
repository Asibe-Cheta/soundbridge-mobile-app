# SoundBridge Pricing Update - January 2026

**Date:** January 1, 2026
**Status:** ✅ IMPLEMENTED
**Update Type:** Major - 3-Tier Model

---

## 🚨 IMPORTANT: Pricing Structure Changed

SoundBridge has moved from a **2-tier** to a **3-tier** pricing model.

### OLD PRICING (Deprecated - November 2025)
- ❌ Free: £0
- ❌ Pro: £9.99/month or £99/year

### NEW PRICING (Current - January 2026)
- ✅ **Free**: £0
- ✅ **Premium**: £6.99/month or £69.99/year (Save 16%)
- ✅ **Unlimited**: £12.99/month or £129.99/year (Save 17%)

---

## Quick Reference Table

| Tier | Monthly | Annual | Storage | Uploads | Key Features |
|------|---------|--------|---------|---------|--------------|
| **Free** | £0 | £0 | 30MB | 3 total | Basic features, 5% platform fee |
| **Premium** | £6.99 | £69.99 | 2GB | Unlimited | Pro badge, featured 1x/month, 5% fee |
| **Unlimited** | £12.99 | £129.99 | 10GB | Unlimited | Fan subscriptions, featured 2x/month, 3% fee |

---

## What Changed?

### 1. **Price Reduction for Entry Tier**
- Old Pro: £9.99/month → New Premium: £6.99/month (**30% price reduction**)
- More accessible for emerging artists

### 2. **New Premium Tier Added**
- Mid-tier option between Free and top tier
- Unlimited uploads with 2GB storage
- Pro badge and featured placement
- £6.99/month or £69.99/year

### 3. **Unlimited Tier Created**
- Top tier for serious creators
- 10GB storage (~1000 tracks)
- **Fan Subscriptions** - earn recurring income from fans
- Lower platform fees (3% vs 5%)
- Featured 2x/month
- £12.99/month or £129.99/year

### 4. **Storage Adjustments**
- Free: 150MB → **30MB** (realistic for 3 tracks)
- Premium: **2GB** (new, ~200 tracks)
- Unlimited: **10GB** (new, ~1000 tracks)

### 5. **Upload Limits Changed**
- Free: Still 3 tracks total
- Premium: **Unlimited uploads** (was 10/month in old Pro)
- Unlimited: **Unlimited uploads**

### 6. **Platform Fees**
- Free/Premium: **5% platform fee** on tips
- Unlimited: **3% platform fee** on tips (reduced fee)

---

## Implementation Details

### Code References

**Mobile App:**
- [src/screens/UpgradeScreen.tsx](src/screens/UpgradeScreen.tsx) - Lines 54-129 (plan configurations)
  - Line 80: Premium at £6.99/month, £69.99/year
  - Line 106: Unlimited at £12.99/month, £129.99/year

**RevenueCat Package IDs:**
- `soundbridge_premium_monthly`
- `soundbridge_premium_annual`
- `soundbridge_unlimited_monthly`
- `soundbridge_unlimited_annual`

### Database Schema

Subscription tiers (enum):
- `free`
- `premium`
- `unlimited`

### Storage Quotas (from StorageQuotaService.ts)
```typescript
FREE: 30 * 1024 * 1024 (30MB)
PREMIUM: 2 * 1024 * 1024 * 1024 (2GB)
UNLIMITED: 10 * 1024 * 1024 * 1024 (10GB)
```

---

## Migration Notes

### For Existing Users

**If you have users on old "Pro" tier (£9.99/month):**

1. **Grandfather them in** - Keep their £9.99/month pricing
2. **Map to new tier:**
   - Old Pro → New Premium tier features
   - They get Premium benefits at old price
3. **No forced migration** - Let them keep legacy pricing
4. **Optional upgrade** - Offer Unlimited tier if they want fan subscriptions

### For New Users

- All new signups see 3-tier model
- No legacy pricing available
- Premium starts at £6.99/month

---

## Documents Requiring Updates

The following documents contain outdated pricing (£9.99) and should be updated or marked as deprecated:

### High Priority (User-Facing)
1. ✅ **TIER_CORRECTIONS.md** - UPDATED
2. **pricing-tier-update-specification.md** - Contains old 2-tier model
3. **SUBSCRIPTION_EMAIL_NOTIFICATIONS_IMPLEMENTATION.md** - Email templates with old prices

### Medium Priority (Internal Documentation)
4. **TIER_RESTRUCTURE.md** - Historical document
5. **MOBILE_NEW_PRICING_IMPLEMENTATION_GUIDE.md** - Implementation guide
6. **SUBSCRIPTION_FIXES_COMPLETE.md** - Status document
7. **IMMEDIATE_PRO_FEATURES_IMPLEMENTED.md** - Feature list
8. **subscription-status-polling-solution.md** - Technical doc

### Low Priority (Archive/Reference)
9. **REVENUECAT_PRO_ACCESS_FINAL_FIX.md** - Technical fix doc
10. **REVENUECAT_PRO_ACCESS_FIX.md** - Technical fix doc
11. **WEB_TEAM_IMPLEMENTATION_PACKAGE/PRIORITY_4_FOUNDATION/TIER_CORRECTIONS.md** - Web team copy

**Recommendation:** Add deprecation notices to old docs pointing to this file.

---

## Key Messaging for Social Media / Marketing

### For Creators

**Premium Tier (£6.99/month):**
> "Professional tools for serious artists. Get unlimited uploads, 2GB storage, a Pro badge, and featured placement for just £6.99/month. Save 16% with annual billing."

**Unlimited Tier (£12.99/month):**
> "For established creators. Enable fan subscriptions, earn recurring income, get 10GB storage, lower fees (3% vs 5%), and featured placement 2x/month. Save 17% with annual billing."

### Value Propositions

**Premium:**
- ✅ 30% cheaper than old Pro tier
- ✅ Unlimited uploads (vs old 10/month)
- ✅ Featured on Discover 1x/month
- ✅ Pro badge credibility
- ✅ Advanced analytics

**Unlimited:**
- ✅ **Fan Subscriptions** - Create recurring revenue streams
- ✅ Lower platform fees (3% vs 5%)
- ✅ 10GB storage for serious catalogs
- ✅ Featured 2x/month (2x the visibility)
- ✅ Top priority in feed algorithm

---

## FAQs

**Q: What happened to the £9.99/month Pro tier?**
A: We split it into two better options - Premium at £6.99/month (more affordable) and Unlimited at £12.99/month (more features). This gives creators more choice.

**Q: I was paying £9.99/month. What happens to me?**
A: You're grandfathered in! Keep your current pricing and get Premium tier features. You can upgrade to Unlimited anytime if you want fan subscriptions.

**Q: What's the difference between Premium and Unlimited?**
A: Premium is perfect for most creators (unlimited uploads, Pro badge, 2GB storage). Unlimited adds fan subscriptions (earn monthly from fans), lower fees (3%), and 10GB storage.

**Q: Can fans subscribe to me on Premium tier?**
A: No, fan subscriptions are Unlimited-tier only. This is because processing fan subscriptions requires additional infrastructure.

**Q: Why did you lower the price from £9.99 to £6.99?**
A: We want to make professional music tools accessible to more creators. Premium at £6.99 hits the sweet spot for emerging artists.

---

## Rollout Checklist

### App Stores
- [ ] Update App Store Connect metadata (pricing tiers)
- [ ] Update Google Play Console metadata (pricing tiers)
- [ ] Update screenshots showing pricing (if any)
- [ ] Update app description mentioning tiers

### RevenueCat
- [x] Configure Premium products (monthly/annual)
- [x] Configure Unlimited products (monthly/annual)
- [x] Set up offerings with 3 tiers
- [ ] Test sandbox purchases for all tiers

### Marketing Materials
- [ ] Update website pricing page
- [ ] Update landing page copy
- [ ] Update comparison tables
- [ ] Update email templates
- [ ] Update social media bio/pinned posts
- [ ] Update press kit

### Documentation
- [x] Update TIER_CORRECTIONS.md
- [ ] Create PRICING_UPDATE_JANUARY_2026.md (this file)
- [ ] Add deprecation notices to old pricing docs
- [ ] Update help center articles
- [ ] Update API documentation (if applicable)

### Communication
- [ ] Email existing users about new tiers
- [ ] Post announcement on social media
- [ ] Update in-app messaging
- [ ] Train customer support on new pricing

---

## Contact

For questions about this pricing update:
- **Technical Implementation:** Check UpgradeScreen.tsx and RevenueCatService.ts
- **Business Questions:** Contact Justice (Founder)
- **Documentation:** This file is the source of truth

---

**Last Updated:** January 1, 2026
**Document Owner:** Development Team
**Next Review:** March 2026
