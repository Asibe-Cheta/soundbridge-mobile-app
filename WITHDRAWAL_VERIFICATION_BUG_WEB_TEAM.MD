FULL REPORT — Withdrawal Blocked Despite "Active" Bank Status

Reported by: a creator (Matthew Omadivi, matthewenejiomadivi04@gmail.com,
username `matthewenejiomadivi04`) via support email, subject "Withdrawal
issue," 08/08/2026 7:53 AM. He has $34.00 earned (2 tips) and cannot withdraw
it. Investigated end-to-end (mobile code + live DB query against his actual
account). Four distinct findings below — #1 is fixed on mobile already, #2 is
the actual blocker and is backend-owned, #3 is a UX gap, #4 is a security
finding unrelated to the withdrawal issue that surfaced during investigation.

## 1. FIXED (mobile) — Verification Status display was hardcoded, not real

`src/screens/PaymentMethodsScreen.tsx` had a `WISE_CURRENCIES` set (NGN, GHS,
KES, and ~25 others — currencies routed through Fincra/Wise instead of
Stripe) that caused the "Verification Status" line to unconditionally display
**"Active"** for any bank account in one of those currencies, regardless of
the real `creator_bank_accounts.verification_status` value:

```tsx
// BEFORE (the bug):
{WISE_CURRENCIES.has(bankAccount.currency) ? 'Active' : bankAccount.verification_status...}
```

This is why Matthew's Payment Methods screen showed his UBA account as
"Active" with a green checkmark, while the separate "Verified" badge
(`bankAccount.is_verified && (...)`, a few lines below — correctly gated on
the real boolean) never rendered. Same screen, contradicting itself, and
easy to miss since "Active" reads as authoritative.

**Fixed** — now always renders the real `verification_status` (`pending` /
`verified` / `failed`), using the existing color/icon mapping that already
supports all three states correctly. No schema or backend change involved;
this was pure client-side display logic.

**Consequence, not just cosmetic:** this likely caused Matthew to believe he
was already fully set up and never looked for (or reported sooner) whatever
step was actually still pending — see #2.

## 2. NOT FIXED (backend-owned) — nothing ever attempts real verification

This is the actual reason he's blocked, and it's not a mobile bug.

Queried his live `creator_bank_accounts` row directly:

```
verification_status: "pending"
is_verified: false
verification_attempts: 0          <-- zero, not just unverified
stripe_account_id: null
stripe_account_status: null
created_at: 2026-08-08 06:02:58
updated_at: 2026-08-08 06:14:02
verified_at: null
```

`verification_attempts: 0` means no verification attempt has been made at
all — not "attempted and failed," genuinely never tried. Traced the mobile
save path (`revenueService.setBankAccount`, `src/services/revenueService.ts:117-142`):
it's a **direct client-side Supabase upsert** into `creator_bank_accounts`
with `verification_status: 'pending'` hardcoded at write time. There is no
API call, no Fincra recipient creation, no webhook trigger, nothing — mobile
just writes the row and stops. Whatever is supposed to pick up `pending`
rows and actually verify them via Fincra must live entirely server-side, and
for this account it never ran.

Questions for you to check on your end, since none of this is visible from
the mobile repo:
- Is there meant to be an automatic process (cron/queue/webhook) that picks
  up new `pending` `creator_bank_accounts` rows and calls Fincra to verify
  them? Is it running? Did it error for this row specifically, or is it
  backlogged?
- Or is verification meant to be a manual admin action? If so, is there a
  queue/dashboard for that, and is this account just not yet reached, or
  stuck?
- The admin "Verified Banks" dashboard list does **not** show his account at
  all (not even as "pending" — a `merituche2003@gmail.com` row several
  entries down does show `pending`, so the admin list isn't filtering
  pending rows out categorically). His row is the most recently
  created/updated of everything visible on that page, so if the list sorts
  by recency it should be at/near the top — worth checking why it isn't
  showing up there at all.

## 3. UX gap (mobile, not yet changed — flagging for a decision)

`handleSave` in `PaymentMethodsScreen.tsx` shows `Alert.alert('Success',
'Bank account information saved successfully!')` after saving, with no
mention that verification is pending or that withdrawal won't work until
it completes. Combined with #1 (now fixed) and #2 (verification never
actually running), a creator currently has no way to know their withdrawal
is blocked until they try to withdraw and hit the "No verified bank
account" wall — same day he saved his details, in Matthew's case.

Separately, "Stripe Account Status: Unknown — Unable to check account
status" displays for every Fincra/NGN-rail creator, since they never have a
`stripe_account_id` at all (`null` is expected and correct here, not an
error) — but the message reads like something is broken. Worth hiding this
card entirely for `WISE_CURRENCIES`-routed accounts, or relabeling to
something like "Not applicable — your payouts route via Fincra" instead of
"Unable to check."

Not changing either of these on mobile yet since the right copy/flow depends
on what #2 turns out to be (e.g. if verification is meant to take a known
amount of time, the success message should say so).

## 4. Security finding (unrelated to the withdrawal bug, found while tracing #2)

`revenueService.ts:117-132` — the upsert payload:

```ts
account_number_encrypted: formData.account_number, // Should be encrypted
routing_number_encrypted: formData.routing_number, // Should be encrypted
```

The raw account and routing numbers are written **as plaintext** into
columns named `_encrypted`, with a comment acknowledging they should be
encrypted but aren't. This means every creator's real bank account and
routing number, across every currency, has been stored in plaintext in
`creator_bank_accounts` since this flow was built — not specific to Matthew
or to NGN accounts. This needs your input on scope (has this table had any
compensating protection — RLS, column-level encryption at rest, restricted
access — that reduces exposure?) and on remediation (encrypt going forward
vs. also re-encrypting/rotating existing plaintext rows). Flagging clearly
rather than attempting a fix myself, since encryption-at-rest design and any
needed data migration for existing rows should be a deliberate decision, not
a quick client-side patch.

## Scope

- Mobile fix (#1) is live-ready, no schema change, no coordination needed.
- #2 is the actual blocker for Matthew and any other creator in this state —
  needs your side to find/fix whatever should be moving `pending` rows to
  verified.
- #3 is a copy/flow decision I'm holding off on until #2's shape is known.
- #4 is a security decision that needs your input before any fix is
  attempted, mobile or backend.
