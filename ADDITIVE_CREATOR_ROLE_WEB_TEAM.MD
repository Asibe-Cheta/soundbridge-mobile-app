# Web Team: Additive Creator Role Upgrade — `is_creator` Flag

## Summary

Mobile shipped "Become a Creator" as an **additive** upgrade: an existing Audio
Lover can gain creator access without losing their Audio Lover status. This
required a schema change because `profiles.role` was a single exclusive value
(`'creator' | 'listener'`) — flipping it for an upgrading user would have
destructively overwritten their listener status and broken every
`role === 'listener'` check gating their tipping/referral/engagement UI.

**The fix: `profiles.role` is never reassigned by this flow.** A new column,
`is_creator`, is set instead. An Audio Lover who upgrades keeps
`role = 'listener'` forever; creator access is granted purely by
`is_creator = true`. Please mirror this on the web app rather than reusing the
old role-flip endpoint for existing accounts.

## Required Migration

Already applied via mobile's own Supabase migration
(`supabase/migrations/20260802000000_additive_creator_role.sql`), included here for your records:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_agreement_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_agreement_version text,
  ADD COLUMN IF NOT EXISTS creator_upgraded_at timestamptz;

UPDATE public.profiles
SET is_creator = true
WHERE role = 'creator'::user_role
  AND is_creator IS DISTINCT FROM true;
```

If your Supabase project is separate from the one mobile writes to, please run
this against it too — the two must stay in sync since they share `profiles`.

## What Changed

- **New "Become a Creator" entry point** in the mobile Profile screen (Creator
  Tools section), reusing the existing perks + agreement modal
  (`BecomeCreatorModal`), followed by a short new screen collecting artist
  name, creator type (musician/podcaster/DJ/event organizer/venue owner), and
  genres — all fields/validation reused from the existing onboarding flow.
- On completion, mobile writes **directly via the Supabase client**:
  `is_creator = true`, `creator_agreement_accepted`, `creator_agreement_version`,
  `creator_upgraded_at`, plus the collected `display_name`/`genres`.
  `role` is untouched.
- Creator sub-types (musician/podcaster/etc.) are recorded via the existing
  `user_creator_types` system (`POST /api/users/{userId}/creator-types`) —
  unchanged, already additive.

## `/api/user/become-creator` — Please Stop Using For This Case

This endpoint (called from `CreatorAgreementService.acceptAgreement()`) sets
`role = 'creator'` server-side, which is fine for a brand-new account's first
role choice but **destructive** for an existing Audio Lover upgrading — it
would silently drop their listener status and break every `role === 'listener'`
check. Mobile's new upgrade flow bypasses it entirely and writes
`is_creator` directly instead.

If the web app has its own "become a creator" flow reachable by an existing
Audio Lover account, please have it check/set `is_creator` the same way rather
than reassigning `role`. `/api/user/become-creator` is still fine as-is for
first-time role selection on brand-new signups where there's no existing
listener status to lose.

## How To Check Creator Access Going Forward

Anywhere the web app currently checks `role === 'creator'` to gate creator
screens/features, please treat it as:

```
isCreator = profile.is_creator === true || profile.role === 'creator'
```

so upgraded accounts (which keep `role = 'listener'`) are recognized. Anywhere
checking `role === 'listener'` for Audio Lover UI (tipping, referral,
engagement) needs **no change** — it continues to correctly reflect Audio
Lover status even after a creator upgrade, since `role` is never reassigned.

## Also Worth Knowing (pre-existing, not introduced by this change)

While researching this we found the Audio Lover referral link
(`?ref=username`) has no server-side tracking of its own — no `partners` row
is created for Audio Lover accounts, so `record_referral_signup` likely never
fires for referrals sent via that link. Flagging in case it's relevant to your
roadmap; out of scope for this change.

## No Other Backend Changes Required

Everything else (agreement acceptance, `is_creator`, creator profile fields)
is written directly by the mobile client via Supabase — no new API endpoints
needed on your side beyond keeping `profiles` in sync per the migration above.
