# Pricing Update Summary - Annual Prices Changed to .99

**Date:** December 11, 2025
**Change:** Annual subscription prices updated to end in .99

---

## Updated Pricing

### Old Pricing (Before)
- Premium Monthly: £6.99/month
- Premium Annual: **£69.16/year** (17% discount)
- Unlimited Monthly: £12.99/month
- Unlimited Annual: **£129.38/year** (17% discount)

### New Pricing (After)
- Premium Monthly: £6.99/month
- Premium Annual: **£69.99/year** (16% discount)
- Unlimited Monthly: £12.99/month
- Unlimited Annual: **£129.99/year** (17% discount)

---

## Savings Calculation

### Premium Annual
- Monthly × 12 = £6.99 × 12 = £83.88
- Annual price = £69.99
- **Savings = £13.89 (16% discount)**

### Unlimited Annual
- Monthly × 12 = £12.99 × 12 = £155.88
- Annual price = £129.99
- **Savings = £25.89 (17% discount)**

---

## Files Updated

### Documentation Files
1. ✅ [STRIPE_PRODUCTS_SETUP.md](STRIPE_PRODUCTS_SETUP.md) - All pricing and discount calculations
2. ✅ [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md) - Pricing table
3. ✅ [BACKEND_IMPLEMENTATION_SUMMARY.md](BACKEND_IMPLEMENTATION_SUMMARY.md) - Pricing references
4. ✅ [MOBILE_IMPLEMENTATION_GUIDE.md](MOBILE_IMPLEMENTATION_GUIDE.md) - All pricing references, code examples, and UI specs
5. ✅ [HOW_TO_FIND_STRIPE_PRICE_ID.md](HOW_TO_FIND_STRIPE_PRICE_ID.md) - Pricing table
6. ✅ [pricing-tier-update-specification.md](pricing-tier-update-specification.md) - All pricing specifications and UI examples

### Code Files
- **No code files updated** - The web app doesn't have hardcoded pricing yet
- Mobile app pricing will come from RevenueCat/App Stores (configured by Justice)

---

## Action Items

### For Justice (Platform Admin)

When creating Stripe products, use these **updated** prices:

1. **SoundBridge Premium Monthly**
   - Price: **£6.99**
   - Billing: Monthly

2. **SoundBridge Premium Annual**
   - Price: **£69.99** ← Updated
   - Billing: Yearly

3. **SoundBridge Unlimited Monthly**
   - Price: **£12.99**
   - Billing: Monthly

4. **SoundBridge Unlimited Annual**
   - Price: **£129.99** ← Updated
   - Billing: Yearly

### For Mobile Team

When configuring App Store Connect and Google Play Console, use:

**iOS (App Store Connect):**
- `soundbridge_premium_annual`: **£69.99/year**
- `soundbridge_unlimited_annual`: **£129.99/year**

**Android (Google Play Console):**
- `soundbridge_premium_annual`: **£69.99/year**
- `soundbridge_unlimited_annual`: **£129.99/year**

---

## Marketing Copy Updates

### Premium Annual
- **Old:** "Save 17%" or "£13.89/year savings"
- **New:** "Save 16%" or "£13.89/year savings"

### Unlimited Annual
- **Old:** "Save 17%" or "£26.50/year savings"
- **New:** "Save 17%" or "£25.89/year savings"

---

## What Stays the Same

- ✅ Monthly prices unchanged (£6.99 and £12.99)
- ✅ Free tier unchanged
- ✅ All features and limits unchanged
- ✅ Upload limits unchanged
- ✅ API endpoints unchanged
- ✅ Database schema unchanged
- ✅ Environment variable names unchanged (still use PRICE_ID)

---

## Verification Checklist

Before launching:

- [ ] Stripe products created with **£69.99** and **£129.99**
- [ ] App Store Connect products show **£69.99** and **£129.99**
- [ ] Google Play Console products show **£69.99** and **£129.99**
- [ ] RevenueCat configured with correct pricing
- [ ] All documentation reviewed and accurate
- [ ] Mobile app pricing page displays .99 prices
- [ ] Web pricing page (when created) displays .99 prices
- [ ] Test purchase shows correct annual prices

---

## Summary of Changes

| Item | Old Price | New Price | Discount Changed |
|------|-----------|-----------|------------------|
| Premium Annual | £69.16/year | £69.99/year | 17% → 16% |
| Unlimited Annual | £129.38/year | £129.99/year | 17% (no change) |

**Rationale:** Annual prices should end in .99 for better marketing appeal and consistency with monthly pricing (.99 ending).

---

All documentation has been updated. No code changes required as pricing comes from external sources (Stripe, App Stores).
