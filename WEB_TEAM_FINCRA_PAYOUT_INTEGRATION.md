# Web Team: Fincra Payout Integration — Replace Wise for African Payouts

**Priority:** High
**Date:** 2026-04-01
**Replaces:** Wise (declined API access)
**Covers:** Nigeria, Ghana, Kenya

---

## Why Fincra

Wise declined API access. Fincra is purpose-built for African bank payouts. Compliance approval is 24–48 hours. API is well-documented and customisable.

---

## Fees

| Market | Currency | Fee per payout |
|---|---|---|
| Nigeria | NGN | ₦50 flat (regardless of amount) |
| Ghana | GHS | GH₵18 flat |
| Kenya | KES | KES 100 (mobile money) / KES 150 (bank transfer) |

No fixed exchange rates — better than general market rates per Fincra.

---

## Limits (KYC-dependent)

| KYC Level | Daily Cap |
|---|---|
| Standard | ₦10,000,000 / day per transaction cap |
| After time on platform | ₦30,000,000 / day |
| Increased (requestable) | ₦200,000,000 / day |
| Full KYC (requestable) | No limits |

- **No minimum payout amount**
- Limits can be increased by requesting full KYC with Fincra

---

## Integration Notes

- Replace all Wise payout calls with Fincra API
- Webhook for payout status: listen for `completed` and `failed` events
- Bank account validation endpoint available — validate before initiating payout (prevents failed transfers)
- Sandbox environment available for testing
- Compliance approval: 24–48 hours after submitting business docs

---

## Action Items for Web Team

1. Register on Fincra dashboard and submit business KYC docs (target: today)
2. Read Fincra API docs — described as easy to understand and customisable
3. Replace Wise payout logic with Fincra for NGN withdrawals
4. Add GHS and KES payout support (Ghana and Kenya launch)
5. Wire bank account validation before payout initiation
6. Handle `completed` / `failed` webhooks → update wallet transaction status
7. Request full KYC with Fincra for no-limit payouts (do this early)

---

## Mobile App Changes (✅ pushed to OTA — 2026-04-01)

The following mobile changes are live:

- `src/screens/WithdrawalScreen.tsx` — all user-facing "Wise" references updated to "Fincra (Africa) or Stripe (UK/EU/US)"
- `src/services/WalletService.ts` — comment updated to reference Fincra Banks API

The `src/lib/wise/` directory (7 files) is dead server-side code in the mobile repo — safe to delete once Fincra is confirmed live.

---

## ⚠️ Env Vars Required (add once Fincra verification complete)

Web team needs these added to their environment:

```
FINCRA_API_KEY=<from Fincra dashboard after KYC approval>
FINCRA_WEBHOOK_SECRET=<from Fincra webhook settings>
FINCRA_BUSINESS_ID=<optional, from Fincra dashboard>
FINCRA_PUBLIC_KEY=<optional>
FINCRA_BASE_URL=<optional override>
```

These are **not active yet** — Fincra API keys will be obtained once Justice completes the KYC/compliance process with Fincra (submitted 2026-04-01, approval 24–48hrs).

---

## Related Docs

- `PAYMENT_INTEGRATION_STRIPE_WISE.md` — original Wise integration (now superseded for Africa)
- `WEB_TEAM_WISE_PAYOUT_ARCHITECTURE_UPDATE.md` — Wise decline context
