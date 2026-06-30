# AI Career Advisor — Web Team Build Instructions

Mobile app side is fully built and live. This document covers what the web backend needs to implement.

---

## What's Already Done (Mobile)

- Real Gemini Flash calls (analysis + chat) — made directly from the mobile app, no backend proxy needed
- Supabase tables created via migration `20260621000000_ai_adviser_tables.sql`
- Tier enforcement (Free / Premium / Unlimited) enforced on mobile
- Usage tracked in `ai_adviser_usage` table
- Conversations persisted in `ai_adviser_conversations`

---

## What the Web Team Needs to Build

### 1. Top-up Credits — Stripe Endpoints

When a paid user exhausts their monthly analyses, the app offers "Buy 5 more analyses — £1.99". The mobile app calls these two endpoints in sequence.

---

#### `POST /api/ai-adviser/credits/create-payment`

Creates a Stripe PaymentIntent.

**Auth:** Requires `Authorization: Bearer {token}` (standard SoundBridge auth middleware).

**Request body:**
```json
{
  "creatorId": "uuid",
  "amount": 199,
  "currency": "gbp",
  "credits": 5
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

**Implementation notes:**
- Create a Stripe PaymentIntent for `amount: 199, currency: 'gbp'`
- Set `metadata: { creatorId, credits: 5, type: 'ai_adviser_credits' }` on the intent so it's identifiable in Stripe dashboard
- Return only the `clientSecret` — the mobile app handles the payment sheet

---

#### `POST /api/ai-adviser/credits/confirm`

Called after Stripe payment completes successfully on the device.

**Auth:** Requires `Authorization: Bearer {token}`.

**Request body:**
```json
{
  "creatorId": "uuid",
  "credits": 5
}
```

**Response:**
```json
{ "ok": true }
```

**Implementation notes:**
- Find the current billing period's `ai_adviser_usage` row for this creator
- Decrement `analyses_used` by `credits` (floor at 0):
  ```sql
  UPDATE ai_adviser_usage
  SET analyses_used = GREATEST(0, analyses_used - 5),
      updated_at = now()
  WHERE creator_id = $1
    AND billing_period_start = date_trunc('month', now())::date
  ```
- Optionally verify the Stripe PaymentIntent status before crediting (recommended — pass `paymentIntentId` in the body and check `stripe.paymentIntents.retrieve`)

---

### 2. Vercel Environment Variables

**You do NOT need to add `EXPO_PUBLIC_GEMINI_API_KEY` to Vercel.** Gemini is called directly from the mobile app — it is baked into the EAS/OTA bundle at build time and never routed through the backend.

The only Vercel env changes needed are whatever Stripe keys are already in use for the existing payment flows (no new keys required — just reuse existing `STRIPE_SECRET_KEY`).

---

### 3. Tables Reference (already created in Supabase)

```sql
ai_adviser_usage (
  id UUID PK,
  creator_id UUID FK → profiles,
  billing_period_start DATE,
  billing_period_end DATE,
  analyses_used INTEGER DEFAULT 0,
  chats_used INTEGER DEFAULT 0,
  free_demo_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (creator_id, billing_period_start)
)

ai_adviser_analyses (
  id UUID PK,
  creator_id UUID FK → profiles,
  analysis_json JSONB,
  generated_at TIMESTAMPTZ
)

ai_adviser_conversations (
  id UUID PK,
  creator_id UUID FK → profiles,
  messages JSONB,
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
)
```

RLS is enabled — creators can only access their own rows.

---

### 4. Tier Limits (for reference — enforced on mobile, not backend)

| Tier      | Analyses/month | Chats/month | Free demo |
|-----------|---------------|-------------|-----------|
| Free      | 0             | 0           | 1 lifetime |
| Premium   | 10            | 5           | —         |
| Unlimited | 20            | 15          | —         |

---

## Summary Checklist

- [ ] `POST /api/ai-adviser/credits/create-payment` — Stripe PaymentIntent for £1.99
- [ ] `POST /api/ai-adviser/credits/confirm` — decrement `analyses_used` by 5
- [ ] No Vercel env changes needed for Gemini
- [ ] No changes needed to existing tables (migration already ran)
