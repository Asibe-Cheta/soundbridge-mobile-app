import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export type UserPreferences = {
  preferred_event_distance?: number;
  preferred_genres?: string[];
  preferred_city?: string;
  preferred_country?: string;
  preferred_locations?: string[];
};

type PreferencesResponse = {
  success: boolean;
  preferences?: UserPreferences;
  message?: string;
};

/**
 * Get user preferences from the API
 * Uses Bearer token authentication only (per web team specification)
 * 
 * @param userId - The user ID to get preferences for
 * @param session - Supabase session containing access token
 * @returns User preferences or null if failed
 */
export async function getUserPreferences(userId: string, session: Session | null): Promise<UserPreferences | null> {
  if (!userId || !session?.access_token) {
    console.warn('UserPreferencesService: Missing userId or session');
    return null;
  }

  try {
    // Use Bearer token authentication only (endpoint now supports Bearer tokens)
    // Per web team: endpoints updated to use getSupabaseRouteClient() which supports Bearer tokens
    const data = await apiFetch<PreferencesResponse>(`/api/users/${userId}/preferences`, {
      method: 'GET',
      session,
    });

    if (!data.success) {
      console.warn('UserPreferencesService: Response indicates failure', data);
      return null;
    }

    const prefs = data.preferences || {};

    return {
      ...prefs,
      preferred_genres: normalizeArray(prefs.preferred_genres),
      preferred_locations: normalizeArray(prefs.preferred_locations),
    };
  } catch (error: any) {
    console.warn('UserPreferencesService: failed to load preferences', {
      error: error?.message,
      status: error?.status,
      userId,
      hasSession: !!session,
      hasToken: !!session?.access_token,
    });
    
    // Handle 401 - token expired or invalid
    if (error?.status === 401) {
      console.warn('UserPreferencesService: Authentication failed - token may be expired');
    }
    
    // Handle 403 - user trying to access another user's preferences
    if (error?.status === 403) {
      console.warn('UserPreferencesService: Forbidden - cannot access other user\'s preferences');
    }
    
    return null;
  }
}

function normalizeArray(value?: string[] | string | null): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return [value];
  return undefined;
}



