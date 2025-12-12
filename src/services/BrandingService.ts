import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
          branding: data as BrandingSettings,
        };
      }

      // Fallback: Query profiles table directly
      console.warn('⚠️ RPC function not available, using direct query');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_logo_url, custom_logo_width, custom_logo_height, custom_logo_position, primary_color, secondary_color, accent_color, background_gradient, layout_style, show_powered_by, watermark_enabled, watermark_opacity, watermark_position')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      return {
        success: true,
        branding: {
          custom_logo_url: profile?.custom_logo_url || null,
          custom_logo_width: profile?.custom_logo_width || null,
          custom_logo_height: profile?.custom_logo_height || null,
          custom_logo_position: profile?.custom_logo_position || 'top-left',
          primary_color: profile?.primary_color || '#EF4444',
          secondary_color: profile?.secondary_color || '#1F2937',
          accent_color: profile?.accent_color || '#F59E0B',
          background_gradient: profile?.background_gradient || null,
          layout_style: profile?.layout_style || 'default',
          show_powered_by: profile?.show_powered_by !== false,
          watermark_enabled: profile?.watermark_enabled || false,
          watermark_opacity: profile?.watermark_opacity || 30,
          watermark_position: profile?.watermark_position || 'bottom-right',
        },
      };
    } catch (error: any) {
      console.error('❌ Error getting user branding:', error);
      return {
        success: false,
        error: error.message || 'Failed to load branding settings',
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
    try {
      // Try RPC function first
      const { data, error } = await supabase
        .rpc('update_user_branding', {
          user_uuid: userId,
          ...branding,
        });

      if (!error) {
        return {
          success: true,
          message: 'Branding settings updated successfully',
        };
      }

      // Fallback: Update profiles table directly
      console.warn('⚠️ RPC function not available, using direct update');
      const { error: updateError } = await supabase
        .from('profiles')
        .update(branding)
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        message: 'Branding settings updated successfully',
      };
    } catch (error: any) {
      console.error('❌ Error updating user branding:', error);
      return {
        success: false,
        error: error.message || 'Failed to update branding settings',
      };
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

      // Read file
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

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

