# SoundBridge Digital Card — API Contract
## Mobile ↔ Backend
## Feature: Cryptographic Card Authentication + Account Recovery

> **Status as of 2026-05-18:** Contract accepted by web team. All schema questions
> resolved. Endpoints 1–7 NOT YET BUILT. Mobile unblocked on UI skeletons and
> types only — no API calls can be wired until web ships.

## Confirmed Facts

| Item | Status | Confirmed value |
|------|--------|----------------|
| Contract accepted | ✅ | Web team accepted in principle 2026-05-18 |
| `persona_verified` computation | ✅ | Server-side: `profiles.is_verified` + `service_provider_profiles.verification_status`. Mobile receives boolean only — no column access needed |
| Login token type | ✅ | `token_type: "magic_link"` + `login_token` URL, ~15 min TTL |
| `profiles.professional_headline` | ✅ | EXISTS in prod DB — added to `database.ts` |
| Card photo source | ✅ | Use `profiles.avatar_url` until `card_photo_url` migration ships |
| `profiles.card_photo_url` | 🔲 | Does NOT exist yet — pending web migration |
| Generation counters | 🔲 | Will live on `profiles` table (web to add columns + reset cron) |
| Generation status endpoint | 🔲 | `GET /api/card/generation-status` — to be built |
| Recovery storage bucket | 🔲 | `recovery-evidence` — to be created by web team |
| Recovery file path | 🔲 | `recovery-evidence/{creator_id}/{request_id}/{file}` |
| RLS on new tables | 🔲 | Confirmed approach: no anon SELECT; Edge Functions use service role |
| Rate limiting | 🔲 | Cloudflare + Edge Function. Returns 429 with `retry_after_seconds` |
| Admin dashboard | ✅ | Web team owns Part 3 entirely — mobile only writes data |
| Endpoints 1–7 | 🔲 | None built yet |

✅ **Discrepancy resolved (2026-05-18):** `persona_verified` in the Endpoint 4 response is
computed entirely server-side from `profiles.is_verified` AND
`service_provider_profiles.verification_status`. Mobile never queries either column
directly — the value arrives as a boolean in the API response. No mobile code change needed.

---

All endpoints are authenticated unless marked `[PUBLIC]`.
Authenticated requests send the Supabase JWT in the Authorization header:
`Authorization: Bearer <supabase_access_token>`

Rate-limited endpoints are marked `[RATE LIMITED]`.
All responses are `Content-Type: application/json`.
All timestamps are ISO 8601 UTC strings.

---

## Endpoint 1 — Generate Card Token

```
POST /api/card/generate-token
```

**Who calls it:** Mobile app, immediately before rendering the QR code.

**What it does:**
- Validates the creator has remaining card generations for their tier
- Invalidates any existing active token for this creator
- Generates a random salt
- Computes HMAC-SHA256 over (creator_id + account_created_at +
  card_generated_at + salt) using CARD_SECRET_KEY (server-side only)
- Inserts a new row in `card_auth_tokens` with is_active = true
- Increments generation counters
- Returns the raw token so mobile can embed it in the QR code JSON

**Request body:**
```json
{
  "creator_id": "uuid-string"
}
```

**Success response — 200:**
```json
{
  "token": "hmac-sha256-hex-string",
  "generated_at": "2026-05-18T14:32:00.000Z",
  "generations_used_this_month": 2,
  "generations_remaining_this_month": 3,
  "generations_lifetime": 7
}
```

**Error responses:**

`403 — Generation limit reached:`
```json
{
  "error": "generation_limit_reached",
  "message": "You have used all your card generations for this period.",
  "tier": "premium",
  "limit": 5,
  "used": 5,
  "resets_at": "2026-06-01T00:00:00.000Z"
}
```

`401 — Unauthenticated:`
```json
{ "error": "unauthorized" }
```

`400 — creator_id missing or malformed:`
```json
{ "error": "invalid_request", "message": "creator_id is required" }
```

**Mobile behaviour on success:**
Embed the returned `token` into the QR code JSON payload alongside the
profile URL and uid. Mobile does NOT store the token locally — it only
lives inside the generated image.

**Mobile behaviour on generation_limit_reached:**
Show the upgrade modal with the `resets_at` date. Do not proceed to
card rendering.

**Note for backend:**
The previous active token for this creator must be invalidated
(is_active = false, invalidated_at = now) before the new one is inserted.
This is a single transaction — do not leave two active tokens.

---

## Endpoint 2 — Store File Fingerprint

```
POST /api/card/store-fingerprint
```

**Who calls it:** Mobile app, immediately after ViewShot captures the card
PNG and before showing the download/share buttons.

**What it does:**
- Receives the SHA-256 hash of the generated card image file bytes
- Stores it as `file_fingerprint` on the most recent active
  `card_auth_tokens` row for this creator
- This is what makes copies and screenshots detectable

**How mobile generates the hash:**
```
SHA-256(rawBytesOfTheGeneratedPNGFile)
```
Encoded as lowercase hex string. Mobile computes this from the ViewShot
output file before it is displayed to the user.

**Request body:**
```json
{
  "creator_id": "uuid-string",
  "file_hash": "sha256-hex-lowercase-string"
}
```

**Success response — 200:**
```json
{
  "stored": true
}
```

**Error responses:**

`404 — No active token found for this creator:`
```json
{
  "error": "no_active_token",
  "message": "Generate a card token before storing a fingerprint."
}
```

`400 — file_hash missing or not a valid hex string:`
```json
{ "error": "invalid_hash", "message": "file_hash must be a 64-character hex string" }
```

**Note for backend:**
There is a short window between Endpoint 1 (token generated) and this
call (fingerprint stored). The `file_fingerprint` column starts null and
is filled by this call. If a recovery attempt arrives before this call
completes (edge case), the fingerprint check should fail gracefully with
the standard "card could not be verified" message rather than a 500.

---

## Endpoint 3 — Get Generation Status

```
GET /api/card/generation-status
```

**Who calls it:** Mobile app when the card screen loads, to decide whether
to show the Generate button as active or disabled.

**What it does:**
- Returns how many card generations the creator has used and how many
  remain for their current tier and period

**No request body. Creator ID inferred from the JWT.**

**Success response — 200:**
```json
{
  "tier": "premium",
  "generations_used_this_month": 2,
  "generations_remaining_this_month": 3,
  "generations_lifetime": 7,
  "monthly_limit": 5,
  "resets_at": "2026-06-01T00:00:00.000Z",
  "can_generate": true
}
```

When limit is reached, `can_generate` is `false` and mobile greys the
button before the user tries.

**Error responses:**

`401 — Unauthenticated:`
```json
{ "error": "unauthorized" }
```

---

## Endpoint 4 — Verify Card (Recovery Step 1)

```
POST /api/recovery/verify-card
[RATE LIMITED] [PUBLIC — no auth token required, user is locked out]
```

**Who calls it:** Mobile app during the recovery flow after the user uploads
their card file.

**What it does (server-side only — none of this logic runs on mobile):**
1. Looks up the active `card_auth_tokens` row for the given uid
2. Checks: is there an active row? (`is_active = true`)
3. Checks: does the submitted `token` match `card_auth_tokens.card_auth_token`?
4. Checks: does the submitted `file_hash` match `card_auth_tokens.file_fingerprint`?
5. ALL THREE must pass. Logs the attempt in `recovery_attempts` regardless
   of outcome (including the IP address from the request header)
6. If all pass: creates a short-lived pending recovery session (server state
   only) and returns a `recovery_session_id` for use in the next step

**Important security rule:**
The server NEVER returns which specific check failed. All failures return
the same generic error message. This prevents an attacker from learning
whether they have a valid token but wrong file, or vice versa.

**Request body:**
```json
{
  "uid": "creator-uuid-string",
  "token": "card-auth-token-from-qr-code",
  "file_hash": "sha256-hex-of-uploaded-file"
}
```

**Success response — 200:**
```json
{
  "verified": true,
  "recovery_session_id": "short-lived-opaque-token",
  "persona_verified": true,
  "expires_at": "2026-05-18T14:47:00.000Z"
}
```

`persona_verified` tells mobile which branch of Step 2 to show:
- `true` → Trigger Persona face verification
- `false` → Show manual selfie video upload

**How the backend determines `persona_verified` (confirmed 2026-05-18):**
Backend computes this entirely server-side by combining `profiles.is_verified` AND
`service_provider_profiles.verification_status`. Mobile receives a plain boolean —
it never reads either column directly and needs no knowledge of the column names.

The `recovery_session_id` must be sent in all subsequent recovery calls.
It expires in 15 minutes.

**Failure response — 400 (any check fails, same body for all failure types):**
```json
{
  "verified": false,
  "error": "verification_failed",
  "message": "This card could not be verified. Please make sure you are uploading your original card file, not a screenshot or copy."
}
```

**Rate limit response — 429:**
```json
{
  "error": "rate_limited",
  "message": "Too many recovery attempts. Please try again in 58 minutes.",
  "retry_after_seconds": 3480
}
```

**Note for backend:**
The `recovery_session_id` is a server-side concept only — it ties the
verified card check to the subsequent face verification step so a bad actor
cannot call Step 3 directly. It is NOT a Supabase auth token. It should
be stored in a temporary table or Redis with a 15-minute TTL and
invalidated after use.

---

## Endpoint 5 — Complete Recovery (Recovery Step 3)

```
POST /api/recovery/complete
[RATE LIMITED] [PUBLIC]
```

**Who calls it:** Mobile app after Persona face verification succeeds.
The Persona result is verified server-side via Persona webhook — mobile
does NOT pass the Persona result directly to this endpoint.

**What it does:**
1. Validates the `recovery_session_id` is still active and not expired
2. Confirms Persona verification status has been updated to approved on
   the backend (via the webhook that Persona fires — NOT mobile's word)
3. Invalidates the used card token:
   - `card_auth_tokens.used_for_recovery_at = now`
   - `card_auth_tokens.is_active = false`
4. Generates a magic link via `supabase.auth.admin.generateLink({ type: 'magiclink', email })`
   (confirmed by web team 2026-05-18 — Option A)
5. Logs the successful recovery in `recovery_attempts`

**Request body:**
```json
{
  "recovery_session_id": "opaque-token-from-step-1"
}
```

**Success response — 200:**
```json
{
  "success": true,
  "login_token": "one-time-login-token-or-magic-link-url",
  "token_type": "magic_link",
  "expires_at": "2026-05-18T14:47:00.000Z"
}
```

`token_type` is always `"magic_link"` (confirmed by web team 2026-05-18).
Mobile calls `supabase.auth.getSessionFromUrl(login_token)` to establish the session.
The magic link expires in 15 minutes (configured server-side, shorter than Supabase default).

**Failure response — 400:**
```json
{
  "success": false,
  "error": "session_expired_or_invalid",
  "message": "Recovery session has expired. Please start over."
}
```

`403` if Persona verification has not been confirmed on the backend yet:
```json
{
  "success": false,
  "error": "face_verification_not_confirmed",
  "message": "Face verification has not been confirmed. Please complete the identity check."
}
```

---

## Endpoint 6 — Submit Manual Recovery Request

```
POST /api/recovery/submit-manual
[RATE LIMITED] [PUBLIC]
```

**Who calls it:** Mobile app for unverified creators who cannot do Persona
face verification (Step 2 alternative path).

**What it does:**
- Creates a row in `recovery_requests` with status = 'pending'
- Associates the card file and selfie video (already uploaded to storage
  by mobile before this call)
- Notifies admin of pending manual review request
- Logs to `recovery_attempts` with outcome = 'pending_manual'

**Request body:**
```json
{
  "recovery_session_id": "opaque-token-from-step-1",
  "card_file_storage_path": "recovery-evidence/{creator_id}/{request_id}/card.png",
  "selfie_video_storage_path": "recovery-evidence/{creator_id}/{request_id}/selfie.mp4"
}
```

**Success response — 200:**
```json
{
  "submitted": true,
  "recovery_request_id": "uuid",
  "message": "Your recovery request has been submitted. We will contact you within 48 hours."
}
```

**Failure — session expired or already used:**
```json
{
  "submitted": false,
  "error": "session_expired_or_invalid"
}
```

---

## Endpoint 7 — Get Signed Upload URL for Recovery Files

```
POST /api/recovery/upload-url
[PUBLIC]
```

**Who calls it:** Mobile, before uploading the card file or selfie video
during manual recovery. Mobile gets a signed URL from the server, then
uploads directly to Supabase storage using that URL. This way mobile
never touches the recovery bucket with the anon key.

**Request body:**
```json
{
  "recovery_session_id": "opaque-token-from-step-1",
  "file_type": "card" | "selfie_video",
  "mime_type": "image/jpeg" | "image/png" | "application/pdf" | "video/mp4"
}
```

**Success response — 200:**
```json
{
  "upload_url": "https://supabase-signed-url...",
  "storage_path": "recovery-evidence/{creator_id}/{request_id}/card.png",
  "expires_at": "2026-05-18T14:42:00.000Z"
}
```

Mobile uploads the file directly to `upload_url` with a `PUT` request,
then passes `storage_path` to Endpoint 6.

---

## QR Code Payload Format

The QR code embedded in the card must change from the current plain URL
string to a JSON payload. Mobile will encode this as a JSON string and pass
it as the `value` prop to `react-native-qrcode-svg`.

**New format:**
```json
{
  "url": "soundbridge.live/username/home",
  "token": "hmac-sha256-hex-from-endpoint-1",
  "uid": "creator-uuid"
}
```

**During recovery, mobile decodes the QR from the uploaded image file.
Server-side QR decoding is strongly preferred** (mobile sends the file to
the server; server extracts the QR). If mobile-side QR decoding is required,
the mobile team will need a library recommendation — confirm which approach.

---

## Data Sent to Endpoint 4 — How mobile generates the file hash

```
1. User selects card file (JPG/PNG/PDF) from device
2. Mobile reads file as raw bytes
3. Mobile computes SHA-256(rawBytes) using expo-crypto or React Native's
   built-in crypto module
4. Result is a 64-character lowercase hex string
5. This hex string is sent as file_hash in the request body
```

Mobile does NOT use base64 encoding for the hash — hex only, lowercase.
The server must compute the fingerprint at card generation time using the
same raw bytes → SHA-256 → lowercase hex pipeline.

---

## Error Code Reference

| Code | Meaning |
|------|---------|
| `generation_limit_reached` | Tier card generation quota exhausted |
| `no_active_token` | No active card_auth_token exists for creator |
| `verification_failed` | Card verify failed (generic — do not reveal which check) |
| `rate_limited` | Too many attempts from IP or creator |
| `session_expired_or_invalid` | Recovery session not found or expired |
| `face_verification_not_confirmed` | Persona webhook not received yet |
| `unauthorized` | Missing or invalid JWT |
| `invalid_request` | Malformed request body |

---

## Security Constraints — For Backend Implementation

These are non-negotiable and must be enforced server-side:

1. **CARD_SECRET_KEY** must NEVER be returned in any response or logged.
   It exists only in server environment variables.

2. **file_fingerprint and card_auth_token values** must NEVER be returned
   in any API response after generation. Endpoint 1 returns the token once
   (so mobile can embed it). After that, both values are write-only from
   mobile's perspective.

3. **All three checks** in Endpoint 4 must be evaluated before the response
   is returned. Do not short-circuit and return early on the first failure —
   constant-time comparison where possible to prevent timing attacks.

4. **Recovery session IDs** must be cryptographically random (not sequential
   UUIDs), single-use, and expire in 15 minutes.

5. **The Persona verification result** for recovery must come from the Persona
   webhook to the backend, not from mobile's self-report. Mobile triggers
   Persona via the existing flow; the server reads the webhook result before
   allowing Endpoint 5 to proceed.

6. **IP address** must be extracted from the `X-Forwarded-For` or
   `CF-Connecting-IP` header server-side. Mobile does not send its own IP.

---

## Implementation Status (2026-05-18)

Backend shipped on commit `85001ec8`. Migration `20260518120000_digital_card_cryptographic_auth.sql` applied on prod.

1. ✅ Schema questions answered
2. ✅ New tables created with RLS (web commit 85001ec8)
3. ✅ Endpoint 3 (generation status) — live
4. ✅ Endpoint 1 (generate token) — live; `creator_id` body field optional, server uses JWT
5. ✅ Endpoint 2 (store fingerprint) — live
6. ✅ Endpoint 4 (verify card) — live
7. ✅ Endpoint 7 (upload URL) — live; path format `{creator_id}/{session_id}/file.ext`
8. ✅ Endpoint 5 (complete recovery) — live; Persona webhook handled server-side
9. ✅ Endpoint 6 (submit manual) — live

**Tier limits (confirmed 2026-05-18):** free = 1/month, premium = 5/month, unlimited = no limit.
**Mobile integration:** complete. New EAS build required (expo-camera added for QR decode).
**Remaining gap:** Admin dashboard UI (Part 3) — web team, not in this release.
