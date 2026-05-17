# Payment-First Architecture — Opportunities & Gigs

**Date:** 2026-03-16
**Priority:** HIGH — current flow creates revenue leakage
**For:** Web / Backend team
**From:** Mobile team (Justice)

---

## The Problem with the Current Flow

The current flow is:

```
Poster fills agreement → Project created (status: payment_pending) → Payment sheet shown → Poster pays (optional)
```

This is wrong because:

1. The project already exists before payment — the poster can simply close the app and the creator is left waiting with a `payment_pending` project, having arranged time and resources
2. If payment never completes, SoundBridge earns nothing and the creator is stranded
3. It implicitly encourages off-platform payment ("I'll just pay you directly — I've already sent the agreement")
4. A poster can advertise work they can't actually afford, only discovering this after a creator has committed

---

## The Correct Model — Payment Before Anything

Think of it like Uber: **the ride is not booked until payment is authorised**. The driver is never dispatched without a card on file.

For SoundBridge gigs and opportunities, **funds must be secured in escrow before the creator is notified of the agreement**. The creator only sees the project once payment is confirmed.

---

## Proposed Flow

### Phase 1 (implement now): Pay before creator is notified

```
1. Poster selects creator and fills agreement form (amount, brief, deadline)
2. Stripe PaymentIntent is created — poster sees payment sheet immediately
3. Poster MUST pay — no "Later", no "OK to skip"
4. On payment_intent.succeeded:
     → Project status updated to 'awaiting_acceptance' (creator can now see it)
     → Creator receives push notification: "You've received a paid project offer"
     → Funds held in escrow (not yet released to creator wallet)
5. Creator accepts or declines
6. On acceptance → status becomes 'active'
7. On delivery confirmation by poster → funds released to creator wallet
```

**Key change from current:** The project status starts as `payment_pending` and the creator is NOT notified until `payment_intent.succeeded` fires. The webhook is what flips the status and sends the creator notification — not the API call.

### Phase 2 (future): Escrow at opportunity posting time

For scheduled/planned opportunities where the poster advertises a budget upfront:

```
1. Poster creates opportunity and enters budget (e.g. "£50 session fee")
2. Stripe SetupIntent created — poster authorises card (no charge yet)
3. When poster selects a creator:
     → Stripe PaymentIntent created immediately for the agreed amount
     → Funds captured → placed in escrow
     → Creator notified
```

This prevents posters from advertising money they don't have, which leads to wasted time for creators who arrange availability only to be let down.

---

## Backend Changes Required for Phase 1

### 1. Do NOT notify the creator when the project is created

Currently, when `/interests/:id/accept` runs, does it send a push notification to the creator? If so, **remove that**. The creator notification must only fire from the `payment_intent.succeeded` webhook.

### 2. Webhook: flip status + notify creator on payment confirmation

In the `payment_intent.succeeded` handler (already being implemented for wallet credit), add:

```typescript
case 'payment_intent.succeeded': {
  const pi = event.data.object;
  const { projectId, recipientUserId } = pi.metadata;

  if (projectId) {
    // Move project from payment_pending → awaiting_acceptance
    await supabase
      .from('opportunity_projects')
      .update({ status: 'awaiting_acceptance', stripe_payment_intent_id: pi.id })
      .eq('id', projectId)
      .eq('status', 'payment_pending');   // only flip if still pending

    // Now notify the creator
    const { data: project } = await supabase
      .from('opportunity_projects')
      .select('title, creator_user_id, poster:poster_user_id(display_name)')
      .eq('id', projectId)
      .single();

    if (project) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', project.creator_user_id)
        .single();

      if (creatorProfile?.expo_push_token) {
        await fetch('https://exp.host/--/expo-push/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: creatorProfile.expo_push_token,
            title: 'Paid Project Offer',
            body: `${project.poster.display_name} has sent you a project agreement for "${project.title}" — payment is secured`,
            data: { type: 'opportunity_agreement_received', projectId },
            channelId: 'opportunities',
            sound: 'default',
          }),
        });
      }
    }
  }
  break;
}
```

### 3. `opportunity_projects` status flow

```
payment_pending       ← project created, poster has not paid yet
       ↓  (payment_intent.succeeded webhook fires)
awaiting_acceptance   ← creator can now see and respond
       ↓  (creator accepts)
active                ← work in progress
       ↓  (creator marks delivered)
delivered             ← poster confirms delivery
       ↓  (poster confirms)
completed             ← funds released to creator wallet
```

`payment_pending` projects should NOT be visible to the creator in any UI. The creator only sees from `awaiting_acceptance` onwards.

---

## Two Backend Gaps That Still Need Closing

### Gap 1 — Webhook must flip status + notify creator (NOT the /accept endpoint)

The `payment_intent.succeeded` webhook currently only credits the wallet. It must also:
1. `UPDATE opportunity_projects SET status = 'awaiting_acceptance' WHERE id = projectId AND status = 'payment_pending'`
2. Send push notification to the creator (see handler code above)

If this is not done, the creator never sees the project even after payment — or worse, they see it before payment if the `/accept` endpoint notifies them directly.

**Action: Remove any push notification from the `/accept` endpoint. Only the webhook should notify the creator.**

### Gap 2 — Filter `payment_pending` out of creator's project list

`GET /api/opportunity-projects?role=creator` must NOT return `payment_pending` projects to the creator. The creator should only see projects from `awaiting_acceptance` onwards.

```typescript
// In the /api/opportunity-projects handler, for role=creator:
.neq('status', 'payment_pending')
```

Without this, a creator could see an unpaid offer, clear their schedule, and then never receive payment confirmation.

---

## What the Mobile Has Already Done

- Removed all "Later" / "OK" dismiss buttons from payment cancellation alerts
- `cancelable: false` on all payment-related alerts — the only option is "Complete Payment"
- The app always navigates to the project screen if payment is not completed, where a "Complete Payment" button is shown

The mobile will hold its end as long as the backend does not notify the creator until payment is confirmed.

---

## Summary of Escrow Model

| Stage | Funds location | Creator sees project? |
|---|---|---|
| `payment_pending` | Still on poster's card (authorized or not) | ❌ No |
| `awaiting_acceptance` | Captured in Stripe escrow | ✅ Yes — can accept/decline |
| `active` | Held in escrow | ✅ Yes |
| `delivered` | Held in escrow | ✅ Yes — waiting poster confirmation |
| `completed` | Released to creator wallet | ✅ Yes |
| `disputed` | Frozen in escrow | ✅ Yes — dispute in progress |
| `cancelled` | Refunded to poster | ✅ History only |
