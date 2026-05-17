# ACTION REQUIRED: Bank Accounts Must Be Available to All Users

## Summary

The `creator_bank_accounts` table name is misleading. Bank accounts (withdrawal methods) must be accessible to **all authenticated users** — not just users with `is_creator = true`.

## Context

Any user on SoundBridge can:
- Receive tips from other users
- Get payouts from event ticket sales
- Earn from any other platform revenue stream

All of these require a bank account on file. Restricting bank account management to creators only would block regular users from withdrawing money they have legitimately earned.

## Required Backend Change

### Check your RLS policy on `creator_bank_accounts`

If your current RLS policy looks like this (creator-restricted):

```sql
-- ❌ WRONG — blocks non-creators
CREATE POLICY "Users can manage their bank accounts"
ON creator_bank_accounts
FOR ALL
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_creator = true
  )
);
```

It must be changed to:

```sql
-- ✅ CORRECT — all authenticated users
CREATE POLICY "Users can manage their bank accounts"
ON creator_bank_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Also verify INSERT policy specifically

```sql
CREATE POLICY "Users can insert their own bank accounts"
ON creator_bank_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

No `is_creator` check. No role check. Just ownership.

## Mobile Side Confirmation

The mobile `PaymentMethodsScreen` and `AddWithdrawalMethodScreen` have **zero** creator checks. The feature is open to all users on mobile. Any restriction is purely a backend RLS concern.

## Table Rename (Optional, Long-term)

Consider renaming `creator_bank_accounts` → `user_bank_accounts` or `withdrawal_methods` to avoid confusion. This would require a migration and updates to all queries referencing this table. Not urgent, but worth noting.

---

**Priority:** High — users who are not flagged as creators cannot add withdrawal methods and cannot receive payouts.

---

## Additional Fixes — Apply on Web If Not Already Done

These are bugs found and fixed on the mobile side. If your web app shares the same bank account form or API logic, apply the same corrections.

---

### Fix 1: Country List — Always Return All Supported Countries

**Problem:** The `/banking/countries` endpoint returns only ~10 countries. The web form was likely falling back to the backend list exclusively, causing countries like Nigeria to be missing from the picker.

**Fix:** The country list in the UI must always be built from a comprehensive hardcoded list (70+ countries). The backend response should only be used to *supplement* the list — add any countries returned by the API that are not already in the built-in list. Never rely solely on the backend response for the country dropdown.

**Logic (pseudocode):**
```
allBuiltin = [ /* full list of 70+ countries with country_code, country_name, currency */ ]
backendExtras = apiResponse.countries.filter(c => !allBuiltin.has(c.country_code))
finalList = [...allBuiltin, ...backendExtras].sortBy('country_name')
```

Do not replace the built-in list with the API response — always merge, built-in first.

---

### Fix 2: `account_holder_name` Must Be a Top-Level Field in the Request Body

**Problem:** When inserting a new bank account, the `account_holder_name` column in `creator_bank_accounts` has a `NOT NULL` constraint. The mobile form was sending it only nested inside `bank_details` (a JSON blob), not as a top-level field. This caused a DB constraint violation:

```
null value in column "account_holder_name" of relation "creator_bank_accounts" violates not-null constraint
```

**Fix:** Ensure `account_holder_name` is sent as a **top-level field** in the request body, not only inside `bank_details`:

```json
{
  "method_type": "bank_transfer",
  "method_name": "John's Nigeria Account",
  "account_holder_name": "John Doe",   // ← top-level, required
  "country": "NG",
  "currency": "NGN",
  "bank_details": {
    "account_holder_name": "John Doe", // ← also here is fine, but not sufficient alone
    "account_number": "...",
    "bank_code": "033"
  },
  "is_default": true
}
```

If your backend insert reads `account_holder_name` from `bank_details` rather than the top level, update the insert logic accordingly — whichever source is consistent with the schema.

---

### Fix 3: Keyboard Covers Country Search Input in Modal

**Problem:** On mobile web or hybrid views, when the country picker modal opens and the user taps the search input, the keyboard slides up and covers the input field, making it unusable.

**Fix:** Wrap the modal content in a keyboard-aware container:
- On iOS: use `padding` behavior so the modal content shifts up with the keyboard
- On Android: use `height` behavior

Also ensure that tapping a list item while the keyboard is still open registers correctly (equivalent of `keyboardShouldPersistTaps="handled"` in React Native). This may require `mousedown` / `pointerdown` event handling on web depending on the framework.

---

### Note on Bank Code Field (Nigeria / CBN)

The 3-digit CBN bank code (e.g. `033` for UBA) is required for NIBSS routing. Keep the field — it's not optional for Nigerian transfers.

**UX improvement to consider (web team discretion):** If the user selects their bank from a dropdown, the bank code can be auto-filled from a static lookup table on your end. This removes the need for users to look it up themselves. The mobile app currently shows a placeholder: *"e.g. 033 — Google '[your bank] CBN code Nigeria' (not a USSD code)"* — auto-filling from the bank selection would be a cleaner experience and worth implementing if you have the bank list available.
