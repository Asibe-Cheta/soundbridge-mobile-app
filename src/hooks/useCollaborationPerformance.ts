// src/hooks/useCollaborationPerformance.ts
// Performance optimization hook for collaboration features

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import type { 
  CreatorAvailability, 
  CollaborationRequest, 
  BookingStatus,
  CollaborationFilters 
} from '../types/collaboration';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  totalRequests: number;
  cachedRequests: number;
}

const CACHE_DURATION = {
  AVAILABILITY: 5 * 60 * 1000, // 5 minutes
  REQUESTS: 2 * 60 * 1000,     // 2 minutes
  BOOKING_STATUS: 3 * 60 * 1000, // 3 minutes
  SEARCH_RESULTS: 1 * 60 * 1000, // 1 minute
};

const CACHE_KEYS = {
  AVAILABILITY: 'collab_availability_',
  REQUESTS: 'collab_requests_',
  BOOKING_STATUS: 'collab_booking_',
  SEARCH: 'collab_search_',
};

export function useCollaborationPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    averageLoadTime: 0,
    totalRequests: 0,
    cachedRequests: 0,
  });

  const requestTimers = useRef<Map<string, number>>(new Map());
  const searchCache = useRef<Map<string, CacheEntry<any>>>(new Map());

  // ===== CACHE MANAGEMENT =====

  const getCacheKey = useCallback((type: keyof typeof CACHE_KEYS, identifier: string): string => {
    return `${CACHE_KEYS[type]}${identifier}`;
  }, []);

  const isExpired = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() > entry.expiresAt;
  }, []);

  const setCache = useCallback(async <T>(
    type: keyof typeof CACHE_KEYS,
    identifier: string,
    data: T,
    customDuration?: number
  ): Promise<void> => {
    try {
      const duration = customDuration || CACHE_DURATION[type];
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      };

      const key = getCacheKey(type, identifier);
      
      // Store in memory cache for quick access
      if (type === 'SEARCH') {
        searchCache.current.set(key, entry);
      }
      
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('❌ Error setting cache:', error);
    }
  }, [getCacheKey]);

  const getCache = useCallback(async <T>(
    type: keyof typeof CACHE_KEYS,
    identifier: string
  ): Promise<T | null> => {
    try {
      const key = getCacheKey(type, identifier);
      
      // Check memory cache first for search results
      if (type === 'SEARCH' && searchCache.current.has(key)) {
        const entry = searchCache.current.get(key)!;
        if (!isExpired(entry)) {
          return entry.data as T;
        } else {
          searchCache.current.delete(key);
        }
      }

      // Check AsyncStorage
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      if (isExpired(entry)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('❌ Error getting cache:', error);
      return null;
    }
  }, [getCacheKey, isExpired]);

  const invalidateCache = useCallback(async (
    type: keyof typeof CACHE_KEYS,
    identifier?: string
  ): Promise<void> => {
    try {
      if (identifier) {
        // Invalidate specific cache entry
        const key = getCacheKey(type, identifier);
        await AsyncStorage.removeItem(key);
        
        if (type === 'SEARCH') {
          searchCache.current.delete(key);
        }
      } else {
        // Invalidate all entries of this type
        const keys = await AsyncStorage.getAllKeys();
        const keysToRemove = keys.filter(key => key.startsWith(CACHE_KEYS[type]));
        await AsyncStorage.multiRemove(keysToRemove);
        
        if (type === 'SEARCH') {
          searchCache.current.clear();
        }
      }
    } catch (error) {
      console.error('❌ Error invalidating cache:', error);
    }
  }, [getCacheKey]);

  // ===== PERFORMANCE TRACKING =====

  const startTimer = useCallback((requestId: string): void => {
    requestTimers.current.set(requestId, Date.now());
  }, []);

  const endTimer = useCallback((requestId: string, fromCache = false): void => {
    const startTime = requestTimers.current.get(requestId);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    requestTimers.current.delete(requestId);

    setMetrics(prev => {
      const newTotalRequests = prev.totalRequests + 1;
      const newCachedRequests = fromCache ? prev.cachedRequests + 1 : prev.cachedRequests;
      const newAverageLoadTime = (prev.averageLoadTime * prev.totalRequests + duration) / newTotalRequests;
      const newCacheHitRate = (newCachedRequests / newTotalRequests) * 100;

      return {
        totalRequests: newTotalRequests,
        cachedRequests: newCachedRequests,
        averageLoadTime: newAverageLoadTime,
        cacheHitRate: newCacheHitRate,
      };
    });
  }, []);

  // ===== OPTIMIZED DATA FETCHERS =====

  const getCachedAvailability = useCallback(async (
    creatorId: string,
    fetchFn: () => Promise<CreatorAvailability[]>
  ): Promise<CreatorAvailability[]> => {
    const requestId = `availability_${creatorId}`;
    startTimer(requestId);

    try {
      // Try cache first
      const cached = await getCache<CreatorAvailability[]>('AVAILABILITY', creatorId);
      if (cached) {
        endTimer(requestId, true);
        return cached;
      }

      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result
      await setCache('AVAILABILITY', creatorId, data);
      
      endTimer(requestId, false);
      return data;
    } catch (error) {
      endTimer(requestId, false);
      throw error;
    }
  }, [getCache, setCache, startTimer, endTimer]);

  const getCachedRequests = useCallback(async (
    filters: CollaborationFilters,
    fetchFn: () => Promise<CollaborationRequest[]>
  ): Promise<CollaborationRequest[]> => {
    const cacheKey = JSON.stringify(filters);
    const requestId = `requests_${cacheKey}`;
    startTimer(requestId);

    try {
      // Try cache first
      const cached = await getCache<CollaborationRequest[]>('REQUESTS', cacheKey);
      if (cached) {
        endTimer(requestId, true);
        return cached;
      }

      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result
      await setCache('REQUESTS', cacheKey, data);
      
      endTimer(requestId, false);
      return data;
    } catch (error) {
      endTimer(requestId, false);
      throw error;
    }
  }, [getCache, setCache, startTimer, endTimer]);

  const getCachedBookingStatus = useCallback(async (
    creatorId: string,
    fetchFn: () => Promise<BookingStatus | null>
  ): Promise<BookingStatus | null> => {
    const requestId = `booking_${creatorId}`;
    startTimer(requestId);

    try {
      // Try cache first
      const cached = await getCache<BookingStatus>('BOOKING_STATUS', creatorId);
      if (cached) {
        endTimer(requestId, true);
        return cached;
      }

      // Fetch fresh data
      const data = await fetchFn();
      if (!data) {
        endTimer(requestId, false);
        return null;
      }
      
      // Cache the result
      await setCache('BOOKING_STATUS', creatorId, data);
      
      endTimer(requestId, false);
      return data;
    } catch (error) {
      endTimer(requestId, false);
      throw error;
    }
  }, [getCache, setCache, startTimer, endTimer]);

  // ===== DEBOUNCED SEARCH =====

  const debouncedSearch = useMemo(
    () => debounce(async (
      query: string,
      searchFn: (query: string) => Promise<any[]>,
      callback: (results: any[]) => void
    ) => {
      if (!query.trim()) {
        callback([]);
        return;
      }

      const requestId = `search_${query}`;
      startTimer(requestId);

      try {
        // Try cache first
        const cached = await getCache<any[]>('SEARCH', query);
        if (cached) {
          endTimer(requestId, true);
          callback(cached);
          return;
        }

        // Perform search
        const results = await searchFn(query);
        
        // Cache results
        await setCache('SEARCH', query, results);
        
        endTimer(requestId, false);
        callback(results);
      } catch (error) {
        endTimer(requestId, false);
        console.error('❌ Search error:', error);
        callback([]);
      }
    }, 300),
    [getCache, setCache, startTimer, endTimer]
  );

  // ===== BATCH OPERATIONS =====

  const batchInvalidateCache = useCallback(async (operations: Array<{
    type: keyof typeof CACHE_KEYS;
    identifier?: string;
  }>): Promise<void> => {
    try {
      await Promise.all(
        operations.map(op => invalidateCache(op.type, op.identifier))
      );
    } catch (error) {
      console.error('❌ Error in batch cache invalidation:', error);
    }
  }, [invalidateCache]);

  // ===== CLEANUP =====

  const clearExpiredCache = useCallback(async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const collaborationKeys = keys.filter(key => 
        Object.values(CACHE_KEYS).some(prefix => key.startsWith(prefix))
      );

      const expiredKeys: string[] = [];
      
      for (const key of collaborationKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<any> = JSON.parse(stored);
            if (isExpired(entry)) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // If we can't parse it, it's probably corrupted, so remove it
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
      }

      // Clear expired memory cache
      for (const [key, entry] of searchCache.current.entries()) {
        if (isExpired(entry)) {
          searchCache.current.delete(key);
        }
      }
    } catch (error) {
      console.error('❌ Error clearing expired cache:', error);
    }
  }, [isExpired]);

  // ===== EFFECTS =====

  useEffect(() => {
    // Clear expired cache on mount
    clearExpiredCache();

    // Set up periodic cleanup
    const cleanupInterval = setInterval(clearExpiredCache, 10 * 60 * 1000); // Every 10 minutes

    return () => {
      clearInterval(cleanupInterval);
      debouncedSearch.cancel();
    };
  }, [clearExpiredCache, debouncedSearch]);

  // ===== RETURN VALUES =====

  return {
    // Cache operations
    getCachedAvailability,
    getCachedRequests,
    getCachedBookingStatus,
    invalidateCache,
    batchInvalidateCache,
    
    // Search
    debouncedSearch,
    
    // Performance metrics
    metrics,
    
    // Cleanup
    clearExpiredCache,
  };
}
