import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import type { ServiceProviderCard, ServiceCategory } from '../types';

export interface ServiceDiscoveryPreferences {
  notifications_enabled: boolean;
  max_distance_km: number;
  min_budget: number | null;
  max_budget: number | null;
  service_categories: ServiceCategory[] | null;
}

export interface GigAlertPreferences {
  gig_alerts_enabled: boolean;
  alert_categories: ServiceCategory[] | null;
  availability_status: 'available' | 'available_from' | 'not_available';
  available_from_date: string | null;
}

export const NATIONWIDE_KM = 99999;

export const DISTANCE_OPTION_LABELS: Record<number, string> = {
  10: '10km',
  20: '20km',
  30: '30km',
  50: '50km',
  100: '100km',
  [NATIONWIDE_KM]: 'Nationwide',
};

export const DISTANCE_OPTIONS = [10, 20, 30, 50, 100, NATIONWIDE_KM] as const;

export const SERVICE_CATEGORY_OPTIONS: Array<{ value: ServiceCategory; label: string }> = [
  { value: 'sound_engineering', label: 'Sound Engineering' },
  { value: 'sound_engineer', label: 'Sound Engineer' },
  { value: 'mixing_mastering', label: 'Mixing & Mastering' },
  { value: 'session_musician', label: 'Session Musician' },
  { value: 'musician', label: 'Musician' },
  { value: 'singer', label: 'Singer' },
  { value: 'bgv', label: 'BGV' },
  { value: 'choir_director', label: 'Choir Director' },
  { value: 'music_lessons', label: 'Music Lessons' },
  { value: 'instrument_teacher', label: 'Instrument Teacher' },
  { value: 'photography', label: 'Photography' },
  { value: 'videography', label: 'Videography' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'event_management', label: 'Event Management' },
  { value: 'other', label: 'Other' },
];

export const DEFAULT_SERVICE_PREFS: ServiceDiscoveryPreferences = {
  notifications_enabled: true,
  max_distance_km: 30,
  min_budget: null,
  max_budget: null,
  service_categories: null,
};

export const DEFAULT_GIG_ALERT_PREFS: GigAlertPreferences = {
  gig_alerts_enabled: false,
  alert_categories: null,
  availability_status: 'available',
  available_from_date: null,
};

class ServiceDiscoveryService {
  async requestLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async getServiceProviders(
    userLat: number | null,
    userLng: number | null,
    prefs: ServiceDiscoveryPreferences
  ): Promise<ServiceProviderCard[]> {
    try {
      let query = supabase
        .from('service_provider_profiles')
        .select(
          'user_id, display_name, headline, categories, default_rate, rate_currency, average_rating, review_count, badge_tier, is_verified, show_payment_protection, first_booking_discount_enabled, first_booking_discount_percent, latitude, longitude'
        )
        .eq('status', 'active')
        .order('average_rating', { ascending: false });

      // Category filter — overlaps means at least one category matches
      if (prefs.service_categories && prefs.service_categories.length > 0) {
        query = (query as any).overlaps('categories', prefs.service_categories);
      }

      const { data: providers, error } = await query;
      if (error || !providers || providers.length === 0) return [];

      // Fetch avatar_url from profiles
      const userIds = providers.map((p: any) => p.user_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profileRows ?? []).map((p: any) => [p.id, p])
      );

      let results: Array<ServiceProviderCard & { _lat: number | null; _lng: number | null }> =
        providers.map((provider: any) => {
          const profile = profileMap.get(provider.user_id);
          return {
            provider_id: provider.user_id,
            display_name: provider.display_name || '',
            headline: provider.headline,
            categories: provider.categories,
            default_rate: provider.default_rate,
            rate_currency: provider.rate_currency,
            average_rating: provider.average_rating,
            review_count: provider.review_count,
            badge_tier: provider.badge_tier,
            is_verified: provider.is_verified || false,
            show_payment_protection: provider.show_payment_protection,
            first_booking_discount_enabled: provider.first_booking_discount_enabled,
            first_booking_discount_percent: provider.first_booking_discount_percent,
            image_url: profile?.avatar_url ?? null,
            price_band: provider.default_rate
              ? `${provider.rate_currency ?? '£'}${provider.default_rate}/hr`
              : null,
            _lat: provider.latitude ?? null,
            _lng: provider.longitude ?? null,
          };
        });

      // Budget filter
      if (prefs.min_budget != null) {
        results = results.filter(
          (r) => r.default_rate == null || (r.default_rate ?? 0) >= prefs.min_budget!
        );
      }
      if (prefs.max_budget != null) {
        results = results.filter(
          (r) => r.default_rate == null || (r.default_rate ?? 0) <= prefs.max_budget!
        );
      }

      // Proximity filter — providers without lat/lng are always included (shown to everyone)
      if (userLat != null && userLng != null && prefs.max_distance_km < NATIONWIDE_KM) {
        const withCoords = results.filter((r) => r._lat != null && r._lng != null);

        if (withCoords.length > 0) {
          const filtered = withCoords.filter(
            (r) => this.haversineKm(userLat, userLng, r._lat!, r._lng!) <= prefs.max_distance_km
          );
          // Expand to 2× radius if nothing found within default radius
          if (filtered.length === 0 && prefs.max_distance_km <= 30) {
            return withCoords.filter(
              (r) => this.haversineKm(userLat, userLng, r._lat!, r._lng!) <= prefs.max_distance_km * 2
            );
          }
          return filtered;
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  // ─── Discovery preferences ────────────────────────────────────────────────

  async getServicePreferences(
    userId: string
  ): Promise<ServiceDiscoveryPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('service_discovery_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        notifications_enabled: data.notifications_enabled ?? true,
        max_distance_km: data.max_distance_km ?? 30,
        min_budget: data.min_budget ?? null,
        max_budget: data.max_budget ?? null,
        service_categories: data.service_categories ?? null,
      };
    } catch {
      return null;
    }
  }

  async saveServicePreferences(
    userId: string,
    prefs: ServiceDiscoveryPreferences
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_discovery_preferences')
        .upsert(
          { user_id: userId, ...prefs, updated_at: new Date().toISOString() } as any
        );
      return !error;
    } catch {
      return false;
    }
  }

  // ─── Gig alert preferences (service provider side) ───────────────────────

  async getGigAlertPreferences(
    userId: string
  ): Promise<GigAlertPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('service_provider_gig_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        gig_alerts_enabled: data.gig_alerts_enabled ?? false,
        alert_categories: data.alert_categories ?? null,
        availability_status: data.availability_status ?? 'available',
        available_from_date: data.available_from_date ?? null,
      };
    } catch {
      return null;
    }
  }

  async saveGigAlertPreferences(
    userId: string,
    prefs: GigAlertPreferences
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_provider_gig_preferences')
        .upsert(
          { user_id: userId, ...prefs, updated_at: new Date().toISOString() } as any
        );
      return !error;
    } catch {
      return false;
    }
  }
}

export const serviceDiscoveryService = new ServiceDiscoveryService();
