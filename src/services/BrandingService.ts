import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { config } from '../config/environment';

const BRANDING_STORAGE_KEY = (userId: string) => `branding_settings_${userId}`;

// The web team's migration accidentally set these as column DEFAULTs, meaning every
// existing row got these values even though creators never chose them.
// We treat this exact triplet as "not set" until the DB is corrected.
const BAD_MIGRATION_PRIMARY   = '#EF4444';
const BAD_MIGRATION_SECONDARY = '#1F2937';
const BAD_MIGRATION_ACCENT    = '#F59E0B';

function sanitizeRawBranding(raw: any): BrandingSettings {
  const hasBadColorDefaults =
    raw.primary_color   === BAD_MIGRATION_PRIMARY &&
    raw.secondary_color === BAD_MIGRATION_SECONDARY &&
    raw.accent_color    === BAD_MIGRATION_ACCENT;

  return {
    custom_logo_url:              raw.custom_logo_url || null,
    custom_logo_width:            raw.custom_logo_width || null,
    custom_logo_height:           raw.custom_logo_height || null,
    custom_logo_position:         raw.custom_logo_position || 'top-left',
    primary_color:                hasBadColorDefaults ? undefined : (raw.primary_color || undefined),
    secondary_color:              hasBadColorDefaults ? undefined : (raw.secondary_color || undefined),
    accent_color:                 hasBadColorDefaults ? undefined : (raw.accent_color || undefined),
    background_gradient:          raw.background_gradient || null,
    layout_style:                 raw.layout_style || 'default',
    // show_powered_by is opt-in — only honour it if creator explicitly enabled it
    // AND they don't have the bad migration defaults (which set it to TRUE for everyone)
    show_powered_by:              hasBadColorDefaults ? false : (raw.show_powered_by === true),
    watermark_enabled:            raw.watermark_enabled || false,
    watermark_opacity:            raw.watermark_opacity || 30,
    watermark_position:           raw.watermark_position || 'bottom-right',
    avatar_border_type:           raw.avatar_border_type || 'single',
    avatar_border_color:          raw.avatar_border_color || null,
    avatar_border_gradient_start: raw.avatar_border_gradient_start || null,
    avatar_border_gradient_end:   raw.avatar_border_gradient_end || null,
  };
}

export interface BrandingSettings {
  custom_logo_url?: string | null;
  custom_logo_width?: number | null;
  custom_logo_height?: number | null;
  custom_logo_position?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_gradient?: any;
  layout_style?: string;
  show_powered_by?: boolean;
  watermark_enabled?: boolean;
  watermark_opacity?: number;
  watermark_position?: string;
  avatar_border_type?: 'none' | 'single' | 'gradient';
  avatar_border_color?: string | null;
  avatar_border_gradient_start?: string | null;
  avatar_border_gradient_end?: string | null;
}

class BrandingService {
  /**
   * Get user branding settings
   * Uses RPC function: get_user_branding(user_uuid UUID)
   */
  async getUserBranding(userId: string, session: Session): Promise<{
    success: boolean;
    branding?: BrandingSettings;
    error?: string;
  }> {
    try {
      // Try RPC function first
      const { data, error } = await supabase
        .rpc('get_user_branding', {
          user_uuid: userId,
        });

      if (!error && data) {
        return {
          success: true,
          branding: sanitizeRawBranding(data),
        };
      }

      // Fallback: Query profiles table directly
      console.warn('⚠️ RPC function not available, using direct query');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_logo_url, custom_logo_width, custom_logo_height, custom_logo_position, primary_color, secondary_color, accent_color, background_gradient, layout_style, show_powered_by, watermark_enabled, watermark_opacity, watermark_position, avatar_border_type, avatar_border_color, avatar_border_gradient_start, avatar_border_gradient_end')
        .eq('id', userId)
        .single();

      const defaults: BrandingSettings = {
        custom_logo_url: null,
        custom_logo_width: null,
        custom_logo_height: null,
        custom_logo_position: 'top-left',
        primary_color: undefined,
        secondary_color: undefined,
        accent_color: undefined,
        background_gradient: null,
        layout_style: 'default',
        show_powered_by: false,
        watermark_enabled: false,
        watermark_opacity: 30,
        watermark_position: 'bottom-right',
      };

      let dbBranding: BrandingSettings = defaults;

      if (profileError) {
        // Branding columns not yet in DB — use defaults, then apply AsyncStorage overrides
      } else {
        dbBranding = sanitizeRawBranding(profile);
      }

      // Merge AsyncStorage overrides — only if saved by user explicitly (version >= 2).
      // Version 1 / unversioned data was written by old code that saved hardcoded defaults,
      // not actual user choices, so we discard it to avoid polluting new profiles.
      try {
        const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
        if (stored) {
          const storedBranding = JSON.parse(stored) as Partial<BrandingSettings> & { _version?: number };
          if ((storedBranding._version ?? 1) >= 2) {
            const { _version: _, ...brandingData } = storedBranding;
            dbBranding = { ...dbBranding, ...brandingData };
          }
        }
      } catch {
        // Ignore storage read errors
      }

      return { success: true, branding: dbBranding };
    } catch (error: any) {
      // Last-resort fallback — only use AsyncStorage if explicitly saved by user (version >= 2)
      try {
        const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
        if (stored) {
          const parsed = JSON.parse(stored) as BrandingSettings & { _version?: number };
          if ((parsed._version ?? 1) >= 2) {
            const { _version: _, ...brandingData } = parsed as any;
            return { success: true, branding: brandingData as BrandingSettings };
          }
        }
      } catch { /* ignore */ }

      return {
        success: true,
        branding: {
          custom_logo_url: null,
          custom_logo_width: null,
          custom_logo_height: null,
          custom_logo_position: 'top-left',
          primary_color: undefined,
          secondary_color: undefined,
          accent_color: undefined,
          background_gradient: null,
          layout_style: 'default',
          show_powered_by: false,
          watermark_enabled: false,
          watermark_opacity: 30,
          watermark_position: 'bottom-right',
        },
      };
    }
  }

  /**
   * Update user branding settings
   * Uses RPC function: update_user_branding(...)
   */
  async updateUserBranding(
    userId: string,
    branding: Partial<BrandingSettings>,
    session: Session
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    // Separate fields being explicitly nulled from fields with real values.
    // RPC functions commonly use COALESCE, which silently ignores null inputs —
    // so null-clears (e.g. removing a logo) must go via a direct table update.
    const nullFields: Partial<BrandingSettings> = {};
    const nonNullFields: Partial<BrandingSettings> = {};
    for (const [key, value] of Object.entries(branding)) {
      if (value === null) {
        (nullFields as any)[key] = null;
      } else {
        (nonNullFields as any)[key] = value;
      }
    }

    const hasNullFields = Object.keys(nullFields).length > 0;
    const hasNonNullFields = Object.keys(nonNullFields).length > 0;

    try {
      // For null fields: always use direct table update so COALESCE doesn't swallow them
      if (hasNullFields) {
        const { error: nullUpdateError } = await supabase
          .from('profiles')
          .update(nullFields)
          .eq('id', userId);

        if (nullUpdateError) {
          console.warn('⚠️ Direct null update failed, persisting to AsyncStorage:', nullUpdateError.message);
          const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
          const current: Partial<BrandingSettings> = stored ? JSON.parse(stored) : {};
          await AsyncStorage.setItem(
            BRANDING_STORAGE_KEY(userId),
            JSON.stringify({ ...current, ...nullFields, _version: 2 })
          );
        } else {
          // Also clear null fields from AsyncStorage so they don't re-hydrate on next load
          try {
            const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
            if (stored) {
              const current = JSON.parse(stored);
              for (const key of Object.keys(nullFields)) {
                delete current[key];
              }
              await AsyncStorage.setItem(BRANDING_STORAGE_KEY(userId), JSON.stringify(current));
            }
          } catch { /* ignore */ }
        }
      }

      // For non-null fields: try RPC first, fall back to direct update
      if (hasNonNullFields) {
        const { error: rpcError } = await supabase
          .rpc('update_user_branding', {
            user_uuid: userId,
            ...nonNullFields,
          });

        if (rpcError) {
          console.warn('⚠️ RPC function not available, using direct update');
          const { error: updateError } = await supabase
            .from('profiles')
            .update(nonNullFields)
            .eq('id', userId);

          if (updateError) {
            console.warn('⚠️ Branding columns not in DB yet, saving to AsyncStorage');
            const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
            const current: Partial<BrandingSettings> = stored ? JSON.parse(stored) : {};
            await AsyncStorage.setItem(
              BRANDING_STORAGE_KEY(userId),
              JSON.stringify({ ...current, ...nonNullFields, _version: 2 })
            );
          }
        }
      }

      return { success: true, message: 'Branding settings updated successfully' };
    } catch (error: any) {
      console.error('❌ Error updating user branding:', error);
      try {
        const stored = await AsyncStorage.getItem(BRANDING_STORAGE_KEY(userId));
        const current: Partial<BrandingSettings> = stored ? JSON.parse(stored) : {};
        await AsyncStorage.setItem(
          BRANDING_STORAGE_KEY(userId),
          JSON.stringify({ ...current, ...branding, _version: 2 })
        );
        return { success: true, message: 'Branding settings saved locally' };
      } catch {
        return { success: false, error: error.message || 'Failed to update branding settings' };
      }
    }
  }

  /**
   * Upload custom logo
   * Similar to avatar upload flow
   */
  async uploadCustomLogo(
    userId: string,
    fileUri: string,
    session: Session
  ): Promise<{
    success: boolean;
    logoUrl?: string;
    error?: string;
  }> {
    try {
      // Extract file extension
      const fileExtension = fileUri.split('.').pop() || 'jpg';
      const fileName = `${userId}/branding/logo_${Date.now()}.${fileExtension}`;

      // Detect MIME type from extension
      const mimeType = fileExtension === 'png' ? 'image/png'
        : fileExtension === 'webp' ? 'image/webp'
        : 'image/jpeg';

      // Upload using FileSystem.uploadAsync — response.blob() is not supported in Hermes
      const storageUploadUrl = `${config.supabaseUrl}/storage/v1/object/branding/${fileName}`;
      const uploadResponse = await FileSystem.uploadAsync(storageUploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        mimeType,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: config.supabaseAnonKey,
          'Content-Type': mimeType,
          'x-upsert': 'true',
          'cache-control': '3600',
        },
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        let errMsg = 'Failed to upload logo';
        try {
          const body = JSON.parse(uploadResponse.body);
          errMsg = body.message || body.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      const logoUrl = urlData.publicUrl;

      // Update branding with logo URL
      const updateResult = await this.updateUserBranding(
        userId,
        { custom_logo_url: logoUrl },
        session
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        logoUrl,
      };
    } catch (error: any) {
      console.error('❌ Error uploading custom logo:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload logo',
      };
    }
  }
}

export const brandingService = new BrandingService();

