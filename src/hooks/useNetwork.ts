import { useState, useEffect, useCallback } from 'react';
import {
  Connection,
  ConnectionRequest,
  ConnectionSuggestion,
} from '../types/network.types';
import { networkService } from '../services/api/networkService';
import { realtimeService } from '../services/realtime/realtimeService';
import { useAuth } from '../contexts/AuthContext';
import { mockConnections, mockConnectionRequests, mockConnectionSuggestions } from '../utils/mockNetworkData';

export const useNetwork = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load connections
  const loadConnections = useCallback(async () => {
    if (!user || !session) return;
    try {
      const { connections: data } = await networkService.getConnections(1, 50);
      setConnections(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock connections.');
        setConnections(mockConnections);
        setError(null); // Don't show error for missing endpoint
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
        console.error('Failed to load connections:', err);
      }
    }
  }, [user, session]);

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!user || !session) return;
    try {
      const { suggestions: data } = await networkService.getSuggestions(1, 10);
      setSuggestions(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock suggestions.');
        setSuggestions(mockConnectionSuggestions);
      } else {
        console.error('Failed to load suggestions:', err);
      }
    }
  }, [user, session]);

  // Load pending requests
  const loadRequests = useCallback(async () => {
    if (!user || !session) return;
    try {
      const { requests: data } = await networkService.getPendingRequests(1, 20);
      setRequests(data);
    } catch (err: any) {
      if (err?.status === 404) {
        console.warn('Network API endpoint not available (404). Showing mock requests.');
        setRequests(mockConnectionRequests);
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

  // Initial load - wait for auth to be ready
  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to finish loading
    }

    if (!user || !session) {
      setLoading(false);
      setConnections([]);
      setSuggestions([]);
      setRequests([]);
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadConnections(),
        loadSuggestions(),
        loadRequests(),
      ]);
      setLoading(false);
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
      await Promise.all([
        loadConnections(),
        loadSuggestions(),
        loadRequests(),
      ]);
    },
  };
};

