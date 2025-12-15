# Profile Screen Tips Display Fix - 401 Authentication Error

**Date:** December 14, 2025
**Status:** ✅ Fixed
**Priority:** High - User Experience

---

## 🐛 Issue: Tips Showing $0.00 in Profile Screen

### Problem Description
- **Profile Screen (Earnings Tab):** Always shows "Tips Received: $0.00"
- **Digital Wallet Screen:** Shows correct tip values in "Recent Transactions"

### Root Cause
```
❌ WalletService Error: HTTP 401: {"error":"Authentication required"}
💰 Total tips from wallet: $0.00 (0 transactions)
```

The ProfileScreen was getting a **401 Authentication error** when fetching wallet transactions because it was using a **stale session token** from the `useAuth()` hook closure.

---

## 🔍 Technical Analysis

### Why It Happened

**ProfileScreen.tsx** flow:
1. Component mounts → Gets `session` from `useAuth()` hook
2. Calls `waitForValidSession()` to ensure session is ready
3. Defines queries with `session` variable from closure
4. **Problem:** The `session` variable might be stale by the time the query executes
5. Wallet API rejects request with 401 error
6. Tips query returns 0 transactions

**WalletScreen.tsx** flow (working correctly):
1. Component mounts → Gets `session` from `useAuth()` hook
2. Directly calls `walletService.getWalletTransactionsSafe(session, 5, 0)`
3. **Success:** Uses fresh session from hook

### The Issue

```typescript
// ❌ BROKEN: Uses stale session from closure
const { session } = useAuth(); // Session might be stale

const loadProfileData = async () => {
  await waitForValidSession(); // Waits but doesn't return fresh session

  const results = await loadQueriesInParallel({
    tips: {
      query: async () => {
        // This session might be stale!
        const transactions = await walletService.getWalletTransactionsSafe(session, 100, 0);
        // ❌ 401 Error
      }
    }
  });
};
```

---

## 🔧 The Fix

### Solution: Get Fresh Session Inside Query

**File:** `src/screens/ProfileScreen.tsx`
**Lines:** 263-297, 298-322

#### Tips Query Fix (Lines 265-297):

**Before:**
```typescript
tips: {
  name: 'tips',
  query: async () => {
    if (!session) {  // ❌ Uses stale session
      return { data: 0, error: null };
    }

    try {
      const transactionsResult = await walletService.getWalletTransactionsSafe(session, 100, 0);
      // ❌ 401 Error
    }
  }
}
```

**After:**
```typescript
tips: {
  name: 'tips',
  query: async () => {
    // ✅ Get fresh session right before API call
    const { data: { session: freshSession } } = await supabase.auth.getSession();

    if (!freshSession) {
      console.warn('⚠️ No session available for tips query');
      return { data: 0, error: null };
    }

    try {
      console.log('💰 Fetching tips with fresh session...');
      const transactionsResult = await walletService.getWalletTransactionsSafe(freshSession, 100, 0);
      // ✅ Success - uses fresh session

      const tipTransactions = transactionsResult.transactions.filter(
        (t) => t.transaction_type === 'tip_received' && t.status === 'completed'
      );

      const totalTips = tipTransactions.reduce((sum: number, transaction) => {
        return sum + (transaction.amount || 0);
      }, 0);

      console.log(`💰 Total tips from wallet: $${totalTips.toFixed(2)} (${tipTransactions.length} transactions)`);
      return { data: totalTips, error: null };
    } catch (error) {
      console.warn('Error fetching tips from wallet:', error);
      return { data: 0, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
  timeout: 5000,
  fallback: 0,
},
```

#### Creator Revenue Query Fix (Lines 300-322):

**Before:**
```typescript
creatorRevenue: {
  name: 'creatorRevenue',
  query: async () => {
    if (!session) {  // ❌ Uses stale session
      return { data: null, error: null };
    }

    try {
      const revenue = await payoutService.getCreatorRevenue(session);
      // ❌ Potential 401 Error
    }
  }
}
```

**After:**
```typescript
creatorRevenue: {
  name: 'creatorRevenue',
  query: async () => {
    // ✅ Get fresh session right before API call
    const { data: { session: freshSession } } = await supabase.auth.getSession();

    if (!freshSession) {
      console.warn('⚠️ No session available for creator revenue query');
      return { data: null, error: null };
    }

    try {
      const revenue = await payoutService.getCreatorRevenue(freshSession);
      console.log(`💰 Creator revenue: $${revenue?.total_earned?.toFixed(2) || '0.00'}`);
      return { data: revenue, error: null };
    } catch (error) {
      console.warn('Error fetching creator revenue (may not exist yet):', error);
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
  timeout: 5000,
  fallback: null,
},
```

---

## 🎯 Why This Fix Works

### 1. **Fresh Session Token**
- `supabase.auth.getSession()` returns the **current** session from Supabase
- Not affected by React hook closure issues
- Always has the latest access token

### 2. **No 401 Errors**
- Fresh access token is always valid
- Wallet API accepts the request
- Tips are fetched successfully

### 3. **Consistent with WalletScreen**
- Both screens now use fresh sessions
- Same data source (WalletService)
- Same authentication flow

---

## 📊 Expected Console Output

### Before Fix:
```
❌ WalletService Error: HTTP 401: {"error":"Authentication required"}
🔇 WalletService: Suppressing wallet transactions error (safe mode)
💰 Total tips from wallet: $0.00 (0 transactions)
📊 Setting ProfileScreen stats: { tips: 0, earnings: 0, ... }
```

### After Fix:
```
💰 Fetching tips with fresh session...
✅ Wallet transactions fetched: 5 transactions
💰 Total tips from wallet: $25.50 (3 transactions)
📊 Setting ProfileScreen stats: { tips: 25.5, earnings: 25.5, ... }
```

---

## 🧪 Testing Checklist

- [x] Navigate to Profile screen → Earnings tab
- [x] Check console for "💰 Fetching tips with fresh session..."
- [x] Verify no 401 errors in console
- [x] Confirm tips amount matches Digital Wallet screen
- [x] Test with multiple tip transactions
- [x] Test with zero tips (should show $0.00 without errors)
- [x] Test after app refresh
- [x] Test after coming back from background

---

## 🔗 Related Files

### Modified:
1. [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx#L265-L297) - Fixed tips query to use fresh session
2. [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx#L300-L322) - Fixed creator revenue query to use fresh session

### Related (No Changes):
- [src/screens/WalletScreen.tsx](src/screens/WalletScreen.tsx#L50-L53) - Working correctly (reference implementation)
- [src/services/WalletService.ts](src/services/WalletService.ts) - No changes needed

---

## 💡 Lessons Learned

### 1. **Session Freshness Matters**
- React hook closures can capture stale session values
- Always get fresh session before making authenticated API calls
- Use `supabase.auth.getSession()` for latest token

### 2. **401 Errors Indicate Stale Tokens**
- If one screen works but another gets 401, check session freshness
- Don't rely on hook values for long-lived async operations

### 3. **Consistent Patterns**
- WalletScreen worked because it uses session immediately
- ProfileScreen failed because it used session from closure in async query
- Solution: Both should use fresh sessions

---

## ✅ Summary

### Problem:
- ProfileScreen showing "Tips Received: $0.00"
- 401 Authentication errors when fetching wallet transactions
- Stale session token from `useAuth()` hook closure

### Solution:
- Get fresh session using `supabase.auth.getSession()` before each API call
- Updated both `tips` and `creatorRevenue` queries
- Now matches WalletScreen's successful pattern

### Impact:
- ✅ Tips display correctly in Profile screen
- ✅ No more 401 authentication errors
- ✅ Consistent behavior with Digital Wallet screen
- ✅ Fresh session tokens for all authenticated requests

---

**Implementation Date:** December 14, 2025
**Status:** ✅ Complete & Tested
**User Experience:** Tips now display accurately 🎉
