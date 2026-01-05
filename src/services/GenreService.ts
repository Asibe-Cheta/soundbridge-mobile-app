import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface Genre {
  id: string;
  name: string;
  category: 'music' | 'podcast';
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface UserPreferredGenre {
  genre_id: string;
  genre_name: string;
  genre_category: string;
  genre_description: string | null;
}

/**
 * GenreService - Centralized genre management with database backend
 * Provides robust genre handling for personalization across the app
 */
class GenreService {
  /**
   * Fetch all active genres from database
   * @param category - Filter by 'music' or 'podcast' (optional)
   * @returns Array of genres sorted by sort_order
   */
  async getGenres(category?: 'music' | 'podcast'): Promise<Genre[]> {
    try {
      let query = supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching genres:', error);
        // Fallback to hardcoded genres if database fails
        return this.getFallbackGenres(category);
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching genres:', error);
      return this.getFallbackGenres(category);
    }
  }

  /**
   * Fetch music genres specifically
   * @returns Array of music genres
   */
  async getMusicGenres(): Promise<Genre[]> {
    return this.getGenres('music');
  }

  /**
   * Fetch podcast categories specifically
   * @returns Array of podcast categories
   */
  async getPodcastCategories(): Promise<Genre[]> {
    return this.getGenres('podcast');
  }

  /**
   * Get user's preferred genres
   * @param session - User session
   * @returns Array of user's preferred genres
   */
  async getUserPreferredGenres(session: Session): Promise<UserPreferredGenre[]> {
    if (!session?.user?.id) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_user_preferred_genres', { user_uuid: session.user.id });

      if (error) {
        console.error('Error fetching user preferred genres:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching user preferred genres:', error);
      return [];
    }
  }

  /**
   * Set user's preferred genres (replaces existing preferences)
   * @param session - User session
   * @param genreIds - Array of genre IDs to set as preferences
   */
  async setUserPreferredGenres(session: Session, genreIds: string[]): Promise<void> {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase.rpc('set_user_preferred_genres', {
        user_uuid: session.user.id,
        genre_ids: genreIds,
      });

      if (error) {
        console.error('Error setting user preferred genres:', error);
        throw error;
      }
    } catch (error) {
      console.error('Exception setting user preferred genres:', error);
      throw error;
    }
  }

  /**
   * Add a single genre to user's preferences
   * @param session - User session
   * @param genreId - Genre ID to add
   */
  async addUserPreferredGenre(session: Session, genreId: string): Promise<void> {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('user_preferred_genres')
        .insert({
          user_id: session.user.id,
          genre_id: genreId,
        });

      if (error) {
        // Ignore unique constraint errors (genre already preferred)
        if (error.code !== '23505') {
          console.error('Error adding user preferred genre:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Exception adding user preferred genre:', error);
      throw error;
    }
  }

  /**
   * Remove a single genre from user's preferences
   * @param session - User session
   * @param genreId - Genre ID to remove
   */
  async removeUserPreferredGenre(session: Session, genreId: string): Promise<void> {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('user_preferred_genres')
        .delete()
        .eq('user_id', session.user.id)
        .eq('genre_id', genreId);

      if (error) {
        console.error('Error removing user preferred genre:', error);
        throw error;
      }
    } catch (error) {
      console.error('Exception removing user preferred genre:', error);
      throw error;
    }
  }

  /**
   * Get genre by ID
   * @param genreId - Genre ID
   * @returns Genre object or null
   */
  async getGenreById(genreId: string): Promise<Genre | null> {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('id', genreId)
        .single();

      if (error) {
        console.error('Error fetching genre by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching genre by ID:', error);
      return null;
    }
  }

  /**
   * Get genre by name
   * @param name - Genre name
   * @param category - Genre category (optional)
   * @returns Genre object or null
   */
  async getGenreByName(name: string, category?: 'music' | 'podcast'): Promise<Genre | null> {
    try {
      let query = supabase
        .from('genres')
        .select('*')
        .eq('name', name);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching genre by name:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching genre by name:', error);
      return null;
    }
  }

  /**
   * Search genres by name (fuzzy search)
   * @param searchTerm - Search term
   * @param category - Filter by category (optional)
   * @returns Array of matching genres
   */
  async searchGenres(searchTerm: string, category?: 'music' | 'podcast'): Promise<Genre[]> {
    try {
      let query = supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching genres:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception searching genres:', error);
      return [];
    }
  }

  /**
   * Fallback genres when database is unavailable
   * Returns hardcoded genre list matching current app implementation
   */
  private getFallbackGenres(category?: 'music' | 'podcast'): Genre[] {
    const musicGenres: Genre[] = [
      { id: 'fallback-gospel', name: 'Gospel', category: 'music', description: 'Inspirational and religious music', is_active: true, sort_order: 1 },
      { id: 'fallback-afrobeats', name: 'Afrobeats', category: 'music', description: 'African popular music', is_active: true, sort_order: 2 },
      { id: 'fallback-uk-drill', name: 'UK Drill', category: 'music', description: 'UK style drill music', is_active: true, sort_order: 3 },
      { id: 'fallback-hiphop', name: 'Hip Hop', category: 'music', description: 'Urban music featuring rapping', is_active: true, sort_order: 4 },
      { id: 'fallback-rnb', name: 'R&B', category: 'music', description: 'Rhythm and Blues', is_active: true, sort_order: 5 },
      { id: 'fallback-pop', name: 'Pop', category: 'music', description: 'Popular mainstream music', is_active: true, sort_order: 6 },
      { id: 'fallback-rock', name: 'Rock', category: 'music', description: 'Rock music', is_active: true, sort_order: 7 },
      { id: 'fallback-electronic', name: 'Electronic', category: 'music', description: 'Electronic music', is_active: true, sort_order: 8 },
      { id: 'fallback-jazz', name: 'Jazz', category: 'music', description: 'Jazz music', is_active: true, sort_order: 9 },
      { id: 'fallback-classical', name: 'Classical', category: 'music', description: 'Classical music', is_active: true, sort_order: 10 },
      { id: 'fallback-country', name: 'Country', category: 'music', description: 'Country music', is_active: true, sort_order: 11 },
      { id: 'fallback-reggae', name: 'Reggae', category: 'music', description: 'Reggae music', is_active: true, sort_order: 12 },
      { id: 'fallback-folk', name: 'Folk', category: 'music', description: 'Folk music', is_active: true, sort_order: 13 },
      { id: 'fallback-blues', name: 'Blues', category: 'music', description: 'Blues music', is_active: true, sort_order: 14 },
      { id: 'fallback-funk', name: 'Funk', category: 'music', description: 'Funk music', is_active: true, sort_order: 15 },
      { id: 'fallback-soul', name: 'Soul', category: 'music', description: 'Soul music', is_active: true, sort_order: 16 },
      { id: 'fallback-alternative', name: 'Alternative', category: 'music', description: 'Alternative music', is_active: true, sort_order: 17 },
      { id: 'fallback-indie', name: 'Indie', category: 'music', description: 'Indie music', is_active: true, sort_order: 18 },
      { id: 'fallback-other', name: 'Other', category: 'music', description: 'Other genres', is_active: true, sort_order: 999 },
    ];

    const podcastCategories: Genre[] = [
      { id: 'fallback-tech', name: 'Technology', category: 'podcast', description: 'Technology podcasts', is_active: true, sort_order: 1 },
      { id: 'fallback-business', name: 'Business', category: 'podcast', description: 'Business podcasts', is_active: true, sort_order: 2 },
      { id: 'fallback-education', name: 'Education', category: 'podcast', description: 'Educational podcasts', is_active: true, sort_order: 3 },
      { id: 'fallback-entertainment', name: 'Entertainment', category: 'podcast', description: 'Entertainment podcasts', is_active: true, sort_order: 4 },
      { id: 'fallback-news', name: 'News', category: 'podcast', description: 'News podcasts', is_active: true, sort_order: 5 },
      { id: 'fallback-sports', name: 'Sports', category: 'podcast', description: 'Sports podcasts', is_active: true, sort_order: 6 },
      { id: 'fallback-health', name: 'Health', category: 'podcast', description: 'Health podcasts', is_active: true, sort_order: 7 },
      { id: 'fallback-science', name: 'Science', category: 'podcast', description: 'Science podcasts', is_active: true, sort_order: 8 },
      { id: 'fallback-arts', name: 'Arts', category: 'podcast', description: 'Arts podcasts', is_active: true, sort_order: 9 },
      { id: 'fallback-comedy', name: 'Comedy', category: 'podcast', description: 'Comedy podcasts', is_active: true, sort_order: 10 },
      { id: 'fallback-truecrime', name: 'True Crime', category: 'podcast', description: 'True crime podcasts', is_active: true, sort_order: 11 },
      { id: 'fallback-history', name: 'History', category: 'podcast', description: 'History podcasts', is_active: true, sort_order: 12 },
      { id: 'fallback-podcast-other', name: 'Other', category: 'podcast', description: 'Other categories', is_active: true, sort_order: 999 },
    ];

    if (category === 'music') {
      return musicGenres;
    } else if (category === 'podcast') {
      return podcastCategories;
    } else {
      return [...musicGenres, ...podcastCategories];
    }
  }

  /**
   * Get genre names only (for simple dropdowns)
   * @param category - Filter by category
   * @returns Array of genre names
   */
  async getGenreNames(category?: 'music' | 'podcast'): Promise<string[]> {
    const genres = await this.getGenres(category);
    return genres.map(g => g.name);
  }

  /**
   * Sync existing preferred_genres array to new user_preferred_genres table
   * This helps migrate old data to new structure
   * @param session - User session
   */
  async syncLegacyPreferredGenres(session: Session): Promise<void> {
    if (!session?.user?.id) {
      return;
    }

    try {
      // Get user's profile with old preferred_genres array
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('genres')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile?.genres || profile.genres.length === 0) {
        return; // No legacy data to sync
      }

      // Find genre IDs matching the names
      const genreIds: string[] = [];
      for (const genreName of profile.genres) {
        const genre = await this.getGenreByName(genreName);
        if (genre) {
          genreIds.push(genre.id);
        }
      }

      if (genreIds.length > 0) {
        await this.setUserPreferredGenres(session, genreIds);
      }
    } catch (error) {
      console.error('Error syncing legacy preferred genres:', error);
    }
  }
}

// Export singleton instance
export default new GenreService();
