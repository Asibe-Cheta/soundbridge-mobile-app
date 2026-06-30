# Web Team → Mobile Team: MBG Sonics Distribution — Live (SendGrid, Not Resend)

**Date:** 2026-06-22  
**From:** Web / Justice  
**Re:** MBG Sonics distribution payment + email handoff  
**Status:** ✅ Web endpoints live on production — safe to test full payment flow

---

## TL;DR

Web implemented the three distribution API endpoints you specified. **We did not use Resend or Supabase edge functions.** All emails go through **SendGrid** (same provider as the rest of SoundBridge). No second email vendor, no `RESEND_API_KEY`, no `supabase functions deploy` required on your side.

Partner inbox: **`israeldmy@gmail.com`** (MBG Sonics / Isreal).

---

## What changed vs your handoff

Your handoff asked for:

- `supabase functions deploy send-distribution-email` with **Resend**
- `RESEND_API_KEY` on Supabase secrets

**Web decision:** SoundBridge already sends all transactional email via **SendGrid** on Vercel (`SENDGRID_API_KEY`). Adding Resend would mean a second paid provider and Supabase CLI deploy (blocked for us by PAT token limits). Functionally identical outcome for mobile — same API contract, same DB rows, same email content.

| Your spec | Web implementation |
|-----------|---------------------|
| Resend edge function after confirm | **SendGrid** from `POST /api/distribution/confirm` on Vercel |
| Edge function on track live | DB trigger → `POST /api/distribution/on-track-live` on Vercel → **SendGrid** |
| `distributions@mbgsonics.com` | **`israeldmy@gmail.com`** (per Justice) |

The edge function files in the repo (`supabase/functions/send-distribution-email/`) are **unused** — ignore them. Do not deploy them.

---

## APIs — unchanged contract for mobile

Base: `https://www.soundbridge.live`  
Auth: **Bearer** (Supabase session token)

### 1. `POST /api/distribution/create-payment-intent`

**Body:**
```json
{
  "creatorId": "uuid",
  "trackId": "uuid"
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_..."
}
```

- Amount: **1579** pence GBP (£15.79)
- Stripe metadata: `{ creator_id, track_id, type: "mbg_distribution" }`

### 2. `POST /api/distribution/confirm`

Call after `presentPaymentSheet()` succeeds.

**Body:**
```json
{
  "paymentIntentId": "pi_...",
  "trackId": "uuid",
  "artistName": "string",
  "trackTitle": "string",
  "genre": "string | null",
  "isrcCode": "string | null",
  "featuredArtists": "string | null",
  "explicitContent": false,
  "rightsConfirmed": true,
  "requestedReleaseDate": "2026-08-01",
  "creatorEmail": "user@example.com",
  "distributionCoverArtUrl": "string | null"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "releaseDate": "2026-08-01"
}
```

**Side effect:** SendGrid email to **`israeldmy@gmail.com`** with track + cover download links (7-day signed URLs).

### 3. Mark as live — no web endpoint needed

Your admin screen continues to update `distribution_requests.track_status = 'live'` directly via Supabase client. Web DB trigger fires creator email automatically.

---

## Database

Migration applied: `supabase/migrations/20260621000002_distribution_requests.sql`

`app_settings` configured for go-live webhook:
- `distribution_creator_live_email_url` → `https://www.soundbridge.live/api/distribution/on-track-live`
- `service_role_key` → used by trigger to auth the webhook

---

## Email flows (SendGrid)

| Event | Recipient | Subject (approx) |
|-------|-----------|------------------|
| Payment confirmed | `israeldmy@gmail.com` | New Distribution Request from SoundBridge — [Track] by [Artist] |
| Admin marks live | Creator email on request | Your track is live on streaming platforms |

Push notification on mark-live is still **mobile-owned** (unchanged).

---

## Commits on `main`

| Commit | What |
|--------|------|
| `1dafeea2` | Distribution payment APIs + DB migration |
| `50bb4830` | Partner email default → `israeldmy@gmail.com` |
| `be4bde16` | **SendGrid instead of Resend** — confirm + on-track-live |

---

## Test plan for mobile

1. Pro Resources → MBG Sonics → full flow → pay £15.79  
2. Confirm `requestId` + `releaseDate` returned  
3. Check `israeldmy@gmail.com` for partner email with download links  
4. Admin → Mark as Live → creator gets push (mobile) + email (SendGrid via web trigger)

If payment step errors, confirm production Vercel deploy includes commit `be4bde16` or later.

---

## Questions?

Ping web if confirm returns 500 on email — row is still inserted; email can be retried. Idempotent on duplicate `paymentIntentId`.

Web reference doc (internal): `WEB_TEAM_MBG_SONICS_DISTRIBUTION.MD`
