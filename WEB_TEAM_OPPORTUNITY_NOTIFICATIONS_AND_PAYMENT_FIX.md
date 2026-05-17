# Web Team: Opportunity Notifications + Accept Agreement 500 Error

Two issues found from end-to-end testing of the Opportunities feature. Both require backend changes.

---

## Issue 1: `POST /api/opportunities/:id/interests/:interestId/accept` returns 500

### Symptom
When the poster taps "Send Agreement" and submits the `ProjectAgreementModal`, the mobile app calls:

```
POST /api/opportunities/:opportunityId/interests/:interestId/accept
Body: { agreed_amount, currency, deadline?, brief }
```

The first call succeeds. A subsequent call for the same interest returns **500 Server Error**. Mobile was showing a generic "Server error" (now showing "Failed to create project agreement. Please try again." after mobile-side try/catch was added).

### Expected Behaviour
The endpoint should:
1. Create a project record linking the opportunity, interest, and both users
2. Create a **Stripe PaymentIntent** for `agreed_amount` (in escrow — poster pays now, released to creator on delivery)
3. Return `{ project, client_secret }` — mobile uses `client_secret` to present Stripe Payment Sheet

### Likely Root Cause
Stripe is probably not initialised / env vars missing in the backend's test environment. Check:
- `STRIPE_SECRET_KEY` is set in backend `.env`
- `stripe.paymentIntents.create(...)` call exists and handles currency correctly (amounts in pence for GBP)

### Duplicate Project Guard + Unpaid Project Recovery (Critical)
The backend correctly returns **409 Conflict** with `{"error":"Project already exists for this interest"}` on duplicate calls. However, there is a race condition / failure path:

1. First call creates the project record ✓
2. But Stripe PaymentIntent creation **fails** (500) before `client_secret` is returned
3. Project now exists in DB with no payment — stuck in unpaid limbo
4. Every subsequent call returns 409, so the poster can **never retry payment**

**Required fix:** When 409 is returned for an existing project, check if it was already paid:
- If **not paid**: return `200` with `{ project, client_secret }` using a new/refreshed Stripe PaymentIntent for the same project (not a new project)
- If **paid**: return `409` as normal (project is active, don't allow another payment)

This makes the endpoint **idempotent for unpaid projects** — safe to retry.

### Response Shape Required
```json
{
  "project": {
    "id": "uuid",
    "opportunity_id": "uuid",
    "poster_id": "uuid",
    "creator_id": "uuid",
    "agreed_amount": 150,
    "currency": "GBP",
    "deadline": "2026-03-01",
    "brief": "Looking for a session guitarist...",
    "status": "pending_creator_acceptance",
    "created_at": "2026-02-16T..."
  },
  "client_secret": "pi_xxx_secret_yyy"
}
```

### Stripe Payment Model (Escrow / Uber Style)
- **Poster pays at agreement time** (Stripe PaymentIntent created and captured immediately)
- Amount held in Stripe — not transferred to creator until project is marked complete
- Creator is notified (see Issue 2) and must accept the agreement
- On delivery/completion, platform calls `stripe.transfers.create` to release funds to creator's connected account

---

## Issue 2: Push Notifications for Opportunity Events

### 2a — Poster: New Interest Received

When a creator calls `POST /api/opportunities/:id/interests`, the backend must:

1. Look up the **opportunity poster's** push token from `notification_tokens` table (or `push_tokens` depending on schema):
   ```sql
   SELECT token FROM notification_tokens
   WHERE user_id = <poster_user_id>
   ORDER BY updated_at DESC LIMIT 1;
   ```

2. Send an Expo push notification:
   ```json
   {
     "to": "<poster_expo_push_token>",
     "title": "New Interest in Your Opportunity",
     "body": "<creator_display_name> expressed interest in \"<opportunity_title>\"",
     "data": {
       "screen": "OpportunityInterestList",
       "opportunityId": "<opportunity_id>",
       "opportunityTitle": "<opportunity_title>"
     }
   }
   ```

3. Insert a row into the `notifications` table so it also appears in the in-app notification inbox:
   ```sql
   INSERT INTO notifications (user_id, type, title, body, data, created_at)
   VALUES (
     <poster_user_id>,
     'opportunity_interest',
     'New Interest in Your Opportunity',
     '<creator_display_name> expressed interest in "<opportunity_title>"',
     '{"type":"opportunity_interest","opportunityId":"<id>","opportunityTitle":"<title>"}',
     NOW()
   );
   ```

   > **Important:** The `data` JSON **must** include `"type": "opportunity_interest"` — the mobile deep-link router keys off the `type` field. It will navigate directly to `OpportunityInterestList` passing `opportunityId` and `opportunityTitle`.

### 2b — Creator: Agreement Received (Poster Accepted Their Interest)

When the poster calls `POST /api/opportunities/:id/interests/:interestId/accept` (and it succeeds / Stripe PaymentIntent created), the backend must notify the **creator**:

1. Look up creator's push token from `notification_tokens`.

2. Send push notification:
   ```json
   {
     "to": "<creator_expo_push_token>",
     "title": "Agreement Offer Received",
     "body": "<poster_display_name> accepted your interest in \"<opportunity_title>\" and has secured payment. Review and accept the project agreement.",
     "data": {
       "screen": "OpportunityProject",
       "projectId": "<project_id>"
     }
   }
   ```

3. Insert notifications row for creator:
   ```sql
   INSERT INTO notifications (user_id, type, title, body, data, created_at)
   VALUES (
     <creator_user_id>,
     'opportunity_agreement_received',
     'Agreement Offer Received',
     '<poster_display_name> accepted your interest in "<opportunity_title>". Payment secured — review and accept.',
     '{"type":"opportunity_agreement_received","projectId":"<project_id>"}',
     NOW()
   );
   ```

   > **Important:** The `data` JSON **must** include `"type": "opportunity_agreement_received"` — the mobile deep-link router keys off the `type` field. It will navigate directly to `OpportunityProject` passing `projectId`.

### 2c — Poster: Creator Accepted the Agreement (Future)
When creator accepts the project, notify the poster:
- Push: `"<creator_display_name> accepted your agreement for \"<opportunity_title>\". Work can begin!"`
- Deep link data: `{ screen: "OpportunityProject", projectId }`

---

## Priority

| Issue | Priority | Reason |
|-------|----------|--------|
| Accept endpoint 500 error | **Critical** | Without Stripe PaymentIntent the entire paid project flow is broken |
| Accept endpoint 409 on duplicate | **High** | Prevents confusing "Server error" on repeat taps |
| Push: new interest → poster | **High** | Poster is blind to applications until they open the app |
| Push: agreement → creator | **High** | Creator has no way to know poster accepted their interest |
| Push: creator accepted → poster | Medium | Nice to have, completes the loop |

---

## Notes for Mobile Team
- Mobile `OpportunityProject` screen (`src/screens/OpportunityProjectScreen.tsx`) needs to be navigable via the deep link `data.screen` value — confirm route name matches
- Mobile `NotificationService` already handles Expo push token registration and deep link routing for `screen`/`projectId` payloads
