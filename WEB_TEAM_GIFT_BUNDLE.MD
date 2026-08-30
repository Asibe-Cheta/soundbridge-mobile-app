# Web Team: Gift Bundle Feature — Backend API (GIFT_BUNDLE.MD, Item 36)

Mobile side (service, credit modal, onboarding hook, tip-flow integration) is built and
calling the endpoints below — currently 404ing until this ships. Database is done on our
side: migration `supabase/migrations/20260830000000_gift_bundle.sql` (already deployed to
the shared Supabase project) adds:

- `gift_bundle_balances` (`user_id` PK, `balance` INTEGER in **minor units**, `currency`,
  `updated_at`) — RLS: users can `SELECT` their own row only, no direct writes.
- `gift_bundle_transactions` (audit ledger: `id`, `user_id`, `type` ('credit'|'debit'),
  `amount` INTEGER minor units, `currency`, `reference_type`, `reference_id`, `created_at`)
  — RLS: users can `SELECT` their own rows only.
- `credit_gift_bundle(p_user_id, p_amount, p_currency, p_payment_intent_id) RETURNS INTEGER`
  — SECURITY DEFINER RPC, granted to `service_role`. Upserts the balance (+=) and inserts a
  `credit` transaction row. Returns the new balance.
- `debit_gift_bundle(p_user_id, p_amount, p_tip_id) RETURNS INTEGER` — SECURITY DEFINER RPC,
  granted to `service_role`. Raises `insufficient_gift_bundle_balance` if the balance is too
  low (also enforced by a `CHECK (balance >= 0)` as a second line of defence). Decrements the
  balance and inserts a `debit` transaction row. Returns the new balance.

**Units:** both RPCs take/return **minor currency units** (cents/pence), same convention as
`profiles.wallet_balance` / `increment_wallet_balance`. Convert dollars↔cents at the API
boundary — never pass a float dollar amount straight into these RPCs.

## What to build

### 1. `GET /api/gift-bundle/balance`
Returns `{ balance: number, currency: string }` in **major units** (dollars) — read
`gift_bundle_balances` for the authenticated user, convert from minor units, default to
`{ balance: 0, currency: 'USD' }` if no row exists yet (never 404/error for a user with no
balance — that's just their normal starting state).

### 2. `POST /api/payments/create-gift-bundle-credit`
Body: `{ amount: number, currency?: string }` (major units, e.g. `50` = $50).
Same shape as `create-tip`: create a Stripe PaymentIntent for `amount` (converted to minor
units for Stripe), return:
```json
{ "success": true, "paymentIntentId": "...", "clientSecret": "...", "customer_id": "...", "ephemeral_key_secret": "..." }
```
`customer_id`/`ephemeral_key_secret` optional, same as `create-tip`'s existing pattern (for
Apple Pay/saved cards via the PaymentSheet customer flow) — include if you already have that
plumbing for tips, skip if not.

### 3. `POST /api/payments/confirm-gift-bundle-credit`
Body: `{ paymentIntentId: string }`. Verify the PaymentIntent succeeded with Stripe (same
verification approach as `confirm-tip`), then call `credit_gift_bundle(user_id, amount_minor,
currency, paymentIntentId)`. Return `{ "success": true, "newBalance": number }` (major units).
Idempotent — if this PaymentIntent was already confirmed/credited, don't double-credit (check
`gift_bundle_transactions` for an existing row with that `reference_id` first, same idempotency
pattern already used in the wallet webhook migration).

### 4. Modify `POST /api/payments/create-tip`
`CreateTipRequest` gains a new `paymentMethod: 'gift_bundle'` value alongside the existing
`'card' | 'apple_pay' | 'google_pay'`. When `paymentMethod === 'gift_bundle'`:
- **Skip Stripe entirely** — no PaymentIntent is created.
- Call `debit_gift_bundle(tipper_user_id, amount_minor, tip_id)`. If it raises
  `insufficient_gift_bundle_balance`, return the exact-as-shown-to-user error:
  `{ "success": false, "error": "Your Gift Bundle balance isn't enough for this tip." }`
  (mobile shows backend `{error}` text verbatim, per the app's existing convention — don't
  change this wording without telling us, mobile may be showing it as-is).
- Otherwise, create the tip record exactly as a normal tip would (same table(s)/fields as the
  `card` path), and credit the **creator's** `profiles.wallet_balance` via the existing
  `increment_wallet_balance` RPC with the same 85%/15% split already used for card tips — Gift
  Bundle tips must pay creators identically to card tips, no different split.
- Response: extend `CreateTipResponse` with two new fields so mobile can skip the Stripe
  PaymentSheet flow entirely for this path:
  ```json
  { "success": true, "tipId": "...", "platformFee": 0.75, "creatorEarnings": 4.25, "paidFromGiftBundle": true, "newGiftBundleBalance": 12.50 }
  ```
  `clientSecret`/`paymentIntentId` can be omitted or empty strings when `paidFromGiftBundle`
  is `true` — mobile branches on `paidFromGiftBundle`, not on the presence/absence of those
  fields, so it's safe either way, but cleaner to omit them.
- `POST /api/payments/confirm-tip` should **not** be called by mobile for this path (there's
  no PaymentIntent to confirm) — the `create-tip` response above is the complete, final result
  for a Gift Bundle tip. No change needed to `confirm-tip` itself.

## Not in scope for this handoff (per GIFT_BUNDLE.MD's own scope boundaries)

- No reward-redemption system (discounted transport, free tickets) — the marketing copy
  references this, but it's separately scoped (Items 4 and 8) and not built yet. The balance
  must function purely for tipping until those land.
- No refund/withdrawal path for Gift Bundle balances — deliberately absent, not an oversight.

## Questions for you, if anything above doesn't match your actual Stripe/tip implementation

- Confirm the exact `tips`/`creator_tips` table(s) and columns `create-tip` currently writes
  to for the `card` path, so the `gift_bundle` path writes to the same place identically.
- Confirm whether `create-tip` already has an idempotency/dedup mechanism we should mirror for
  `confirm-gift-bundle-credit`.
