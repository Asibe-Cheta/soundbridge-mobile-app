# Web → Mobile Response: Is bank-detail encryption a DB trigger or API-only?

**From:** Web team / Justice
**Date:** 2026-08-09
**Re:** Follow-up on `WEB_TEAM_WITHDRAWAL_VERIFICATION_BUG_RESPONSE.MD`

---

## Direct answer: it's API-only, not a DB trigger — and it can't be a trigger

Good instinct to check before assuming. Unlike the Fincra-rail verification fix
(which *is* a DB trigger, so every client automatically gets it for free),
encryption is enforced in application code (`encryptSecret()` in
`apps/web/src/lib/encryption.ts`, called from the web save route), not the
database. Reason: it's AES-256-GCM using `TOTP_ENCRYPTION_KEY`, a server-only
Node environment variable. Postgres has no access to that value — a trigger
would need the key available to the database itself (pgcrypto + Supabase
Vault or similar), which is real, different infrastructure, not something we
can bolt on the way we did for the verification-status trigger.

**This means your write path needs to change** — confirmed by checking your
code directly:

`src/services/revenueService.ts` — `setBankAccount()` (lines ~117-150) still
upserts straight into `creator_bank_accounts` from the app, and `getBankAccount()`
(lines ~92-115) still selects `*` directly too. Neither goes through any web
API, so neither is covered by the encryption fix — every mobile bank-account
save will keep writing plaintext, and every read will keep pulling the raw
(soon-to-be-encrypted-and-therefore-unreadable-garbage) value straight to the
device, indefinitely, until this changes on your side.

## The fix: route through the web API — one blocker we already found and fixed for you

`POST /api/user/revenue/bank-account` and `GET /api/user/revenue/bank-account`
already do the encryption/decryption/masking correctly. But we found while
writing this response that the route only accepted session-cookie auth
(`createRouteHandlerClient({ cookies })`), which doesn't work for a mobile
`fetch` at all — so pointing you at it before now would've just given you
401s. **Already fixed on our side**: it now uses `getSupabaseRouteClient`,
which accepts either a cookie (web) or an `Authorization: Bearer <token>`
header (mobile) — the same helper your other web-API calls already use (e.g.
`complete-onboarding`).

### `setBankAccount` — new implementation

```ts
async setBankAccount(userId: string, formData: BankAccountFormData & Record<string, unknown>): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${config.apiUrl}/api/user/revenue/bank-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: result?.error || 'Failed to save bank account information' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving bank account:', error);
    return { success: false, error };
  }
}
```

### `getBankAccount` — new implementation

```ts
async getBankAccount(userId: string): Promise<BankAccount | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${config.apiUrl}/api/user/revenue/bank-account`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.has_account) return null;

    return { ...result, account_number_encrypted: '', routing_number_encrypted: '' };
  } catch (error) {
    console.error('Error fetching bank account (returning null):', error);
    return null;
  }
}
```

`userId` params are unused now (the route derives the user from the bearer
token) — kept in the signature so `PaymentMethodsScreen.tsx` doesn't need to
change its call sites at all.

## Important: this will silently break NG/GH/KE saves unless you also fix the field mapping

Checked `handleCountryAwareBankSubmit` in `PaymentMethodsScreen.tsx` (~line
300-310) — it currently builds:

```ts
const formData = {
  account_holder_name: ...,
  bank_name: ...,
  account_number: ...,
  routing_number: methodData.bank_code || methodData.routing_number || methodData.routingNumber || '',
  account_type: ...,
  currency: derivedCurrency,
};
```

It aliases `bank_code` **into** `routing_number` and never sends `country` at
all. The web API route does country-specific validation keyed on an explicit
`country` field (defaults to `'US'` if absent) and checks `bank_code`
specifically for Nigeria (not `routing_number`). If you swap the fetch target
without also fixing this, every Nigerian/Ghanaian/Kenyan save will hit the
default US branch, get told "Routing number must be 9 digits," and fail —
the exact same class of bug as Matthew's, just moved one step earlier in the
flow. Add `country` and keep `bank_code`/`swift_code`/`branch_code` as their
own fields instead of collapsing them into `routing_number`:

```ts
const countryForCurrency: Record<string, string> = { NGN: 'NG', GHS: 'GH', KES: 'KE' };
const formData = {
  account_holder_name: methodData.account_holder_name || methodData.accountHolderName,
  bank_name: methodData.bank_name || methodData.bankName,
  account_number: methodData.account_number || methodData.accountNumber,
  account_type: methodData.account_type || methodData.accountType || 'checking',
  currency: derivedCurrency,
  country: methodData.country || countryForCurrency[derivedCurrency] || 'US',
  bank_code: methodData.bank_code,
  swift_code: methodData.swift_code,
  branch_code: methodData.branch_code,
  routing_number: methodData.routing_number || methodData.routingNumber,
};
```

The simple (non-country-aware) `handleSave` path (~line 270-296) is unaffected
— it's already US-only and already requires a 9-digit `routing_number`,
matching the API's default branch exactly.

## Not in scope for this response, but check while you're in there

`PaymentMethodsScreen.tsx` line ~104 pre-fills form state from
`getBankAccount()`'s result the same way `BankAccountManager.tsx` did on web
before we fixed it — if it ever puts `bankAccount.account_number_encrypted`
into an editable field or a "reveal" view, that'll show either an empty
string (fine) or garbled ciphertext (not fine) once this ships, depending on
exactly how it's wired. We fixed the equivalent web bug by leaving
account_number/routing_number blank on edit (forcing re-entry, like any other
credential field) and using a `account_number_masked` field for display
instead of the raw column. Worth a quick look on your end — we can't see your
JSX from here well enough to say definitively whether it's affected.

## Testing checklist

- [ ] Simple (US-style) bank account save still works end-to-end.
- [ ] NG/GH/KE bank account save works with the field mapping fix above — this is the one most likely to silently break.
- [ ] Existing saved account still loads and displays (masked, not raw/garbled) after this ships.
- [ ] `getBankAccount` returns `null` gracefully for a user with no bank account (unchanged behavior).

If you'd rather not touch this right now, the alternative is a DB-level
solution (pgcrypto + Vault) so no client — yours, ours, or a future one — can
ever bypass it again. That's real infrastructure work, not a quick fix, so we
didn't just do it, but flagging it if "no client can get this wrong" matters
enough to be worth the investment.
