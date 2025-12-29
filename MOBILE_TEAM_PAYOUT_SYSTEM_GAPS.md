# Mobile Team: Critical Payout System Gaps

**Date:** December 29, 2025  
**Priority:** 🔴 **CRITICAL**  
**Status:** Action Required  
**Forward To:** Claude for implementation guidance

---

## Executive Summary

The cross-border payout system from UK/US to African creators (Nigeria, Ghana, Kenya) has **critical gaps** that prevent creators from receiving payouts automatically. While the tipping flow works perfectly and the Wise integration code exists, creators **cannot request payouts themselves** - this requires manual admin intervention for every payout.

---

## ✅ What's Currently Working

1. **Tipping Flow** - Fully functional
   - UK/US users can tip creators in any country
   - Tips are processed via Stripe (USD/GBP)
   - Creator balances are updated correctly in `creator_revenue` table
   - Platform fees are deducted correctly

2. **Wise Integration Code** - Implementation complete
   - `payoutToCreator()` function exists in `apps/web/src/lib/wise/payout.ts`
   - Bank account verification works
   - Currency conversion (USD/GBP → NGN/GHS/KES) handled by Wise
   - Webhook system updates payout status
   - Database schema (`wise_payouts` table) is ready

3. **Bank Account Storage** - Working
   - African bank accounts can be stored via `CountryAwareBankForm`
   - Supports Nigeria, Ghana, Kenya, South Africa
   - Bank account data stored in `creator_bank_accounts` table

---

## ❌ Critical Gaps

### **1. Missing Creator Payout Request API** 🔴 **HIGHEST PRIORITY**

**Problem:**
- Creators cannot request payouts from their balance
- Only admins can trigger payouts via `/api/admin/payouts`
- Requires manual admin intervention for every single payout

**What's Needed:**
```
POST /api/creator/payouts/request
```

**Functionality Required:**
- Creator requests payout from their `available_balance`
- System automatically:
  - Detects creator's country (from profile or bank account)
  - Fetches bank account from `creator_bank_accounts` table
  - Determines payout method (Wise for NG/GH/KE, Stripe Connect for others)
  - Converts currency (USD/GBP → NGN/GHS/KES) via Wise
  - Calls `payoutToCreator()` function

**Impact:** Without this, creators cannot get paid. Currently requires manual admin action for every payout.

---

### **2. No Automatic Country Detection** 🔴 **HIGH PRIORITY**

**Problem:**
- System doesn't automatically detect which payout method to use
- Admin must manually determine if creator needs Wise or Stripe Connect
- No logic to choose based on creator's location

**What's Needed:**
- Store `country_code` in `profiles` table (if not already)
- Use bank account currency to infer country:
  - `NGN` → Nigeria → Use Wise
  - `GHS` → Ghana → Use Wise
  - `KES` → Kenya → Use Wise
  - `USD`/`GBP`/`EUR` → Use Stripe Connect (if account exists)

**Impact:** Cannot automate payout method selection.

---

### **3. No Automatic Bank Account Fetching** 🔴 **HIGH PRIORITY**

**Problem:**
- Admin must manually provide bank account details when calling payout API
- System doesn't fetch from `creator_bank_accounts` table automatically

**What's Needed:**
- Query `creator_bank_accounts` table for creator's bank account
- Extract:
  - `account_number_encrypted` (decrypt if needed)
  - `routing_number_encrypted` (or `bank_code`, `swift_code`, `branch_code` based on country)
  - `account_holder_name`
  - `currency` (to determine country)

**Impact:** Cannot automate payout process.

---

### **4. Currency Conversion Transparency** 🟡 **MEDIUM PRIORITY**

**Problem:**
- Creator balance stored in USD/GBP (tipper's currency)
- Creator doesn't know NGN equivalent until payout
- Exchange rate risk between tip time and payout time

**What's Needed (Future Enhancement):**
- Show estimated NGN/GHS/KES equivalent in UI
- Consider converting balance to local currency at tip time (future)

**Impact:** Poor user experience, exchange rate uncertainty.

---

## Current System Architecture

### **How It Works Now (Manual Process):**

```
1. User tips $5 → Creator gets $4.50 in balance (USD)
   ✅ This works perfectly

2. Admin manually calls:
   POST /api/admin/payouts
   {
     "creatorId": "uuid",
     "amount": 67000,  // NGN (admin must calculate)
     "currency": "NGN",
     "bankAccountNumber": "1234567890",  // Admin must provide
     "bankCode": "044",  // Admin must provide
     "accountHolderName": "John Doe",  // Admin must provide
     "sourceCurrency": "USD"
   }

3. Wise converts and transfers
   ✅ This code works, but requires manual admin action
```

### **How It Should Work (Automated):**

```
1. User tips $5 → Creator gets $4.50 in balance (USD)
   ✅ This works

2. Creator requests payout via mobile app:
   POST /api/creator/payouts/request
   {
     "amount": 4.50  // USD from balance
   }

3. System automatically:
   - Detects creator is in Nigeria (from country_code or bank currency)
   - Fetches bank account from creator_bank_accounts
   - Gets Wise quote for USD → NGN conversion
   - Calls payoutToCreator() with correct parameters
   - Returns payout status to creator

4. Wise converts and transfers
   ✅ Same Wise code, just triggered automatically
```

---

## Required Implementation

### **Priority 1: Creator Payout Request API**

**File:** `apps/web/app/api/creator/payouts/request/route.ts` (NEW)

**Functionality:**
```typescript
POST /api/creator/payouts/request
Body: { "amount": number }

Steps:
1. Authenticate creator
2. Validate creator has sufficient balance
3. Detect creator's country (from profile.country_code or bank account currency)
4. Fetch bank account from creator_bank_accounts
5. Determine payout method (Wise vs Stripe Connect)
6. If Wise:
   - Get Wise quote (USD/GBP → NGN/GHS/KES)
   - Call payoutToCreator() with:
     - creatorId
     - amount (converted to target currency)
     - currency (NGN/GHS/KES)
     - bankAccountNumber (from creator_bank_accounts)
     - bankCode (from creator_bank_accounts, decrypted)
     - accountHolderName (from creator_bank_accounts)
     - sourceCurrency (original balance currency)
7. Update creator_revenue.available_balance (deduct amount)
8. Return payout status
```

**Integration Points:**
- Uses existing `payoutToCreator()` from `apps/web/src/lib/wise/payout.ts`
- Queries `creator_bank_accounts` table
- Queries `profiles` table for country_code
- Updates `creator_revenue` table

---

### **Priority 2: Country Detection Logic**

**Location:** New helper function or within payout request API

**Logic:**
```typescript
async function detectCreatorCountry(creatorId: string): Promise<string> {
  // Try 1: Check profiles.country_code
  // Try 2: Check creator_bank_accounts.currency
  // Try 3: Infer from bank code (044 = Nigeria, etc.)
  // Return country code (NG, GH, KE, etc.)
}
```

**Country → Payout Method Mapping:**
- `NG`, `GH`, `KE` → Use Wise API
- `US`, `GB`, `CA`, `AU`, `EU countries` → Use Stripe Connect (if account exists)

---

### **Priority 3: Bank Account Fetching**

**Location:** New helper function or within payout request API

**Logic:**
```typescript
async function getCreatorBankAccount(creatorId: string): Promise<BankAccount> {
  // Query creator_bank_accounts table
  // Verify account is verified (is_verified = true)
  // Extract country-specific identifier:
  //   - Nigeria: routing_number_encrypted = bank_code
  //   - Ghana/Kenya: routing_number_encrypted = swift_code
  //   - South Africa: routing_number_encrypted = branch_code
  // Decrypt account_number_encrypted if needed
  // Return bank account details
}
```

**Note:** May need to add a field to track which field type is stored in `routing_number_encrypted` (bank_code vs swift_code vs branch_code), or infer from country.

---

## Testing Requirements

### **Test Scenario: Nigerian Creator Payout**

1. **Setup:**
   - Create test creator with Nigeria country_code
   - Add Nigerian bank account (044 - Access Bank, account 1234567890)
   - Add $10 balance to creator_revenue (available_balance)

2. **Test Flow:**
   - Creator requests $10 payout via API
   - System detects Nigeria → Wise
   - Fetches bank account automatically
   - Gets Wise quote (USD → NGN)
   - Creates Wise transfer
   - Updates balance (deducts $10)
   - Returns payout status

3. **Verify:**
   - `wise_payouts` table has new record
   - `creator_revenue.available_balance` reduced by $10
   - Wise transfer created successfully
   - Webhook updates status when complete

---

## Database Considerations

### **Tables Used:**
- `profiles` - Store `country_code` (may need to add if missing)
- `creator_bank_accounts` - Bank account details
- `creator_revenue` - Balance tracking
- `wise_payouts` - Payout records (already exists)

### **Potential Schema Addition:**
Consider adding a field to track which identifier type is stored:
```sql
ALTER TABLE creator_bank_accounts 
ADD COLUMN identifier_type VARCHAR(20); 
-- Values: 'routing_number', 'bank_code', 'swift_code', 'branch_code', 'sort_code', 'bsb_code'
```

Or infer from country/currency:
- `NGN` → `bank_code`
- `GHS`, `KES` → `swift_code`
- `ZAR` → `branch_code`
- `USD` → `routing_number`
- `GBP` → `sort_code`
- etc.

---

## Existing Code to Leverage

### **Wise Payout Function:**
```typescript
// apps/web/src/lib/wise/payout.ts
export async function payoutToCreator(params: PayoutToCreatorParams): Promise<WisePayout>
```

**This function already:**
- ✅ Validates inputs
- ✅ Verifies creator exists
- ✅ Resolves/verifies bank account
- ✅ Creates Wise recipient
- ✅ Creates transfer via Wise API
- ✅ Stores payout record
- ✅ Handles currency conversion

**We just need to call it with the right parameters!**

---

## Reference Documents

- **Detailed Analysis:** `CROSS_BORDER_PAYOUT_FLOW_ANALYSIS.md`
- **Wise Integration:** `WISE_WEBHOOK_INTEGRATION_FEEDBACK.md`
- **African Banking Support:** `AFRICAN_COUNTRY_BANKING_SUPPORT.md`

---

## Action Items for Implementation

### **Phase 1: Critical Path (MVP)**

1. ✅ Create `POST /api/creator/payouts/request` endpoint
2. ✅ Add country detection logic
3. ✅ Add bank account fetching logic
4. ✅ Integrate with existing `payoutToCreator()` function
5. ✅ Update `creator_revenue.available_balance` after payout

### **Phase 2: Enhancement**

1. Add `GET /api/creator/payouts/status` endpoint
2. Add payout history endpoint
3. Add currency conversion estimates in UI
4. Add payout notifications

### **Phase 3: Future**

1. Automatic currency conversion at tip time
2. Automatic payout thresholds
3. Scheduled payouts

---

## Questions for Claude

1. **Currency Storage:** Should we convert balance to local currency at tip time, or keep in payment currency and convert at payout time?

2. **Bank Account Field Mapping:** How should we handle the generic `routing_number_encrypted` field that stores different identifier types (bank_code, swift_code, branch_code)? Add a type field, or infer from country?

3. **Payout Validation:** What validations should we add? (Minimum amount, payout frequency limits, etc.)

4. **Error Handling:** How should we handle cases where bank account is missing, unverified, or invalid?

5. **Multi-Currency Balance:** Should creators have separate balances per currency, or one balance in payment currency with conversion at payout?

---

## Summary

**Current State:**
- ✅ Tipping works perfectly
- ✅ Wise integration code exists and is correct
- ❌ **Missing: Creator payout request API**
- ❌ **Missing: Automatic country detection**
- ❌ **Missing: Automatic bank account fetching**

**Impact:**
Without these missing pieces, creators cannot get paid without manual admin intervention. The foundation is solid, but the creator-facing payout flow is incomplete.

**Next Steps:**
1. Forward this document to Claude
2. Request implementation guidance for creator payout request API
3. Implement Priority 1-3 items
4. Test end-to-end flow
5. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** December 29, 2025  
**Status:** Awaiting Implementation Guidance

