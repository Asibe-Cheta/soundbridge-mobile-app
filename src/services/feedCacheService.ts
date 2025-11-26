/**
 * Feed Cache Service
 * 
 * Implements instant feed loading by:
 * 1. Storing feed posts in AsyncStorage for instant retrieval
 * 2. Loading cached data immediately on app open
 * 3. Fetching fresh data in background and updating silently
 * 4. Smart cache invalidation (5 minutes for feed)
 * 
 * This provides LinkedIn/Instagram-like instant loading experience
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '../types/feed.types';

const CACHE_KEYS = {
  FEED_POSTS: 'feed_posts_cache',
  FEED_TIMESTAMP: 'feed_posts_timestamp',
  FEED_PAGE: 'feed_posts_page',
  FEED_HAS_MORE: 'feed_posts_has_more',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - feed stays fresh for 5 minutes

interface CachedFeed {
  posts: Post[];
  timestamp: number;
  page: number;
  hasMore: boolean;
}

class FeedCacheService {
  /**
   * Get cached feed posts
   * Returns null if cache is expired or doesn't exist
   */
  async getCachedFeed(): Promise<CachedFeed | null> {
    try {
      const [postsJson, timestampStr, pageStr, hasMoreStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.FEED_POSTS),
        AsyncStorage.getItem(CACHE_KEYS.FEED_TIMESTAMP),
        AsyncStorage.getItem(CACHE_KEYS.FEED_PAGE),
        AsyncStorage.getItem(CACHE_KEYS.FEED_HAS_MORE),
      ]);

      if (!postsJson || !timestampStr) {
        return null;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      // Check if cache is expired
      if (now - timestamp > CACHE_DURATION) {
        console.log('📦 Feed cache expired, will fetch fresh data');
        return null;
      }

      const posts: Post[] = JSON.parse(postsJson);
      const page = pageStr ? parseInt(pageStr, 10) : 1;
      const hasMore = hasMoreStr === 'true';

      console.log(`✅ Loaded ${posts.length} posts from cache (age: ${Math.round((now - timestamp) / 1000)}s)`);

      return {
        posts,
        timestamp,
        page,
        hasMore,
      };
    } catch (error) {
      console.error('❌ Error loading cached feed:', error);
      return null;
    }
  }

  /**
   * Save feed posts to cache
   */
  async saveFeedCache(posts: Post[], page: number, hasMore: boolean): Promise<void> {
    try {
      const timestamp = Date.now();
      
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.FEED_POSTS, JSON.stringify(posts)),
        AsyncStorage.setItem(CACHE_KEYS.FEED_TIMESTAMP, timestamp.toString()),
        AsyncStorage.setItem(CACHE_KEYS.FEED_PAGE, page.toString()),
        AsyncStorage.setItem(CACHE_KEYS.FEED_HAS_MORE, hasMore.toString()),
      ]);

      console.log(`💾 Cached ${posts.length} posts (page ${page})`);
    } catch (error) {
      console.error('❌ Error saving feed cache:', error);
    }
  }

  /**
   * Append posts to existing cache (for pagination)
   */
  async appendToCache(newPosts: Post[], newPage: number, hasMore: boolean): Promise<void> {
    try {
      const cached = await this.getCachedFeed();
      
      if (cached && cached.page < newPage) {
        // Append new posts to existing cache
        const updatedPosts = [...cached.posts, ...newPosts];
        await this.saveFeedCache(updatedPosts, newPage, hasMore);
      } else {
        // Replace cache if page is same or lower
        await this.saveFeedCache(newPosts, newPage, hasMore);
      }
    } catch (error) {
      console.error('❌ Error appending to feed cache:', error);
    }
  }

  /**
   * Prepend a new post to cache (for real-time updates)
   */
  async prependPostToCache(post: Post): Promise<void> {
    try {
      const cached = await this.getCachedFeed();
      
      if (cached) {
        // Check if post already exists (avoid duplicates)
        const exists = cached.posts.some(p => p.id === post.id);
        if (!exists) {
          const updatedPosts = [post, ...cached.posts];
          await this.saveFeedCache(updatedPosts, cached.page, cached.hasMore);
        }
      }
    } catch (error) {
      console.error('❌ Error prepending post to cache:', error);
    }
  }

  /**
   * Update a post in cache (for edits, reactions, etc.)
   */
  async updatePostInCache(postId: string, updates: Partial<Post>): Promise<void> {
    try {
      const cached = await this.getCachedFeed();
      
      if (cached) {
        const updatedPosts = cached.posts.map(post => 
          post.id === postId ? { ...post, ...updates } : post
        );
        await this.saveFeedCache(updatedPosts, cached.page, cached.hasMore);
      }
    } catch (error) {
      console.error('❌ Error updating post in cache:', error);
    }
  }

  /**
   * Remove a post from cache (for deletes)
   */
  async removePostFromCache(postId: string): Promise<void> {
    try {
      const cached = await this.getCachedFeed();
      
      if (cached) {
        const updatedPosts = cached.posts.filter(post => post.id !== postId);
        await this.saveFeedCache(updatedPosts, cached.page, cached.hasMore);
      }
    } catch (error) {
      console.error('❌ Error removing post from cache:', error);
    }
  }

  /**
   * Clear feed cache
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.FEED_POSTS),
        AsyncStorage.removeItem(CACHE_KEYS.FEED_TIMESTAMP),
        AsyncStorage.removeItem(CACHE_KEYS.FEED_PAGE),
        AsyncStorage.removeItem(CACHE_KEYS.FEED_HAS_MORE),
      ]);
      console.log('🗑️ Cleared feed cache');
    } catch (error) {
      console.error('❌ Error clearing feed cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  async hasValidCache(): Promise<boolean> {
    const cached = await this.getCachedFeed();
    return cached !== null;
  }
}

export const feedCacheService = new FeedCacheService();

