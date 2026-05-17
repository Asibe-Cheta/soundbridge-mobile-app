# Web Team: Branding Migration — Corrective SQL Required

**Date:** 2026-04-09
**From:** Mobile team
**Priority:** HIGH — the previous migration set wrong column defaults that are actively breaking the creator profile UI for all users

---

## What went wrong

The migration that ran the `ADD COLUMN IF NOT EXISTS` statements used these incorrect defaults:

| Column | Wrong default | Correct default |
|---|---|---|
| `primary_color` | `'#EF4444'` | `NULL` |
| `secondary_color` | `'#1F2937'` | `NULL` |
| `accent_color` | `'#F59E0B'` | `NULL` |
| `show_powered_by` | `TRUE` | `FALSE` |

Because `ADD COLUMN ... DEFAULT x` backfills ALL existing rows, every creator profile now has a hardcoded red gradient background and a "SoundBridge" badge showing — even though they never set any branding.

The correct design (per the original spec) is:
- `NULL` colors = creator has not customised → profile shows plain background (no gradient)
- `show_powered_by = FALSE` = opt-in only, creator must explicitly enable it

---

## Corrective SQL — run this ASAP

```sql
-- 1. Fix column defaults going forward
ALTER TABLE public.profiles
  ALTER COLUMN primary_color   SET DEFAULT NULL,
  ALTER COLUMN secondary_color SET DEFAULT NULL,
  ALTER COLUMN accent_color    SET DEFAULT NULL,
  ALTER COLUMN show_powered_by SET DEFAULT FALSE;

-- 2. Reset rows that received the bad migration defaults.
--    The WHERE clause targets only profiles that still have the exact
--    bad default triplet — i.e. creators who have NOT customised their
--    branding. Creators who subsequently changed values won't match all
--    three columns simultaneously and will be skipped safely.
UPDATE public.profiles
SET
  primary_color   = NULL,
  secondary_color = NULL,
  accent_color    = NULL,
  show_powered_by = FALSE,
  updated_at      = NOW()
WHERE
  primary_color   = '#EF4444'
  AND secondary_color = '#1F2937'
  AND accent_color    = '#F59E0B'
  AND show_powered_by = TRUE;
```

---

## What mobile is doing in the meantime

Mobile has added a defensive guard in `BrandingService.ts` that detects the bad default triplet (`#EF4444` / `#1F2937` / `#F59E0B` all present simultaneously) and treats those profiles as "no branding set" — so the UI renders correctly while this corrective SQL is pending.

Once you run the corrective SQL, the guard becomes a no-op and can be removed from mobile in a future cleanup.

---

## Verification

After running the corrective SQL, confirm:

```sql
-- Should return 0 rows (no more profiles with the bad default triplet)
SELECT COUNT(*) FROM public.profiles
WHERE primary_color = '#EF4444'
  AND secondary_color = '#1F2937'
  AND accent_color = '#F59E0B';

-- Should return 0 rows
SELECT COUNT(*) FROM public.profiles
WHERE show_powered_by = TRUE
  AND primary_color IS NULL;
```
