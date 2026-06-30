# Web Team → Mobile Team: Google Calendar — Backend Live, Ready for OTA

**Date:** 2026-06-08  
**From:** Web / Justice  
**Re:** Your handoff `MOBILE_TEAM_GOOGLE_CALENDAR_WEB_HANDOFF.MD`  
**Mobile OTA:** Not pushed yet — **web is unblocked; safe to ship when ready**

---

## TL;DR

Web backend for **Part 1 (connect/disconnect)** and **Part 5 (settings status)** is **live in production**. You can push OTA and run the full connect flow. Parts 2–4 (FreeBusy notification gate, pattern learning, poll insight copy) are still web-owned and not required for connect/disconnect smoke test.

---

## What web shipped (production)

| Item | Status |
|------|--------|
| DB migration `20260608120000_google_calendar_integration.sql` | ✅ Applied on prod (`aunxdbqukbxyyiusaeqi`) |
| `calendar_integrations` table (encrypted tokens, service-role only) | ✅ |
| `calendar_availability_checks` table (for future FreeBusy gate) | ✅ |
| `user_behaviour_profiles` calendar columns | ✅ |
| Code on `main` | ✅ Commit `5dbe1705` |
| Vercel production deploy | ✅ Live |
| Google Calendar API enabled (GCP) | ✅ |
| Dedicated OAuth client `SoundBridge Calendar (FreeBusy)` | ✅ |
| Vercel env: `GOOGLE_CALENDAR_CLIENT_ID`, `_SECRET`, `_REDIRECT_URI` | ✅ |
| GCP test users (Testing mode) | ✅ `asibechetachukwu@gmail.com`, `merituche2003@gmail.com` |

**Prod API smoke (unauthenticated):** all calendar routes return **401** (not 404/503) — endpoints exist and Google OAuth is configured.

---

## APIs you can call now (Bearer auth)

Base: `https://www.soundbridge.live` (or `https://soundbridge.live` — both work)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/calendar/google/status` | Returns `connected: false` when disconnected |
| `GET` | `/api/calendar/google/connect-url` | Returns Google OAuth URL (FreeBusy scope only) |
| `POST` | `/api/calendar/google/disconnect` | Idempotent; revokes + clears DB |
| `GET` | `/api/calendar/google/callback` | **Browser only** — web handles Google redirect |
| `GET` | `/api/calendar/poll-availability-insight?campaignId=` | **404** until pattern job — hide UI on 404 |

### `GET /api/calendar/google/status` — disconnected example

```json
{
  "success": true,
  "connected": false,
  "calendar_connected_at": null,
  "last_synced_at": null,
  "needs_reconnect": false
}
```

### `GET /api/calendar/google/connect-url` — success

```json
{
  "success": true,
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### OAuth callback (web → mobile)

After Google consent, web redirects to:

- Success: `soundbridge://calendar/google/callback?success=1`
- Error: `soundbridge://calendar/google/callback?error={code}`

Web callback URL (registered in Google):  
`https://www.soundbridge.live/api/calendar/google/callback`

`state` is HMAC-signed to authenticated `user_id` (30 min TTL).

---

## Answers to your open questions (unchanged)

1. **Separate OAuth client?** Yes — Calendar uses its own GCP client; Supabase Google login is unchanged.
2. **Feature flag?** No — show Connected Apps. Status returns 200 when disconnected. Poll insight 404 is optional UI.
3. **Poll insight scope?** Per `campaignId`, aggregated across calendar-connected **fans** who expressed interest in that poll.

Full detail: `WEB_TEAM_GOOGLE_CALENDAR_RESPONSE.MD`

---

## OTA + smoke test checklist (mobile)

Use a Google account listed as **GCP test user** (app is in Testing mode).

- [ ] Push OTA with `GoogleCalendarConnectCard` + `CalendarIntegrationService`
- [ ] Profile → Settings → Connected Apps visible
- [ ] Tap Connect → privacy modal → OAuth opens
- [ ] Complete Google consent (scope: availability only)
- [ ] App returns via `soundbridge://calendar/google/callback?success=1`
- [ ] Status shows `connected: true` + `last_synced_at`
- [ ] Disconnect → confirm → status `connected: false`
- [ ] Poll results: insight block hidden on 404 (expected until web ships pattern job)

---

## Not live yet (web — do not block OTA on these)

| Feature | Owner | Mobile impact |
|---------|-------|---------------|
| FreeBusy gate before event push notifications | Web edge fn | None for connect UI |
| 4-week pattern aggregation → `calendar_free_*` | Web cron | Poll insight stays 404 |
| Web settings Connected Apps UI | Web | Mobile-only for now |
| Privacy policy calendar section update | Justice / legal | In-app modal covers interim; policy update before wide rollout |

---

## Testing constraints (Google Cloud)

- OAuth app is in **Testing** — only **test users** in GCP Audience can connect.
- Current test users: `asibechetachukwu@gmail.com`, `merituche2003@gmail.com`
- To add testers: GCP → Google Auth Platform → **Audience** → **+ Add users**
- Cap: 100 users in Testing before Google verification required

---

## If connect fails

| Symptom | Likely cause |
|---------|----------------|
| `access_denied` | Google account not in GCP test users |
| `redirect_uri_mismatch` | Should not happen — URI is registered |
| `503` on connect-url | Env misconfig — tell web (currently OK) |
| Callback `error=invalid_state` | OAuth took >30 min or stale session — retry |
| `needs_reconnect: true` on status | Refresh token failed — user should disconnect + reconnect |

---

## Contact

Ping web if status/connect-url return unexpected shapes or 5xx after OTA. Include device, user id, and exact error from callback query or API response.
