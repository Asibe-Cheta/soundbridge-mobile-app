import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdConfig {
  enabled: boolean;
  frequency: number; // Show ad every X tracks
  types: {
    banner: boolean;
    interstitial: boolean;
    rewarded: boolean;
  };
  networks: {
    admob: boolean;
    facebook: boolean;
    unity: boolean;
  };
}

export interface AdUnit {
  id: string;
  type: 'banner' | 'interstitial' | 'rewarded';
  network: 'admob' | 'facebook' | 'unity';
  unitId: string;
  enabled: boolean;
}

export interface AdEvent {
  id: string;
  type: 'impression' | 'click' | 'reward' | 'error';
  adUnitId: string;
  timestamp: string;
  revenue?: number;
  error?: string;
}

class AdService {
  private config: AdConfig = {
    enabled: true,
    frequency: 3, // Show ad every 3 tracks for free users
    types: {
      banner: true,
      interstitial: true,
      rewarded: false, // Implement later
    },
    networks: {
      admob: true,
      facebook: false,
      unity: false,
    }
  };

  private adUnits: AdUnit[] = [
    {
      id: 'banner-home',
      type: 'banner',
      network: 'admob',
      unitId: 'ca-app-pub-3940256099942544/6300978111', // Test banner ID
      enabled: true,
    },
    {
      id: 'interstitial-tracks',
      type: 'interstitial',
      network: 'admob',
      unitId: 'ca-app-pub-3940256099942544/1033173712', // Test interstitial ID
      enabled: true,
    },
    {
      id: 'rewarded-offline',
      type: 'rewarded',
      network: 'admob',
      unitId: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded ID
      enabled: false, // Disabled for now
    }
  ];

  private trackCount = 0;
  private lastAdShown = 0;
  private adEvents: AdEvent[] = [];

  // ===== INITIALIZATION =====
  
  async initialize(): Promise<boolean> {
    try {
      console.log('📺 Initializing ad service...');
      
      // Load saved config
      await this.loadConfig();
      
      // Load track count
      await this.loadTrackCount();
      
      console.log('✅ Ad service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ad service:', error);
      return false;
    }
  }

  // ===== CONFIG MANAGEMENT =====
  
  private async loadConfig(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('ad_config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading ad config:', error);
    }
  }

  async saveConfig(config: Partial<AdConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('ad_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving ad config:', error);
    }
  }

  getConfig(): AdConfig {
    return { ...this.config };
  }

  // ===== TRACK COUNT MANAGEMENT =====
  
  private async loadTrackCount(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('ad_track_count');
      if (saved) {
        this.trackCount = parseInt(saved, 10) || 0;
      }
    } catch (error) {
      console.error('Error loading track count:', error);
    }
  }

  private async saveTrackCount(): Promise<void> {
    try {
      await AsyncStorage.setItem('ad_track_count', this.trackCount.toString());
    } catch (error) {
      console.error('Error saving track count:', error);
    }
  }

  // ===== AD DISPLAY LOGIC =====
  
  async onTrackPlay(userTier: 'free' | 'pro' | 'enterprise'): Promise<boolean> {
    // Only show ads to free users
    if (userTier !== 'free') {
      return false;
    }

    if (!this.config.enabled) {
      return false;
    }

    this.trackCount++;
    await this.saveTrackCount();

    // Check if it's time to show an ad
    const shouldShowAd = this.shouldShowAd();
    
    if (shouldShowAd) {
      this.lastAdShown = Date.now();
      return true;
    }

    return false;
  }

  private shouldShowAd(): boolean {
    // Show ad every X tracks
    if (this.trackCount % this.config.frequency === 0) {
      return true;
    }

    // Don't show ads too frequently (minimum 30 seconds between ads)
    const timeSinceLastAd = Date.now() - this.lastAdShown;
    if (timeSinceLastAd < 30000) {
      return false;
    }

    return false;
  }

  // ===== AD UNITS =====
  
  getAdUnits(): AdUnit[] {
    return this.adUnits.filter(unit => unit.enabled);
  }

  getAdUnit(id: string): AdUnit | null {
    return this.adUnits.find(unit => unit.id === id) || null;
  }

  // ===== AD EVENTS =====
  
  async trackAdEvent(event: Omit<AdEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const adEvent: AdEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...event
      };

      this.adEvents.push(adEvent);
      
      // Keep only last 100 events
      if (this.adEvents.length > 100) {
        this.adEvents = this.adEvents.slice(-100);
      }

      console.log('📺 Ad event tracked:', event.type, event.adUnitId);
    } catch (error) {
      console.error('Error tracking ad event:', error);
    }
  }

  getAdEvents(): AdEvent[] {
    return [...this.adEvents];
  }

  getAdRevenue(): number {
    return this.adEvents
      .filter(event => event.revenue)
      .reduce((total, event) => total + (event.revenue || 0), 0);
  }

  // ===== UTILITY METHODS =====
  
  resetTrackCount(): void {
    this.trackCount = 0;
    this.saveTrackCount();
  }

  isAdEnabled(userTier: 'free' | 'pro' | 'enterprise'): boolean {
    return this.config.enabled && userTier === 'free';
  }

  getAdFrequency(): number {
    return this.config.frequency;
  }

  // ===== MOCK AD DISPLAY (for development) =====
  
  async showMockBannerAd(): Promise<void> {
    console.log('📺 Mock banner ad displayed');
    await this.trackAdEvent({
      type: 'impression',
      adUnitId: 'banner-home',
    });
  }

  async showMockInterstitialAd(): Promise<boolean> {
    console.log('📺 Mock interstitial ad displayed');
    await this.trackAdEvent({
      type: 'impression',
      adUnitId: 'interstitial-tracks',
    });
    
    // Simulate user interaction
    setTimeout(() => {
      this.trackAdEvent({
        type: 'click',
        adUnitId: 'interstitial-tracks',
      });
    }, 2000);

    return true;
  }

  async showMockRewardedAd(): Promise<boolean> {
    console.log('📺 Mock rewarded ad displayed');
    await this.trackAdEvent({
      type: 'impression',
      adUnitId: 'rewarded-offline',
    });
    
    // Simulate reward earned
    setTimeout(() => {
      this.trackAdEvent({
        type: 'reward',
        adUnitId: 'rewarded-offline',
        revenue: 0.01, // Mock revenue
      });
    }, 3000);

    return true;
  }
}

// Export singleton instance
export const adService = new AdService();
