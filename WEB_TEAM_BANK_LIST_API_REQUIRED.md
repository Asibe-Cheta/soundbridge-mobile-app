# WEB_TEAM_BANK_LIST_API_REQUIRED.md

**Date:** 2026-03-01 (updated)
**Priority:** HIGH
**For:** Backend team

---

## Context

The mobile app bank account form fetches the list of valid banks dynamically from the backend. When the user selects any country, the app calls this endpoint and displays a searchable bank picker if a list is returned. If the list is empty, the field falls back to free-text input.

**The backend is the sole source of truth for which countries have bank lists.** The mobile has no hardcoded country exclusions — it just renders whatever the backend returns.

The goal is for **every country** to return a usable bank list — including UK, EU/IBAN countries, and global markets — so users never have to guess or type their bank name manually.

---

## Endpoint to Build

```
GET /api/banks
Query params:
  country  — ISO 3166-1 alpha-2 country code (e.g. "NG", "GB", "DE", "US")
  currency — ISO 4217 currency code (e.g. "NGN", "GBP", "EUR", "USD")
Auth: Bearer token (standard user auth)
```

### Response — countries WITH a bank list

```json
{
  "banks": [
    { "name": "Access Bank", "code": "044" },
    { "name": "Zenith Bank", "code": "057" }
  ]
}
```

For IBAN/UK countries the `code` field will be a BIC or left as an empty string — the mobile only uses it to auto-fill the code field where applicable.

### Response — countries WITHOUT a bank list

```json
{ "banks": [] }
```

**Never return an HTTP error for this endpoint.** Empty array = no picker, free-text input is shown instead. This should only happen if both data sources fail for a given country.

---

## Implementation: Two-Source Strategy

The previous version of this doc proposed using only the Wise `account-requirements` API. Research has confirmed that **Wise does not return a bank list for UK or any IBAN country** (DE, FR, NL, IT, ES, etc.) because in those countries an IBAN or sort code self-identifies the bank. This means UK users would always get a free-text field with no suggestions.

To solve this, the backend must use **two data sources** and combine them:

| Source | Coverage | What it returns |
|--------|----------|-----------------|
| **Wise `account-requirements` API** | Non-IBAN countries (NG, GH, IN, BR, PH, ID, etc.) | Bank name + bank code, embedded in form field definition |
| **APILayer Bank Data API** | Global — including UK, DE, FR, NL and all IBAN countries | Bank name + bank id |

The logic is simple: **try Wise first. If Wise returns an empty list for the country, fall back to APILayer.**

---

## Source 1: Wise `account-requirements` API

This is the preferred source for non-IBAN countries because it returns bank codes that Wise itself uses for payouts — they are accurate and always up to date.

### Endpoint

```
POST https://api.transferwise.com/v1/quotes/{quoteId}/account-requirements
  — or —
GET  https://api.transferwise.com/v1/account-requirements?source=USD&target={currency}&sourceAmount=100
Authorization: Bearer {WISE_API_KEY}
```

The simpler GET form works for most cases. It returns a JSON array of field definitions. Find the field with `"key": "bankCode"` (or similar) and extract its `valuesAllowed` array.

### Wise response shape (relevant field only)

```json
[
  {
    "type": "sort_code",
    "fields": [
      {
        "name": "Recipient Bank Name",
        "group": [
          {
            "key": "bankCode",
            "type": "select",
            "required": true,
            "valuesAllowed": [
              { "key": "044", "name": "Access Bank" },
              { "key": "057", "name": "Zenith Bank" }
            ]
          }
        ]
      }
    ]
  }
]
```

### Extraction logic

```typescript
// Find the bankCode select field anywhere in the nested response
function extractWiseBanks(requirements: any[]): { name: string; code: string }[] {
  for (const req of requirements) {
    for (const field of req.fields ?? []) {
      for (const group of field.group ?? []) {
        if (group.key === 'bankCode' && Array.isArray(group.valuesAllowed)) {
          return group.valuesAllowed.map((b: { key: string; name: string }) => ({
            name: b.name,
            code: b.key,
          }));
        }
      }
    }
  }
  return [];
}
```

### Countries where Wise returns a bank list

| Region | Countries |
|--------|-----------|
| Sub-Saharan Africa | NG, GH, KE, ZA, TZ, UG, ET, CI, SN, CM, ... |
| North Africa / Middle East | EG, MA, TN, TR, ... |
| South Asia | IN, PK, BD, LK, NP |
| Southeast Asia | ID, MY, PH, TH, VN, MM |
| East Asia | CN, KR, JP |
| Latin America | BR, MX, AR, CL, CO, PE, UY, CR, EC |
| Eastern Europe / CIS | UA, GE, RS, BA, MK |
| North America | US, CA |
| Asia-Pacific | SG, HK, AU, NZ |

### Countries where Wise returns NO bank list (fall through to Source 2)

- **UK (GB):** uses sort code — no bank picker from Wise
- **All IBAN countries:** DE, FR, IT, ES, NL, BE, AT, PT, GR, SE, NO, DK, FI, CH, PL, CZ, HU, RO, BG, HR, SK, SI, EE, LV, LT, LU, MT, CY, AE, IL

---

## Source 2: APILayer Bank Data API (UK + IBAN Countries)

For any country where Wise returns an empty list, call APILayer's Bank Data API. This is a global bank directory that covers UK and all IBAN countries.

### Sign up

Register at: **https://apilayer.com/marketplace/bank_data-api**

Recommended plan for production: **Starter ($39.99/month, 2,500 requests/month)**. With a 7-day Redis cache per country, 2,500 requests comfortably covers ~350 country-level refreshes per month — sufficient for a global user base. See the Caching section below for why per-user request volume is not the concern.

The free tier (100 requests/month) is only suitable for development/testing.

### Endpoint

```
GET https://api.apilayer.com/bank_data/banks_by_country?country_code={country}
apikey: {APILAYER_API_KEY}
```

Note: the API key goes in the `apikey` header, not `Authorization`.

### Response shape

```json
[
  { "id": 12345, "name": "Barclays Bank PLC" },
  { "id": 12346, "name": "HSBC UK Bank plc" },
  { "id": 12347, "name": "Lloyds Bank plc" },
  { "id": 12348, "name": "NatWest" },
  { "id": 12349, "name": "Monzo Bank Limited" }
]
```

### Mapping to mobile format

```typescript
const res = await fetch(
  `https://api.apilayer.com/bank_data/banks_by_country?country_code=${country}`,
  { headers: { apikey: process.env.APILAYER_API_KEY } }
);
const data: { id: number; name: string }[] = await res.json();

return data.map(b => ({
  name: b.name,
  code: '',  // APILayer does not return routing codes — leave blank, user fills sort code/IBAN separately
}));
```

For IBAN/UK countries the routing code (sort code, IBAN) is typed by the user manually in a separate field — the bank picker is purely for the bank name field. The `code` field can be empty string for these countries.

---

## Combined Handler Logic

```typescript
async function getBanks(country: string, currency: string) {
  // 1. Check Redis cache first
  const cacheKey = `banks:${country}:${currency}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Try Wise account-requirements
  let banks = await getWiseBanks(currency);

  // 3. If Wise returned nothing, try APILayer
  if (banks.length === 0) {
    banks = await getAPILayerBanks(country);
  }

  // 4. Cache the result (even empty arrays — avoids repeated failed lookups)
  await redis.set(cacheKey, JSON.stringify(banks), 'EX', 60 * 60 * 24 * 7); // 7-day TTL

  return banks;
}

// Always return safely — never throw
export async function handleGetBanks(country: string, currency: string) {
  try {
    const banks = await getBanks(country, currency);
    return { banks };
  } catch {
    return { banks: [] };
  }
}
```

---

## Caching

Bank lists change very rarely (new banks appear maybe a few times per year). Cache aggressively.

```
Key:  banks:{country}:{currency}
TTL:  7 days (604800 seconds)
Store: Redis
```

**Important note on request volume:** The 100/month or 2,500/month limits on APILayer apply to backend-to-APILayer calls, not per user. Once Nigeria's bank list is cached, all Nigerian users are served from Redis with zero additional APILayer calls until the cache expires. With a 7-day TTL and ~50 active countries, the backend makes at most ~215 APILayer calls per month — well within the Starter plan.

For Wise, rate limits are generous for this use case (bank lists are a lightweight call). The same caching strategy keeps usage minimal.

---

## How the Mobile Uses This

When the user selects or changes their country:

1. Mobile calls `GET /api/banks?country=GB&currency=GBP`
2. If response has `banks.length > 0` → shows a **searchable modal picker** for the bank name field
3. Selecting a bank auto-fills the bank code field (sort_code / swift_code / branch_code / bank_code depending on country schema) where `code` is non-empty
4. If `banks.length === 0` → falls back to free-text input

The mobile shows a loading spinner while the request is in flight. The transition is seamless.

---

## Environment Variables Required

Add these to the backend `.env` / secrets manager:

```
WISE_API_KEY=           # Already exists — see PAYMENT_INTEGRATION_STRIPE_WISE.md
APILAYER_API_KEY=       # New — from apilayer.com account
```

---

## Related Documents

- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — Wise API key and integration details
- `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md` — wallet credit flow

---

*Document created: 2026-02-28 | Updated: 2026-03-01 — added APILayer as second source for UK and IBAN countries*
