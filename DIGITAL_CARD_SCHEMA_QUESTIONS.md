# SoundBridge Digital Card — Schema Confirmation Questions
## For: Web / Backend Team
## From: Mobile Team
## Re: DIGITAL_CARD_CRYPTOGRAPHIC_AUTH.MD implementation

These questions must be answered before mobile can write any code. Each
question explains why we need the answer and what breaks if we guess wrong.

---

## Q1 — Persona verification: which column, which table, which value?

**Context:**
The recovery flow branches in Step 2 based on whether a creator has completed
Persona identity verification. The spec says `persona_verified: true` on the
profile. Mobile has already typed the `profiles` table in `database.ts` and
that table has `verified: boolean | null`. The `service_provider_profiles`
table separately has `is_verified`, `id_verified`, and `verification_status`.

Neither table has a column called `persona_verified`.

**Question:**
When a user has successfully completed Persona identity verification, which
exact column in which table is set, and what is the value that confirms it?

For example:
- `profiles.verified = true`
- `service_provider_profiles.is_verified = true`
- `service_provider_profiles.verification_status = 'approved'`
- A new `profiles.persona_verified = true` column that does not exist yet

**Why it matters:**
Mobile queries this before deciding whether to show the Persona face
verification flow or the manual selfie video route. If we query the wrong
column, every verified user gets routed to manual review (or vice versa).

---

## Q2 — Card generation counters: on profiles or separate table?

**Context:**
The spec requires tracking:
- `card_generations_this_month: integer`
- `card_generations_lifetime: integer`
- `card_generation_month: date` (used to reset the monthly counter)

The spec says these can go "on their profile or in the card_auth_tokens
table". Mobile needs to know where to read the remaining count from before
showing the Generate Card button.

The current `profiles` row type in mobile's `database.ts` does not have
these columns. If they are added to profiles, we update the types file.
If they go on a separate table, we call an endpoint.

**Questions:**

a) Where will these counters live — on the `profiles` table, or elsewhere?

b) Who owns the monthly reset? Is there a Supabase cron job on your end that
resets `card_generations_this_month` when `card_generation_month` rolls over,
or does the Edge Function handle this inline on each generation request?

c) When mobile reads the current count (to decide whether to grey out the
button before the user even tries), should it query the DB column directly
or call an endpoint like `GET /card/generation-status`? The security
implication: the mobile app uses anon key so if the counter is on profiles
with a permissive RLS select policy it can read it. If you want the count
gated, an endpoint is safer.

**Why it matters:**
Mobile needs to show the correct remaining count in the UI and block the
generation attempt before the server rejects it. If we read the wrong place
we either never show the limit or always show wrong numbers.

---

## Q3 — One-time login token for Step 3: how does the user get back in?

**Context:**
After a creator successfully passes card verification AND face verification,
the spec says:

> "Generate a secure one-time login token for this creator's account and log
> them into their account using this token."

Supabase does not expose `signInWithToken(arbitraryToken)` on the client.
The ways to programmatically create a session are:

- **Option A — Magic link:** Server calls
  `supabase.auth.admin.generateLink({ type: 'magiclink', email })`.
  Returns a URL mobile can open via `supabase.auth.getSessionFromUrl(url)`.
  The URL is single-use and expires in 1 hour by default (can be shortened).

- **Option B — OTP:** Server calls
  `supabase.auth.admin.generateLink({ type: 'email', email })`.
  Returns a token mobile can use with `supabase.auth.verifyOtp(...)`.

- **Option C — Custom session endpoint:** Backend creates a signed short-lived
  JWT and returns it; mobile calls a custom endpoint to exchange it for a
  Supabase session. More work, more flexibility.

- **Option D — Temporary password reset:** Server calls
  `supabase.auth.admin.updateUser({ id, password: tempPwd })` and returns
  the temp password. Mobile signs in with it and immediately forces a reset.
  Works but is a bad pattern (temp password visible in transit).

**Questions:**

a) Which approach do you plan to implement?

b) What exactly does the mobile app receive from the
`POST /recovery/complete` endpoint that lets it create a Supabase session —
a magic link URL, an OTP token string, or something else?

c) What is the expiry time on that token, and does mobile need to exchange it
immediately within a specific window?

**Why it matters:**
If we build the wrong session-creation flow on mobile the recovery succeeds
on the server but the user never actually gets logged in. This is the most
critical handoff point in the entire feature.

---

## Q4 — Manual recovery file storage: bucket, path format, upload mechanism

**Context:**
For unverified creators (no Persona), the recovery spec requires storing:
- The uploaded card file (JPG, PNG, or PDF, up to 20 MB)
- A selfie video (5–10 seconds)

These files need to be stored so an admin can review them.

Mobile currently uses the `avatars` Supabase storage bucket for profile
photos and card photos. We do NOT want to mix recovery evidence files in
there.

**Questions:**

a) Which Supabase storage bucket should recovery files go into? If it does
not exist yet, what should it be named?

b) What is the expected path/naming convention?
For example: `recovery-files/{creator_id}/{recovery_request_id}/card.png`

c) How should mobile upload the file — directly to Supabase storage with the
anon key (requires a permissive RLS INSERT policy on that bucket), or should
it call a backend endpoint that returns a signed upload URL?

d) What is the maximum video duration/file size you will accept for the
selfie video? The spec says 5–10 seconds but does not give a size limit.

**Why it matters:**
If mobile uploads to the wrong bucket or path, the admin dashboard will not
be able to retrieve the evidence files for review.

---

## Q5 — `professional_headline` — does it exist in the DB?

**Context:**
The digital card already displays the creator's professional headline
(e.g. "Founder and CEO of SoundBridge Live"). Mobile reads it as
`profile.professional_headline` in `ProfileScreen.tsx`. However, this column
does not appear anywhere in the typed `database.ts` file that describes the
`profiles` table schema.

Either the column exists in the actual Supabase `profiles` table but was
never added to the TypeScript types, or it is stored somewhere else.

**Question:**
Does `profiles.professional_headline` exist in the database? If so, please
confirm the exact column name so we can add it to `database.ts`. If it is
stored differently (e.g. in a JSONB column, or a separate table), let us know
the correct way to query it.

**Why it matters:**
Currently the type cast works in practice but TypeScript does not know this
column exists, so it cannot be used in strongly-typed Supabase queries. This
is a latent bug. We need it typed correctly before adding generation limit
checks that also query the profiles row.

---

## Q6 — `card_photo_url` — is this column on profiles in the DB?

**Context:**
The background removal service stores the processed transparent PNG to
Supabase storage at `avatars/card-photos/{userId}.png` and then attempts to
update `profiles.card_photo_url` with the public URL. This is done with an
`as any` cast because the column is not in the typed schema.

The card generation spec says "use the already processed profile photo stored
in the database from when it was originally uploaded" — which is this field.

**Questions:**

a) Does `profiles.card_photo_url` exist in the actual database?

b) If yes, should mobile read from `profiles.card_photo_url` first, and fall
back to `profiles.avatar_url` only if it is null?

c) If no, where is the processed card photo URL stored, or does it need to
be added?

**Why it matters:**
The spec explicitly says NOT to call remove.bg at card generation time — we
must use the pre-processed photo. We cannot do this reliably without knowing
the correct column.

---

## Q7 — RLS policies on the three new tables

**Context:**
The three new tables in the spec are:
- `card_auth_tokens`
- `recovery_attempts`
- `recovery_requests`

For security, the spec requires that token validation and fingerprint checks
happen server-side only. This means the mobile app (which uses the anon key)
must NEVER be able to query `card_auth_tokens` directly to read stored tokens
or fingerprints.

**Questions:**

a) Confirm that all three tables will have RLS enabled with no direct SELECT
access from the anon key. All reads/writes must go through Edge Functions
using the service role key.

b) For `recovery_requests`: can a creator SELECT their own row (to check
status of a pending manual review), or must this also go through an endpoint?

c) For `card_auth_tokens`: the mobile app will call a server endpoint to
trigger generation. The endpoint returns the token so mobile can embed it in
the QR code. Does the endpoint return the raw `card_auth_token` string, or a
reference ID only? We ask because if it returns the raw token, mobile must
not store it locally — it only gets embedded in the QR image at generation
time.

**Why it matters:**
If we accidentally query these tables directly on mobile with the anon key,
the security model is broken even if the columns look empty from the mobile
side due to RLS.

---

## Q8 — Admin dashboard: web team ownership confirmed?

**Context:**
The spec includes a Part 3 — Admin Dashboard with recovery attempt logs,
manual review queue, and approve/reject actions. Mobile does not own or
build the admin dashboard.

**Question:**
Confirming: the admin dashboard (Part 3) is entirely owned and built by the
web team? Mobile's only obligation is to ensure the data ends up in the right
tables so the dashboard can display it.

If yes, mobile has no further action on Part 3 beyond ensuring correct API
calls.

---

## Q9 — Rate limiting: where does it live, what does mobile receive?

**Context:**
The spec requires:
- Max 3 failed recovery attempts per IP per hour → lock IP for 1 hour
- Max 5 failed recovery attempts per creator per 24 hours → flag account

**Questions:**

a) Is rate limiting implemented at the Edge Function level, at a reverse
proxy / Cloudflare layer, or via a database table?

b) When a rate limit is hit, what HTTP status and response body does the
endpoint return? Mobile needs to show a specific error message (e.g. "Too
many attempts, please try again in X minutes") rather than a generic failure.

c) Does mobile need to send the IP address explicitly in the request, or does
the Edge Function extract it from the request headers server-side?

**Why it matters:**
Mobile needs to handle the rate limit response gracefully with a clear message
and a timer/disable state on the retry button.

---

## Summary — Web Team Answers (received 2026-05-18)

| # | Blocker | Status | Answer |
|---|---------|--------|--------|
| Q1 | Persona verified column | ✅ Resolved | Backend computes `persona_verified` from `profiles.is_verified` + `service_provider_profiles.verification_status` server-side. Mobile receives a boolean — no column access needed. Discrepancy moot. |
| Q2 | Generation counters | 🔲 Not yet built | Will be on `profiles` table. Web adding columns + cron reset. Endpoint `GET /api/card/generation-status` to be built |
| Q3 | Login token mechanism | ✅ Confirmed | `token_type: "magic_link"` + `login_token` URL. Mobile calls `getSessionFromUrl`. ~15 min TTL. |
| Q4 | Recovery file storage | 🔲 Not yet built | Bucket: `recovery-evidence`. Path: `recovery-evidence/{creator_id}/{request_id}/file`. Max selfie: 50MB/60s |
| Q5 | `professional_headline` | ✅ Confirmed | EXISTS in prod `profiles` table. Added to `database.ts` ✅ |
| Q6 | `card_photo_url` | 🔲 Pending migration | Does NOT exist yet. Fallback: `avatars/card-photos/{userId}.png` |
| Q7 | RLS on new tables | 🔲 Not yet built | Confirmed: anon key has no SELECT. Edge Functions use service role. `recovery_requests` status check also via endpoint |
| Q8 | Admin dashboard | ✅ Confirmed | Web team owns entirely. Mobile only writes data to correct tables |
| Q9 | Rate limiting | ✅ Confirmed approach | Cloudflare + Edge Function. Returns 429 with `retry_after_seconds`. Mobile sends no IP |

**Currently unblocked:** UI skeletons, TypeScript types, `database.ts` updates.
**Still blocked:** All API calls. Web must build tables + endpoints before mobile wires any calls.
