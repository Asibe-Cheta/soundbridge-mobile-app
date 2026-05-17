# Web Team: Manually Trigger Pending Payout (Test End-to-End)

## Status

**Implemented.** `POST /api/admin/payouts/initiate` accepts `payout_request_id` in the body. It looks up the pending request, the creator’s verified bank account, then calls Wise with `sourceCurrency: "USD"`, `sourceAmount`, and `targetCurrency` from the bank. It updates `payout_requests.status` to `processing` → `completed` (or `failed` on error) and stores the Wise transfer ID in `stripe_transfer_id`.

## Action Required Now

A payout request has been successfully created and is sitting in `payout_requests` with status `pending`. Manually trigger it via the admin endpoint to verify the full end-to-end flow (request → Wise → UBA NGN bank) while the admin dashboard is being built.

---

## The Pending Request

| Field | Value |
|---|---|
| Creator | Uche Onyekachukwu Merit |
| Bank | UBA (United Bank for Africa) |
| Account | ****3908 (NGN) |
| Amount | $40.44 USD |
| Status | pending |

Fetch the `payout_request_id` from the `payout_requests` table for this user and use it below.

---

## Before You Fire — Bank Data

**Current state (this codebase):** We store bank account number and routing/bank code in `creator_bank_accounts` as **plaintext** (see `apps/web/app/api/user/revenue/bank-account/route.ts` — TODO: Encrypt). The admin payout flow reads those values and passes them to Wise.

**Implemented:** If we later encrypt those columns (same `iv:authTag:hex` format as `@/src/lib/encryption`), the admin flow will decrypt them automatically before calling Wise (`toPlaintext()` in `apps/web/app/api/admin/payouts/route.ts`). So it’s safe to fire now (plaintext), and it will still work after we add encryption.

---

## How to Trigger

Web team: run it directly with admin access — grab the `id` from `payout_requests` in Supabase (row with amount 40.44, status pending) and call the endpoint with your admin JWT.

```
POST /api/admin/payouts/initiate
Authorization: Bearer <admin JWT>
Content-Type: application/json

{
  "payout_request_id": "<id from payout_requests table>"
}
```

The admin endpoint calls Wise with:
- `sourceCurrency: "USD"`
- `targetCurrency: "NGN"`
- `sourceAmount: 40.44`
- Destination: creator's UBA bank details from `creator_bank_accounts`

(See `WEB_TEAM_PAYOUT_ELIGIBILITY_AND_BANK_VERIFICATION.md` §3 for the Wise transfer spec.)

---

## After Triggering

Please confirm:
- [ ] Wise transfer created successfully (share transfer ID)
- [ ] `payout_requests.status` updated to `processing` then `completed`
- [ ] Creator wallet balance deducted
- [ ] Creator email notification sent (per `WEB_TEAM_ADMIN_PAYOUT_DASHBOARD_REQUIRED.md`)

---

## Admin Dashboard

Continue building `/admin/payouts` in parallel per `WEB_TEAM_ADMIN_PAYOUT_DASHBOARD_REQUIRED.md`. This manual trigger is just to validate the Wise payout flow works end-to-end before launch.
