# Action Required: Set Google Places API Key as Supabase Secret

## What is broken

The mobile app has a **Venues** tab under Discover that pulls nearby music venues from the Google Places API. This is routed through a Supabase Edge Function (`nearby-venues`) so the API key never touches the mobile client.

However the Edge Function currently returns **empty results** because `GOOGLE_PLACES_API_KEY` is not set as a Supabase secret — the function reads it from `Deno.env.get('GOOGLE_PLACES_API_KEY')` and returns an error when it's missing.

## What we already have

Your Vercel environment has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configured (visible in the Vercel → Settings → Environment Variables panel). The same API key just needs to be added to Supabase under a different variable name.

## Action needed (one command)

Run this once from your terminal with the Supabase CLI:

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=<value_of_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY>
```

Replace `<value_of_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY>` with the actual key value from Vercel.

If the key has any restrictions set in Google Cloud Console (HTTP referrer restrictions for the web), you may need to either:
- Use a separate unrestricted server-side key for Supabase Edge Functions, or
- Add `*.supabase.co` to the allowed referrers for the existing key

A server-side-only key with **IP restrictions** or **no restrictions** is ideal for Edge Functions.

## What the mobile app does with it

The `nearby-venues` Edge Function:
1. Accepts `{ lat, lng, radius }` from the mobile client
2. Makes two Google Places Nearby Search calls (music venues + bars/clubs/studios)
3. Deduplicates results and returns mapped venue objects
4. The key is **never** sent to the mobile device — it stays server-side

## Edge Function location

```
supabase/functions/nearby-venues/index.ts
```

## Impact

Without this secret set, the **Nearby Venues** section of the Venues tab will always show empty with no error visible to the user.
