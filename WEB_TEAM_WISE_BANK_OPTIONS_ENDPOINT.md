# Web Team: Wise Bank Options Proxy Endpoint Required

## Priority: P1 — Required for correct payout recipient creation

## Problem

`creator_bank_accounts.routing_number_encrypted` currently stores whatever bank code the user typed or selected from our hardcoded lists — CBN codes for Nigeria (e.g. `"058"` for GTB), BIC/SWIFT codes for UK, etc. These are **not** the same codes Wise expects when creating a recipient via `POST /v1/accounts`.

Wise has its own internal bank codes (`valuesAllowed` from its `account-requirements` endpoint). Sending the wrong code causes 422 errors (e.g. `"Account type is not valid"`, `"bankCode is invalid"`).

## Required Endpoint

```
GET /api/payouts/bank-options?currency=NGN
Authorization: Bearer <user JWT>
```

**What it does:**
Proxies `GET /v1/account-requirements?source=USD&target={currency}&sourceAmount=100` from Wise and returns the bank list for that currency's primary recipient type.

**Response shape:**
```json
{
  "currency": "NGN",
  "wise_type": "nigeria",
  "banks": [
    { "name": "Access Bank", "code": "ACCESS" },
    { "name": "UBA (United Bank for Africa)", "code": "UBA" },
    { "name": "Zenith Bank", "code": "ZENITH" }
  ]
}
```

Where `code` is Wise's internal value from `valuesAllowed[].key` for the `bankCode` field in the account-requirements response.

**How to extract from Wise response:**
```ts
// GET /v1/account-requirements?source=USD&target=NGN&sourceAmount=100
const requirements = await wise.get('/v1/account-requirements', { source: 'USD', target: currency, sourceAmount: 100 });

// Find the primary type (e.g. "nigeria" for NGN)
const primaryType = requirements[0]; // first entry
const wiseType = primaryType.type;

// Find the bankCode field
const bankCodeField = primaryType.fields
  .flatMap((f: any) => f.group)
  .find((f: any) => f.key === 'bankCode');

const banks = (bankCodeField?.valuesAllowed || []).map((v: any) => ({
  name: v.name,
  code: v.key,
}));
```

## Currencies That Need This

| Currency | Wise Type | Has Bank Dropdown |
|---|---|---|
| NGN | `nigeria` | Yes — `bankCode` (Wise internal codes) |
| GHS | `ghana_local` | Yes — `bankCode` |
| KES | `kenya_local` | Yes — `bankCode` |
| KES | `kenya_mobile` | No — just mobile number |
| ZAR | `southafrica` | Yes — `bankCode` (BIC/SWIFT) |
| TZS | `tanzania_local` | Yes — `bankCode` |
| UGX | `uganda_local` | Yes — `bankCode` |

IBAN-based currencies (EUR, GBP sort_code, USD aba) do not need a bank dropdown — the user enters the IBAN/sort code/routing number directly.

## Caching

Cache responses per currency for 24 hours — Wise's bank list changes rarely. Do not call Wise on every form load.

## Also Required: Store Wise Bank Code Correctly

When the admin initiates a payout via Wise (`POST /api/admin/payouts/initiate`):

1. Read `creator_bank_accounts.routing_number_encrypted` as the Wise `bankCode`
2. Read `creator_bank_accounts.account_number_encrypted` as the account number
3. The Wise recipient `type` must match the currency — use the lookup table in `WEB_TEAM_PAYOUT_ELIGIBILITY_AND_BANK_VERIFICATION.md §4`

**For the current pending UBA NGN payout:**
- Call `GET /v1/account-requirements?source=USD&target=NGN&sourceAmount=40` to get Wise's bank list
- Find UBA's internal `code` from `valuesAllowed`
- Use `type: "nigeria"` and that `code` as `bankCode` in `POST /v1/accounts`
- The account number (NUBAN) from `creator_bank_accounts.account_number_encrypted` is correct

## Summary Checklist

- [ ] `GET /api/payouts/bank-options?currency=NGN` endpoint (proxies Wise account-requirements)
- [ ] Returns `{ wise_type, banks: [{ name, code }] }` with Wise internal bank codes
- [ ] 24-hour cache per currency
- [ ] Admin payout route uses `routing_number_encrypted` as Wise `bankCode`
- [ ] Admin payout route uses correct `type` per currency (from §4 of payout eligibility doc)
