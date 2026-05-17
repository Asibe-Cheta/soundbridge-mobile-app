# WEB TEAM: Persona Identity Verification Integration

**From:** Mobile team  
**Date:** 2026-04-07  
**Priority:** High — mobile UI is ready and waiting on this API contract

---

## Context

We are integrating Persona (app.withpersona.com) for identity verification on the Service Provider Dashboard. The KYC solution (Government ID + Selfie liveness check) is already added to the Persona Production account.

The mobile app already has:
- `GET /api/service-providers/:userId/verification/status` — already implemented and working
- The 4-state verification UI in `ServiceProviderDashboardScreen`
- State 3 (Premium + unverified) currently shows a placeholder — **this is where the Persona flow gets launched**

---

## What We Need From You

### 1. New Endpoint: Start Persona Inquiry

```
POST /api/service-providers/:userId/verification/start
Authorization: Bearer <session token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inquiry_url": "https://withpersona.com/verify?inquiry-id=inq_xxxx",
    "inquiry_id": "inq_xxxx"
  }
}
```

**What this endpoint should do on your side:**
1. Check the user has an active Premium subscription (guard — return 403 if not)
2. Call Persona's API to create a new Inquiry using the KYC template already set up in Production
3. Store `inquiry_id` against the user in DB (for webhook matching later)
4. Return the `inquiry_url` to mobile

**If an inquiry already exists and is pending:**  
Return the existing `inquiry_url` rather than creating a duplicate.

---

### 2. Persona Webhook Handler

Set up a webhook in the Persona dashboard pointing to your backend.

**Events to handle:**
- `inquiry.completed` — user finished the flow, awaiting review
- `inquiry.approved` — verification passed → set `verification_status = 'approved'` for the user
- `inquiry.declined` — verification failed → set `verification_status = 'rejected'`
- `inquiry.expired` — inquiry expired without completion → reset to `not_requested` or keep `pending`

**DB update:** The existing `verification_status` field on the service provider record should be updated. The existing `GET /api/service-providers/:userId/verification/status` endpoint already returns this — just keep the response shape consistent:

```json
{
  "status": {
    "verificationStatus": "not_requested" | "pending" | "approved" | "rejected"
  }
}
```

---

### 3. Existing Status Endpoint — No Changes Needed

`GET /api/service-providers/:userId/verification/status` already works. Mobile will re-call this after the user returns from Persona. No changes needed unless the shape changes.

---

## Mobile Behaviour (What We Will Build)

When user taps **"Start Verification"** (State 3 — Premium + not verified):
1. Call `POST /api/service-providers/:userId/verification/start`
2. Receive `inquiry_url`
3. Open URL in the device's default browser via `Linking.openURL(inquiry_url)`
4. When user returns to the app (AppState `active` event), re-fetch verification status
5. If status changed to `pending` or `approved`, update UI accordingly

We will show a loading spinner during the API call and a clear error message if it fails.

---

## Error Cases We'll Handle on Mobile

| HTTP Status | Meaning | Mobile behaviour |
|---|---|---|
| 403 | Not Premium | Should not happen (we gate the button), but show "Premium required" alert |
| 409 | Inquiry already in progress | Use returned `inquiry_url` to resume |
| 500 | Persona API error | Show "Something went wrong, please try again" |

---

## Persona Dashboard Reference

- Environment: **Production** (not sandbox)
- Solution: **KYC** (already added — "Solution is already added" confirmed)
- Template: Government ID + Selfie liveness
- 500 free verifications, small per-verification fee after

Please share the Persona template ID / flow ID when setting up the backend so we can reference it if needed.

---

## Questions for You

1. Is there already a `verification_status` column on the service providers table, or is it tracked elsewhere?
2. Should we support resuming an in-progress inquiry (i.e. user started but didn't finish — same `inquiry_url` returned on next `POST /start`)?
3. Any rate limiting on the `/verification/start` endpoint we should handle on mobile?

---

Mobile side will be ready to test as soon as the endpoint is live in staging.
