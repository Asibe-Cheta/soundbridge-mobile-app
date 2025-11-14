import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPreferences, UserPreferences } from '../services/UserPreferencesService';

export function useUserPreferences() {
  const { user, session } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!user?.id || !session?.access_token) {
      setPreferences(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const prefs = await getUserPreferences(user.id, session);
      setPreferences(prefs);
    } catch (err) {
      console.warn('useUserPreferences: error loading preferences', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [session, user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    refresh: loadPreferences,
  };
}



