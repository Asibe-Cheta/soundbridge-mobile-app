# Web Team: Branding — Profiles Table Columns + RPC Functions Required

**Date:** 2026-04-08  
**From:** Mobile team  
**Priority:** Medium — branding settings work now via AsyncStorage fallback, but won't persist across devices or app reinstalls until these columns exist

---

## Background

The Branding Customisation screen (Premium/Unlimited creators) lets users set brand colors, a custom logo, watermark settings, and now profile picture border style. All settings are saved via `updateUserBranding`, which:

1. Tries the `update_user_branding` RPC function
2. Falls back to a direct `UPDATE profiles SET ...`
3. Falls back to AsyncStorage (last resort — device-local only)

Both RPC functions are currently missing, and the `profiles` columns don't exist yet. The mobile app is fully functional via AsyncStorage but settings don't sync across devices.

---

## Required: Add columns to `profiles` table

```sql
ALTER TABLE profiles
  -- Brand colors (NULL = creator has not customised; mobile will show plain background)
  ADD COLUMN IF NOT EXISTS primary_color        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_color      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accent_color         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS background_gradient  JSONB DEFAULT NULL,

  -- Custom logo
  ADD COLUMN IF NOT EXISTS custom_logo_url      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_width    INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_height   INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_logo_position TEXT DEFAULT 'top-left',

  -- Layout
  ADD COLUMN IF NOT EXISTS layout_style         TEXT DEFAULT 'default',

  -- Powered by badge (opt-in — FALSE by default, only shows when creator explicitly enables it)
  ADD COLUMN IF NOT EXISTS show_powered_by      BOOLEAN DEFAULT FALSE,

  -- Watermark
  ADD COLUMN IF NOT EXISTS watermark_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS watermark_opacity    INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS watermark_position   TEXT DEFAULT 'bottom-right',

  -- Profile picture border (added 2026-04-08)
  ADD COLUMN IF NOT EXISTS avatar_border_type            TEXT DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS avatar_border_color           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_border_gradient_start  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_border_gradient_end    TEXT DEFAULT NULL;
```

---

## Required: Create `get_user_branding` RPC function

```sql
CREATE OR REPLACE FUNCTION get_user_branding(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(t) INTO result
  FROM (
    SELECT
      primary_color,
      secondary_color,
      accent_color,
      background_gradient,
      custom_logo_url,
      custom_logo_width,
      custom_logo_height,
      custom_logo_position,
      layout_style,
      show_powered_by,
      watermark_enabled,
      watermark_opacity,
      watermark_position,
      avatar_border_type,
      avatar_border_color,
      avatar_border_gradient_start,
      avatar_border_gradient_end
    FROM profiles
    WHERE id = user_uuid
  ) t;

  RETURN result;
END;
$$;

-- Allow any authenticated user to read any creator's branding (needed for profile viewers)
GRANT EXECUTE ON FUNCTION get_user_branding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_branding(UUID) TO anon;
```

---

## Required: Create `update_user_branding` RPC function

```sql
CREATE OR REPLACE FUNCTION update_user_branding(
  user_uuid                   UUID,
  primary_color               TEXT DEFAULT NULL,
  secondary_color             TEXT DEFAULT NULL,
  accent_color                TEXT DEFAULT NULL,
  background_gradient         JSONB DEFAULT NULL,
  custom_logo_url             TEXT DEFAULT NULL,
  custom_logo_width           INTEGER DEFAULT NULL,
  custom_logo_height          INTEGER DEFAULT NULL,
  custom_logo_position        TEXT DEFAULT NULL,
  layout_style                TEXT DEFAULT NULL,
  show_powered_by             BOOLEAN DEFAULT NULL,
  watermark_enabled           BOOLEAN DEFAULT NULL,
  watermark_opacity           INTEGER DEFAULT NULL,
  watermark_position          TEXT DEFAULT NULL,
  avatar_border_type          TEXT DEFAULT NULL,
  avatar_border_color         TEXT DEFAULT NULL,
  avatar_border_gradient_start TEXT DEFAULT NULL,
  avatar_border_gradient_end  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to update their own branding
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles SET
    primary_color                = COALESCE(update_user_branding.primary_color, profiles.primary_color),
    secondary_color              = COALESCE(update_user_branding.secondary_color, profiles.secondary_color),
    accent_color                 = COALESCE(update_user_branding.accent_color, profiles.accent_color),
    background_gradient          = COALESCE(update_user_branding.background_gradient, profiles.background_gradient),
    custom_logo_url              = COALESCE(update_user_branding.custom_logo_url, profiles.custom_logo_url),
    custom_logo_width            = COALESCE(update_user_branding.custom_logo_width, profiles.custom_logo_width),
    custom_logo_height           = COALESCE(update_user_branding.custom_logo_height, profiles.custom_logo_height),
    custom_logo_position         = COALESCE(update_user_branding.custom_logo_position, profiles.custom_logo_position),
    layout_style                 = COALESCE(update_user_branding.layout_style, profiles.layout_style),
    show_powered_by              = COALESCE(update_user_branding.show_powered_by, profiles.show_powered_by),
    watermark_enabled            = COALESCE(update_user_branding.watermark_enabled, profiles.watermark_enabled),
    watermark_opacity            = COALESCE(update_user_branding.watermark_opacity, profiles.watermark_opacity),
    watermark_position           = COALESCE(update_user_branding.watermark_position, profiles.watermark_position),
    avatar_border_type           = COALESCE(update_user_branding.avatar_border_type, profiles.avatar_border_type),
    avatar_border_color          = COALESCE(update_user_branding.avatar_border_color, profiles.avatar_border_color),
    avatar_border_gradient_start = COALESCE(update_user_branding.avatar_border_gradient_start, profiles.avatar_border_gradient_start),
    avatar_border_gradient_end   = COALESCE(update_user_branding.avatar_border_gradient_end, profiles.avatar_border_gradient_end),
    updated_at                   = NOW()
  WHERE id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_branding TO authenticated;
```

---

## Notes

- **Clearing a logo:** The mobile app calls `updateUserBranding({ custom_logo_url: null })`. The `COALESCE` above won't clear a value back to NULL. If you want NULL-clearing to work, the function needs a separate approach (e.g. pass a sentinel or use a different COALESCE strategy). For now it only sets values, never clears. Clearing the logo is handled by a direct profiles UPDATE from mobile.
- **`show_powered_by` default:** `FALSE` — opt-in only. Creators explicitly enable it in the Branding screen.
- **`avatar_border_type` constraint:** Optionally add `CHECK (avatar_border_type IN ('none', 'single', 'gradient'))` for safety.
- **RPC logs:** Once these functions exist, the mobile app will stop logging `⚠️ RPC function not available, using direct query`.

---

## What mobile already handles

- Logo upload → `branding` storage bucket (already deployed by web team ✅)
- AsyncStorage fallback for all fields until DB columns exist ✅
- Reading branding for any creator's profile (public, no auth needed for viewing) ✅
