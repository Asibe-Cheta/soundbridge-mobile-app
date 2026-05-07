import { useState, useEffect } from 'react';
import { brandingService, BrandingSettings } from '../services/BrandingService';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_BRANDING: BrandingSettings = {
  custom_logo_url: null,
  custom_logo_position: 'top-left',
  primary_color: undefined,
  secondary_color: undefined,
  accent_color: undefined,
  layout_style: 'default',
  show_powered_by: false,
  watermark_enabled: false,
  watermark_opacity: 30,
  watermark_position: 'bottom-right',
  avatar_border_type: 'single',
  avatar_border_color: null,
  avatar_border_gradient_start: null,
  avatar_border_gradient_end: null,
};

/**
 * Fetches and caches branding settings for a given userId.
 * Falls back to defaults immediately so the UI never blocks on load.
 * Pass the currently-authed session — branding is public data but the
 * service uses it for auth'd fallback writes, so we thread it through.
 */
export function useBranding(userId: string | null | undefined) {
  const { session } = useAuth();
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !session) return;

    let cancelled = false;
    setLoading(true);

    brandingService.getUserBranding(userId, session).then((result) => {
      if (!cancelled && result.success && result.branding) {
        setBranding(result.branding);
      }
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId, session]);

  return { branding, loading };
}
