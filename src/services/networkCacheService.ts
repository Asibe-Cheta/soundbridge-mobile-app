import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Connection,
  ConnectionRequest,
  ConnectionSuggestion,
} from '../types/network.types';

const CACHE_KEYS = {
  CONNECTIONS: 'network_connections_cache',
  SUGGESTIONS: 'network_suggestions_cache',
  REQUESTS: 'network_requests_cache',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheData<T> {
  data: T;
  timestamp: number;
}

class NetworkCacheService {
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed: CacheData<T> = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      if (age < CACHE_DURATION) {
        console.log(`⚡ Using cached ${key} (${Math.round(age / 1000)}s old)`);
        return parsed.data;
      }

      // Cache expired
      await AsyncStorage.removeItem(key);
      return null;
    } catch (error) {
      console.warn(`Failed to get cached ${key}:`, error);
      return null;
    }
  }

  private async saveCache<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Cached ${key}`);
    } catch (error) {
      console.warn(`Failed to save cache ${key}:`, error);
    }
  }

  // Connections
  async getCachedConnections(): Promise<Connection[] | null> {
    return this.getCached<Connection[]>(CACHE_KEYS.CONNECTIONS);
  }

  async saveConnections(connections: Connection[]): Promise<void> {
    return this.saveCache(CACHE_KEYS.CONNECTIONS, connections);
  }

  // Suggestions
  async getCachedSuggestions(): Promise<ConnectionSuggestion[] | null> {
    return this.getCached<ConnectionSuggestion[]>(CACHE_KEYS.SUGGESTIONS);
  }

  async saveSuggestions(suggestions: ConnectionSuggestion[]): Promise<void> {
    return this.saveCache(CACHE_KEYS.SUGGESTIONS, suggestions);
  }

  // Requests
  async getCachedRequests(): Promise<ConnectionRequest[] | null> {
    return this.getCached<ConnectionRequest[]>(CACHE_KEYS.REQUESTS);
  }

  async saveRequests(requests: ConnectionRequest[]): Promise<void> {
    return this.saveCache(CACHE_KEYS.REQUESTS, requests);
  }

  // Clear all network cache
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.CONNECTIONS),
        AsyncStorage.removeItem(CACHE_KEYS.SUGGESTIONS),
        AsyncStorage.removeItem(CACHE_KEYS.REQUESTS),
      ]);
      console.log('🗑️ Cleared all network cache');
    } catch (error) {
      console.warn('Failed to clear network cache:', error);
    }
  }
}

export const networkCacheService = new NetworkCacheService();
