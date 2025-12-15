// src/services/AudioEnhancementService.ts
// Audio enhancement service for tier-based audio processing

// Note: expo-av removed, using expo-audio if needed in future
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface AudioEnhancementProfile {
  id: string;
  user_id: string;
  name: string;
  tier_level: 'free' | 'pro';
  enhancement_settings: {
    eq?: {
      bands: number[];
      frequencies: number[];
      gains: number[];
      preset?: string;
    };
    compression?: {
      threshold: number;
      ratio: number;
      attack: number;
      release: number;
    };
    enhancement?: {
      enabled: boolean;
      strength: number;
      type: 'ai' | 'dsp';
    };
    noise_reduction?: {
      enabled: boolean;
      level: number;
    };
    reverb?: {
      type: string;
      wetness: number;
    };
    spatial?: {
      enabled: boolean;
      width: number;
      type?: 'virtual_surround' | 'dolby_atmos';
    };
  };
  is_default: boolean;
  is_public: boolean;  // Added: Allow sharing presets
  usage_count: number; // Added: Track popularity
  created_at: string;
  updated_at: string;
}

export interface AudioProcessingJob {
  id: string;
  user_id: string;
  track_id: string;
  job_type: 'enhancement' | 'noise_reduction' | 'mastering' | 'format_conversion';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  settings: object;
  input_url: string;           // Added: Source audio URL
  result_url?: string;
  file_size_bytes?: number;    // Added: Track output size
  processing_time_ms?: number; // Added: Performance metrics
  error_message?: string;
  retry_count: number;         // Added: Track retries
  created_at: string;
  started_at?: string;         // Added: When processing began
  completed_at?: string;
}

export interface TierFeatures {
  maxQuality: 'standard' | 'high' | 'lossless';
  enhancement: boolean;
  advancedEQ: boolean;
  noiseReduction: boolean;
  spatialAudio: boolean;
  realTimeProcessing: boolean;
  exportFormats: string[];
}

class AudioEnhancementService {
  private currentProfile: AudioEnhancementProfile | null = null;
  private audioContext: any = null;
  private processingNodes: Map<string, any> = new Map();

  // ===== TIER MANAGEMENT =====

  getTierFeatures(tier: 'free' | 'premium' | 'unlimited'): TierFeatures {
    const features: Record<string, TierFeatures> = {
      free: {
        maxQuality: 'standard',
        enhancement: false,
        advancedEQ: false,
        noiseReduction: false,
        spatialAudio: false,
        realTimeProcessing: false,
        exportFormats: ['mp3_128'],
      },
      premium: {
        maxQuality: 'high',
        enhancement: true,
        advancedEQ: true,
        noiseReduction: true,
        spatialAudio: true,
        realTimeProcessing: true,
        exportFormats: ['mp3_128', 'mp3_320', 'wav'],
      },
      unlimited: {
        maxQuality: 'high',
        enhancement: true,
        advancedEQ: true,
        noiseReduction: true,
        spatialAudio: true,
        realTimeProcessing: true,
        exportFormats: ['mp3_128', 'mp3_320', 'wav'],
      },
    };

    // Legacy support for 'pro' tier
    if (tier === 'pro') {
      return features.premium;
  }

    return features[tier] || features.free;
  }

  async validateTierAccess(tier: 'free' | 'premium' | 'unlimited', feature: keyof TierFeatures): Promise<boolean> {
    try {
      const { data: { user, session } } = await supabase.auth.getUser();
      if (!user || !session) return false;

      // Get user's subscription tier from API (subscription data in user_subscriptions table, not profiles)
      // Updated to use new endpoint: /api/subscription/status
      const response = await fetch('https://www.soundbridge.live/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to fetch subscription status, defaulting to free');
        const tierFeatures = this.getTierFeatures('free');
        return tierFeatures[feature] === true;
      }

      const responseData = await response.json();
      // Defensive: Use optional chaining - subscription might be null for free users
      const subscription = responseData?.data?.subscription || null;
      
      if (!subscription) {
        // No subscription, default to free
        const tierFeatures = this.getTierFeatures('free');
        return tierFeatures[feature] === true;
      }
      
      // IMPORTANT: Paid access requires both tier === 'premium'|'unlimited' AND status === 'active'
      const userTier = subscription.tier || 'free';
      const userStatus = subscription.status || 'active';
      const hasPaidAccess = (userTier === 'premium' || userTier === 'unlimited') && userStatus === 'active';
      
      // If user doesn't have active paid access, treat as free
      // Legacy: treat 'pro' as 'premium'
      let effectiveTier: 'free' | 'premium' | 'unlimited' = 'free';
      if (hasPaidAccess) {
        effectiveTier = userTier === 'unlimited' ? 'unlimited' : 'premium';
      } else if (userTier === 'pro') {
        // Legacy support
        effectiveTier = 'premium';
      }
      const tierFeatures = this.getTierFeatures(effectiveTier);
      
      return tierFeatures[feature] === true || (
        feature === 'maxQuality' && this.compareQualityTiers(tierFeatures.maxQuality, tier)
      );
    } catch (error) {
      console.error('❌ Error validating tier access:', error);
      // Default to free tier on error
      const tierFeatures = this.getTierFeatures('free');
      return tierFeatures[feature] === true;
    }
  }

  private compareQualityTiers(userQuality: string, requiredTier: string): boolean {
    const qualityLevels = { standard: 1, high: 2, lossless: 3 };
    const tierLevels = { free: 1, pro: 2 };
    
    // Defensive: normalize tier names
    let normalizedTier: 'free' | 'premium' | 'unlimited' = requiredTier;
    if (requiredTier === 'enterprise') {
      normalizedTier = 'unlimited';
    } else if (requiredTier === 'pro') {
      normalizedTier = 'premium';
    }
    
    return qualityLevels[userQuality as keyof typeof qualityLevels] >= 
           (tierLevels[normalizedTier as keyof typeof tierLevels] || 2);
  }

  // ===== PROFILE MANAGEMENT =====

  async getUserProfiles(type: 'user' | 'public' | 'all' = 'user', tier?: 'free' | 'premium' | 'unlimited'): Promise<AudioEnhancementProfile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && type !== 'public') return [];

      let query = supabase.from('audio_enhancement_profiles').select('*');

      // Filter by type
      if (type === 'user') {
        query = query.eq('user_id', user!.id);
      } else if (type === 'public') {
        query = query.eq('is_public', true);
      } else if (type === 'all') {
        query = query.or(`user_id.eq.${user!.id},is_public.eq.true`);
      }

      // Filter by tier if specified
      if (tier) {
        query = query.eq('tier_level', tier);
      }

      // Order by usage count for public, creation date for user
      if (type === 'public') {
        query = query.order('usage_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error getting user profiles:', error);
      return [];
    }
  }

  async createProfile(
    name: string, 
    settings: AudioEnhancementProfile['enhancement_settings'],
      tierLevel: 'free' | 'pro',
    isDefault = false,
    isPublic = false
  ): Promise<AudioEnhancementProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate tier access
      const hasAccess = await this.validateTierAccess(tierLevel, 'enhancement');
      if (!hasAccess) {
        throw new Error(`Tier ${tierLevel} features not available for your subscription`);
      }

      const { data, error } = await supabase
        .from('audio_enhancement_profiles')
        .insert({
          user_id: user.id,
          name,
          tier_level: tierLevel,
          enhancement_settings: settings,
          is_default: isDefault,
          is_public: isPublic,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Audio enhancement profile created:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      return null;
    }
  }

  async updateProfile(
    profileId: string, 
    updates: Partial<Pick<AudioEnhancementProfile, 'name' | 'enhancement_settings' | 'is_default' | 'is_public'>>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('audio_enhancement_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Audio enhancement profile updated:', profileId);
      return true;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return false;
    }
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('audio_enhancement_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Audio enhancement profile deleted:', profileId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting profile:', error);
      return false;
    }
  }

  async setDefaultProfile(profileId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, unset all default profiles
      await supabase
        .from('audio_enhancement_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the new default
      const { error } = await supabase
        .from('audio_enhancement_profiles')
        .update({ is_default: true })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Default profile set:', profileId);
      return true;
    } catch (error) {
      console.error('❌ Error setting default profile:', error);
      return false;
    }
  }

  // ===== AUDIO PROCESSING =====

  async initializeAudioContext(): Promise<boolean> {
    try {
      // For React Native, we'll use a mock audio context
      // In a real implementation, this would initialize native audio processing
      this.audioContext = {
        sampleRate: 44100,
        state: 'running',
        createGain: () => ({ gain: { value: 1 } }),
        createBiquadFilter: () => ({ 
          type: 'peaking',
          frequency: { value: 1000 },
          Q: { value: 1 },
          gain: { value: 0 }
        }),
      };

      console.log('✅ Audio context initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing audio context:', error);
      return false;
    }
  }

  async applyEnhancementProfile(profileId: string): Promise<boolean> {
    try {
      const profiles = await this.getUserProfiles();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Validate tier access
      const hasAccess = await this.validateTierAccess(profile.tier_level, 'enhancement');
      if (!hasAccess) {
        throw new Error('Insufficient subscription tier for this profile');
      }

      this.currentProfile = profile;
      await this.setupAudioProcessing(profile.enhancement_settings);

      console.log('✅ Enhancement profile applied:', profileId);
      return true;
    } catch (error) {
      console.error('❌ Error applying enhancement profile:', error);
      return false;
    }
  }

  private async setupAudioProcessing(settings: AudioEnhancementProfile['enhancement_settings']): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    // Clear existing processing nodes
    this.processingNodes.clear();

    // Setup EQ
    if (settings.eq && settings.eq.bands) {
      const eqNode = this.createEQNode(settings.eq.bands);
      this.processingNodes.set('eq', eqNode);
    }

    // Setup enhancement
    if (settings.enhancement?.enabled) {
      const enhancementNode = this.createEnhancementNode(settings.enhancement);
      this.processingNodes.set('enhancement', enhancementNode);
    }

    // Setup noise reduction
    if (settings.noise_reduction?.enabled) {
      const noiseReductionNode = this.createNoiseReductionNode(settings.noise_reduction);
      this.processingNodes.set('noise_reduction', noiseReductionNode);
    }

    // Setup spatial audio
    if (settings.spatial?.enabled) {
      const spatialNode = this.createSpatialAudioNode({ 
        type: settings.spatial.type || 'virtual_surround' 
      });
      this.processingNodes.set('spatial_audio', spatialNode);
    }
  }

  private createEQNode(bands: number[]): any {
    // Mock EQ node creation
    // In real implementation, this would create native audio filter nodes
    return {
      type: 'eq',
      bands: bands.map((gain, index) => ({
        frequency: this.getEQFrequency(index, bands.length),
        gain,
        Q: 1.0,
      })),
    };
  }

  private createEnhancementNode(settings: { strength: number; type: 'ai' | 'dsp' }): any {
    // Mock enhancement node creation
    return {
      type: 'enhancement',
      algorithm: settings.type,
      strength: settings.strength,
    };
  }

  private createNoiseReductionNode(settings: { level: number }): any {
    // Mock noise reduction node creation
    return {
      type: 'noise_reduction',
      level: settings.level,
    };
  }

  private createSpatialAudioNode(settings: { type: 'virtual_surround' | 'dolby_atmos' }): any {
    // Mock spatial audio node creation
    return {
      type: 'spatial_audio',
      algorithm: settings.type,
    };
  }

  private getEQFrequency(bandIndex: number, totalBands: number): number {
    // Calculate frequency for EQ band
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logStep = (logMax - logMin) / (totalBands - 1);
    
    return Math.pow(10, logMin + (bandIndex * logStep));
  }

  // ===== CLOUD PROCESSING =====

  async submitProcessingJob(
    trackId: string,
    jobType: 'enhancement' | 'noise_reduction' | 'mastering' | 'format_conversion',
    settings: object,
    inputUrl: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check rate limits based on subscription tier
      const rateLimitCheck = await this.checkProcessingRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. ${rateLimitCheck.message}`);
      }

      const { data, error } = await supabase
        .from('audio_processing_jobs')
        .insert({
          user_id: user.id,
          track_id: trackId,
          job_type: jobType,
          settings: { ...settings, priority },
          input_url: inputUrl,
          status: 'pending',
          progress: 0,
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger cloud processing with priority
      await this.triggerCloudProcessing(data.id, priority);

      console.log('✅ Processing job submitted:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error submitting processing job:', error);
      return null;
    }
  }

  private async triggerCloudProcessing(jobId: string, priority: string = 'normal'): Promise<void> {
    try {
      // Call backend API to start processing
      const { error } = await supabase.functions.invoke('process-audio', {
        body: { jobId, priority },
      });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error triggering cloud processing:', error);
    }
  }

  private async checkProcessingRateLimit(userId: string): Promise<{ allowed: boolean; message: string }> {
    try {
      // Get user's subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      const tier = profile?.subscription_tier || 'free';
      
      // Get today's job count
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('audio_processing_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const limits = {
        free: 5,
        premium: 100,
        unlimited: 100,
      };
      
      // Defensive: normalize tier names
      let normalizedTier: 'free' | 'premium' | 'unlimited' = tier === 'enterprise' ? 'unlimited' : (tier === 'pro' ? 'premium' : tier as 'free' | 'premium' | 'unlimited');

      const dailyLimit = limits[normalizedTier] || limits.premium;
      const currentCount = count || 0;

      if (currentCount >= dailyLimit) {
        return {
          allowed: false,
          message: `Daily limit of ${dailyLimit} processing jobs reached. Upgrade to increase limit.`,
        };
      }

      return { allowed: true, message: 'Rate limit OK' };
    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      return { allowed: true, message: 'Rate limit check failed, allowing request' };
    }
  }

  async getProcessingJobStatus(jobId: string): Promise<AudioProcessingJob | null> {
    try {
      const { data, error } = await supabase
        .from('audio_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Error getting job status:', error);
      return null;
    }
  }

  async getUserProcessingJobs(): Promise<AudioProcessingJob[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('audio_processing_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error getting user processing jobs:', error);
      return [];
    }
  }

  // ===== PRESETS =====

  getDefaultPresets(tier: 'free' | 'pro'): AudioEnhancementProfile[] {
    // Defensive: if tier is 'enterprise', treat as 'pro'
    const normalizedTier = tier === 'enterprise' ? 'pro' : tier;
    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    
    const basePresets = [
      {
        name: 'Flat',
        settings: {
          eq: { 
            bands: new Array(10).fill(0), 
            frequencies,
            gains: new Array(10).fill(0),
            preset: 'flat' 
          },
          compression: { threshold: -12, ratio: 2, attack: 10, release: 100 },
          enhancement: { enabled: false, strength: 0, type: 'ai' as const },
        },
      },
    ];

    if (normalizedTier === 'free') {
      return basePresets.map(preset => ({
        ...preset,
        id: `preset_${preset.name.toLowerCase()}`,
        user_id: '',
        tier_level: 'free' as const,
        enhancement_settings: preset.settings,
        is_default: preset.name === 'Flat',
        is_public: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    const proPresets = [
      ...basePresets,
      {
        name: 'Rock',
        settings: {
          eq: { 
            bands: [0, 0, 2, 3, 1, -1, -2, 0, 2, 3], 
            frequencies,
            gains: [0, 0, 2, 3, 1, -1, -2, 0, 2, 3],
            preset: 'rock' 
          },
          compression: { threshold: -8, ratio: 3, attack: 5, release: 50 },
          enhancement: { enabled: true, strength: 0.3, type: 'ai' as const },
        },
      },
      {
        name: 'Pop',
        settings: {
          eq: { bands: [1, 2, 1, 0, -1, -1, 0, 1, 2, 2], frequencies, gains: [1, 2, 1, 0, -1, -1, 0, 1, 2, 2], preset: 'pop' },
          enhancement: { enabled: true, strength: 0.4, type: 'ai' as const },
        },
      },
      {
        name: 'Vocal',
        settings: {
          eq: { bands: [-2, -1, 0, 2, 3, 2, 1, 0, -1, -2], frequencies, gains: [-2, -1, 0, 2, 3, 2, 1, 0, -1, -2], preset: 'vocal' },
          enhancement: { enabled: true, strength: 0.5, type: 'ai' as const },
          noise_reduction: { enabled: true, level: 0.3 },
        },
      },
    ];

    // Enterprise tier removed - all presets available to Pro users

    return proPresets.map(preset => ({
      ...preset,
        id: `preset_${preset.name.toLowerCase()}`,
        user_id: '',
        tier_level: normalizedTier,
        enhancement_settings: preset.settings,
        is_default: preset.name === 'Flat',
        is_public: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));
  }

  // ===== UTILITY METHODS =====

  getCurrentProfile(): AudioEnhancementProfile | null {
    return this.currentProfile;
  }

  isProcessingActive(): boolean {
    return this.processingNodes.size > 0;
  }

  getProcessingNodes(): Map<string, any> {
    return this.processingNodes;
  }

  async cleanup(): Promise<void> {
    this.processingNodes.clear();
    this.currentProfile = null;
    
    if (this.audioContext) {
      // In real implementation, close audio context
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const audioEnhancementService = new AudioEnhancementService();


      return true;

    } catch (error) {

      console.error('❌ Error applying enhancement profile:', error);

      return false;

    }

  }



  private async setupAudioProcessing(settings: AudioEnhancementProfile['enhancement_settings']): Promise<void> {

    if (!this.audioContext) {

      await this.initializeAudioContext();

    }



    // Clear existing processing nodes

    this.processingNodes.clear();



    // Setup EQ

    if (settings.eq && settings.eq.bands) {

      const eqNode = this.createEQNode(settings.eq.bands);

      this.processingNodes.set('eq', eqNode);

    }



    // Setup enhancement

    if (settings.enhancement?.enabled) {

      const enhancementNode = this.createEnhancementNode(settings.enhancement);

      this.processingNodes.set('enhancement', enhancementNode);

    }



    // Setup noise reduction

    if (settings.noise_reduction?.enabled) {

      const noiseReductionNode = this.createNoiseReductionNode(settings.noise_reduction);

      this.processingNodes.set('noise_reduction', noiseReductionNode);

    }



    // Setup spatial audio

    if (settings.spatial?.enabled) {

      const spatialNode = this.createSpatialAudioNode({ 

        type: settings.spatial.type || 'virtual_surround' 

      });

      this.processingNodes.set('spatial_audio', spatialNode);

    }

  }



  private createEQNode(bands: number[]): any {

    // Mock EQ node creation

    // In real implementation, this would create native audio filter nodes

    return {

      type: 'eq',

      bands: bands.map((gain, index) => ({

        frequency: this.getEQFrequency(index, bands.length),

        gain,

        Q: 1.0,

      })),

    };

  }



  private createEnhancementNode(settings: { strength: number; type: 'ai' | 'dsp' }): any {

    // Mock enhancement node creation

    return {

      type: 'enhancement',

      algorithm: settings.type,

      strength: settings.strength,

    };

  }



  private createNoiseReductionNode(settings: { level: number }): any {

    // Mock noise reduction node creation

    return {

      type: 'noise_reduction',

      level: settings.level,

    };

  }



  private createSpatialAudioNode(settings: { type: 'virtual_surround' | 'dolby_atmos' }): any {

    // Mock spatial audio node creation

    return {

      type: 'spatial_audio',

      algorithm: settings.type,

    };

  }



  private getEQFrequency(bandIndex: number, totalBands: number): number {

    // Calculate frequency for EQ band

    const minFreq = 20;

    const maxFreq = 20000;

    const logMin = Math.log10(minFreq);

    const logMax = Math.log10(maxFreq);

    const logStep = (logMax - logMin) / (totalBands - 1);

    

    return Math.pow(10, logMin + (bandIndex * logStep));

  }



  // ===== CLOUD PROCESSING =====



  async submitProcessingJob(

    trackId: string,

    jobType: 'enhancement' | 'noise_reduction' | 'mastering' | 'format_conversion',

    settings: object,

    inputUrl: string,

    priority: 'low' | 'normal' | 'high' = 'normal'

  ): Promise<string | null> {

    try {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');



      // Check rate limits based on subscription tier

      const rateLimitCheck = await this.checkProcessingRateLimit(user.id);

      if (!rateLimitCheck.allowed) {

        throw new Error(`Rate limit exceeded. ${rateLimitCheck.message}`);

      }



      const { data, error } = await supabase

        .from('audio_processing_jobs')

        .insert({

          user_id: user.id,

          track_id: trackId,

          job_type: jobType,

          settings: { ...settings, priority },

          input_url: inputUrl,

          status: 'pending',

          progress: 0,

          retry_count: 0,

        })

        .select()

        .single();



      if (error) throw error;



      // Trigger cloud processing with priority

      await this.triggerCloudProcessing(data.id, priority);



      console.log('✅ Processing job submitted:', data.id);

      return data.id;

    } catch (error) {

      console.error('❌ Error submitting processing job:', error);

      return null;

    }

  }



  private async triggerCloudProcessing(jobId: string, priority: string = 'normal'): Promise<void> {

    try {

      // Call backend API to start processing

      const { error } = await supabase.functions.invoke('process-audio', {

        body: { jobId, priority },

      });



      if (error) throw error;

    } catch (error) {

      console.error('❌ Error triggering cloud processing:', error);

    }

  }



  private async checkProcessingRateLimit(userId: string): Promise<{ allowed: boolean; message: string }> {

    try {

      // Get user's subscription tier

      const { data: profile } = await supabase

        .from('profiles')

        .select('subscription_tier')

        .eq('id', userId)

        .single();



      const tier = profile?.subscription_tier || 'free';

      

      // Get today's job count

      const today = new Date().toISOString().split('T')[0];

      const { count } = await supabase

        .from('audio_processing_jobs')

        .select('*', { count: 'exact', head: true })

        .eq('user_id', userId)

        .gte('created_at', `${today}T00:00:00.000Z`)

        .lt('created_at', `${today}T23:59:59.999Z`);



      const limits = {

        free: 5,

        pro: 100,

      };

      // Defensive: normalize tier names
      let normalizedTier: 'free' | 'premium' | 'unlimited' = tier === 'enterprise' ? 'unlimited' : (tier === 'pro' ? 'premium' : tier as 'free' | 'premium' | 'unlimited');
      const dailyLimit = limits[normalizedTier as keyof typeof limits] || limits.pro;

      const currentCount = count || 0;



      if (currentCount >= dailyLimit) {

        return {

          allowed: false,

          message: `Daily limit of ${dailyLimit} processing jobs reached. Upgrade to increase limit.`,

        };

      }



      return { allowed: true, message: 'Rate limit OK' };

    } catch (error) {

      console.error('❌ Error checking rate limit:', error);

      return { allowed: true, message: 'Rate limit check failed, allowing request' };

    }

  }



  async getProcessingJobStatus(jobId: string): Promise<AudioProcessingJob | null> {

    try {

      const { data, error } = await supabase

        .from('audio_processing_jobs')

        .select('*')

        .eq('id', jobId)

        .single();



      if (error) throw error;



      return data;

    } catch (error) {

      console.error('❌ Error getting job status:', error);

      return null;

    }

  }



  async getUserProcessingJobs(): Promise<AudioProcessingJob[]> {

    try {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return [];



      const { data, error } = await supabase

        .from('audio_processing_jobs')

        .select('*')

        .eq('user_id', user.id)

        .order('created_at', { ascending: false })

        .limit(50);



      if (error) throw error;



      return data || [];

    } catch (error) {

      console.error('❌ Error getting user processing jobs:', error);

      return [];

    }

  }



  // ===== PRESETS =====



  getDefaultPresets(tier: 'free' | 'pro'): AudioEnhancementProfile[] {
    // Defensive: if tier is 'enterprise', treat as 'pro'
    const normalizedTier = tier === 'enterprise' ? 'pro' : tier;
    const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

    

    const basePresets = [

      {

        name: 'Flat',

        settings: {

          eq: { 

            bands: new Array(10).fill(0), 

            frequencies,

            gains: new Array(10).fill(0),

            preset: 'flat' 

          },

          compression: { threshold: -12, ratio: 2, attack: 10, release: 100 },

          enhancement: { enabled: false, strength: 0, type: 'ai' as const },

        },

      },

    ];



    if (tier === 'free') {

      return basePresets.map(preset => ({

        ...preset,

        id: `preset_${preset.name.toLowerCase()}`,

        user_id: '',

        tier_level: 'free' as const,

        enhancement_settings: preset.settings,

        is_default: preset.name === 'Flat',

        is_public: true,

        usage_count: 0,

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),

      }));

    }



    const proPresets = [

      ...basePresets,

      {

        name: 'Rock',

        settings: {

          eq: { 

            bands: [0, 0, 2, 3, 1, -1, -2, 0, 2, 3], 

            frequencies,

            gains: [0, 0, 2, 3, 1, -1, -2, 0, 2, 3],

            preset: 'rock' 

          },

          compression: { threshold: -8, ratio: 3, attack: 5, release: 50 },

          enhancement: { enabled: true, strength: 0.3, type: 'ai' as const },

        },

      },

      {

        name: 'Pop',

        settings: {

          eq: { bands: [1, 2, 1, 0, -1, -1, 0, 1, 2, 2], frequencies, gains: [1, 2, 1, 0, -1, -1, 0, 1, 2, 2], preset: 'pop' },

          enhancement: { enabled: true, strength: 0.4, type: 'ai' as const },

        },

      },

      {

        name: 'Vocal',

        settings: {

          eq: { bands: [-2, -1, 0, 2, 3, 2, 1, 0, -1, -2], frequencies, gains: [-2, -1, 0, 2, 3, 2, 1, 0, -1, -2], preset: 'vocal' },

          enhancement: { enabled: true, strength: 0.5, type: 'ai' as const },

          noise_reduction: { enabled: true, level: 0.3 },

        },

      },

    ];



    // Enterprise tier removed - all presets available to Pro users
    // (Keeping the Mastered preset for Pro users)
    if (normalizedTier === 'pro') {
      proPresets.push(
        {
          name: 'Mastered',
          settings: {
            eq: { bands: [0, 0, 1, 1, 0, 0, 1, 2, 1, 0], frequencies, gains: [0, 0, 1, 1, 0, 0, 1, 2, 1, 0], preset: 'mastered' },

            enhancement: { enabled: true, strength: 0.7, type: 'ai' as const },

            noise_reduction: { enabled: true, level: 0.5 },

          },

        }

      );

    }



    return proPresets.map(preset => ({

      ...preset,

        id: `preset_${preset.name.toLowerCase()}`,

        user_id: '',

        tier_level: normalizedTier,

        enhancement_settings: preset.settings,

        is_default: preset.name === 'Flat',

        is_public: true,

        usage_count: 0,

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),

    }));

  }



  // ===== UTILITY METHODS =====



  getCurrentProfile(): AudioEnhancementProfile | null {

    return this.currentProfile;

  }



  isProcessingActive(): boolean {

    return this.processingNodes.size > 0;

  }



  getProcessingNodes(): Map<string, any> {

    return this.processingNodes;

  }



  async cleanup(): Promise<void> {

    this.processingNodes.clear();

    this.currentProfile = null;

    

    if (this.audioContext) {

      // In real implementation, close audio context

      this.audioContext = null;

    }

  }

}



// Export singleton instance

export const audioEnhancementService = new AudioEnhancementService();


