# Web Team: Persona Verification — Two Required Backend Fixes

**Date:** 2026-04-08  
**From:** Mobile team  
**Priority:** High — currently causing a visible console error on device and the verified badge only shows due to a manually-set SQL value, not actual Persona approval

---

## Issue 1 — `notifications_type_check` constraint blocking verification notification

### What's happening
When Persona's webhook fires and the backend sends the "You're Verified!" push notification to the device, the notification has `data.type = 'identity_verified'` (or similar). The mobile app then tries to persist it to the Supabase `notifications` table, but the DB check constraint `notifications_type_check` rejects it because `'identity_verified'` is not in the allowed values list.

**Console error seen on device:**
```
Error persisting notification to Supabase: 
{"code":"23514","message":"new row for relation \"notifications\" violates check constraint \"notifications_type_check\""}
```

### Mobile fix already applied
We added `'identity_verified'` to the `NotificationType` union and added a type-sanitizer in `persistNotificationToSupabase` that falls back to `'system'` for any type not in the allowed list (prevents future similar errors).

### Required backend fix
Add `'identity_verified'` to the `notifications_type_check` constraint in the `notifications` table:

```sql
-- Drop existing constraint and recreate with identity_verified included
ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'event', 'tip', 'message',
    'collaboration_request', 'collaboration_accepted', 'collaboration_declined', 'collaboration_confirmed',
    'event_reminder', 'withdrawal', 'track_approved', 'track_featured',
    'creator_post', 'live_session', 'moderation',
    'new_follower', 'follow', 'like', 'reaction', 'comment',
    'content_purchase', 'connection_request', 'connection_accepted',
    'subscription', 'system', 'payout',
    'opportunity_interest', 'opportunity_agreement_received',
    'urgent_gig', 'gig_accepted', 'gig_confirmed', 'gig_starting_soon',
    'gig_expired', 'gig_payment', 'gig_refund', 'gig_rating_received',
    'opportunity', 'dispute_raised',
    'identity_verified'   -- NEW: Persona KYC approval
  ));
```

**Important:** If the backend is using a different `type` value for this notification (e.g. `'verification_complete'`, `'verified_professional'`), please let us know the exact value so we can match it in the mobile `NotificationType` union. Whatever value you use must be added to both the constraint above AND communicated to the mobile team.

---

## Issue 2 — `GET /api/verification/status` must return `'approved'` after Persona webhook fires

### What's happening
After the user completes Persona KYC and the browser sheet closes, the mobile app immediately calls `GET /api/verification/status`. At that moment, Persona's webhook may not have fired yet (it's asynchronous), so the endpoint returns `'pending'` instead of `'approved'`, and the verified badge doesn't show.

The verified badge logic on mobile reads:
```typescript
verificationStatus?.status === 'approved'   // from /api/verification/status
  || profile?.is_verified                    // from profiles table
```

The badge is currently only showing because `is_verified` was manually set to `true` in SQL — **it is NOT reading from Persona's actual approval**.

### Required backend fix

1. **Persona webhook handler** must update the user's record when Persona fires `inquiry.approved`:
   - Set `is_verified = true` on the `profiles` table  
   - Update the verification status in your verification table to `'approved'`
   - Then send the push notification (`identity_verified` type, see Issue 1)

2. **`GET /api/verification/status`** must read from your DB (not just live-query Persona each time), so that once the webhook has fired and updated the DB, subsequent mobile calls return `'approved'`.

### Current mobile behaviour after this fix is applied
- User completes Persona → browser closes → mobile calls `/api/verification/status` (may still return `'pending'` at this exact moment, that's fine)
- Backend receives Persona webhook → updates DB → sends push notification with `type: 'identity_verified'`
- Mobile receives the push notification → calls `refreshVerificationStatus()` → now gets `'approved'` → badge shows ✓

The mobile side already has the listener for the `identity_verified` notification that triggers `refreshVerificationStatus()`.

---

## Summary of what each team needs to do

| Action | Owner |
|--------|-------|
| Add `identity_verified` to `notifications_type_check` SQL constraint | Web team |
| Persona webhook handler sets `is_verified = true` + updates verification status | Web team |
| Webhook handler sends push notification with `type: 'identity_verified'` | Web team |
| `NotificationType` union updated with `'identity_verified'` | Mobile ✓ Done |
| Type-sanitizer in `persistNotificationToSupabase` | Mobile ✓ Done |
| `identity_verified` notification listener → `refreshVerificationStatus()` | Mobile ✓ Done |
