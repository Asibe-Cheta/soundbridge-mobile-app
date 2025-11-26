/**
 * Content Cache Service
 * 
 * Generic cache service for all app content (tracks, events, services, venues, profile data)
 * Provides instant loading by caching data in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DURATIONS = {
  TRACKS: 10 * 60 * 1000,      // 10 minutes - tracks change less frequently
  EVENTS: 5 * 60 * 1000,       // 5 minutes - events are time-sensitive
  SERVICES: 15 * 60 * 1000,     // 15 minutes - services change infrequently
  VENUES: 30 * 60 * 1000,       // 30 minutes - venues rarely change
  PROFILE: 5 * 60 * 1000,       // 5 minutes - profile data
  ARTISTS: 10 * 60 * 1000,      // 10 minutes - artist data
  PLAYLISTS: 10 * 60 * 1000,    // 10 minutes - playlists
} as const;

type CacheType = keyof typeof CACHE_DURATIONS;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ContentCacheService {
  /**
   * Get cached content
   */
  async getCached<T>(type: CacheType, key: string): Promise<T | null> {
    try {
      const cacheKey = `cache_${type}_${key}`;
      const cachedJson = await AsyncStorage.getItem(cacheKey);

      if (!cachedJson) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cachedJson);
      const now = Date.now();

      // Check if cache is expired
      if (now > entry.expiresAt) {
        console.log(`📦 ${type} cache expired for key: ${key}`);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      const age = Math.round((now - entry.timestamp) / 1000);
      console.log(`✅ Loaded ${type} from cache (key: ${key}, age: ${age}s)`);
      return entry.data;
    } catch (error) {
      console.error(`❌ Error loading ${type} cache:`, error);
      return null;
    }
  }

  /**
   * Save content to cache
   */
  async saveCache<T>(type: CacheType, key: string, data: T): Promise<void> {
    try {
      const cacheKey = `cache_${type}_${key}`;
      const duration = CACHE_DURATIONS[type];
      const timestamp = Date.now();

      const entry: CacheEntry<T> = {
        data,
        timestamp,
        expiresAt: timestamp + duration,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`💾 Cached ${type} (key: ${key})`);
    } catch (error) {
      console.error(`❌ Error saving ${type} cache:`, error);
    }
  }

  /**
   * Clear cache for a specific type and key
   */
  async clearCache(type: CacheType, key: string): Promise<void> {
    try {
      const cacheKey = `cache_${type}_${key}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`🗑️ Cleared ${type} cache (key: ${key})`);
    } catch (error) {
      console.error(`❌ Error clearing ${type} cache:`, error);
    }
  }

  /**
   * Clear all cache for a specific type
   */
  async clearAllCache(type: CacheType): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(`cache_${type}_`));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cleared all ${type} cache (${cacheKeys.length} entries)`);
      }
    } catch (error) {
      console.error(`❌ Error clearing all ${type} cache:`, error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  async hasValidCache(type: CacheType, key: string): Promise<boolean> {
    const cached = await this.getCached(type, key);
    return cached !== null;
  }
}

export const contentCacheService = new ContentCacheService();

