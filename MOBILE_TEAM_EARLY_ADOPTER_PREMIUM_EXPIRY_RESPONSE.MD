# Mobile Team — Early Adopter Premium Expiry (Web / Backend Complete)

**Date:** 2026-06-03  
**Status:** ✅ Live on Sound Bridge production  
**Supabase project:** `aunxdbqukbxyyiusaeqi` (Sound Bridge — **not** GlobalReady Mobile)  
**Related:** `EARLY_ADOPTER_PREMIUM_WEB_HANDOFF.MD` (original spec)

---

## Summary for mobile

Your **EarlyAdopterConversionModal** logic from the original handoff is still correct. **No schema changes are required** if you already read these three fields from `profiles`:

| Column | Type | Use |
|--------|------|-----|
| `early_adopter` | `boolean` | Permanent cohort flag (badge + modal eligibility) |
| `subscription_tier` | `text` | `'free' \| 'premium' \| 'unlimited'` (and legacy `'pro'` if still present) |
| `subscription_period_end` | `timestamptz` | End of the **free 3‑month grant** (canonical) |

**Fallback (optional):** If `subscription_period_end` is null, you may use `subscription_renewal_date` as the same instant (web backfills both on grant).

Web now handles expiry downgrade, push cadence, and paid conversion tracking. Modal timing stays **client-side (AsyncStorage)** unless you choose to sync with `early_adopter_conversion` (optional below).

---

## Production state (2026-06-03)

| Item | Value |
|------|--------|
| Waitlist emails loaded | ~398 (`waitlist_premium_3mo_2026`) |
| Signed-up + granted on Sound Bridge | **102** users |
| Grant end date | **`2026-07-01T00:00:00+00`** UTC |
| `early_adopter` + `premium` + `subscription_period_end` set | **102 / 102 / 102** |

New waitlist signups are granted when ops re-runs the sync script (email must match `auth.users.email` exactly).

---

## Modal gate (unchanged — verify in app)

Show **EarlyAdopterConversionModal** when **all** are true:

```ts
profile.early_adopter === true
&& normalizeTier(profile.subscription_tier) === 'free'   // after web downgrade on expiry day
&& grantEnd(profile) < new Date()
```

```ts
function normalizeTier(tier: string | null | undefined): string {
  const t = (tier ?? 'free').toLowerCase();
  if (t === 'pro') return 'premium';
  if (t === 'enterprise') return 'unlimited';
  return t;
}

function grantEnd(profile: {
  subscription_period_end?: string | null;
  subscription_renewal_date?: string | null;
}): Date | null {
  const raw = profile.subscription_period_end ?? profile.subscription_renewal_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}
```

**While grant is active** (before expiry): `subscription_tier` is `'premium'` → modal must **not** show.

**After expiry day:** web cron sets `subscription_tier` → `'free'` (unless Stripe/RevenueCat still active — see below).

**After user pays:** tier becomes `'premium'` or `'unlimited'` via RevenueCat → hide modal forever (same as today).

---

## Do not confuse with Founding Members

| | Early adopter (this doc) | Founding member |
|--|--------------------------|-----------------|
| Table / flag | `profiles.early_adopter` | `founding_members` (~102 rows) |
| Cohort size | ~398 emails; **102** signed up | First 102 waitlist by signup order |
| Grant | 3 months **Premium** until **2026-07-01** | Separate benefits (10% discount, etc.) |
| Modal | EarlyAdopterConversionModal | Different flows |

A user can be founding member **and** early adopter; read the correct flag for each feature.

---

## What web shipped (you can rely on this)

### 1. `profiles` columns (migration applied on Sound Bridge)

Added if missing (safe `IF NOT EXISTS`):

- `early_adopter` boolean default `false`
- `subscription_tier` varchar default `'free'`
- `subscription_status` varchar
- `subscription_period_end` timestamptz
- `subscription_renewal_date` timestamptz (kept in sync on grant)

### 2. `early_adopter_conversion` table (optional for mobile)

```sql
early_adopter_conversion (
  user_id                      uuid PK → profiles(id),
  access_expired_at            timestamptz,
  modal_last_shown_at          timestamptz,      -- optional: mobile can write
  modal_dismissed_permanently  boolean default false,
  reminder_count               int default 0,
  converted_to_paid            boolean default false,
  converted_at                 timestamptz,
  push_pre_7d_sent_at          timestamptz,      -- web only (dedupe)
  push_pre_1d_sent_at          timestamptz,
  push_post_7d_sent_at         timestamptz,
  push_post_14d_sent_at        timestamptz,
  created_at                   timestamptz
)
```

- **RLS:** authenticated users can **SELECT own row** only (`user_id = auth.uid()`).
- **No INSERT/UPDATE policy for clients today** — web uses service role for cron/webhooks.

**You do not need this table for the modal** if AsyncStorage cadence is enough.

### 3. Daily cron (Vercel)

`GET /api/cron/early-adopter-premium-expiry` (09:00 UTC, requires `CRON_SECRET`)

| Stage | Action |
|-------|--------|
| −7 days | Push: grant expiring in 7 days |
| −1 day | Push: expires tomorrow |
| Day 0 | Set `subscription_tier = 'free'` if grant ended and no active paid sub |
| Day 0 | Insert `early_adopter_conversion` row |
| +7 / +14 days | Re-engagement pushes (stops if `converted_to_paid` or dismissed) |

Skips downgrade if `subscription_status` is `'active'` or `'trialing'` (paid Stripe path).

### 4. Paid conversion

On Stripe / RevenueCat subscription activation, web sets:

```sql
early_adopter_conversion.converted_to_paid = true, converted_at = now()
```

Post-expiry pushes from web stop for that user.

---

## Push notifications (already specified)

**Payload:**

```json
{
  "type": "early_adopter_expiry",
  "screen": "Upgrade"
}
```

**Handler:** Open Upgrade / paywall (RevenueCat) — same as existing `NotificationService` routing.

| Timing | Title (approx) |
|--------|----------------|
| −7d | Your Premium access expires in 7 days |
| −1d | Your Premium access expires tomorrow |
| +7d | Your Premium features are waiting |
| +14d | One last nudge 🙏🏾 |

---

## Recommended mobile reads

### Profile fetch (Supabase)

Include in your profile / session refresh select list:

```ts
'id, early_adopter, subscription_tier, subscription_status, subscription_period_end, subscription_renewal_date'
```

Or use existing API if it already returns these:

- `GET /api/subscription/status` (includes `early_adopter`, `subscription_period_end` on profile)

**Refresh profile** after:

- App foreground (you likely already do)
- RevenueCat purchase success (so tier updates before modal check)
- Tap on `early_adopter_expiry` push

### Tier / entitlement logic

Treat **active early-adopter grant** as Premium until `subscription_period_end`:

```ts
function hasActiveEarlyAdopterGrant(profile): boolean {
  if (!profile?.early_adopter) return false;
  const tier = normalizeTier(profile.subscription_tier);
  if (tier !== 'premium' && tier !== 'unlimited') return false;
  const end = grantEnd(profile);
  return !end || end > new Date();
}
```

Use this for upload limits, badge, and gating — aligned with web `isEarlyAdopterPremiumGrant()`.

---

## Optional schema / client enhancements (not required)

Only if product wants **server-backed** modal state (instead of AsyncStorage only):

1. **RPC or API** to upsert own `early_adopter_conversion` row:
   - `modal_last_shown_at = now()`
   - `modal_dismissed_permanently = true` when user taps “Continue with Free”
   - increment `reminder_count` on “Remind me later”

   Requires new RLS policy: `UPDATE`/`INSERT` for `user_id = auth.uid()` — **not deployed yet**; ask web if you want this.

2. **Stop showing modal** when `converted_to_paid = true`:

   ```ts
   const { data } = await supabase
     .from('early_adopter_conversion')
     .select('converted_to_paid')
     .eq('user_id', userId)
     .maybeSingle();
   if (data?.converted_to_paid) return; // skip modal
   ```

3. **Apple Private Relay emails** — several granted users use `@privaterelay.appleid.com`. Waitlist matching is on **exact** `auth.users.email`; no mobile change needed.

---

## Mobile QA checklist

- [ ] Confirm app points at Sound Bridge Supabase (`aunxdbqukbxyyiusaeqi`), not another project
- [ ] Early adopter test user: `early_adopter=true`, `premium`, `subscription_period_end` in future → **no** modal, Premium features work
- [ ] Simulate post-expiry: `tier=free`, `period_end` in past → modal shows on foreground
- [ ] Push `type: early_adopter_expiry` opens Upgrade screen
- [ ] After RevenueCat purchase, modal does not return (refresh profile / RC entitlements)
- [ ] Badge still shows for `early_adopter=true` after expiry (permanent cohort flag)

---

## Web / ops contacts

- **Grant more signups:** re-run `scripts/early-adopter-sync-profiles-from-legacy.sql` on Sound Bridge (not GlobalReady)
- **Verify counts:** `scripts/early-adopter-diagnose-prod.sql` (SUMMARY query)
- **Wrong DB warning:** `scripts/VERIFY-SUPABASE-PROJECT.md`

---

## Acceptance (web — done on Sound Bridge)

- [x] `early_adopter_conversion` table + RLS select own row
- [x] `profiles` columns for cohort + grant end
- [x] 102 early adopters granted through **2026-07-01**
- [x] Cron + webhook conversion tracking (deploy with app release)
- [x] Push payload `early_adopter_expiry` / `Upgrade`

**Mobile:** no mandatory schema changes — confirm profile fields + modal gate above.
