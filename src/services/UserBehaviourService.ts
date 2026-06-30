import { supabase } from '../lib/supabase';

/**
 * UserBehaviourService
 *
 * Handles the two mobile-side signals that cannot be captured by DB triggers:
 *   1. App open  → updates most_active_day / most_active_hour
 *   2. Event view → increments events_viewed, updates preferred_event_cities
 *
 * All other signals (plays, tips, bookmarks, ticket purchases, follows,
 * live interest, request-room tips) are captured automatically by
 * Postgres triggers defined in the DB migration.
 *
 * Every call is fire-and-forget. Errors are logged but never thrown —
 * behaviour tracking must never block or crash the main UX.
 */

const TAG = '🧠 UBP';

class UserBehaviourService {
  /**
   * Called every time the app comes to foreground (AppState → 'active').
   * Updates most_active_day and most_active_hour in user_behaviour_profiles
   * by recording the open in app_session_log and recomputing the mode.
   */
  async recordAppOpen(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const { error } = await supabase.rpc('record_app_open', { p_user_id: userId });
      if (error) console.warn(`${TAG} record_app_open error:`, error.message);
    } catch (e) {
      console.warn(`${TAG} record_app_open exception:`, e);
    }
  }

  /**
   * Called when EventDetailsScreen mounts with a valid event.
   * Increments events_viewed and appends the city to preferred_event_cities.
   */
  async recordEventView(userId: string, eventId: string, city: string | null): Promise<void> {
    if (!userId || !eventId) return;
    try {
      const { error } = await supabase.rpc('record_event_view', {
        p_user_id: userId,
        p_event_id: eventId,
        p_city: city ?? null,
      });
      if (error) console.warn(`${TAG} record_event_view error:`, error.message);
    } catch (e) {
      console.warn(`${TAG} record_event_view exception:`, e);
    }
  }

  /**
   * Called when the user's city is known (profile load or location update).
   * Keeps primary_location_city in sync.
   */
  async updatePrimaryCity(userId: string, city: string): Promise<void> {
    if (!userId || !city) return;
    try {
      const { error } = await supabase
        .from('user_behaviour_profiles')
        .upsert({ user_id: userId, primary_location_city: city, last_updated: new Date().toISOString() }, {
          onConflict: 'user_id',
        });
      if (error) console.warn(`${TAG} updatePrimaryCity error:`, error.message);
    } catch (e) {
      console.warn(`${TAG} updatePrimaryCity exception:`, e);
    }
  }
}

export const userBehaviourService = new UserBehaviourService();
