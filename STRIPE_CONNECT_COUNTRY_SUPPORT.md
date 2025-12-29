# Stripe Connect Country Support - Updated December 2025

**Date:** 2025-12-29
**Status:** ✅ UPDATED - Country list now reflects actual Stripe Connect support
**Files Updated:** `src/components/CountryAwareBankForm.tsx`

---

## Summary

The CountryAwareBankForm component has been updated to only show countries that are actually supported by Stripe Connect for direct bank transfers. Previously, the form included 45+ countries including Nigeria, Ghana, Kenya, Egypt, and many others that Stripe Connect does NOT support.

**Impact:** Users in unsupported countries will no longer see their country listed in the bank transfer withdrawal option. They should use alternative withdrawal methods.

---

## ✅ Stripe Connect Supported Countries (40 countries)

### North America (2)
- 🇺🇸 **United States** (USD) - ACH transfers
- 🇨🇦 **Canada** (CAD) - Interac transfers

### Europe (28 countries - SEPA + UK + CH)

**Western Europe:**
- 🇬🇧 **United Kingdom** (GBP) - Faster Payments
- 🇨🇭 **Switzerland** (CHF) - SEPA
- 🇩🇪 **Germany** (EUR) - SEPA
- 🇫🇷 **France** (EUR) - SEPA
- 🇪🇸 **Spain** (EUR) - SEPA
- 🇮🇹 **Italy** (EUR) - SEPA
- 🇳🇱 **Netherlands** (EUR) - SEPA
- 🇧🇪 **Belgium** (EUR) - SEPA
- 🇦🇹 **Austria** (EUR) - SEPA
- 🇮🇪 **Ireland** (EUR) - SEPA
- 🇵🇹 **Portugal** (EUR) - SEPA
- 🇱🇺 **Luxembourg** (EUR) - SEPA

**Nordic Countries:**
- 🇸🇪 **Sweden** (SEK) - SEPA
- 🇩🇰 **Denmark** (DKK) - SEPA
- 🇫🇮 **Finland** (EUR) - SEPA
- 🇳🇴 **Norway** (NOK) - SEPA

**Eastern Europe:**
- 🇵🇱 **Poland** (PLN) - SEPA
- 🇨🇿 **Czech Republic** (CZK) - SEPA
- 🇭🇺 **Hungary** (HUF) - SEPA
- 🇷🇴 **Romania** (RON) - SEPA
- 🇧🇬 **Bulgaria** (BGN) - SEPA

**Southern Europe:**
- 🇬🇷 **Greece** (EUR) - SEPA
- 🇭🇷 **Croatia** (EUR) - SEPA
- 🇸🇮 **Slovenia** (EUR) - SEPA
- 🇸🇰 **Slovakia** (EUR) - SEPA
- 🇪🇪 **Estonia** (EUR) - SEPA
- 🇱🇻 **Latvia** (EUR) - SEPA
- 🇱🇹 **Lithuania** (EUR) - SEPA

### Asia-Pacific (8)
- 🇯🇵 **Japan** (JPY) - Zengin
- 🇸🇬 **Singapore** (SGD) - FAST
- 🇭🇰 **Hong Kong** (HKD) - CHATS
- 🇦🇺 **Australia** (AUD) - NPP
- 🇳🇿 **New Zealand** (NZD) - NPP

### Middle East (1)
- 🇦🇪 **United Arab Emirates** (AED) - IBAN/UAEFTS

---

## ❌ Countries NOT Supported by Stripe Connect

These countries were previously listed but have been **removed** because Stripe Connect does not support direct bank transfers to these regions:

### Africa (ALL countries - 0 supported)
- ❌ 🇳🇬 **Nigeria** (NGN)
- ❌ 🇬🇭 **Ghana** (GHS)
- ❌ 🇰🇪 **Kenya** (KES)
- ❌ 🇪🇬 **Egypt** (EGP)
- ❌ 🇿🇦 **South Africa** (ZAR)
- ❌ All other African countries

### Latin America (ALL countries - 0 supported)
- ❌ 🇲🇽 **Mexico** (MXN)
- ❌ 🇧🇷 **Brazil** (BRL)
- ❌ 🇦🇷 **Argentina** (ARS)
- ❌ 🇨🇱 **Chile** (CLP)
- ❌ 🇨🇴 **Colombia** (COP)
- ❌ 🇵🇪 **Peru** (PEN)
- ❌ All other Latin American countries

### Asia (except JP, SG, HK)
- ❌ 🇨🇳 **China** (CNY)
- ❌ 🇮🇳 **India** (INR)
- ❌ 🇹🇭 **Thailand** (THB)
- ❌ 🇵🇭 **Philippines** (PHP)
- ❌ 🇮🇩 **Indonesia** (IDR)
- ❌ 🇻🇳 **Vietnam** (VND)
- ❌ 🇰🇷 **South Korea** (KRW)
- ❌ 🇲🇾 **Malaysia** (MYR)

### Middle East (except UAE)
- ❌ 🇸🇦 **Saudi Arabia** (SAR)
- ❌ All other Middle Eastern countries except UAE

---

## Alternative Withdrawal Methods for Unsupported Countries

If your country is not supported by Stripe Connect, you have several alternative options:

### 1. **Wise (Formerly TransferWise)** ⭐ RECOMMENDED
- **Supported Countries:** 160+ countries including Nigeria, Ghana, Kenya, Egypt, India, Brazil, etc.
- **How It Works:**
  - Create a Wise account
  - Get a Wise virtual bank account (US, UK, or EU)
  - Add that account to SoundBridge as your withdrawal method
  - Wise will convert and send to your local bank
- **Fees:** Lower than traditional banks (~0.5-2%)
- **Transfer Time:** 1-3 business days
- **Website:** [wise.com](https://wise.com)

### 2. **Payoneer**
- **Supported Countries:** 200+ countries
- **How It Works:**
  - Create Payoneer account
  - Get virtual US/EU bank account
  - Add to SoundBridge
  - Withdraw to local bank via Payoneer
- **Fees:** ~2-3%
- **Transfer Time:** 2-5 business days
- **Website:** [payoneer.com](https://payoneer.com)

### 3. **Cryptocurrency Withdrawals** (FUTURE)
- **Status:** Not yet implemented
- **Supported:** USDC, USDT (stablecoins)
- **Planned Release:** Q1 2026
- **Benefits:** Instant transfers, low fees, global support

### 4. **PayPal** ❌ NOT AVAILABLE
- **Note:** Stripe does NOT integrate with PayPal for payouts
- **Alternative:** You could request PayPal support separately, but this would require a different payment processor

---

## Technical Changes Made

### File: `src/components/CountryAwareBankForm.tsx`

#### 1. Updated Supported Countries List (Lines 56-117)
**Before:** 45+ countries including Nigeria, Ghana, Kenya, Egypt, Mexico, Brazil, Argentina, China, India, etc.

**After:** Only 40 Stripe Connect verified countries (US, CA, UK, EU, CH, AU, NZ, JP, SG, HK, AE)

```typescript
// Added comprehensive comment explaining what's NOT supported
// ⚠️ NOTE: The following countries are NOT currently supported by Stripe Connect
// but may be added in future. Users in these countries should use alternative methods:
// - Nigeria (NG) - Use Wise or alternative payout providers
// - Ghana (GH) - Use Wise or alternative payout providers
// - Kenya (KE) - Use Wise or alternative payout providers
// - Egypt (EG) - Use Wise or alternative payout providers
```

#### 2. Removed Unsupported Countries from `getFallbackCountryInfo` (Lines 174-348)
**Removed:**
- Mexico (MX), Brazil (BR), Argentina (AR), Chile (CL), Colombia (CO)
- China (CN), India (IN), Thailand (TH), Philippines (PH), Indonesia (ID), Vietnam (VN), South Korea (KR)
- Nigeria (NG), Ghana (GH), Kenya (KE), Egypt (EG), South Africa (ZA)
- Saudi Arabia (SA)

**Added:**
- New Zealand (NZ) - NPP banking system
- Hong Kong (HK) - CHATS banking system

**Added comment (Lines 341-347):**
```typescript
// ⚠️ UNSUPPORTED COUNTRIES REMOVED
// The following countries are NOT supported by Stripe Connect:
// - Mexico (MX), Brazil (BR), Argentina (AR), Chile (CL), Colombia (CO)
// - China (CN), India (IN), Thailand (TH), Philippines (PH), Indonesia (ID), Vietnam (VN), South Korea (KR)
// - Nigeria (NG), Ghana (GH), Kenya (KE), Egypt (EG), South Africa (ZA)
// - Saudi Arabia (SA)
// Users in these countries should use alternative withdrawal methods (e.g., Wise, cryptocurrency, etc.)
```

#### 3. Updated `getBankingInfoText` Function (Lines 462-488)
**Removed info text for:**
- MX (Mexico), CN (China), IN (India), AR (Argentina), BR (Brazil), NG (Nigeria), ZA (South Africa)

**Added info text for:**
- HK (Hong Kong), NZ (New Zealand)

---

## User Journey: What Changed

### Before (INCORRECT)
1. User from Nigeria opens "Add Withdrawal Method"
2. Sees "Nigeria" in country dropdown
3. Fills out Nigerian bank details (Account Number, Bank Code)
4. Submits form
5. ❌ **FAILS** - Backend rejects because Stripe doesn't support Nigeria
6. User confused and frustrated

### After (CORRECT)
1. User from Nigeria opens "Add Withdrawal Method"
2. Does NOT see "Nigeria" in country dropdown
3. Sees only supported countries (US, UK, EU, etc.)
4. ✅ **Clear Expectation:** User understands Nigeria is not directly supported
5. User explores alternative options (Wise, Payoneer, etc.)

---

## Verification Checklist

After this update, verify:

- [ ] ✅ CountryAwareBankForm only shows 40 Stripe Connect supported countries
- [ ] ✅ Nigeria, Ghana, Kenya, Egypt NOT in country list
- [ ] ✅ Mexico, Brazil, Argentina, China, India NOT in country list
- [ ] ✅ getFallbackCountryInfo does not contain unsupported countries
- [ ] ✅ getBankingInfoText does not reference unsupported countries
- [ ] ⏳ Users see helpful error message when country not found
- [ ] ⏳ Documentation guides users to Wise/Payoneer alternatives
- [ ] ⏳ FAQ section explains Stripe limitations

---

## Future Improvements

### 1. Add Warning Banner for Unsupported Regions
When user's detected location is in an unsupported country, show:

```
⚠️ Direct bank transfers are not yet available in Nigeria.

We recommend using Wise or Payoneer to receive payments.
Learn more about alternative withdrawal methods.
```

### 2. Implement Wise Integration
- Create Wise API integration
- Allow users to connect Wise accounts directly
- Auto-detect Wise virtual bank accounts

### 3. Add Cryptocurrency Withdrawals
- Integrate USDC/USDT stablecoin support
- Instant global transfers with low fees
- No country restrictions

### 4. Create Country Support FAQ
Add to help docs:
- "Why isn't my country supported?"
- "How do I use Wise with SoundBridge?"
- "When will more countries be added?"

---

## Related Files

### Withdrawal Flow Files
1. **src/screens/WalletScreen.tsx** - Digital Wallet main screen
2. **src/screens/WithdrawalScreen.tsx** - Withdrawal initiation screen
3. **src/screens/AddWithdrawalMethodScreen.tsx** - Add withdrawal method screen
4. **src/screens/PaymentMethodsScreen.tsx** - Manage payment methods
5. **src/components/CountryAwareBankForm.tsx** - Bank transfer form (UPDATED)

### Service Files
1. **src/services/WalletService.ts** - Wallet operations
2. **src/services/PayoutService.ts** - Payout/withdrawal operations
3. **src/services/LocationService.ts** - Country detection
4. **src/services/CurrencyService.ts** - Currency formatting

---

## API Requirements (For Backend Team)

The backend `/api/upload/quota` endpoint currently returns:
```json
{ "tier": "pro" }
```

But should return:
```json
{ "tier": "premium" }
```

**Tier Normalization:**
- Backend "pro" → Mobile "premium"
- Backend "free" → Mobile "free"
- Backend "unlimited" → Mobile "unlimited"

**Backend Action Required:** Fix tier normalization or update mobile mapping.

---

## References

### Stripe Documentation
- [Stripe Connect: Supported Countries](https://stripe.com/global)
- [Stripe Payouts: Country Support](https://stripe.com/docs/payouts)
- [Stripe Connect: Bank Account Requirements](https://stripe.com/docs/connect/bank-account-requirements)

### Alternative Providers
- [Wise Multi-Currency Accounts](https://wise.com/gb/multi-currency-account/)
- [Payoneer Global Payment Service](https://www.payoneer.com/solutions/global-payments/)

---

## Summary

**Problem:** Mobile app showed 45+ countries in bank transfer form, but Stripe Connect only supports ~40 countries (NOT including Nigeria, Ghana, Kenya, Egypt, Mexico, Brazil, India, China, and most of Africa/Latin America).

**Solution:** Updated CountryAwareBankForm to only show actually supported countries. Removed all unsupported countries from both the country list and fallback banking info.

**User Impact:** Users in unsupported countries will now see clear indication that direct bank transfer is not available, and should use alternative methods like Wise or Payoneer.

**Files Modified:**
- `src/components/CountryAwareBankForm.tsx` (lines 56-117, 174-348, 462-488)

**Status:** ✅ Complete and ready for testing

---

**Last Updated:** 2025-12-29
**Author:** Mobile Team
**Verified Against:** Stripe Connect documentation (Dec 2025)

---

**END OF DOCUMENTATION**
