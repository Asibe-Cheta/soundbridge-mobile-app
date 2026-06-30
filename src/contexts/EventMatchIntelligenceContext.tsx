import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { eventMatchIntelligenceService } from '../services/EventMatchIntelligenceService';
import type { EventMatchScore } from '../types/eventMatch.types';

interface EventMatchIntelligenceContextValue {
  matches: EventMatchScore[];
  matchByEventId: Map<string, EventMatchScore>;
  hasUnseenIndicator: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllViewed: () => Promise<void>;
}

const EventMatchIntelligenceContext = createContext<EventMatchIntelligenceContextValue | null>(null);

export function EventMatchIntelligenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<EventMatchScore[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setMatches([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await eventMatchIntelligenceService.fetchHighConfidenceMatches(user.id);
      setMatches(rows);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const matchByEventId = useMemo(
    () => eventMatchIntelligenceService.buildEventIdMap(matches),
    [matches],
  );

  const hasUnseenIndicator = useMemo(
    () => eventMatchIntelligenceService.hasUnseenIndicator(matches),
    [matches],
  );

  const markAllViewed = useCallback(async () => {
    if (!user?.id || !matches.length) return;
    const ids = matches.filter(m => !m.indicator_shown).map(m => m.id);
    await eventMatchIntelligenceService.markMatchesViewed(user.id, ids);
    setMatches(prev =>
      prev.map(m => (ids.includes(m.id) ? { ...m, indicator_shown: true } : m)),
    );
  }, [user?.id, matches]);

  const value = useMemo(
    () => ({
      matches,
      matchByEventId,
      hasUnseenIndicator,
      loading,
      refresh,
      markAllViewed,
    }),
    [matches, matchByEventId, hasUnseenIndicator, loading, refresh, markAllViewed],
  );

  return (
    <EventMatchIntelligenceContext.Provider value={value}>
      {children}
    </EventMatchIntelligenceContext.Provider>
  );
}

export function useEventMatchIntelligence(): EventMatchIntelligenceContextValue {
  const ctx = useContext(EventMatchIntelligenceContext);
  if (!ctx) {
    throw new Error('useEventMatchIntelligence must be used within EventMatchIntelligenceProvider');
  }
  return ctx;
}
