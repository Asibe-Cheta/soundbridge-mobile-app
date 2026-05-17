# ACTION REQUIRED: Send Email on Subscription Upgrade (Mobile / RevenueCat)

## Background

The mobile app uses **RevenueCat** (App Store / Google Play) for subscriptions — not Stripe. When a user upgrades on mobile, no email is currently sent. This needs to be fixed.

The mobile app now calls your backend immediately after a successful purchase. You need to:
1. Create the endpoint
2. Update the user's tier in the database
3. Send an upgrade confirmation email

---

## Mobile → Backend Call

After every successful RevenueCat purchase, the mobile app sends:

```
POST /api/subscriptions/sync-revenuecat
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "tier": "premium" | "unlimited" | "free",
  "activeSubscriptions": ["monthly" | "annual"],
  "entitlements": ["premium" | "unlimited"]
}
```

The JWT is a valid Supabase session token — decode it to get `sub` (the user's UUID).

---

## Endpoint Requirements

### `POST /api/subscriptions/sync-revenuecat`

**Authenticate:** Verify the JWT using your Supabase service role key. Extract `user_id = jwt.sub`.

**Update tier:**

```sql
UPDATE profiles
SET subscription_tier = $tier,
    updated_at = NOW()
WHERE id = $user_id;
```

**Send upgrade email** (only when tier goes up — free → premium, free → unlimited, premium → unlimited):

Fetch the user's email from `auth.users` or `profiles`, then send via SendGrid (same setup as Stripe):

```
Template: subscription_upgrade_confirmation
To: user's email
Subject: "You're now on SoundBridge [Plan]!"

Variables:
  - plan_name: "Premium" | "Unlimited"
  - plan_price: "£6.99/month" | "£12.99/month"
  - plan_features: [...] (see subscriptionPlans.ts)
  - manage_url: "https://soundbridge.live/settings/billing"
```

**Return:**

```json
{ "success": true, "tier": "premium" }
```

On any error, return a non-200 status — the mobile app logs a warning and continues (purchase is not rolled back).

---

## Also: Configure RevenueCat Webhook (Backup)

The mobile call covers the immediate case, but configure a RevenueCat webhook as a backup for edge cases (app crashes before sync, slow network, etc.).

In the RevenueCat dashboard → **Project Settings → Webhooks**, add:

```
URL: https://www.soundbridge.live/api/webhooks/revenuecat
Events to listen for:
  - INITIAL_PURCHASE
  - RENEWAL
  - PRODUCT_CHANGE (plan switch)
  - CANCELLATION
  - EXPIRATION
```

Webhook payload includes `event.app_user_id` (the Supabase user ID we passed at login) and `event.product_id` to determine the tier.

For the webhook endpoint, update the DB tier and send the same email as above. Do NOT send a duplicate if the `/sync-revenuecat` call already fired within the last 60 seconds (check `profiles.updated_at`).

---

## Email Templates Needed

| Event | Template | Subject |
|-------|----------|---------|
| Upgraded to Premium | `subscription_upgrade_premium` | You're now on SoundBridge Premium! |
| Upgraded to Unlimited | `subscription_upgrade_unlimited` | You're now on SoundBridge Unlimited! |
| Downgraded / Cancelled | `subscription_cancelled` | Your SoundBridge subscription has ended |
| Renewal | (optional) `subscription_renewed` | SoundBridge subscription renewed |

---

## Plan Feature Reference

For email content, pull from this source of truth:

**Premium (£6.99/mo, £69.99/yr):**
- Host paid events (keep 95% of revenue)
- Sell audio downloads
- 2GB storage (~250 tracks)
- Pro badge on profile
- Featured on Discover 1×/month
- Advanced analytics, priority in feed

**Unlimited (£12.99/mo, £129.99/yr):**
- 10GB storage (~1,000+ tracks)
- Unlimited badge on profile
- Featured on Discover 2×/month
- Fan subscriptions (earn monthly)
- Social media post generator
- Custom promo codes, email list export
- Lower fees (3% vs 5%)

---

**Priority:** High — mobile users currently receive no confirmation after paying.
