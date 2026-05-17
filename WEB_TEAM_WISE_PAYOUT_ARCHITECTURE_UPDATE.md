# Wise Payout Architecture Update — Semi-Automated Batch Flow

**Date:** 2026-03-23
**Status:** Action Required — Backend payout flow needs to be updated

---

## Background

We contacted Wise to request full API credentials (clientID) for automated payouts. Wise has confirmed they only issue API credentials to large-scale businesses. We are not currently eligible.

**Wise response summary:**
- Full API access (including auto-funding) is restricted to select large businesses
- Personal access tokens are now limited to creating transfers only (EU/UK regulatory change)
- Funding and statements must be managed via the Wise dashboard manually
- The recommended path for mass payouts is the **Batch Groups API**

---

## What This Means

We cannot do fully automated payouts (create + fund + send with zero human intervention). The funding step requires a manual action in the Wise dashboard.

However, the **Batch Groups API** allows us to:
- Create up to 1,000 payouts programmatically via API
- Queue them all in a single batch
- An admin then logs into Wise and clicks "Fund batch" — one action sends all 1,000 payments

This is **semi-automated** and is workable for our current scale at launch.

---

## Revised Payout Flow

### Old (intended) flow — no longer possible:
1. Backend detects eligible payout
2. Backend calls Wise API to create transfer
3. Backend calls Wise API to fund transfer automatically
4. Wise sends payment — zero manual steps

### New flow — use this instead:
1. Backend detects all eligible payouts (e.g. daily or weekly cron job)
2. Backend groups payouts into a Wise Batch Group via the Batch Groups API
3. Backend creates all transfers within the batch (up to 1,000)
4. **Admin receives notification** (email or internal dashboard alert) that a batch is ready to fund
5. Admin logs into Wise dashboard → clicks "Fund batch"
6. Wise processes and sends all payments in the batch

---

## Backend Implementation Requirements

### 1. Batch creation endpoint
Use the Wise Batch Groups API:
- `POST /v3/profiles/{profileId}/batch-payments` — create a batch group
- `POST /v3/profiles/{profileId}/batch-payments/{batchId}/transfers` — add transfers to the batch
- `GET /v3/profiles/{profileId}/batch-payments/{batchId}` — check batch status

Reference: https://docs.wise.com

### 2. Payout queue
- Implement a payout queue that accumulates pending payouts
- Run a scheduled job (daily or weekly) to group and submit them as a batch
- Do not process payouts one-by-one — always batch them

### 3. Admin notification
When a batch is created and ready to fund, notify the admin via:
- Email to the admin address
- A flag/alert in the internal admin dashboard

The notification should include:
- Number of payouts in the batch
- Total amount
- Link to Wise dashboard to fund

### 4. Payout status tracking
After the admin funds the batch, Wise will process each transfer. Poll or use webhooks to update payout status in the database:
- `pending_batch` — added to batch, awaiting funding
- `funded` — batch funded by admin, Wise processing
- `completed` — Wise confirms transfer sent
- `failed` — transfer failed, needs investigation

### 5. Minimum payout threshold
Keep the existing minimum payout threshold (e.g. $10 or equivalent) to avoid creating batches with many tiny transfers.

---

## Admin Dashboard Requirements

The admin dashboard needs a **Payouts** section showing:
- Current unfunded batch (if any) — with a "View in Wise" button
- History of past batches — date, count, total amount, status
- Individual payout records with status

---

## What Has NOT Changed

- The mobile app payout request flow (user requests payout in app) — no changes needed
- The wallet balance logic — no changes needed
- The payout eligibility checks — no changes needed
- Bank account verification via Wise — no changes needed

---

## Timeline Note

This semi-automated flow is the permanent approach until SoundBridge reaches a scale where Wise will grant full API credentials. At that point, the manual funding step can be removed and the flow becomes fully automated. The backend should be architected so that removing the manual step is a minor change, not a rewrite.

---

## Contact

For Wise API technical questions: api@wise.com
Wise API docs: https://docs.wise.com
