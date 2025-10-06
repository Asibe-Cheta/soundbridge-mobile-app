// src/services/DistributionPlatformService.ts
// Distribution platform service for multi-platform music distribution

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DistributionRelease {
  id: string;
  user_id: string;
  external_release_id?: string;  // Aggregator's ID
  title: string;
  artist_name: string;
  release_type: 'single' | 'ep' | 'album';
  release_date: string;
  upc?: string;
  artwork_url: string;
  status: 'draft' | 'submitted' | 'processing' | 'live' | 'failed' | 'takedown';
  metadata: {
    genre: string;
    subgenre?: string;
    language: string;
    explicit: boolean;
    copyright: string;
    copyrightYear: number;
    copyrightHolder: string;
    publishingRights: string;
    publisher?: string;
    label?: string;
    description?: string;
    tags: string[];
  };
  territories: string[];
  selected_platforms: string[];
  submission_date?: string;
  live_date?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DistributionTrack {
  id: string;
  release_id: string;
  track_id: string;
  track_number: number;
  title: string;
  isrc?: string;
  duration_seconds: number;
  explicit_content: boolean;
  preview_start_seconds: number;
  status: 'pending' | 'processing' | 'live' | 'failed';
  platform_urls: {
    spotify?: string;
    apple_music?: string;
    youtube_music?: string;
    amazon_music?: string;
    tidal?: string;
    deezer?: string;
  };
  created_at: string;
}

export interface PlatformIntegration {
  id: string;
  user_id: string;
  platform_name: 'spotify' | 'apple_music' | 'youtube_music' | 'amazon_music' | 'tidal' | 'deezer';
  integration_status: 'disconnected' | 'connected' | 'error' | 'pending';
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  platform_user_id?: string;
  settings: {
    auto_distribute?: boolean;
    territory_restrictions?: string[];
    content_id_enabled?: boolean;
    analytics_enabled?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface RoyaltyPayment {
  id: string;
  user_id: string;
  release_id: string;
  reporting_month: string;  // Format: "2025-01"
  total_streams: number;
  gross_revenue_micros: number;  // Store in micros to avoid decimal issues
  aggregator_fee_micros: number;
  soundbridge_commission_micros: number;
  net_payout_micros: number;
  currency: string;
  payment_status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at?: string;
  stripe_payout_id?: string;
  created_at: string;
}

export interface DistributionAnalytics {
  total_streams: number;
  total_revenue: number;
  top_platforms: Array<{ platform: string; streams: number; revenue: number }>;
  top_tracks: Array<{ track_id: string; title: string; streams: number; revenue: number }>;
  geographic_data: Array<{ country: string; streams: number; revenue: number }>;
  period_comparison: {
    current_period: { streams: number; revenue: number };
    previous_period: { streams: number; revenue: number };
    growth_rate: number;
  };
}

export interface LegalRequirement {
  territory: string;
  requirements: {
    age_rating: boolean;
    content_warning: boolean;
    licensing_needed: string[];
    restricted_content: string[];
    tax_implications: string[];
  };
}

class DistributionPlatformService {
  private platformConfigs = {
    spotify: {
      name: 'Spotify',
      apiUrl: 'https://api.spotify.com/v1',
      authUrl: 'https://accounts.spotify.com/authorize',
      tokenUrl: 'https://accounts.spotify.com/api/token',
      scopes: ['user-read-email', 'user-read-private'],
      contentIdSupport: true,
      territories: 'global',
      audioFormats: ['mp3', 'ogg'],
      maxFileSize: '200MB',
      processingTime: '1-3 days',
    },
    apple_music: {
      name: 'Apple Music',
      apiUrl: 'https://api.music.apple.com/v1',
      authUrl: 'https://appleid.apple.com/auth/authorize',
      contentIdSupport: true,
      territories: 'global',
      audioFormats: ['aac', 'm4a'],
      maxFileSize: '200MB',
      processingTime: '1-7 days',
    },
    youtube_music: {
      name: 'YouTube Music',
      apiUrl: 'https://www.googleapis.com/youtube/v3',
      authUrl: 'https://accounts.google.com/oauth2/auth',
      contentIdSupport: true,
      territories: 'global',
      audioFormats: ['mp3', 'wav', 'flac'],
      maxFileSize: '256MB',
      processingTime: '1-2 days',
    },
    amazon_music: {
      name: 'Amazon Music',
      contentIdSupport: false,
      territories: 'limited',
      audioFormats: ['mp3', 'flac'],
      maxFileSize: '200MB',
      processingTime: '3-7 days',
    },
    tidal: {
      name: 'Tidal',
      contentIdSupport: false,
      territories: 'limited',
      audioFormats: ['flac', 'mp3'],
      maxFileSize: '500MB',
      processingTime: '2-5 days',
    },
    deezer: {
      name: 'Deezer',
      contentIdSupport: false,
      territories: 'global',
      audioFormats: ['mp3', 'flac'],
      maxFileSize: '200MB',
      processingTime: '1-3 days',
    },
  };

  // ===== RELEASE MANAGEMENT =====

  async createRelease(releaseData: {
    title: string;
    artistName: string;
    releaseType: 'single' | 'ep' | 'album';
    releaseDate: string;
    trackIds: string[];
    artworkUrl: string;
    territories: string[];
    platforms: string[];
    metadata: DistributionRelease['metadata'];
  }): Promise<DistributionRelease | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate UPC (Universal Product Code)
      const upc = await this.generateUPC();

      const { data: release, error: releaseError } = await supabase
        .from('distribution_releases')
        .insert({
          user_id: user.id,
          title: releaseData.title,
          artist_name: releaseData.artistName,
          release_type: releaseData.releaseType,
          release_date: releaseData.releaseDate,
          artwork_url: releaseData.artworkUrl,
          upc,
          status: 'draft',
          metadata: releaseData.metadata,
          territories: releaseData.territories,
          selected_platforms: releaseData.platforms,
        })
        .select()
        .single();

      if (releaseError) throw releaseError;

      // Get track details for distribution tracks
      const { data: tracks } = await supabase
        .from('audio_tracks')
        .select('id, title, duration, explicit_content')
        .in('id', releaseData.trackIds);

      if (!tracks || tracks.length !== releaseData.trackIds.length) {
        throw new Error('Some tracks not found or inaccessible');
      }

      // Create distribution tracks with proper data
      const trackInserts = releaseData.trackIds.map((trackId, index) => {
        const track = tracks.find(t => t.id === trackId);
        return {
          release_id: release.id,
          track_id: trackId,
          track_number: index + 1,
          title: track?.title || `Track ${index + 1}`,
          isrc: this.generateISRC(releaseData.artistName, release.id, index + 1),
          duration_seconds: track?.duration || 0,
          explicit_content: track?.explicit_content || false,
          preview_start_seconds: 0,
          status: 'pending' as const,
          platform_urls: {},
        };
      });

      const { error: tracksError } = await supabase
        .from('distribution_tracks')
        .insert(trackInserts);

      if (tracksError) throw tracksError;

      console.log('✅ Distribution release created:', release.id);
      return release;
    } catch (error) {
      console.error('❌ Error creating release:', error);
      return null;
    }
  }

  async updateRelease(
    releaseId: string,
    updates: Partial<Pick<DistributionRelease, 'title' | 'artist_name' | 'release_type' | 'release_date' | 'artwork_url' | 'metadata' | 'territories' | 'selected_platforms'>>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('distribution_releases')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', releaseId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Distribution release updated:', releaseId);
      return true;
    } catch (error) {
      console.error('❌ Error updating release:', error);
      return false;
    }
  }

  async deleteRelease(releaseId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if release can be deleted (not live or submitted)
      const { data: release } = await supabase
        .from('distribution_releases')
        .select('status')
        .eq('id', releaseId)
        .eq('user_id', user.id)
        .single();

      if (release?.status === 'live' || release?.status === 'processing') {
        throw new Error('Cannot delete live or processing releases. Please contact support.');
      }

      const { error } = await supabase
        .from('distribution_releases')
        .delete()
        .eq('id', releaseId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Distribution release deleted:', releaseId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting release:', error);
      return false;
    }
  }

  async getUserReleases(): Promise<DistributionRelease[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('distribution_releases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error getting user releases:', error);
      return [];
    }
  }

  async getReleaseDetails(releaseId: string): Promise<{
    release: DistributionRelease | null;
    tracks: DistributionTrack[];
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { release: null, tracks: [] };

      const [releaseResult, tracksResult] = await Promise.all([
        supabase
          .from('distribution_releases')
          .select('*')
          .eq('id', releaseId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('distribution_tracks')
          .select('*')
          .eq('release_id', releaseId)
          .order('track_number', { ascending: true }),
      ]);

      return {
        release: releaseResult.data,
        tracks: tracksResult.data || [],
      };
    } catch (error) {
      console.error('❌ Error getting release details:', error);
      return { release: null, tracks: [] };
    }
  }

  // ===== PLATFORM INTEGRATION =====

  async connectPlatform(
    platform: keyof typeof this.platformConfigs,
    authCode: string,
    redirectUri: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Exchange auth code for access token
      const tokenData = await this.exchangeAuthCode(platform, authCode, redirectUri);
      
      if (!tokenData) {
        throw new Error('Failed to exchange auth code for access token');
      }

      // Store integration
      const { error } = await supabase
        .from('platform_integrations')
        .upsert({
          user_id: user.id,
          platform_name: platform,
          integration_status: 'connected',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenData.expires_at,
          platform_user_id: tokenData.user_id,
          settings: {
            auto_distribute: false,
            territory_restrictions: [],
            content_id_enabled: this.platformConfigs[platform].contentIdSupport,
            analytics_enabled: true,
          },
        }, {
          onConflict: 'user_id,platform_name',
        });

      if (error) throw error;

      console.log('✅ Platform connected:', platform);
      return true;
    } catch (error) {
      console.error('❌ Error connecting platform:', error);
      return false;
    }
  }

  async disconnectPlatform(platform: keyof typeof this.platformConfigs): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('platform_integrations')
        .update({
          integration_status: 'disconnected',
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform_name', platform);

      if (error) throw error;

      console.log('✅ Platform disconnected:', platform);
      return true;
    } catch (error) {
      console.error('❌ Error disconnecting platform:', error);
      return false;
    }
  }

  async getUserPlatformIntegrations(): Promise<PlatformIntegration[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('platform_integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error getting platform integrations:', error);
      return [];
    }
  }

  // ===== DISTRIBUTION SUBMISSION =====

  async submitToDistribution(releaseId: string, platforms: string[]): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate release is ready for distribution
      const validation = await this.validateReleaseForDistribution(releaseId);
      if (!validation.isValid) {
        throw new Error(`Release validation failed: ${validation.errors.join(', ')}`);
      }

      // Update release status
      await supabase
        .from('distribution_releases')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', releaseId)
        .eq('user_id', user.id);

      // Submit to backend processing
      const { error } = await supabase.functions.invoke('distribute-release', {
        body: {
          releaseId,
          platforms,
          userId: user.id,
        },
      });

      if (error) throw error;

      console.log('✅ Release submitted for distribution:', releaseId);
      return true;
    } catch (error) {
      console.error('❌ Error submitting to distribution:', error);
      return false;
    }
  }

  private async validateReleaseForDistribution(releaseId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const { release, tracks } = await this.getReleaseDetails(releaseId);
      
      if (!release) {
        errors.push('Release not found');
        return { isValid: false, errors };
      }

      // Validate release metadata
      if (!release.title.trim()) errors.push('Release title is required');
      if (!release.artist_name.trim()) errors.push('Artist name is required');
      if (!release.metadata.genre) errors.push('Genre is required');
      if (!release.metadata.copyright) errors.push('Copyright information is required');

      // Validate release date
      const releaseDate = new Date(release.release_date);
      const today = new Date();
      if (releaseDate < today) {
        errors.push('Release date must be in the future');
      }

      // Validate tracks
      if (tracks.length === 0) {
        errors.push('At least one track is required');
      }

      for (const track of tracks) {
        if (!track.isrc) {
          errors.push(`Track ${track.track_number} is missing ISRC`);
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push('Validation error occurred');
      return { isValid: false, errors };
    }
  }

  // ===== ANALYTICS & ROYALTIES =====

  async getDistributionAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<DistributionAnalytics | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('get-distribution-analytics', {
        body: {
          userId: user.id,
          startDate,
          endDate,
        },
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Error getting distribution analytics:', error);
      return null;
    }
  }

  async getRoyaltyPayments(
    startDate?: string,
    endDate?: string,
    platform?: string
  ): Promise<RoyaltyPayment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('royalty_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('reporting_month', { ascending: false });

      if (startDate) {
        query = query.gte('reporting_month', startDate.substring(0, 7)); // Convert to YYYY-MM format
      }
      if (endDate) {
        query = query.lte('reporting_month', endDate.substring(0, 7));
      }
      // Note: Platform filtering would need to be done via joins with distribution_analytics
      // For now, we'll return all royalties and filter client-side if needed

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error getting royalty payments:', error);
      return [];
    }
  }

  // ===== LEGAL COMPLIANCE =====

  async getLegalRequirements(territory: string): Promise<LegalRequirement | null> {
    try {
      // This would typically call a legal compliance API
      const legalRequirements: Record<string, LegalRequirement> = {
        'US': {
          territory: 'United States',
          requirements: {
            age_rating: true,
            content_warning: true,
            licensing_needed: ['mechanical', 'performance'],
            restricted_content: ['explicit_sexual', 'hate_speech'],
            tax_implications: ['federal_tax', 'state_tax'],
          },
        },
        'EU': {
          territory: 'European Union',
          requirements: {
            age_rating: true,
            content_warning: true,
            licensing_needed: ['mechanical', 'performance', 'synchronization'],
            restricted_content: ['explicit_sexual', 'hate_speech', 'violence'],
            tax_implications: ['vat', 'digital_services_tax'],
          },
        },
        'UK': {
          territory: 'United Kingdom',
          requirements: {
            age_rating: true,
            content_warning: true,
            licensing_needed: ['mechanical', 'performance'],
            restricted_content: ['explicit_sexual', 'hate_speech'],
            tax_implications: ['vat', 'corporation_tax'],
          },
        },
      };

      return legalRequirements[territory] || null;
    } catch (error) {
      console.error('❌ Error getting legal requirements:', error);
      return null;
    }
  }

  // ===== UTILITY METHODS =====

  private async generateUPC(): Promise<string> {
    // Generate a unique UPC (12 digits)
    // In production, this would be provided by a UPC registry
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp.slice(-9)}${random}`;
  }

  private generateISRC(artistName: string, releaseId: string, trackNumber: number): string {
    // Generate ISRC (International Standard Recording Code)
    // Format: CC-XXX-YY-NNNNN
    const countryCode = 'US'; // Would be dynamic based on user location
    const registrantCode = artistName.substring(0, 3).toUpperCase().padEnd(3, 'X');
    const year = new Date().getFullYear().toString().slice(-2);
    const designation = (trackNumber + parseInt(releaseId.slice(-3), 16)).toString().padStart(5, '0');
    
    return `${countryCode}-${registrantCode}-${year}-${designation}`;
  }

  private async exchangeAuthCode(
    platform: keyof typeof this.platformConfigs,
    authCode: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_at: string;
    user_id: string;
  } | null> {
    try {
      // This would make actual OAuth token exchange requests
      // For now, return mock data
      return {
        access_token: `mock_access_token_${platform}_${Date.now()}`,
        refresh_token: `mock_refresh_token_${platform}_${Date.now()}`,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        user_id: `mock_user_${platform}_${Date.now()}`,
      };
    } catch (error) {
      console.error('❌ Error exchanging auth code:', error);
      return null;
    }
  }

  getPlatformConfig(platform: keyof typeof this.platformConfigs) {
    return this.platformConfigs[platform];
  }

  getAllPlatformConfigs() {
    return this.platformConfigs;
  }

  // ===== REVENUE CALCULATIONS =====

  calculateSoundBridgeCommission(grossRevenueMicros: number): {
    commissionMicros: number;
    netRevenueMicros: number;
    commissionRate: number;
  } {
    const commissionRate = 0.05; // 5% commission
    const commissionMicros = Math.round(grossRevenueMicros * commissionRate);
    const netRevenueMicros = grossRevenueMicros - commissionMicros;

    return {
      commissionMicros,
      netRevenueMicros,
      commissionRate,
    };
  }

  // Helper to convert micros to dollars
  microsToDollars(micros: number): number {
    return micros / 1000000;
  }

  // Helper to convert dollars to micros
  dollarsToMicros(dollars: number): number {
    return Math.round(dollars * 1000000);
  }

  async getTotalEarnings(): Promise<{
    totalStreams: number;
    grossRevenue: number;
    commission: number;
    netRevenue: number;
  }> {
    try {
      const royalties = await this.getRoyaltyPayments();
      
      const totalStreams = royalties.reduce((sum, payment) => sum + payment.total_streams, 0);
      const grossRevenueMicros = royalties.reduce((sum, payment) => sum + payment.gross_revenue_micros, 0);
      const { commissionMicros, netRevenueMicros } = this.calculateSoundBridgeCommission(grossRevenueMicros);

      return {
        totalStreams,
        grossRevenue: this.microsToDollars(grossRevenueMicros),
        commission: this.microsToDollars(commissionMicros),
        netRevenue: this.microsToDollars(netRevenueMicros),
      };
    } catch (error) {
      console.error('❌ Error calculating total earnings:', error);
      return {
        totalStreams: 0,
        grossRevenue: 0,
        commission: 0,
        netRevenue: 0,
      };
    }
  }
}

// Export singleton instance
export const distributionPlatformService = new DistributionPlatformService();
