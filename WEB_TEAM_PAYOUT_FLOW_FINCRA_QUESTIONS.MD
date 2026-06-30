# Web Team — Payout Flow Clarification + Fincra Questions

**From:** Mobile team / Justice  
**Date:** 2026-05-29  
**Priority:** High — needed before we can confirm Fincra is live for African creators

---

## What mobile now understands about the flow

Here is our best understanding of the full money flow end to end.
Please correct anything that is wrong.

### Inflow (how money enters SoundBridge)

All tips are collected in USD via Stripe.

```
User tips creator
  → Stripe Payment Sheet (USD)
  → SoundBridge Stripe account (UK)
  → Creator balance credited in Supabase (wallet_transactions table)
```

There is no other inflow path. No creator pays into SoundBridge via Fincra.
SoundBridge collects all money, holds it, and pays out on request.

### Outflow — Stripe rail (non-African creators)

```
Creator requests payout (mobile or web)
  → /api/payouts/request
  → Admin approves in dashboard
  → Backend executes Stripe payout to creator's connected bank
  → Creator receives GBP / EUR / USD
```

### Outflow — Fincra rail (African creators: NGN / GHS / KES)

This is what we need you to confirm is correct:

```
Creator requests payout (mobile or web)
  → /api/payouts/request
  → Admin approves in dashboard
  → Backend calls Fincra payout API
  → Fincra debits SoundBridge's Fincra wallet
  → Creator receives NGN / GHS / KES in their local bank account
```

---

## The problem we need your help with

Fincra has told us they cannot enable **GBP/USD wallet funding** until we
reach £100,000 annual processing volume through them. Their email says:

> "our current partner requires a minimum annual processing volume of
> GBP 100,000 to support this service."

This creates a possible blocker: if the Fincra payout backend requires a
**GBP-funded Fincra wallet** as the source of funds, then African creator
payouts are currently blocked.

---

## Specific questions for the web team

**1. Has any Fincra payout actually been executed successfully in production?**

If yes — what source currency did the Fincra wallet use? GBP, USD, or something
else? We need to know if the GBP/USD funding restriction is already a live
blocker or not yet.

**2. What source currency does the backend pass to Fincra today?**

In the payout API call to Fincra, what is `sourceCurrency`? Is it:
- GBP (debited from a GBP wallet at Fincra)
- USD
- The creator's local currency (NGN/GHS/KES — i.e. a same-currency payout)

**3. Is there a funded Fincra wallet right now?**

Does SoundBridge have any balance sitting in a Fincra wallet today?
If so, what currency and what balance?

**4. Is the Fincra payout backend live and wired to the admin approval flow?**

When an admin approves a payout request for a Nigerian creator, does Fincra
actually get called, or is it still manual / pending implementation?

---

## What Fincra's docs say is possible (for context)

Their public docs confirm NGN-funded NGN payouts are available without a
volume minimum — same-currency local transfers settle T+0.

If SoundBridge manually tops up a Fincra NGN wallet (or receives NGN via
a Fincra virtual account), it can pay Nigerian creators in NGN without
needing the GBP/USD cross-currency route — which is the route Fincra just
restricted.

The question is whether switching to same-currency NGN payouts is feasible
for us, or whether the cross-currency GBP→NGN route is baked into the
current backend implementation.

---

## What mobile has already cleaned up

- All Wise references removed from mobile app (RequestPayoutScreen,
  WalletScreen, CountryAwareBankForm)
- Mobile payout UI now says "via Fincra" for African currencies
- `src/lib/wise/` directory exists as dead code — no screens or services
  import it; can be deleted from the repo when convenient

---

## Summary of what we need from you

| Question | Why it matters |
|---|---|
| Has a Fincra payout actually fired? | Confirms whether we have a blocker now or only in theory |
| What `sourceCurrency` is used? | Tells us if we're on the blocked GBP→NGN route |
| Is there a funded Fincra wallet? | Determines if payouts can execute at all |
| Is admin approval → Fincra fully wired? | Closes the loop on end-to-end readiness |
| Can we switch to NGN same-currency payouts? | Potential fix if GBP route is blocked |

Happy to jump on a call if easier.
