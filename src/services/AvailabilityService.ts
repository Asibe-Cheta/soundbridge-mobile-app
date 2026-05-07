import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { UserAvailability } from '../types/availability.types';

const LOCATION_UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.id) throw new Error('Not authenticated');
  return data.session.user.id;
}

class AvailabilityService {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private lastLocationUpdateAt = 0;
  private trackingActive = false;

  // ===== AVAILABILITY CRUD =====

  /**
   * Fetch the user's availability row from Supabase.
   * Creates a default row if none exists.
   */
  async getMyAvailability(): Promise<UserAvailability> {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No row — insert defaults and return them
      const defaults: Partial<UserAvailability> = {
        user_id: userId,
        available_for_urgent_gigs: false,
        max_radius_km: 20,
        rate_negotiable: false,
        max_notifications_per_day: 5,
        availability_schedule: {
          monday:    { available: true,  hours: '09:00-17:00' },
          tuesday:   { available: true,  hours: '09:00-17:00' },
          wednesday: { available: true,  hours: '09:00-17:00' },
          thursday:  { available: true,  hours: '09:00-17:00' },
          friday:    { available: true,  hours: '09:00-17:00' },
          saturday:  { available: false, hours: 'all_day' },
          sunday:    { available: false, hours: 'all_day' },
        },
      };
      const { data: inserted, error: insertError } = await supabase
        .from('user_availability')
        .insert(defaults)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      return inserted as UserAvailability;
    }

    if (error) throw new Error(error.message);
    return data as UserAvailability;
  }

  /**
   * Upsert the user's availability row.
   */
  async updateAvailability(updates: Partial<UserAvailability>): Promise<UserAvailability> {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('user_availability')
      .upsert({ ...updates, user_id: userId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as UserAvailability;
  }

  /**
   * Push current GPS coordinates to the availability row.
   */
  async updateLocation(lat: number, lng: number): Promise<void> {
    try {
      const userId = await getUserId();
      await supabase
        .from('user_availability')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('user_id', userId);

      this.lastLocationUpdateAt = Date.now();
      console.log('📍 Availability location updated:', lat, lng);
    } catch (error) {
      console.warn('⚠️ Failed to update availability location:', error);
    }
  }

  // ===== GPS LOCATION =====

  async updateCurrentGPSLocation(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastLocationUpdateAt < LOCATION_UPDATE_INTERVAL_MS) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await this.updateLocation(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.warn('⚠️ Could not get GPS location for availability:', error);
    }
  }

  /**
   * Geocode a text area name to lat/lng using Google Places Geocoding API.
   */
  async geocodeArea(areaText: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ EXPO_PUBLIC_GOOGLE_PLACES_API_KEY not set — cannot geocode area');
        return null;
      }
      const encoded = encodeURIComponent(areaText);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Geocoding error:', error);
      return null;
    }
  }

  // ===== LOCATION TRACKING =====

  startLocationTracking(): void {
    if (this.trackingActive) return;
    this.trackingActive = true;
    this.updateCurrentGPSLocation(true);
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    console.log('✅ Availability location tracking started');
  }

  stopLocationTracking(): void {
    if (!this.trackingActive) return;
    this.trackingActive = false;
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    console.log('✅ Availability location tracking stopped');
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && this.trackingActive) {
      this.updateCurrentGPSLocation();
    }
  };

  get isTracking(): boolean {
    return this.trackingActive;
  }
}

export const availabilityService = new AvailabilityService();
