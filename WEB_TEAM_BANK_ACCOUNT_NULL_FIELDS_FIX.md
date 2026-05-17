# BUG FIX: creator_bank_accounts — Null Field Constraint Violations

## What Happened

A Nigerian user attempted to add their bank account and received this error:

```
null value in column "bank_name" of relation "creator_bank_accounts" violates not-null constraint
```

The same class of error can affect `account_number`, `account_type`, `bank_code`, and `currency` for any country.

---

## Root Cause

### Mobile (now fixed)

The form submission was building the payload like this:

```js
// ❌ BEFORE — bank_name only nested inside bank_details
const methodData = {
  method_type: 'bank_transfer',
  method_name: "John's Nigeria Account",
  account_holder_name: formData.account_holder_name,
  country: 'NG',
  currency: 'NGN',
  bank_details: formData,  // bank_name was only here
};
```

The backend was reading top-level fields directly (e.g. `methodData.bank_name`) rather than extracting them from `bank_details`, so they arrived as `undefined` → `null` → constraint violation.

### Mobile Fix Applied

```js
// ✅ AFTER — all key fields hoisted to top level
const methodData = {
  method_type: 'bank_transfer',
  method_name: "John's Nigeria Account",
  account_holder_name: formData.account_holder_name || '',
  bank_name:           formData.bank_name || '',
  account_number:      formData.account_number || formData.iban || '',
  account_type:        formData.account_type || 'checking',
  bank_code:           formData.bank_code || formData.swift_code || formData.branch_code || formData.routing_number || '',
  country:             selectedCountry,
  currency:            countryInfo?.currency || '',
  bank_details:        formData,   // still sent for backend flexibility
  is_default:          setAsDefault,
};
```

---

## What the Web Team Must Do

### 1. Mirror the same fix on the web form submission

When submitting a bank account from the web add-withdrawal-method form, ensure these fields are present **at the top level** of the payload sent to `POST /api/wallet/withdrawal-methods` (or whichever endpoint you use):

| Top-level field   | Source                                                                 |
|-------------------|------------------------------------------------------------------------|
| `bank_name`       | Selected bank name (from picker or free-text input)                   |
| `account_number`  | Account number or IBAN, depending on country                          |
| `account_type`    | `"checking"` or `"savings"` (default to `"checking"` if not applicable) |
| `bank_code`       | CBN code (NG), SWIFT (GH/UAE), sort code (GB), routing (US), etc.    |
| `account_holder_name` | Full name as entered                                              |
| `currency`        | Currency for the selected country                                      |
| `country`         | ISO 3166-1 alpha-2 country code (e.g. `"NG"`, `"GB"`)                |

Also send the full form data inside `bank_details` as a JSON object for future-proofing.

---

### 2. Backend API fix (critical)

The `/wallet/withdrawal-methods` POST handler must be defensive about where it reads each field. It should try both the top level and `bank_details` before inserting:

```js
// Pseudocode — apply to your actual backend language/framework
const bank_name     = body.bank_name     || body.bank_details?.bank_name     || null;
const account_number = body.account_number || body.bank_details?.account_number || body.bank_details?.iban || null;
const account_type  = body.account_type  || body.bank_details?.account_type  || 'checking';
const bank_code     = body.bank_code     || body.bank_details?.bank_code
                    || body.bank_details?.swift_code
                    || body.bank_details?.routing_number
                    || body.bank_details?.branch_code
                    || null;
const currency      = body.currency      || body.bank_details?.currency      || null;
const account_holder_name = body.account_holder_name || body.bank_details?.account_holder_name || null;
```

Then validate that `bank_name`, `account_number`, and `account_holder_name` are non-null **before** attempting the INSERT, and return a `400` with a clear message if they are missing — rather than letting the database throw a `500`.

---

### 3. Check all NOT NULL columns in creator_bank_accounts

Review the schema and confirm every NOT NULL column is either:
- Supplied from the request payload (using the defensive extraction above), or
- Has a sensible database-level default

Columns to audit:

| Column               | Must come from         | Suggested default if missing       |
|----------------------|------------------------|------------------------------------|
| `bank_name`          | Payload                | None — return 400 if absent        |
| `account_holder_name`| Payload                | None — return 400 if absent        |
| `account_number`     | Payload / `iban`       | None — return 400 if absent        |
| `account_type`       | Payload                | `'checking'`                       |
| `bank_code`          | Payload (various names)| `''` (empty string, nullable preferred) |
| `currency`           | Payload / country      | None — return 400 if absent        |
| `country`            | Payload                | None — return 400 if absent        |
| `method_type`        | Payload                | None — return 400 if absent        |
| `method_name`        | Payload                | Auto-generate from holder + country|
| `is_verified`        | —                      | See `WEB_TEAM_BANK_ACCOUNT_VERIFICATION_STATUS.md` |

---

## Countries Most Affected

Nigeria was the first reported case, but this bug affects **all countries** where form field names differ from what the backend reads at the top level. Countries to test:

- 🇳🇬 Nigeria — `bank_name` (picker) + `bank_code` (CBN 3-digit)
- 🇬🇧 UK — `bank_name` (picker) + `sort_code` + `account_number`
- 🇺🇸 USA — `bank_name` + `routing_number` + `account_number`
- 🇬🇭 Ghana — `bank_name` + `swift_code`
- 🇪🇺 SEPA — `bank_name` + `iban`
- 🇦🇪 UAE — `bank_name` + `iban`

---

## Priority

**High** — this blocks every user from adding a bank account for withdrawal.
Mobile fix is already shipped. Backend fix is required before any withdrawal flow works end-to-end.
