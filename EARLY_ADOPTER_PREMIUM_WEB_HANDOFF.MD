# Web Team Handoff — Early Adopter Premium Expiry Conversion
**From:** Mobile team / Justice  
**Date:** 2026-06-01  
**Priority:** High — mobile modal is already deployed. It reads `profiles.early_adopter`,
`profiles.subscription_tier`, and `profiles.subscription_period_end` to decide when to show.
The DB additions below complete the loop.

---

## How the mobile side works (already live)

```
App opens / comes to foreground
  └─ FeedScreen checks:
       early_adopter === true
       AND subscription_tier === 'free'     ← web team sets this on expiry
       AND subscription_period_end < now()
  └─ If true → show EarlyAdopterConversionModal

Modal actions:
  "Continue as Premium"  → navigate to UpgradeScreen (RevenueCat)
  "Remind me later"      → AsyncStorage: re-show after 3 days
  "Continue with Free"   → AsyncStorage: dismiss permanently
```

The modal handles its own reminder cadence (day 0 → 3 → 7 → 14, then stops) entirely client-side via AsyncStorage. It needs no backend state for the modal itself.

**What the web team must do:**
1. Downgrade `subscription_tier` to `'free'` on expiry day
2. Send the pre-expiry push notifications (7 days before, 1 day before)
3. Send the post-expiry push notifications (day 7, day 14)
4. Create `early_adopter_conversion` tracking table

---

## Step 1 — Tracking table

```sql
CREATE TABLE IF NOT EXISTS public.early_adopter_conversion (
  user_id               uuid PRIMARY KEY
                        REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_expired_at     timestamptz,          -- when subscription_period_end was
  modal_last_shown_at   timestamptz,          -- informational (mirror of client state)
  modal_dismissed_permanently boolean NOT NULL DEFAULT false,
  reminder_count        integer  NOT NULL DEFAULT 0,
  converted_to_paid     boolean  NOT NULL DEFAULT false,
  converted_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

Backfill existing expired early adopters:

```sql
INSERT INTO public.early_adopter_conversion (user_id, access_expired_at)
SELECT id, subscription_period_end::timestamptz
FROM   public.profiles
WHERE  early_adopter  = true
  AND  subscription_tier = 'free'
  AND  subscription_period_end IS NOT NULL
  AND  subscription_period_end::timestamptz < now()
ON CONFLICT (user_id) DO NOTHING;
```

---

## Step 2 — Background job (run via pg_cron or Edge Function, daily)

The job does three things: sends pre-expiry notifications, downgrades accounts on day 0,
and sends post-expiry re-engagement pushes.

```sql
-- ═══════════════════════════════════════
-- STAGE 1: 7 days before expiry warning
-- ═══════════════════════════════════════
-- Find early adopters whose access expires in 6–8 days (2-day window to catch any drift)
-- and send a push notification.

-- Query to find them:
SELECT p.id, p.expo_push_token, p.display_name
FROM   public.profiles p
WHERE  p.early_adopter = true
  AND  p.subscription_period_end::timestamptz BETWEEN now() + interval '6 days'
                                                   AND now() + interval '8 days'
  AND  p.expo_push_token IS NOT NULL
  -- Only send once (check notifications or a sent_flags table)
;
-- For each row, POST to Expo Push API:
-- {
--   to: expo_push_token,
--   title: "Your Premium access expires in 7 days",
--   body:  "You have been with us from the beginning. We would love to keep you on Premium. Continue for just £6.99 per month.",
--   data:  { type: "early_adopter_expiry", screen: "Upgrade" }
-- }


-- ═══════════════════════════════════════
-- STAGE 2: 1 day before expiry warning
-- ═══════════════════════════════════════

SELECT p.id, p.expo_push_token
FROM   public.profiles p
WHERE  p.early_adopter = true
  AND  p.subscription_period_end::timestamptz BETWEEN now() AND now() + interval '26 hours'
  AND  p.expo_push_token IS NOT NULL
;
-- Push:
-- title: "Your Premium access expires tomorrow"
-- body:  "Do not lose access to your Premium features. Continue for just £6.99 per month."


-- ═══════════════════════════════════════
-- STAGE 3: Day of expiry — downgrade
-- ═══════════════════════════════════════

UPDATE public.profiles
SET    subscription_tier = 'free'
WHERE  early_adopter = true
  AND  subscription_tier IN ('unlimited', 'premium')
  AND  subscription_period_end::timestamptz <= now()
  -- Only downgrade if they have no active Stripe/RevenueCat subscription
  -- (add your subscription_status check here)
  AND  (subscription_status IS NULL OR subscription_status NOT IN ('active', 'trialing'));

-- Insert tracking record for newly expired users
INSERT INTO public.early_adopter_conversion (user_id, access_expired_at)
SELECT p.id, p.subscription_period_end::timestamptz
FROM   public.profiles p
WHERE  p.early_adopter = true
  AND  p.subscription_tier = 'free'
  AND  p.subscription_period_end::timestamptz BETWEEN now() - interval '2 hours' AND now()
ON CONFLICT (user_id) DO NOTHING;


-- ═══════════════════════════════════════
-- STAGE 4: Day 7 post-expiry push
-- ═══════════════════════════════════════

SELECT p.id, p.expo_push_token
FROM   public.profiles           p
JOIN   public.early_adopter_conversion c ON c.user_id = p.id
WHERE  c.converted_to_paid = false
  AND  c.modal_dismissed_permanently = false
  AND  c.access_expired_at BETWEEN now() - interval '8 days' AND now() - interval '6 days'
  AND  p.expo_push_token IS NOT NULL
;
-- Push:
-- title: "Your Premium features are waiting"
-- body:  "Come back to Premium for just £6.99 per month. Everything you had before is still there."


-- ═══════════════════════════════════════
-- STAGE 5: Day 14 post-expiry final push
-- ═══════════════════════════════════════

SELECT p.id, p.expo_push_token
FROM   public.profiles           p
JOIN   public.early_adopter_conversion c ON c.user_id = p.id
WHERE  c.converted_to_paid = false
  AND  c.modal_dismissed_permanently = false
  AND  c.access_expired_at BETWEEN now() - interval '15 days' AND now() - interval '13 days'
  AND  p.expo_push_token IS NOT NULL
;
-- Push:
-- title: "One last nudge 🙏🏾"
-- body:  "We would love to have you back on Premium. £6.99 per month. Cancel anytime."
```

---

## Step 3 — Mark conversion when user subscribes

When a user upgrades to Premium or Unlimited via Stripe/RevenueCat webhook:

```sql
UPDATE public.early_adopter_conversion
SET
  converted_to_paid = true,
  converted_at      = now()
WHERE user_id = :user_id;
```

---

## Step 4 — Grant RPC access for analytics (optional)

```sql
GRANT SELECT ON public.early_adopter_conversion TO authenticated;
```

---

## Step 5 — Expo Push API call format

All push notifications must POST to `https://exp.host/--/api/v2/push/send`:

```json
{
  "to": "<expo_push_token>",
  "sound": "default",
  "title": "<title>",
  "body": "<body>",
  "data": {
    "type": "early_adopter_expiry",
    "screen": "Upgrade"
  }
}
```

The mobile app's `NotificationService` already handles incoming notifications of type
`"early_adopter_expiry"` via its existing notification handler (the `screen` key opens
the Upgrade screen).

---

## Mobile behaviour summary (for reference)

| Day from expiry | Mobile modal shows? | Copy |
|---|---|---|
| 0 (first open after expiry) | ✅ | "You have been here from the start" |
| 1–2 | ❌ (throttled) | — |
| 3 | ✅ (if "Remind me later" tapped) | Standard |
| 4–6 | ❌ | — |
| 7 | ✅ | Standard |
| 8–13 | ❌ | — |
| 14 | ✅ | "Still thinking about it?" |
| 15+ | ❌ forever (unless feature gate) | — |
| User taps "Continue with Free" | ❌ forever | — |
| User converts to paid | ❌ forever | — |

---

## Acceptance checklist

- [ ] `early_adopter_conversion` table created
- [ ] Existing expired early adopters backfilled
- [ ] Day -7 push notification sends correctly
- [ ] Day -1 push notification sends correctly  
- [ ] `subscription_tier` downgraded to `'free'` on expiry day (with Stripe check)
- [ ] Day +7 push sends to unconverted users
- [ ] Day +14 push sends to unconverted users
- [ ] `converted_to_paid` updated via Stripe/RevenueCat webhook
- [ ] No pushes after day 14

🙏🏾
