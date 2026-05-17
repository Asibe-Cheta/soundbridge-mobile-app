# Two Bugs: Confirm Delivery 500 + Missing other_party on Project

---

## Bug 1: Confirm Delivery returns 500 but succeeds

### What's Happening

When the poster taps **Confirm Delivery & Release Payment**, the backend:
1. ✅ Captures the Stripe PaymentIntent successfully
2. ✅ Updates the project status to `completed`
3. ❌ Returns HTTP 500 `{ "error": "Server error. Please try again later." }`

The app shows an error dialog to the user even though the payment was released and the project is complete. This is a backend response bug — the operation completes but the endpoint throws an unhandled error after the DB update.

### What to Fix

In the `/confirm-delivery` (or equivalent) route handler:
- Check for any unhandled exception thrown *after* the Stripe capture and DB update
- Likely a notification dispatch, webhook call, or wallet credit that is failing silently but bubbling up as a 500
- Wrap that secondary operation in a try/catch so the 500 doesn't leak to the client
- The endpoint should return 200 with the updated project as long as capture + status update succeeded — secondary operations (notifications, wallet) should fail gracefully without crashing the response

### Critical Question: Was the Provider's Wallet Credited?

The 500 error is most likely thrown by one of the post-capture steps. **Please confirm whether the provider's wallet was credited with GBP 8.80** (agreed £10.00 minus 12% platform fee = £8.80).

If the wallet was NOT credited, the wallet credit operation is the source of the 500 and must be fixed immediately — the provider completed the work but hasn't been paid.

The order of operations in `/confirm-delivery` should be:
1. Capture Stripe PaymentIntent → if this fails, return 500 (correct)
2. Update project status to `completed` → if this fails, return 500 (correct)
3. Credit provider's wallet balance → **this must not crash the response if it fails; log and retry**
4. Send notifications → **this must not crash the response if it fails; log and retry**
5. Return 200 with updated project

If wallet credit is failing, fix it and run a one-off credit for `pi_3T6GcG0Bt6mXrdye10HwRyaF` (GBP 8.80 to the provider).

### Impact

**Potentially critical** if the provider's wallet was not credited — provider did work and Stripe captured funds but provider received nothing. Otherwise medium (user sees false error).

---

## Bug 2: `other_party` is null on completed projects

### What's Happening

The `/api/opportunity-projects/:id` endpoint returns the project object with `other_party: null` in some cases (observed on a project that was advanced via manual SQL / webhook rather than the normal accept flow).

On the mobile review screen, the ratee shows as **"the other party"** instead of their real name, and their avatar is missing.

### What to Fix

Ensure the `other_party` field is always populated in the project response. The pattern should be:

```js
// In the project fetch handler:
const project = await db.opportunity_projects.findOne({ where: { id: projectId } });

// Always join the other party's profile
const viewerId = req.user.id;
const otherUserId = project.poster_user_id === viewerId
  ? project.creator_user_id
  : project.poster_user_id;

const otherParty = await db.profiles.findOne({ where: { user_id: otherUserId } });

return {
  ...project,
  other_party: otherParty
    ? { id: otherParty.user_id, display_name: otherParty.display_name, avatar_url: otherParty.avatar_url }
    : null,
};
```

This should apply regardless of how the project record was created.

### Impact

Review screen shows "the other party" instead of the real name. Low priority (cosmetic), but affects trust and polish.
