import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Connection,
  ConnectionRequest,
  ConnectionSuggestion,
} from '../types/network.types';
import { networkService } from '../services/api/networkService';
import { realtimeService } from '../services/realtime/realtimeService';
import { useAuth } from '../contexts/AuthContext';
import { mockConnections, mockConnectionRequests, mockConnectionSuggestions } from '../utils/mockNetworkData';
import { networkCacheService } from '../services/networkCacheService';

export const useNetwork = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false); // Start false - show cached data immediately
  const [error, setError] = useState<string | null>(null);
  const initialLoadRef = useRef(false);
  const backgroundRefreshRef = useRef(false);

  // Load connections with caching
  const loadConnections = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return;

    // Try cache first unless force refresh
    if (!forceRefresh && !backgroundRefreshRef.current) {
      const cached = await networkCacheService.getCachedConnections();
      if (cached && cached.length > 0) {
        setConnections(cached);
        return;
      }
    }

    try {
      const { connections: data } = await networkService.getConnections(1, 50);
      setConnections(data);
      await networkCacheService.saveConnections(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock connections.');
        setConnections(mockConnections);
        await networkCacheService.saveConnections(mockConnections);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
        console.error('Failed to load connections:', err);
      }
    }
  }, [user, session]);

  // Load suggestions with caching
  const loadSuggestions = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return;

    // Try cache first unless force refresh
    if (!forceRefresh && !backgroundRefreshRef.current) {
      const cached = await networkCacheService.getCachedSuggestions();
      if (cached && cached.length > 0) {
        setSuggestions(cached);
        return;
      }
    }

    try {
      const { suggestions: data } = await networkService.getSuggestions(1, 10);
      setSuggestions(data);
      await networkCacheService.saveSuggestions(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock suggestions.');
        setSuggestions(mockConnectionSuggestions);
        await networkCacheService.saveSuggestions(mockConnectionSuggestions);
      } else {
        console.error('Failed to load suggestions:', err);
      }
    }
  }, [user, session]);

  // Load pending requests with caching
  const loadRequests = useCallback(async (forceRefresh = false) => {
    if (!user || !session) return;

    // Try cache first unless force refresh
    if (!forceRefresh && !backgroundRefreshRef.current) {
      const cached = await networkCacheService.getCachedRequests();
      if (cached && cached.length > 0) {
        setRequests(cached);
        return;
      }
    }

    try {
      const { requests: data } = await networkService.getPendingRequests(1, 20);
      setRequests(data);
      await networkCacheService.saveRequests(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock requests.');
        setRequests(mockConnectionRequests);
        await networkCacheService.saveRequests(mockConnectionRequests);
      } else {
        console.error('Failed to load requests:', err);
      }
    }
  }, [user, session]);

  // Send connection request
  const sendRequest = useCallback(
    async (userId: string, message?: string) => {
      try {
        await networkService.sendConnectionRequest(userId, message);
        // Remove from suggestions
        setSuggestions((prev) => prev.filter((s) => s.id !== userId));
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Accept request
  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      await networkService.acceptConnectionRequest(requestId);
      // Remove from requests
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Reload connections
      await loadConnections();
    } catch (err) {
      throw err;
    }
  }, [loadConnections]);

  // Decline request
  const declineRequest = useCallback(async (requestId: string) => {
    try {
      await networkService.declineConnectionRequest(requestId);
      // Remove from requests
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      throw err;
    }
  }, []);

  // Dismiss suggestion
  const dismissSuggestion = useCallback(async (userId: string) => {
    try {
      await networkService.dismissSuggestion(userId);
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
    } catch (err) {
      throw err;
    }
  }, []);

  // Subscribe to real-time connection requests
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = realtimeService.subscribeToConnectionRequests(
      user.id,
      (newRequest) => {
        setRequests((prev) => [newRequest, ...prev]);
      }
    );

    return unsubscribe;
  }, [user?.id]);

  // Initial load with instant cache display
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !session) {
      setLoading(false);
      setConnections([]);
      setSuggestions([]);
      setRequests([]);
      return;
    }

    const loadAll = async () => {
      // First load: Try cache immediately
      if (!initialLoadRef.current) {
        console.log('⚡ Loading network data from cache...');
        await Promise.all([
          loadConnections(false),
          loadSuggestions(false),
          loadRequests(false),
        ]);

        initialLoadRef.current = true;

        // Background refresh for fresh data
        backgroundRefreshRef.current = true;
        setTimeout(async () => {
          await Promise.all([
            loadConnections(true),
            loadSuggestions(true),
            loadRequests(true),
          ]);
          backgroundRefreshRef.current = false;
        }, 100);
      } else {
        // Subsequent loads: fetch fresh data
        setLoading(true);
        setError(null);
        await Promise.all([
          loadConnections(true),
          loadSuggestions(true),
          loadRequests(true),
        ]);
        setLoading(false);
      }
    };

    loadAll();
  }, [authLoading, user, session, loadConnections, loadSuggestions, loadRequests]);

  return {
    connections,
    suggestions,
    requests,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    dismissSuggestion,
    refresh: async () => {
      setLoading(true);
      await Promise.all([
        loadConnections(true),
        loadSuggestions(true),
        loadRequests(true),
      ]);
      setLoading(false);
    },
  };
};

