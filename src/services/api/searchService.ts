import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';

export interface SearchResult {
  id: string;
  type: 'post' | 'person' | 'opportunity' | 'track' | 'event';
  title?: string;
  content?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  [key: string]: any;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export class SearchService {
  /**
   * Universal search across content types
   */
  async search(
    query: string,
    type: 'all' | 'posts' | 'people' | 'opportunities' | 'tracks' | 'events' = 'all',
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams({
        q: query,
        type: type === 'all' ? 'all' : type,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await apiFetch<SearchResponse>(
        `/api/search?${params.toString()}`,
        {
          method: 'GET',
          session,
        }
      );

      return response.results || [];
    } catch (error) {
      console.error('SearchService.search:', error);
      // Fallback to Supabase search if API fails
      return this.fallbackSearch(query, type);
    }
  }

  /**
   * Fallback search using Supabase directly
   */
  private async fallbackSearch(
    query: string,
    type: 'all' | 'posts' | 'people' | 'opportunities' | 'tracks' | 'events'
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Search posts
      if (type === 'all' || type === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)')
          .or(`content.ilike.%${query}%`)
          .limit(10);

        if (posts) {
          posts.forEach((post: any) => {
            results.push({
              id: post.id,
              type: 'post',
              content: post.content,
              title: post.content?.substring(0, 50),
              username: post.author?.username,
              display_name: post.author?.display_name,
              avatar_url: post.author?.avatar_url,
              created_at: post.created_at,
            });
          });
        }
      }

      // Search people (profiles)
      if (type === 'all' || type === 'people') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, created_at')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
          .limit(10);

        if (profiles) {
          profiles.forEach((profile: any) => {
            results.push({
              id: profile.id,
              type: 'person',
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              content: profile.bio,
              created_at: profile.created_at,
            });
          });
        }
      }
    } catch (error) {
      console.error('Fallback search error:', error);
    }

    return results;
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(): Promise<string[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return [];
      }

      const response = await apiFetch<{ trending: string[] }>(
        '/api/search/trending',
        {
          method: 'GET',
          session,
        }
      );

      return response.trending || [];
    } catch (error) {
      console.error('SearchService.getTrendingSearches:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();

