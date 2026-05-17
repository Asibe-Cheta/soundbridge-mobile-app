# Web Team: creator_types Sync Issue — Service Provider Detection

## Problem

Users who set up their Service Provider profile via the **web app** are not being
recognised as service providers in the **mobile app**. Instead of seeing
"Service Provider Dashboard" in their Profile → Settings tab, they see
"Become a Service Provider", and tapping it triggers an unnecessary re-registration
flow that fails with a network error.

## Root Cause

The mobile app determines whether a user is a service provider by calling:

```
GET /api/users/:userId/creator-types
```

This endpoint is returning an empty array (or failing entirely) for users who set
up their SP profile through the web UI. The `service_provider` value is not present
in the response even though a `service_provider_profiles` row exists in the database
for those users.

## Required Backend Fix

When a user creates or updates their service provider profile (via web or mobile),
ensure the `service_provider` value is written to — and returned by —
`/api/users/:userId/creator-types`.

Specifically, `POST /api/users/:userId/creator-types` (or the equivalent internal
write path) should be called with `service_provider` included in `creatorTypes`
whenever a `service_provider_profiles` row is created for that user.

The `GET /api/users/:userId/creator-types` endpoint should also fall back to
querying `service_provider_profiles` directly if the `creator_types` table does
not have an entry, rather than returning an empty array.

## Mobile-Side Workaround Applied (2026-05-05)

As a temporary fix, the mobile app now:
1. Queries `service_provider_profiles` directly via Supabase in `ProfileScreen`
   to detect SP status independently of the API endpoint.
2. If a row exists in `service_provider_profiles` for the user, the app shows
   "Service Provider Dashboard" and routes them there — bypassing the broken
   registration flow entirely.

This workaround means the immediate UX issue is resolved, but the `/api/users/:userId/creator-types`
endpoint still needs to be fixed for consistency across all clients (web dashboard,
future API consumers, etc.).

## Impact

- Affects every user who registered as a service provider via the web app.
- Causes confusing "Become a Service Provider" prompts and network errors on mobile.
- The `becomeServiceProvider` API call fails because the endpoint it relies on
  (`/api/users/:userId/creator-types`) is unreliable — this needs to be investigated
  and stabilised regardless of the sync fix above.

## Also Reported: Sentry Error on Web — Route Slug Mismatch

Sentry ID: `a39d3585921f4ec28099949e778ad4bb`
Last seen: 2026-05-05 22:37 UTC

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'trackId').
```

This is a Next.js routing error. Two route segments at the same dynamic path level
are using different parameter names (`[id]` vs `[trackId]`). For example, if you
have both `/tracks/[id]/page.tsx` and `/tracks/[trackId]/something/page.tsx` under
the same parent route, Next.js will throw this error at startup.

**Fix**: Rename one of the conflicting route folders so both use the same slug name
(e.g., standardise on `[trackId]` or `[id]` throughout the tracks route tree).
This error has been seen 8 times in production and will cause those routes to fail
to render.
