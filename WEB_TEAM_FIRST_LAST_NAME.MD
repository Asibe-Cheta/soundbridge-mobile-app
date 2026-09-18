# Optional first_name / last_name fields

New, additive fields alongside `display_name` — `display_name` is NOT being replaced or
touched anywhere. It stays the public-facing "how should people call you" field used
everywhere for display (creator cards, feeds, profile headers, etc.). `first_name`/`last_name`
are new, optional, more formal fields for future personalization use cases (e.g. a real
name-based greeting somewhere, instead of guessing by splitting `display_name`).

## Schema (already applied to prod by Justice)

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
```

Nullable, no default — genuinely optional for every user, no backfill needed.

## What's needed on your end

Mobile added the DB columns and its own UI (onboarding + profile editing), and mobile's
client now sends `first_name`/`last_name` in its requests to your two existing endpoints —
but **your endpoints need to actually accept and persist them**, or the fields will keep
getting silently dropped:

1. **`/api/user/complete-profile`** (used during onboarding) — needs to accept optional
   `first_name`/`last_name` strings in the request body and write them to `profiles` on
   insert/update, same as it already does for `display_name`.
2. **`/api/profile/update`** (used for later profile editing) — same: accept optional
   `first_name`/`last_name` and persist them.

Both fields should be treated as fully optional — no validation requiring them, matching how
`display_name` itself has no hard requirement beyond whatever you already enforce.

## Your own UI

If your web onboarding flow and profile-edit page collect `display_name` today, worth adding
the same optional First Name / Last Name inputs there too, for consistency across platforms —
same additive-only approach, no changes to how `display_name` is collected or displayed.

## Status

Mobile-side is fully built and OTA-ready (migration run, UI added, requests updated) but the
new fields won't actually persist anywhere until your two endpoints accept them — flagging
clearly so this isn't mistaken for fully working end-to-end yet.
