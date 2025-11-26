import { useState, useEffect, useCallback } from 'react';
import { dbHelpers, supabase } from '../lib/supabase';
import { searchServiceProviders } from '../services/creatorExpansionService';
import { useAuth } from '../contexts/AuthContext';

export interface SearchResult {
  tracks: any[];
  artists: any[];
  events?: any[];
  services?: any[];
  venues?: any[];
  posts?: any[];
  opportunities?: any[];
}

export function useSearch() {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult>({
    tracks: [],
    artists: [],
    events: [],
    services: [],
    venues: [],
    posts: [],
    opportunities: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (query: string, includePosts = false, includeOpportunities = false) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], events: [], services: [], venues: [], posts: [], opportunities: [] });
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);

      // Get current session for services search
      const currentSession = session || (await supabase.auth.getSession()).data.session;

      const [tracksResult, artistsResult, eventsResult, venuesResult] = await Promise.all([
        dbHelpers.searchTracks(query.trim(), 20),
        dbHelpers.searchProfiles(query.trim(), 10),
        dbHelpers.searchEvents(query.trim(), 10).catch(() => ({ success: false, data: [], error: null })),
        dbHelpers.searchVenues(query.trim(), 10).catch(() => ({ success: false, data: [], error: null })),
      ]);

      // Search services using API
      let servicesResult: any[] = [];
      try {
        servicesResult = await searchServiceProviders(query.trim(), {
          session: currentSession,
        });
      } catch (e) {
        console.log('Services search not available:', e);
      }

      const tracks = tracksResult.success ? tracksResult.data || [] : [];
      const artists = artistsResult.success ? artistsResult.data || [] : [];
      const events = eventsResult.success ? eventsResult.data || [] : [];
      const venues = venuesResult.success ? venuesResult.data || [] : [];
      const services = servicesResult || [];

      // TODO: Add posts and opportunities search when available
      const posts: any[] = [];
      const opportunities: any[] = [];

      setSearchResults({ tracks, artists, events, services, venues, posts, opportunities });
      console.log('✅ Search results:', tracks.length, 'tracks,', artists.length, 'artists,', events.length, 'events,', services.length, 'services,', venues.length, 'venues');
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ tracks: [], artists: [], events: [], services: [], venues: [], posts: [], opportunities: [] });
    } finally {
      setIsSearching(false);
    }
  }, [session]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    performSearch,
  };
}

