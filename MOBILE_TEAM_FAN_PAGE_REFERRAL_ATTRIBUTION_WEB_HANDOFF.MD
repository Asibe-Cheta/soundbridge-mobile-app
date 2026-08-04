# Web → Mobile Handoff: Partner Fan-Page Referral Attribution

**From:** Web team / Justice
**Date:** 2026-08-02
**Spec:** `UNIFY_FAN_PAGE_AND_REF.MD`
**Web status:** ✅ Implemented on web (commit `cb3ed479`) — **DB migration not yet applied, see below**

---

## What changed and why

Today, a Partner only earns 10% commission when a new user signs up via their
explicit `?ref=partnername` link. Signups that come from a Partner's own fan
page link (their regular profile URL — `soundbridge.live/{username}` on web,
which most people share more naturally than a separate referral link) weren't
attributed to them at all.

Fix: a new user signup is now also attributed to a Partner when the **last
profile page they visited before signing up** was that Partner's fan page —
even with no `?ref=` present. This only applies to designated **Partners**
(an existing `partners` table row) — it does **not** extend to the general
Audio Lover referral system, which stays explicit-link-only. If both signals
are present (visited a Partner's fan page, then separately used their `?ref=`
link), the explicit `?ref=` always wins — never both, never double-credited.

## Where the logic actually lives

All of the priority/attribution/no-double-crediting logic was pushed into the
**`record_referral_signup` Postgres RPC itself** (not duplicated in web or
mobile client code), so both platforms share one source of truth. The RPC
gained a new optional 3rd parameter:

```sql
record_referral_signup(
  p_referred_user_id uuid,
  p_referral_code text DEFAULT NULL,
  p_fan_page_creator_id uuid DEFAULT NULL   -- new
)
```

Behavior:
- If `p_referral_code` resolves to a partner → that partner is credited (unchanged, existing behavior).
- Else if `p_fan_page_creator_id` is provided and *that* user has a `partners` row → **that** partner is credited.
- Else → nothing happens (matches today's behavior when neither applies).

**Fully backward compatible.** The new parameter defaults to `NULL`, so your
existing call (`{ p_referred_user_id, p_referral_code }`) keeps working exactly
as it does today, with zero urgency to change anything. This doc is for when
you're ready to pick up the fan-page-attribution behavior on mobile too.

## ⚠️ Before this can go live: apply the migration

The migration file is at
`supabase/migrations/20260802120000_partner_fan_page_referral_attribution.sql`
in the web repo. We couldn't apply it directly from this session (no DB access
from this sandbox) — **someone needs to run it via the Supabase Dashboard SQL
editor** before the web code (already committed) is deployed. If the web code
ships before the migration runs, **every** `record_referral_signup` call —
including the existing explicit `?ref=` flow — will fail, because the RPC call
now always sends 3 named arguments and the deployed function would still only
accept 2. This is a real regression risk, not just a missing feature, so
please treat the migration as a hard blocker on deploying the web change.

Mobile is unaffected by this ordering — your existing 2-arg call keeps working
before *and* after the migration runs, since the new parameter is optional.

## What to change on mobile (when ready)

You already have everything you need — `CommunityEntryService` already tracks
the last-visited creator (`communityCreatorId`, via `AsyncStorage`, set on
fan-page visits) and already calls `record_referral_signup` from
`applyReferralAttribution()` inside `completeOnboarding()`:

`src/services/CommunityEntryService.ts`:
```ts
// Current — only fires when an explicit referral code is present:
private async applyReferralAttribution(
  userId: string,
  attr: CommunityAttribution,
): Promise<void> {
  if (!attr.referralCode) return;
  try {
    await referralService.recordReferralSignup(userId, attr.referralCode);
    ...
```

Change to also fire when there's no explicit code but a fan page was visited,
and pass `attr.communityCreatorId` through:

```ts
private async applyReferralAttribution(
  userId: string,
  attr: CommunityAttribution,
): Promise<void> {
  if (!attr.referralCode && !attr.communityCreatorId) return;
  try {
    await referralService.recordReferralSignup(
      userId,
      attr.referralCode,
      attr.communityCreatorId, // new
    );
    ...
```

`src/services/ReferralService.ts`:
```ts
// Current:
async recordReferralSignup(referredUserId: string, referralCode: string): Promise<void> {
  try {
    await supabase.rpc('record_referral_signup', {
      p_referred_user_id: referredUserId,
      p_referral_code: referralCode,
    });
  } catch (err) { ... }
}
```

```ts
// New — referralCode becomes optional, new fanPageCreatorId param passed through as-is:
async recordReferralSignup(
  referredUserId: string,
  referralCode?: string | null,
  fanPageCreatorId?: string | null,
): Promise<void> {
  try {
    await supabase.rpc('record_referral_signup', {
      p_referred_user_id: referredUserId,
      p_referral_code: referralCode ?? null,
      p_fan_page_creator_id: fanPageCreatorId ?? null,
    });
  } catch (err) { ... }
}
```

That's it — no new tracking to build. `attr.communityCreatorId` is already
captured whenever a user visits a creator's fan page (same place the
community-welcome-screen attribution already comes from), and the RPC does
the "is this actually a Partner / don't double-credit / explicit-code-wins"
work server-side. You don't need to query the `partners` table from the app
at all (its RLS policy only lets a partner read their own row anyway — the
RPC runs as `SECURITY DEFINER` specifically so it can do that lookup safely
server-side without needing client-side `partners` access).

## Scope — please don't extend this further

- Only affects **attribution** (which Partner gets credit for a signup) — no
  changes to commission %, payout logic, or Partner-status eligibility.
- Only for accounts with an existing `partners` row. Do not wire this into the
  general Audio Lover referral system.
- Don't add a separate DB write for this — `record_referral_signup` already
  does the `referral_signups` insert + `partners.total_referrals` increment +
  `profiles.referred_by_code` / `community_entry_creator_id` stamping, exactly
  as it does today for the explicit-code path.

## Testing checklist

- [ ] Existing explicit `?ref=partnername` signup flow still credits the right partner (regression check — should be unaffected).
- [ ] Visit a Partner's fan page, sign up with no `?ref=`, no other referral code entered → new `referral_signups` row created for that partner, `total_referrals` incremented.
- [ ] Visit a *non-partner* creator's fan page, sign up with no `?ref=` → no `referral_signups` row, no commission (this is already true today for the community-entry/welcome-screen path — just confirm it's still true).
- [ ] Visit Partner A's fan page, then sign up via Partner B's explicit `?ref=` link → only Partner B is credited, no row for Partner A.
- [ ] Self-referral (a Partner visits their own fan page and signs up a new account) still doesn't get credited.

Questions? Ping on Slack.
