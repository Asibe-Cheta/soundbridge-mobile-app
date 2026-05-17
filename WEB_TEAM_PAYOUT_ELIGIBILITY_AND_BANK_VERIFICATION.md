# Payout eligibility & bank account verification (mobile team)

## 1. GET /api/payouts/eligibility — never throws

**Fixed.** The handler now always returns **200** with a valid eligibility object. It never throws or returns 5xx for “no verified bank account” or RPC failures.

**Response shape (always 200 when authenticated):**

```json
{
  "success": true,
  "eligible": false,
  "reasons": ["No verified bank account"],
  "eligibility": {
    "eligible": false,
    "reasons": ["No verified bank account"],
    "available_balance": 0,
    "pending_requests": 0,
    "min_payout": 25,
    "withdrawable_amount": 0
  },
  "available_balance": 0,
  "pending_requests": 0,
  "min_payout": 25,
  "withdrawable_amount": 0
}
```

- **`eligible`**: `true` only when the user has at least one verified bank account and sufficient balance (withdrawable ≥ min_payout).
- **`reasons`**: List of blocking reasons, e.g. `"No verified bank account"`, `"Insufficient balance"`, `"Unable to verify bank account"`, `"Unable to determine balance"`, `"Unable to determine eligibility"`.
- Balance fields may be omitted if the balance RPC fails; `min_payout` is always present (25). Use `eligible` + `reasons` for UX; use the numeric fields for display when present.

**Auth:** If the user is not authenticated, the API still returns **401** (no 200 body). Only the *eligibility logic* is non-throwing and always returns a valid object on 200.

**Mobile:** For any **200** response, do not throw. Parse the JSON and use `eligible` and `reasons` (and optional balance fields). Treat `eligible: false` as a valid result and show `reasons` in the UI (e.g. "No verified bank account"); only treat **non-2xx** as a network/error state and then show a generic message or retry — do not use the body’s `error` string to throw, since the API no longer returns 5xx for eligibility.

---

## 2. How a bank account gets marked as verified (`creator_bank_accounts`)

Verification is **automated** in the current flows; there is **no manual admin step** that creators depend on for payouts.

| Flow | How it’s verified | Where it’s set |
|------|-------------------|----------------|
| **Wise-routed currencies** | Treated as verified **on submission**. We do not call Wise for account validation; we set `is_verified = true` and `verification_status = 'verified'` when the currency is in our Wise list (e.g. NGN, GHS, GBP, EUR, etc.). | `apps/web/app/api/user/revenue/bank-account/route.ts` (POST), `apps/web/src/lib/revenue-service.ts` (`setBankAccount`). Both use `isWiseCurrency(currency)` and set `is_verified: isWise`, `verification_status: isWise ? 'verified' : 'pending'`. |
| **Stripe Connect** | Verified when Stripe enables the account. We update `creator_bank_accounts` from the **Stripe webhook** `account.updated`: `is_verified = account.charges_enabled`, `verification_status = account.charges_enabled ? 'verified' : 'pending'`. | `apps/web/app/api/stripe/webhook/route.ts` (case `account.updated`). |

So:

- **Wise path:** Verification is **automated at submission** for Wise-routed currencies (no separate validation call; we trust the currency list and user input).
- **Stripe path:** Verification is **automated via Stripe’s webhook** when Stripe sets `charges_enabled`; no manual admin step.

**Non–Wise, non–Stripe (e.g. manual bank details for a non-Wise currency):** Stored with `verification_status = 'pending'` and `is_verified = false`. There is currently **no automated verification** (e.g. micro-deposits or provider callbacks) for this path. If you rely on that flow at scale, it would need an automated verification step before launch; the current “at scale” paths are Wise (auto-verified on submit) and Stripe (auto-verified via webhook).

**References:**  
- Wise list: `apps/web/src/lib/wise-currencies.ts` (`isWiseCurrency`).  
- One-off data fixes (existing rows): `migrations/wise_creator_bank_accounts_auto_verify.sql`, `migrations/fix_bank_account_is_verified.sql` — these are not the ongoing verification flow.

---

## 3. Payout request currency (POST /api/payouts/request)

**Decision: Mobile sends `currency: "USD"` and amount in USD. Backend handles conversion via Wise API.**

The wallet balance is denominated in USD. Requiring the mobile to convert USD → NGN before submitting is unnecessary complexity — it would need live exchange rates, rounding logic, and introduces a second source of truth.

**Wise natively supports source/target currency separation.** The correct approach is:

```
POST /v1/transfers (Wise API)
{
  "sourceCurrency": "USD",
  "targetCurrency": "NGN",
  "sourceAmount": 40.44,   // or omit and use targetAmount
  "targetAccount": <wise_account_id for creator’s NGN bank>
}
```

Wise converts at the live mid-market rate and sends NGN to the creator’s bank. No pre-conversion needed.

**Required backend change (admin payout initiate flow):**

When `POST /api/admin/payouts/initiate` processes a payout request:

1. Read `payout_requests.amount` (USD) and `payout_requests.currency` (USD)
2. Look up creator’s `creator_bank_accounts` row to get `currency` (e.g. NGN) and bank details
3. Call Wise `createTransfer` with:
   - `sourceCurrency: "USD"`
   - `targetCurrency: bankAccount.currency` (e.g. `"NGN"`)
   - `sourceAmount: payout_requests.amount`
4. Wise handles the rate and conversion automatically

This keeps the wallet in USD, payout requests in USD, and lets Wise do what it’s designed to do. No mobile changes needed — mobile already sends USD.

---

## 4. Wise Recipient Types — Correct Values Per Currency

**Critical:** The recipient `type` sent to `POST /v1/accounts` (Wise) must match exactly what Wise's `GET /v1/account-requirements` returns for that currency. Using wrong types (e.g. `"nuban"`, `"bank_code"`) causes 422 errors.

### Always call account-requirements first

```
GET https://api.wise.com/v1/account-requirements?source=USD&target=NGN&sourceAmount=100
Authorization: Bearer <WISE_API_TOKEN>
```

Returns an array of available `type` values and their required `details` fields for that currency. Use the `type` from this response — never hardcode.

---

### Quick-Reference: Correct Type Strings Per Currency

| Currency | Country | Type String(s) | Key Account Fields |
|---|---|---|---|
| **NGN** | Nigeria | `nigeria` | `bankCode` (dropdown) + `accountNumber` (10 digits NUBAN) |
| **GBP** | UK | `sort_code`, `iban`, `swift_code` | `sortCode` (6 digits) + `accountNumber` (8 digits) |
| **EUR** | Europe | `iban`, `swift_code` | `IBAN` (uppercase key) |
| **USD** | US | `aba`, `fedwire_local`, `swift_code` | `abartn` (9-digit routing) + `accountNumber` + `accountType` |
| **KES** | Kenya | `kenya_mobile`, `kenya_local` | M-PESA: `accountNumber` (mobile) / Bank: `bankCode` + `accountNumber` |
| **GHS** | Ghana | `ghana_local` | `bankCode` + `accountNumber` (8–20 digits) |
| **ZAR** | South Africa | `southafrica` | `bankCode` (BIC/SWIFT) + `accountNumber` (7–11 digits) |
| **CAD** | Canada | `canadian`, `interac` | `institutionNumber` (3d) + `transitNumber` (5d) + `accountNumber` |
| **AUD** | Australia | `australian`, `australian_bpay` | `bsbCode` (BSB, async validated) + `accountNumber` |
| **INR** | India | `indian`, `indian_upi` | `ifscCode` (11 chars, async) + `accountNumber` |
| **BRL** | Brazil | `brazil`, `brazil_business` | `bankCode` + `branchCode` + `accountNumber` + `cpf` (async) |
| **MXN** | Mexico | `mexican` | `clabe` (18 digits) |
| **PHP** | Philippines | `philippines`, `philippinesmobile` | `bankCode` + `accountNumber` |
| **SGD** | Singapore | `singapore`, `singapore_paynow` | `bankCode` + `accountNumber` or UEN/mobile |
| **JPY** | Japan | `japanese` | `bankCode` (4d) → then `branchCode` (cascading) + `accountNumber` |
| **TZS** | Tanzania | `tanzania_local` | `bankCode` + `accountNumber` (8–20 digits) |
| **UGX** | Uganda | `uganda_local` | `bankCode` + `accountNumber` (8–20 digits) |
| **ZAR** | South Africa | `southafrica` | `bankCode` (BIC/SWIFT) + `accountNumber` |

---

### NGN — Full Spec (Current Active Currency)

```json
POST /v1/accounts
{
  "profile": "<WISE_PROFILE_ID>",
  "accountHolderName": "Uche Onyekachukwu Merit",
  "currency": "NGN",
  "type": "nigeria",
  "details": {
    "legalType": "PRIVATE",
    "bankCode": "<wise_internal_bank_code>",
    "accountNumber": "0123456789",
    "address": {
      "country": "NG",
      "city": "Lagos",
      "firstLine": "123 Main Street",
      "postCode": "100001"
    }
  }
}
```

- `type` must be `"nigeria"` — NOT `"nuban"`, NOT `"bank_code"`
- `accountNumber` must be exactly 10 digits (NUBAN format)
- `bankCode` is Wise's internal dropdown code — get valid values from `GET /v1/account-requirements` response under `fields[].group[].key === "bankCode"` → `valuesAllowed[]`
- `legalType`: `"PRIVATE"` for individuals, `"BUSINESS"` for companies

---

### Universal address fields (required for all currencies)

```json
"address": {
  "country": "NG",       // ISO 3166-1 alpha-2
  "city": "Lagos",
  "firstLine": "123 Main Street",
  "postCode": "100001"
}
```

---

### Implementation Notes

1. **Never hardcode field lists** — always call `GET /v1/account-requirements` first. Wise updates requirements periodically.
2. **Cascading fields** — for Japan (and some others), after selecting `bankCode` you must re-POST to `/v1/account-requirements` with current details to get branch-level fields (`refreshRequirementsOnChange: true`).
3. **Async validation** — Australia (BSB), India (IFSC), Brazil (CPF/branch) have server-side async validation via a URL in the `validationAsync` field of the requirement.
4. **IBAN field key is uppercase** — `"IBAN"` and `"BIC"` in the `details` object, not `"iban"` / `"bic"`.
5. **USD routing key** — `"abartn"` (not `"routingNumber"`).
6. **Idempotency** — include `X-idempotency-uuid` header on `POST /v1/accounts` to safely retry.
7. **Sandbox:** `https://api.sandbox.transferwise.tech` / **Production:** `https://api.wise.com`

---

## 5. Server logs when payout request fails

When `POST /api/payouts/request` fails:

- **500:** Supabase/RPC threw; server logs **`create_payout_request_for_user RPC error:`** with `message`, `code`, `details`, `hint`.
- **400:** RPC returned `success: false`; server logs **`create_payout_request_for_user rejected:`** with `error` (exact string, e.g. "Insufficient balance or pending requests", "No verified bank account found"), `creator_id`, `amount`, `currency`, and `eligibility` (the same object returned to the client). The response body includes `error` and optionally `eligibility` so the client can show the exact reason.
