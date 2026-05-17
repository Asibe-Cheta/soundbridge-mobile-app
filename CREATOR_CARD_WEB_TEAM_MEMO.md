# Web Team — Creator Fan Link Card: DB Migration Required

## Context
The mobile app now has a creator fan link share nudge and branded digital card system
(CREATOR_BRANDED_CARD.MD). The mobile side is fully implemented and ready. We need
five new columns on the `profiles` table before the feature is live.

---

## Required Migration

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fan_link_shared          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fan_link_shared_at       timestamptz          DEFAULT null,
  ADD COLUMN IF NOT EXISTS fan_link_share_method    text                 DEFAULT null,
  ADD COLUMN IF NOT EXISTS app_launch_count         integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teaser_last_shown_at_launch integer  NOT NULL DEFAULT 0;

-- Optional: constrain fan_link_share_method to known values
ALTER TABLE profiles
  ADD CONSTRAINT profiles_fan_link_share_method_check
  CHECK (fan_link_share_method IN ('link', 'card') OR fan_link_share_method IS NULL);
```

---

## What Each Column Does

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `fan_link_shared` | boolean | false | Set to true the first time a creator shares their fan link or card. Once true, no nudge or teaser ever fires again for that user. |
| `fan_link_shared_at` | timestamptz | null | Timestamp of the first share action. Analytics only. |
| `fan_link_share_method` | text | null | Whether they shared via `'link'` (native share sheet) or `'card'` (branded PNG card). |
| `app_launch_count` | integer | 0 | Incremented on every app open for creator accounts. Used to calculate when to show the teaser modal. |
| `teaser_last_shown_at_launch` | integer | 0 | The `app_launch_count` value at the time the teaser was last shown. Teaser fires again when `app_launch_count - teaser_last_shown_at_launch >= 4`. |

---

## How the Mobile App Uses These

All reads and writes go through the existing `profiles` table (no new tables needed).

**On every app launch (creator only):**
```sql
-- Mobile reads: app_launch_count, teaser_last_shown_at_launch, fan_link_shared
-- Then writes the incremented count (and teaser_last if showing teaser):
UPDATE profiles
SET app_launch_count = <newCount>,
    teaser_last_shown_at_launch = <newCount>  -- only if showing teaser
WHERE id = '<creator_uuid>';
```

**On first share (link or card):**
```sql
UPDATE profiles
SET fan_link_shared = true,
    fan_link_shared_at = now(),
    fan_link_share_method = 'link'  -- or 'card'
WHERE id = '<creator_uuid>';
```

---

## RLS Notes

These columns live on `profiles` which already has RLS. No new policies are needed:
- The creator reads their own row (existing SELECT policy covers this).
- The creator updates their own row (existing UPDATE policy covers this).

No server-side function or edge function is required. All writes come from the mobile
client using the user's own JWT session — same pattern as the existing nudge dismissal
fields (`nudge_event_30day_dismissed`, etc.).

---

## No Risk to Existing Data

- All columns have safe defaults (false / 0 / null).
- `fan_link_shared = false` means the nudge and teaser behave as designed for all
  existing creators who haven't seen this feature yet.
- The constraint on `fan_link_share_method` is `NOT VALID` by default so it won't
  block existing rows.

---

## Priority

This migration should go out **before** the next app build that includes this feature.
The mobile code is already written to handle null/missing values gracefully, so existing
builds won't crash if the columns don't exist yet — but the teaser and nudge won't fire.
