# PayPal as a Payment Option for One-Time Payments

> **Status: web team has already implemented the backend/shared portion of this. Read this
> whole doc before writing any code** — the backend that mobile calls into is the same
> Next.js API in this repo (`apps/web/app/api/...`), so most of what this original spec asked
> for is already done and shared automatically with the mobile app. Duplicating it (e.g.
> building a standalone PayPal SDK integration, or touching the PaymentIntent creation routes
> again) will conflict with what's live.

## Original spec (for context)

Add PayPal as an available payment method for all existing one-time payment flows: Tip Room
tips, Live Request Room tips, in-player music tipping, live audio session tips, event ticket
purchases, and audio material/merchandise purchases. Subscriptions are out of scope.

Priority order: first check if enabling PayPal within Stripe's existing configuration is
sufficient (config + checkout UI change, not a new integration); only build a separate PayPal
SDK integration if Stripe's native support is unavailable or insufficient.

Scope boundaries: one-time payments only, no subscription billing, no changes to creator
payout methods/architecture (this only affects how a *payer* pays, not how creators get paid
out). Transaction records should store which payment method was used (card vs PayPal) for
reconciliation.

## What's already done (web team, backend — shared with mobile)

Stripe's native PayPal support turned out to be sufficient — no separate PayPal SDK needed.
Every relevant PaymentIntent-creation endpoint in this backend now requests
`automatic_payment_methods: { enabled: true }` (or already had it), which makes Stripe
surface PayPal as a selectable, PayPal-branded option automatically once PayPal is turned on
in the Stripe Dashboard — for **both** web and mobile clients, since they call the same API:

- `POST /api/payments/create-intent` (content/merchandise purchases) — added
- `POST /api/events/create-ticket-payment-intent` (event tickets) — added
- `POST /api/payments/tip-room-tip`, `POST /api/payments/fan-landing-tip`,
  `POST /api/request-room/create-payment-intent` — already had it
- `POST /api/payments/create-tip` — the default (non-`apple_pay`/`google_pay`) code path
  already used `automatic_payment_methods`. **This is the endpoint the mobile app's own
  tipping flow already calls** (it's built around Stripe's PaymentSheet customer pattern —
  `ephemeral_key_secret` + `customer_id`), so mobile tipping is already backend-ready too.

Reconciliation (which payment method was actually used, per the spec's requirement): a new
`payment_method_type` column now exists on `platform_revenue`, `content_purchases`,
`request_room_requests`, and `purchased_event_tickets`, populated automatically server-side
at charge-finalization time (see `apps/web/src/lib/stripe-payment-intent-metadata.ts` →
`getPaymentIntentPaymentMethodType`). This runs in the shared webhook/finalize code
(`tip-payment-intent-webhook.ts`, `content-purchase-payment-intent-webhook.ts`,
`request-room-payment-intent-webhook.ts`, `confirm-ticket-purchase/route.ts`), so it fires
regardless of whether the charge originated from web or mobile — **mobile doesn't need to do
anything for this to work.**

Migration: `supabase/migrations/20260730120000_payment_method_type_reconciliation.sql`
(applied).

On web specifically: every checkout UI already used Stripe's modern `PaymentElement` +
`confirmPayment()` (Tip Room, fan-landing/in-player tips, Request Room, content purchase,
event tickets), so no frontend rebuild was needed there — PayPal just appears once enabled.

## What's still needed

### Shared (whoever owns Stripe Dashboard access — not per-client)

1. **Turn PayPal on in the Stripe Dashboard**, in the right configuration. Settings →
   Payments → **Payment methods** only lists *configurations* (groups), not individual
   method toggles — you have to open one to find PayPal:
   - Click into the **"Default"** row where **Type = "Your platform account"**
     (`pmc_1Rq1Pl0Bt6mXrdyeWfraTamz`), *not* one of the connected-account configs. This
     codebase uses destination charges (`transfer_data: { destination: <connected account> }`),
     and per Stripe's own description on that page, destination charges bill against the
     **platform account's** payment method configuration, not the connected account's.
   - Inside it, toggle PayPal on.
   - This is a one-time, account-level setting — not "web's" or "mobile's" to do separately.
     Until it's on, PayPal won't appear on **either** platform no matter what code says.
2. **Register the production domain under Payment method domains** (Settings → Payments →
   **Payment method domains**). Currently only `buy.stripe.com` and `checkout.stripe.com` are
   listed. PayPal (like Apple Pay, Google Pay, Amazon Pay, Klarna) requires the domain it's
   rendered on to be registered before it'll show up in Stripe Elements/PaymentElement. Add:
   - `www.soundbridge.live` — the canonical domain. (Bare `soundbridge.live` 301-redirects to
     `www.soundbridge.live` before anything renders — per `vercel.json` and the hardcoded
     `return_url` fallback already in the checkout components — so there's nothing to register
     there; only the `www` host actually serves pages.)
   - Enter just the hostname, no `https://` prefix, matching the existing rows.
   - This step is **web-specific** — it only matters for PayPal rendered via Elements/
     PaymentElement on soundbridge.live. Mobile's native `PaymentSheet` doesn't use Elements on
     a domain, so this doesn't block mobile.

### Mobile team's to do

3. **PaymentSheet configuration for redirect-based methods.** PayPal is a redirect-based
   payment method in Stripe (like iDEAL), which the React Native Stripe SDK's `PaymentSheet`
   supports, but it needs a `returnURL` configured on `initPaymentSheet` (a custom URL scheme),
   the corresponding native URL scheme registration in `Info.plist`/iOS and the Android
   manifest, and `handleURLCallback` wired up so the app resumes correctly after the user
   completes payment in PayPal's app/browser and gets redirected back. This is genuinely
   mobile-SDK-specific plumbing this web session has not touched and can't verify — it's the
   one real piece of client work left.
4. **QA on both iOS and Android** once items 1–3 are done: confirm the PayPal button renders
   in PaymentSheet and a full redirect-and-return payment completes for at least tip and
   event-ticket flows.

## What NOT to do (avoid duplicating/conflicting with what's already live)

- Don't touch `POST /api/payments/create-tip`, `create-intent`, `tip-room-tip`,
  `fan-landing-tip`, `create-ticket-payment-intent`, or `request-room/create-payment-intent` —
  their PaymentIntent config is already correct.
- Don't build a separate PayPal SDK integration — Stripe's native support already covers this;
  a standalone integration would directly contradict this doc's own stated priority order and
  create a second, conflicting payment path.
- Don't add another payment-method column elsewhere, or a new RPC for recording it —
  `platform_revenue.payment_method_type` (and the matching columns on the three other tables
  above) is the reconciliation record; it's already populated automatically.
- Don't modify `insert_platform_revenue` or the webhook/finalize libs listed above — they're
  shared with web and already updated for this.
