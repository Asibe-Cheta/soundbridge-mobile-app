# Payout System - Design Decisions & Answers

**Date:** December 29, 2025
**Status:** Decision Document

---

## Answers to Critical Questions

### 1. Currency Storage: When to Convert?

**Question:** Should we convert balance to local currency at tip time, or keep in payment currency and convert at payout time?

**Answer: Convert at Payout Time** ✅

**Reasoning:**
- **Simpler accounting:** One source of truth (USD/GBP from tipper)
- **Avoid exchange rate volatility:** Converting at tip time locks in rate, creator may lose/gain based on rate changes
- **Flexibility:** Creator can choose when to cash out based on favorable rates
- **International consistency:** Same balance display regardless of creator location
- **Wise handles conversion:** Their real-time rates are competitive

**Implementation:**
```typescript
// Store in tipper's currency
creator_revenue.available_balance = 10.00 USD

// Convert at payout time
const quote = await getWiseQuote({
  sourceCurrency: 'USD',
  targetCurrency: 'NGN',
  sourceAmount: 10.00
});
// Result: ~NGN 15,000 (at current rate)
```

**Display in UI:**
```typescript
// Show both currencies
Available Balance: $10.00 USD (~₦15,000 NGN)
// Update NGN estimate regularly (every hour or on page load)
```

---

### 2. Bank Account Field Mapping

**Question:** How should we handle the generic `routing_number_encrypted` field that stores different identifier types (bank_code, swift_code, branch_code)?

**Answer: Infer from Currency/Country** ✅

**Reasoning:**
- **Less schema changes:** Works with existing table
- **Deterministic:** Currency always maps to same identifier type
- **Backward compatible:** No data migration needed

**Implementation:**
```typescript
function getIdentifierType(currency: string): string {
  const typeMap: Record<string, string> = {
    'NGN': 'bank_code',      // Nigeria
    'GHS': 'swift_code',     // Ghana
    'KES': 'swift_code',     // Kenya
    'ZAR': 'branch_code',    // South Africa
    'USD': 'routing_number', // USA
    'GBP': 'sort_code',      // UK
  };
  return typeMap[currency] || 'routing_number';
}

// Usage
const bankAccount = await fetchBankAccount(creatorId);
const identifierType = getIdentifierType(bankAccount.currency);

if (identifierType === 'bank_code') {
  // Use for Wise Nigeria
  payoutParams.bankCode = bankAccount.routing_number_encrypted;
} else if (identifierType === 'swift_code') {
  // Use for Ghana/Kenya
  payoutParams.swiftCode = bankAccount.routing_number_encrypted;
}
```

**Alternative (if needed later):**
```sql
-- Add explicit field (optional enhancement)
ALTER TABLE creator_bank_accounts
ADD COLUMN identifier_type VARCHAR(20) DEFAULT 'routing_number';
```

---

### 3. Payout Validation

**Question:** What validations should we add? (Minimum amount, payout frequency limits, etc.)

**Answer: Start Simple, Add Later** ✅

**Minimum Validations (Phase 1):**
```typescript
// 1. Minimum amount: $5 USD equivalent
const MINIMUM_PAYOUT = {
  USD: 5.00,
  GBP: 4.00,
  EUR: 4.50,
};

if (amount < MINIMUM_PAYOUT[currency]) {
  throw new Error(`Minimum payout is ${MINIMUM_PAYOUT[currency]} ${currency}`);
}

// 2. Sufficient balance
if (amount > availableBalance) {
  throw new Error('Insufficient balance');
}

// 3. Verified bank account
if (!bankAccount.is_verified) {
  throw new Error('Please verify your bank account first');
}
```

**Phase 2 Validations:**
```typescript
// 4. Payout frequency limit (max 1 per day)
const lastPayout = await getLastPayout(creatorId);
if (lastPayout && lastPayout.created_at > Date.now() - 24 * 60 * 60 * 1000) {
  throw new Error('You can only request one payout per day');
}

// 5. Maximum amount (anti-fraud)
const MAXIMUM_PAYOUT = {
  USD: 10000, // $10K per payout
};

if (amount > MAXIMUM_PAYOUT[currency]) {
  throw new Error(`Maximum payout is ${MAXIMUM_PAYOUT[currency]} ${currency}`);
}

// 6. Pending payout check
const pendingPayouts = await getPendingPayouts(creatorId);
if (pendingPayouts.length > 0) {
  throw new Error('You have a pending payout. Please wait for it to complete.');
}
```

**Recommended Limits:**
| Validation | Limit | Reason |
|------------|-------|--------|
| Minimum payout | $5 USD | Avoid Wise fees eating small amounts |
| Maximum payout | $10,000 USD | Anti-fraud protection |
| Frequency | 1 per day | Reduce abuse, Wise fees |
| Pending limit | 1 at a time | Simplify status tracking |

---

### 4. Error Handling

**Question:** How should we handle cases where bank account is missing, unverified, or invalid?

**Answer: Clear Error Messages + UI Guidance** ✅

**Error Scenarios:**

```typescript
// Scenario 1: No bank account
if (!bankAccount) {
  return {
    error: 'NO_BANK_ACCOUNT',
    message: 'Please add a bank account first',
    action: {
      type: 'navigate',
      screen: 'AddBankAccount',
    },
  };
}

// Scenario 2: Unverified bank account
if (!bankAccount.is_verified) {
  return {
    error: 'UNVERIFIED_BANK_ACCOUNT',
    message: 'Please verify your bank account before requesting payouts',
    action: {
      type: 'navigate',
      screen: 'VerifyBankAccount',
      params: { accountId: bankAccount.id },
    },
  };
}

// Scenario 3: Invalid bank details (failed Wise verification)
try {
  const accountVerification = await resolveAccount({
    accountNumber: bankAccount.account_number,
    bankCode: bankAccount.bank_code,
    currency: bankAccount.currency,
  });

  if (!accountVerification.success) {
    return {
      error: 'INVALID_BANK_ACCOUNT',
      message: 'Bank account details are invalid. Please update your bank account.',
      action: {
        type: 'navigate',
        screen: 'UpdateBankAccount',
        params: { accountId: bankAccount.id },
      },
    };
  }
} catch (error) {
  // Wise API error
  return {
    error: 'BANK_VERIFICATION_FAILED',
    message: 'Unable to verify bank account. Please try again later.',
    retryable: true,
  };
}

// Scenario 4: Country not supported
if (!SUPPORTED_COUNTRIES.includes(country)) {
  return {
    error: 'COUNTRY_NOT_SUPPORTED',
    message: `Payouts to ${country} are not yet supported. We currently support Nigeria, Ghana, and Kenya.`,
    action: {
      type: 'email',
      email: 'support@soundbridge.com',
      subject: 'Request payout support for my country',
    },
  };
}
```

**UI Flow:**
```typescript
// In mobile app
try {
  const result = await requestPayout({ amount: 10.00 });

  if (result.success) {
    navigation.navigate('PayoutSuccess', { payoutId: result.payout.id });
  }
} catch (error) {
  const errorData = JSON.parse(error.message);

  if (errorData.action?.type === 'navigate') {
    Alert.alert(
      'Action Required',
      errorData.message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Go to Settings',
          onPress: () => navigation.navigate(errorData.action.screen, errorData.action.params),
        },
      ]
    );
  } else {
    Alert.alert('Error', errorData.message);
  }
}
```

---

### 5. Multi-Currency Balance

**Question:** Should creators have separate balances per currency, or one balance in payment currency with conversion at payout?

**Answer: Single Balance in Source Currency** ✅

**Reasoning:**
- **Simpler schema:** One `available_balance` field
- **Easier accounting:** One source of truth
- **Most tips are USD/GBP:** 95%+ of tips will be in same currency
- **Convert only at payout:** Avoids multiple conversions

**Implementation:**
```typescript
// Creator revenue table
creator_revenue {
  creator_id: uuid,
  available_balance: decimal,  // Amount in source currency
  currency: string,            // USD, GBP, EUR (source currency)
  total_earnings: decimal,     // Lifetime earnings
}

// Tips are aggregated in source currency
// Tip from US user: $5 → Add $5 to available_balance (currency = USD)
// Tip from UK user: £4 → Convert to USD at tip time → Add $5.20 to available_balance

// At payout time:
// Creator requests payout → Convert USD → NGN using Wise
```

**Alternative (Future Enhancement - Multi-Currency):**
```sql
-- If you later support multi-currency balances
CREATE TABLE creator_balances (
  id uuid PRIMARY KEY,
  creator_id uuid REFERENCES profiles(id),
  currency varchar(3),
  available_balance decimal,
  UNIQUE(creator_id, currency)
);

-- Creator could have:
-- USD: $10.00
-- GBP: £5.00
-- EUR: €8.00

-- And request payout from any currency
```

**Recommendation:** Start with single currency (Phase 1), add multi-currency later if needed (Phase 3).

---

## Additional Design Decisions

### 6. Payout Processing Flow

**Flow:**
```
1. Creator requests payout ($10 USD)
   ↓
2. System checks balance ✓
   ↓
3. System detects country (Nigeria) ✓
   ↓
4. System fetches bank account ✓
   ↓
5. System gets Wise quote (USD → NGN) ✓
   ↓
6. System creates Wise transfer ✓
   ↓
7. System deducts balance (-$10 USD) ✓
   ↓
8. Wise processes transfer (1-3 days)
   ↓
9. Webhook updates status to "completed"
   ↓
10. Creator receives money in bank account ✓
```

**Database Updates:**
```sql
-- Step 7: Deduct balance (in transaction)
BEGIN;

-- Deduct from available_balance
UPDATE creator_revenue
SET available_balance = available_balance - 10.00,
    total_withdrawn = total_withdrawn + 10.00
WHERE creator_id = 'creator-uuid'
  AND available_balance >= 10.00; -- Ensure sufficient balance

-- Create payout record
INSERT INTO wise_payouts (
  creator_id,
  amount,        -- NGN amount
  currency,      -- NGN
  source_amount, -- USD amount
  source_currency, -- USD
  status,
  ...
) VALUES (...);

COMMIT;
```

---

### 7. Fee Handling

**Question:** Who pays Wise transfer fees?

**Options:**
1. **Platform absorbs fees** ✅ Recommended
2. Creator pays fees (deducted from payout)
3. Transparent fee model (show before confirmation)

**Recommendation: Platform Absorbs Fees (Phase 1)**

**Reasoning:**
- Better creator experience
- Simpler UX (no fee calculations)
- Builds trust
- Wise fees are relatively low (~0.5-1%)

**Example:**
```typescript
// Creator sees: $10.00 → ₦15,000
// Platform pays: Wise fee (~₦150)
// Creator receives: ₦15,000 (full amount)

// Cost to platform: ~$0.10 per $10 payout (1%)
```

**Alternative (Phase 2):**
```typescript
// Show fees upfront
const quote = await getWiseQuote({ sourceAmount: 10.00, targetCurrency: 'NGN' });

// Display:
// You'll receive: ₦15,000
// Wise fee: ₦150
// Exchange rate: 1 USD = 1,500 NGN
```

---

### 8. Payout Limits & Thresholds

**Recommended Settings:**

```typescript
const PAYOUT_CONFIG = {
  // Minimum amounts (avoid small fees)
  MINIMUM_PAYOUT: {
    USD: 5.00,
    GBP: 4.00,
    EUR: 4.50,
  },

  // Maximum amounts (anti-fraud)
  MAXIMUM_PAYOUT: {
    USD: 10000,
    GBP: 8000,
    EUR: 9000,
  },

  // Frequency limits
  MAX_PAYOUTS_PER_DAY: 1,
  MAX_PAYOUTS_PER_WEEK: 3,
  MAX_PAYOUTS_PER_MONTH: 10,

  // Processing time
  EXPECTED_PROCESSING_DAYS: {
    NG: '1-3 business days',
    GH: '1-3 business days',
    KE: '1-3 business days',
  },

  // Auto-payout threshold (future)
  AUTO_PAYOUT_THRESHOLD: 50.00, // Auto-pay when balance > $50
};
```

---

## Implementation Priority

### Phase 1: MVP (Week 1)
- ✅ Creator payout request API
- ✅ Country detection
- ✅ Bank account fetching
- ✅ Basic validation (minimum amount, sufficient balance)
- ✅ Integrate with existing `payoutToCreator()`
- ✅ Update creator balance

### Phase 2: Enhancement (Week 2)
- ✅ Payout history API
- ✅ Payout status API
- ✅ Mobile UI (request screen, history screen)
- ✅ Currency conversion estimates in UI
- ✅ Advanced validation (frequency limits, maximum amount)

### Phase 3: Future
- ⏳ Auto-payout thresholds
- ⏳ Scheduled payouts (weekly/monthly)
- ⏳ Multi-currency balances
- ⏳ Fee transparency
- ⏳ Payout preferences

---

## Summary

**Decisions Made:**
1. **Currency Storage:** Keep in source currency, convert at payout ✅
2. **Bank Field Mapping:** Infer identifier type from currency ✅
3. **Validation:** Start simple ($5 min), add limits later ✅
4. **Error Handling:** Clear messages with actionable navigation ✅
5. **Multi-Currency:** Single balance for now, multi-currency later ✅
6. **Fees:** Platform absorbs Wise fees (Phase 1) ✅

**Next Steps:**
1. Implement Phase 1 (MVP) - backend + mobile
2. Test with real Nigerian/Ghanaian/Kenyan accounts
3. Deploy to production
4. Monitor success rate and errors
5. Iterate based on feedback

---

**Last Updated:** December 29, 2025
**Status:** Ready for Implementation
