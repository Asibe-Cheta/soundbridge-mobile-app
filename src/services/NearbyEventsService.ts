import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export interface NearbyEvent {
  event_id: string;
  title: string;
  event_date: string;
  location: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  ticket_price: number | null;
  tickets_available: number | null;
  image_url: string | null;
  distance_km: number | null;
}

export interface NearbyEventsResult {
  events: NearbyEvent[];
  needsLocationPrompt: boolean;
  debug: string;
}

class NearbyEventsService {
  async getNearbyEvents(userId: string, limit = 2): Promise<NearbyEventsResult> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('city, location, latitude, longitude')
        .eq('id', userId)
        .single();

      if (profileError) {
        return { events: [], needsLocationPrompt: false, debug: `profile select failed: ${profileError.message}` };
      }

      const hasProfileLocation = !!(profile?.city || profile?.location || (profile?.latitude && profile?.longitude));

      let overrideLat: number | null = null;
      let overrideLng: number | null = null;

      if (!hasProfileLocation) {
        // Never prompt for permission from here — only use it if the user
        // already granted it somewhere else in the app.
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            overrideLat = position.coords.latitude;
            overrideLng = position.coords.longitude;
          } catch {
            // Fall through — treated the same as no device location below.
          }
        }
      }

      if (!hasProfileLocation && overrideLat === null) {
        return { events: [], needsLocationPrompt: true, debug: 'no profile location and no device location' };
      }

      const { data, error } = await supabase.rpc('get_nearby_events_for_user', {
        p_user_id: userId,
        p_limit: limit,
        p_override_lat: overrideLat,
        p_override_lng: overrideLng,
      });

      if (error) {
        console.warn('[NearbyEvents] get_nearby_events_for_user failed:', error.message);
        return { events: [], needsLocationPrompt: false, debug: `rpc error: ${error.message} (code ${error.code ?? 'n/a'})` };
      }

      const events = (data ?? []) as NearbyEvent[];
      return { events, needsLocationPrompt: false, debug: `rpc ok, ${events.length} row(s)` };
    } catch (err: any) {
      console.warn('[NearbyEvents] getNearbyEvents error:', err);
      return { events: [], needsLocationPrompt: false, debug: `thrown: ${err?.message ?? String(err)}` };
    }
  }

  async recordShown(userId: string, eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_feed_impressions')
        .insert({ user_id: userId, event_id: eventId });
      if (error) {
        console.warn('[NearbyEvents] recordShown failed:', error.message);
      }
    } catch (err) {
      console.warn('[NearbyEvents] recordShown error:', err);
    }
  }

  async recordTap(userId: string, eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_feed_impressions')
        .update({ tapped_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .is('tapped_at', null);
      if (error) {
        console.warn('[NearbyEvents] recordTap failed:', error.message);
      }
    } catch (err) {
      console.warn('[NearbyEvents] recordTap error:', err);
    }
  }

  async recordDismiss(userId: string, eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_feed_impressions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .is('dismissed_at', null);
      if (error) {
        console.warn('[NearbyEvents] recordDismiss failed:', error.message);
      }
    } catch (err) {
      console.warn('[NearbyEvents] recordDismiss error:', err);
    }
  }
}

export const nearbyEventsService = new NearbyEventsService();
