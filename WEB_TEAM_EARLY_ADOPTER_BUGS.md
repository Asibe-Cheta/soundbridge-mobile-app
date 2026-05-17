# WEB TEAM: Early Adopter User Bug Report

**From:** Mobile team  
**Date:** 2026-04-08  
**Priority:** High — affects all ~397 early adopter users who received the waitlist email  
**Reporter:** lagcitykeys (early adopter user, reached out via Instagram DM)

---

## Context

We sent ~397 waitlist users an email granting 3 months free Premium with an Early Adopter badge. lagcitykeys is one of them. He reports:

1. Profile not verified / Early Adopter badge not showing
2. Gig availability screen throws a server error on save
3. Branding screen throws `"Could not find the 'primary_color' column of 'profiles' in the schema cache"`

---

## Bug 1 — Early Adopter Badge Not Showing

**User reports:** "My profile still isn't verified and that limits what I can do on the platform with regards to customisations"

The waitlist email promised:
- 🏅 Permanent Early Adopter badge on profile
- 🎁 3 months free Premium (includes "Pro verification badge on your profile")

**What we need:**
1. Confirm the SQL grant from the waitlist campaign was applied to lagcitykeys' account specifically — check `profiles.subscription_tier`, `subscription_status`, `subscription_period_end`
2. Confirm the Early Adopter badge is being set on their profile — is there an `early_adopter` flag or badge tier on the `profiles` table?
3. If the badge exists in DB, confirm it is rendering on the public profile page at `soundbridge.live`

This is likely the same SQL grant issue we flagged earlier (commit `8e73c3d7` fixed Premium detection, but individual users may not have had the grant applied).

---

## Bug 2 — Urgent Gig Availability: "Server error. Please try again later."

**Screen:** Urgent Gig Availability (AvailabilityCalendarScreen)  
**Action:** User toggles a day on (e.g. Thursday/Friday) and taps "Save Availability"  
**Error shown:** `"Server error. Please try again later."`

This is a backend error — the mobile app is calling the availability save endpoint and receiving a 5xx. Please check:
- What endpoint handles saving urgent gig availability slots
- Server logs for the error around the time lagcitykeys attempted to save
- Whether the endpoint requires a service provider profile to exist first (lagcitykeys may not have one set up, but the screen shouldn't return a 500 for that — it should return a meaningful 400/404)

---

## Bug 3 — Branding Screen: Missing `primary_color` Column

**Screen:** Branding Customization  
**Error shown:** `"Could not find the 'primary_color' column of 'profiles' in the schema cache"`

**Root cause (mobile side identified):** Our `BrandingService` tries to read/write branding columns (`primary_color`, `secondary_color`, `accent_color`, `background_gradient`, `layout_style`, `show_powered_by`, `watermark_enabled`, `watermark_opacity`, `watermark_position`, `custom_logo_url`) directly from the `profiles` table as a fallback when the `get_user_branding` / `update_user_branding` RPC functions are unavailable.

The error message confirms these columns don't exist on `profiles`.

**What we need from you — two options:**

**Option A (preferred):** Create the `get_user_branding` and `update_user_branding` RPC functions in Supabase so the primary path works. These should read/write a separate `user_branding` table (or a JSONB column) rather than individual columns on `profiles`.

**Option B:** Add the missing columns to `profiles`:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS background_gradient JSONB,
  ADD COLUMN IF NOT EXISTS layout_style TEXT,
  ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS watermark_opacity INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS watermark_position TEXT,
  ADD COLUMN IF NOT EXISTS custom_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_logo_width INTEGER,
  ADD COLUMN IF NOT EXISTS custom_logo_height INTEGER,
  ADD COLUMN IF NOT EXISTS custom_logo_position TEXT;
```

We recommend Option A (dedicated table/RPC) to keep `profiles` clean, but either unblocks the user immediately.

---

## Summary

| Bug | Owner | Blocking user? |
|---|---|---|
| Early Adopter badge / Premium grant not applied | Web team (DB/SQL) | Yes — limits customisation access |
| Gig availability server error | Web team (API 5xx) | Yes — can't set availability |
| Branding `primary_color` column missing | Web team (DB schema) | Yes — branding screen crashes on save |

All three affect every early adopter user, not just lagcitykeys. Please prioritise.

— Mobile
