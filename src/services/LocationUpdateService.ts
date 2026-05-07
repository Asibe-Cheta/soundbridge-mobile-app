/**
 * LocationUpdateService
 * Handles sending location updates to the backend for event notification matching.
 *
 * Features:
 * - Throttling (15 min / 500m)
 * - Multiple trigger sources (onboarding, foreground, background, manual, significant_change)
 * - Retry on failure
 * - Privacy-aware (respects permissions and approximate location)
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { AppState, AppStateStatus } from 'react-native';

// Storage keys
const LAST_LOCATION_KEY = 'location_update_service_last_location';
const LAST_UPDATE_KEY = 'location_update_service_last_update';
const PENDING_UPDATE_KEY = 'location_update_service_pending_update';

// Throttling constants
const MIN_UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MIN_DISTANCE_METERS = 500; // 500 meters

export type LocationSource =
  | 'onboarding'
  | 'foreground'
  | 'background'
  | 'manual'
  | 'significant_change';

interface LocationPayload {
  latitude: number;
  longitude: number;
  locationState: string;
  locationCountry: string;
  source: LocationSource;
}

interface StoredLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

class LocationUpdateService {
  private static instance: LocationUpdateService;
  private isInitialized = false;
  private appStateSubscription: any = null;
  private lastKnownLocation: StoredLocation | null = null;
  private lastUpdateTimestamp: number = 0;

  private constructor() {}

  public static getInstance(): LocationUpdateService {
    if (!LocationUpdateService.instance) {
      LocationUpdateService.instance = new LocationUpdateService();
    }
    return LocationUpdateService.instance;
  }

  /**
   * Initialize the location update service.
   * Sets up app state listeners for foreground updates.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load last known location and update timestamp
      await this.loadStoredData();

      // Set up app state listener for foreground updates
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange
      );

      // Check for pending updates that failed
      await this.retryPendingUpdate();

      this.isInitialized = true;
      console.log('📍 LocationUpdateService initialized');
    } catch (error) {
      console.error('❌ Error initializing LocationUpdateService:', error);
    }
  }

  /**
   * Handle app state changes to trigger foreground location updates.
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('📱 App came to foreground - checking location update');
      await this.updateLocationIfNeeded('foreground');
    }
  };

  /**
   * Load stored location data from AsyncStorage.
   */
  private async loadStoredData(): Promise<void> {
    try {
      const [locationStr, timestampStr] = await Promise.all([
        AsyncStorage.getItem(LAST_LOCATION_KEY),
        AsyncStorage.getItem(LAST_UPDATE_KEY),
      ]);

      if (locationStr) {
        this.lastKnownLocation = JSON.parse(locationStr);
      }
      if (timestampStr) {
        this.lastUpdateTimestamp = parseInt(timestampStr, 10);
      }
    } catch (error) {
      console.error('❌ Error loading stored location data:', error);
    }
  }

  /**
   * Save location data to AsyncStorage.
   */
  private async saveLocationData(location: StoredLocation): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location)),
        AsyncStorage.setItem(LAST_UPDATE_KEY, Date.now().toString()),
      ]);
      this.lastKnownLocation = location;
      this.lastUpdateTimestamp = Date.now();
    } catch (error) {
      console.error('❌ Error saving location data:', error);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula.
   * Returns distance in meters.
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if location update should be sent based on throttling rules.
   */
  private shouldSendUpdate(
    newLat: number,
    newLon: number,
    source: LocationSource
  ): boolean {
    // Always send for onboarding or manual updates
    if (source === 'onboarding' || source === 'manual') {
      return true;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTimestamp;

    // Check time threshold (15 minutes)
    if (timeSinceLastUpdate > MIN_UPDATE_INTERVAL_MS) {
      console.log('📍 Location update needed: time threshold exceeded');
      return true;
    }

    // Check distance threshold (500 meters)
    if (this.lastKnownLocation) {
      const distance = this.calculateDistance(
        this.lastKnownLocation.latitude,
        this.lastKnownLocation.longitude,
        newLat,
        newLon
      );
      if (distance > MIN_DISTANCE_METERS) {
        console.log(`📍 Location update needed: moved ${distance.toFixed(0)}m`);
        return true;
      }
    } else {
      // No previous location, should send
      return true;
    }

    console.log('📍 Location update skipped: within throttle limits');
    return false;
  }

  /**
   * Get current location with geocoding.
   */
  private async getCurrentLocationWithGeocoding(): Promise<LocationPayload | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('📍 Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Geocode to get state and country
      let locationState = 'Unknown';
      let locationCountry = 'Unknown';

      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (geocoded.length > 0) {
          const place = geocoded[0];
          locationState = place.region || place.subregion || place.city || 'Unknown';
          locationCountry = place.country || 'Unknown';
        }
      } catch (geoError) {
        console.warn('⚠️ Geocoding failed:', geoError);
      }

      return {
        latitude,
        longitude,
        locationState,
        locationCountry,
        source: 'foreground', // Will be overwritten by caller
      };
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      return null;
    }
  }

  /**
   * Send location update to backend.
   */
  private async sendLocationToBackend(payload: LocationPayload): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('⚠️ No session for location update');
        return false;
      }

      console.log('📤 Sending location update:', {
        lat: payload.latitude.toFixed(4),
        lon: payload.longitude.toFixed(4),
        state: payload.locationState,
        country: payload.locationCountry,
        source: payload.source,
      });

      const response = await fetch(`${config.apiUrl}/user/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // 404 means the endpoint doesn't exist yet — don't queue retries
        if (response.status === 404) {
          console.warn('⚠️ Location endpoint not implemented on server (404) — skipping');
          return false;
        }
        console.warn('⚠️ Location update failed:', response.status, errorText.substring(0, 100));
        // Store as pending for retry only on transient errors
        await AsyncStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(payload));
        return false;
      }

      const result = await response.json();
      console.log('✅ Location updated on backend:', result);

      // Save successful location
      await this.saveLocationData({
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: Date.now(),
      });

      // Clear any pending update
      await AsyncStorage.removeItem(PENDING_UPDATE_KEY);

      return true;
    } catch (error) {
      console.error('❌ Error sending location to backend:', error);

      // Store as pending for retry
      await AsyncStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(payload));
      return false;
    }
  }

  /**
   * Retry pending location update (called on app foreground).
   */
  private async retryPendingUpdate(): Promise<void> {
    try {
      const pendingStr = await AsyncStorage.getItem(PENDING_UPDATE_KEY);
      if (!pendingStr) return;

      const pending: LocationPayload = JSON.parse(pendingStr);
      console.log('📍 Retrying pending location update...');

      await this.sendLocationToBackend(pending);
    } catch (error) {
      console.error('❌ Error retrying pending update:', error);
    }
  }

  /**
   * Update location if needed based on throttling rules.
   * Call this from app lifecycle events.
   */
  public async updateLocationIfNeeded(source: LocationSource): Promise<boolean> {
    try {
      const locationData = await this.getCurrentLocationWithGeocoding();
      if (!locationData) {
        return false;
      }

      // Check if update should be sent
      if (!this.shouldSendUpdate(locationData.latitude, locationData.longitude, source)) {
        return false;
      }

      // Send update
      locationData.source = source;
      return await this.sendLocationToBackend(locationData);
    } catch (error) {
      console.error('❌ Error in updateLocationIfNeeded:', error);
      return false;
    }
  }

  /**
   * Force send location update (bypasses throttling).
   * Use for onboarding and manual city selection.
   */
  public async forceLocationUpdate(source: LocationSource): Promise<boolean> {
    try {
      const locationData = await this.getCurrentLocationWithGeocoding();
      if (!locationData) {
        return false;
      }

      locationData.source = source;
      return await this.sendLocationToBackend(locationData);
    } catch (error) {
      console.error('❌ Error in forceLocationUpdate:', error);
      return false;
    }
  }

  /**
   * Send manual location (when user selects city without GPS).
   * Use when location permission is denied or user prefers manual entry.
   */
  public async sendManualLocation(
    city: string,
    state: string,
    country: string,
    latitude?: number,
    longitude?: number
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('⚠️ No session for manual location update');
        return false;
      }

      const payload: any = {
        locationState: state || city,
        locationCountry: country,
        source: 'manual',
      };

      // Include coordinates if provided
      if (latitude !== undefined && longitude !== undefined) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }

      console.log('📤 Sending manual location:', payload);

      const response = await fetch(`${config.apiUrl}/user/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ Location endpoint not implemented on server (404) — skipping');
          return false;
        }
        const errorText = await response.text();
        console.warn('⚠️ Manual location update failed:', response.status, errorText.substring(0, 100));
        return false;
      }

      const result = await response.json();
      console.log('✅ Manual location updated:', result);

      // Save if we have coordinates
      if (latitude !== undefined && longitude !== undefined) {
        await this.saveLocationData({
          latitude,
          longitude,
          timestamp: Date.now(),
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending manual location:', error);
      return false;
    }
  }

  /**
   * Called when location permission is granted (e.g., after onboarding).
   */
  public async onLocationPermissionGranted(): Promise<void> {
    console.log('📍 Location permission granted - sending initial update');
    await this.forceLocationUpdate('onboarding');
  }

  /**
   * Clean up listeners when service is no longer needed.
   */
  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
    console.log('📍 LocationUpdateService cleaned up');
  }

  /**
   * Get the last known location (if any).
   */
  public getLastKnownLocation(): StoredLocation | null {
    return this.lastKnownLocation;
  }

  /**
   * Check if location updates are being sent properly.
   * Returns backend verification data.
   */
  public async verifyLocationOnBackend(): Promise<{
    latitude: number | null;
    longitude: number | null;
    locationUpdatedAt: string | null;
  } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await fetch(`${config.apiUrl}/user/location/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('❌ Error verifying location:', error);
      return null;
    }
  }
}

export const locationUpdateService = LocationUpdateService.getInstance();
export default locationUpdateService;
