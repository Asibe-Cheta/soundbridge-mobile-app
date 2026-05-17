# Mobile Team — Opportunities Backend Live

**Date:** January 2026  
**Status:** ✅ **BACKEND LIVE — Ready for Integration**  
**Priority:** High

---

## Summary

The Opportunities backend is now live and deployed. Feed UI, OpportunityCard, and ExpressInterestModal can be wired to real APIs. **Key change:** Escrow flow is Uber-style — poster pays at the moment of accepting an interest, before the creator is notified.

---

## Base URL

```
https://soundbridge.live/api
```
(or your staging/production API host)

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/opportunities` | Required | Create opportunity post |
| `GET` | `/opportunities` | Required | Get recommended opportunities (paginated) |
| `GET` | `/opportunities/mine` | Required | Get poster's own opportunities |
| `GET` | `/opportunities/:id` | Required | Get single opportunity |
| `PATCH` | `/opportunities/:id` | Required (owner) | Update or deactivate opportunity |
| `DELETE` | `/opportunities/:id` | Required (owner) | Delete opportunity |
| `POST` | `/opportunities/:id/interest` | Required | Express interest (reason + optional message) |
| `GET` | `/opportunities/:id/interests` | Required (owner) | List interests on opportunity |
| `POST` | `/opportunities/:id/interests/:interestId/accept` | Required (owner) | Accept interest, create project, get `client_secret` for Stripe |
| `GET` | `/opportunity-projects` | Required | List user's projects (as poster or creator) |
| `GET` | `/opportunity-projects/:id` | Required (participant) | Get project detail |
| `POST` | `/opportunity-projects/:id/accept-agreement` | Required (creator) | Creator accepts agreement (payment already in escrow) |
| `POST` | `/opportunity-projects/:id/decline-agreement` | Required (creator) | Creator declines |
| `POST` | `/opportunity-projects/:id/mark-delivered` | Required (creator) | Creator marks work delivered |
| `POST` | `/opportunity-projects/:id/confirm-delivery` | Required (poster) | Poster confirms delivery, releases funds |
| `POST` | `/opportunity-projects/:id/dispute` | Required (participant) | Raise dispute |

---

## Critical: Escrow Flow (Uber-style)

### Poster flow

1. Poster taps **"Accept & Create Project"** (or similar) on an interest.
2. Poster fills agreement form: `agreed_amount`, `currency`, `deadline`, `brief`.
3. **POST** `/opportunities/:id/interests/:interestId/accept` with body:
   ```json
   {
     "agreed_amount": 250,
     "currency": "GBP",
     "deadline": "2026-03-15",
     "brief": "Record 3 lead vocal tracks..."
   }
   ```
4. Response includes `client_secret` and project:
   ```json
   {
     "project": {
       "id": "...",
       "status": "payment_pending",
       "agreed_amount": 250,
       "currency": "GBP",
       "platform_fee_amount": 30,
       "creator_payout_amount": 220,
       "deadline": "2026-03-15",
       "brief": "...",
       "chat_thread_id": "..."
     },
     "client_secret": "pi_xxx_secret_xxx"
   }
   ```
5. **Immediately** show Stripe payment sheet using `client_secret`. Creator is **not** notified until payment succeeds.
6. On successful payment, webhook updates project to `awaiting_acceptance` and notifies creator.

### Creator flow

1. Creator receives notification: "£X in escrow and waiting for you — review the project agreement."
2. Creator views project (agreed amount, deadline, brief, escrow status).
3. Creator taps **"Accept Agreement"** → **POST** `/opportunity-projects/:id/accept-agreement` (no payment — already in escrow).
4. Project moves to `active`. Work can begin.

---

## Integration Notes

### Interest body

Use `reason` and `message` (not `custom_message`). Schema uses `reason` + `message` for legacy; some tables may have `custom_message` — API accepts `message` and maps as needed.

### Recommended opportunities

`GET /opportunities` uses RPC `get_recommended_opportunities` with `limit`, `offset`, optional `type`. Returns `posted_by` (profile), `has_expressed_interest`.

### Project status order

- `payment_pending` → poster created agreement, payment not yet confirmed  
- `awaiting_acceptance` → payment in escrow, creator must accept  
- `active` → work in progress  
- `delivered` → creator marked delivered  
- `completed` → poster confirmed, funds released  
- `declined`, `disputed`, `cancelled` → terminal states  

### Notification types

- `opportunity_interest` — new interest on poster's opportunity  
- `opportunity_project_agreement` — creator notified when payment confirmed in escrow  
- `opportunity_project_active` — poster notified when creator accepts  
- `opportunity_project_delivered` — poster notified when creator marks delivered  
- `opportunity_project_completed` — both notified when completed  
- `opportunity_expiring_no_interest` — poster: opportunity expiring, no interests  
- `opportunity_expiring_with_interest` — poster: opportunity expiring, N interests  

---

## Testing

1. Create opportunity via `POST /opportunities`.
2. Express interest via `POST /opportunities/:id/interest` (different user).
3. Accept interest via `POST /opportunities/:id/interests/:interestId/accept` (poster).
4. Present Stripe payment sheet with `client_secret` (use test card if Stripe test mode).
5. After payment, creator should see project and accept via `POST /opportunity-projects/:id/accept-agreement`.

---

## Questions

Contact backend/web team for schema details, RPC signatures, or edge cases.
