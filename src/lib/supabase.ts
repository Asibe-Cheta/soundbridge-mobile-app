// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreatorAvailability,
  CollaborationRequest,
  BookingStatus,
  CreateAvailabilityRequest,
  CreateCollaborationRequest,
  RespondToRequestData,
  CollaborationFilters,
  ApiResponse,
  PaginatedResponse,
  ValidationResult,
  TimeSlotValidation
} from '../types/collaboration';

// CORRECT CREDENTIALS
const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export as db for compatibility
export const db = supabase;

// WORKING QUERY FUNCTIONS
export const dbHelpers = {
  // Get creators - NO AUTHENTICATION REQUIRED
  async getCreators(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          country,
          genre,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching creators:', error);
      return { data: null, error };
    }
  },

  // Get creators with real stats - NO AUTHENTICATION REQUIRED
  async getCreatorsWithStats(limit = 20) {
    try {
      console.log('🔧 Getting creators with real stats...');
      
      // First get the creators
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          country,
          genre,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (creatorsError) throw creatorsError;
      if (!creators || creators.length === 0) {
        return { data: [], error: null };
      }

      // Get stats for each creator
      const creatorsWithStats = await Promise.all(
        creators.map(async (creator) => {
          try {
            // Get followers count
            const { count: followersCount } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', creator.id);

            // Get tracks count
            const { count: tracksCount } = await supabase
              .from('audio_tracks')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', creator.id);

            // Get events count
            const { count: eventsCount } = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', creator.id);

            return {
              ...creator,
              followers_count: followersCount || 0,
              tracks_count: tracksCount || 0,
              events_count: eventsCount || 0,
            };
          } catch (error) {
            console.error(`Error getting stats for creator ${creator.id}:`, error);
            return {
              ...creator,
              followers_count: 0,
              tracks_count: 0,
              events_count: 0,
            };
          }
        })
      );

      console.log('✅ Successfully got creators with real stats:', creatorsWithStats.length);
      return { data: creatorsWithStats, error: null };
    } catch (error) {
      console.error('Error fetching creators with stats:', error);
      return { data: null, error };
    }
  },

  // Get hot creators - NO AUTHENTICATION REQUIRED
  async getHotCreators(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          genre,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching hot creators:', error);
      return { data: null, error };
    }
  },

  // Get events - NO AUTHENTICATION REQUIRED
  async getUpcomingEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          venue,
          category,
          price_gbp,
          price_ngn,
          max_attendees,
          current_attendees,
          image_url,
          created_at
        `)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { data: null, error };
    }
  },

  // Search tracks - EXACT WORKING CODE from web app team
  async searchTracks(query: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          file_url,
          cover_art_url,
          duration,
          genre,
          play_count,
          likes_count,
          creator_id,
          created_at,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error searching tracks:', error);
      return { success: false, data: null, error };
    }
  },

  // Search profiles/artists - EXACT WORKING CODE from web app team
  async searchProfiles(query: string, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          genre,
          role,
          created_at,
          followers:follows!follows_following_id_fkey(count),
          tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
        `)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .eq('role', 'creator')
        .order('username', { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      // Transform data to match expected format
      const transformedData = data?.map(profile => ({
        ...profile,
        followers_count: profile.followers?.[0]?.count || 0,
        tracks_count: profile.tracks?.[0]?.count || 0,
      }));

      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Error searching profiles:', error);
      return { success: false, data: null, error };
    }
  },

  // Get conversations for MessagesScreen - EXACT WORKING CODE from web app team
  async getConversations(userId: string) {
    try {
      console.log('📬 Fetching conversations for user:', userId);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('⚠️ Messages table might not exist or has different structure:', error.message);
        return { success: true, data: [], error: null };
      }

      // Group messages into conversations
      const conversationsMap = new Map();
      
      messages?.forEach((message) => {
        const otherUserId = message.sender_id === userId 
          ? message.recipient_id 
          : message.sender_id;
        
        const otherUser = message.sender_id === userId 
          ? message.recipient 
          : message.sender;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            id: otherUserId,
            participant1_id: userId,
            participant2_id: otherUserId,
            participant1: userId === message.sender_id ? message.sender : message.recipient,
            participant2: otherUser,
            last_message: [{
              content: message.content,
              created_at: message.created_at,
              sender_id: message.sender_id
            }],
            updated_at: message.created_at,
            unreadCount: 0
          });
        }

        const conversation = conversationsMap.get(otherUserId);
        
        // Count unread messages (where current user is recipient)
        if (!message.is_read && message.recipient_id === userId) {
          conversation.unreadCount++;
        }
      });

      const conversations = Array.from(conversationsMap.values());
      console.log('✅ Conversations loaded:', conversations.length);
      
      return { success: true, data: conversations, error: null };
    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      return { success: false, data: [], error };
    }
  },

  // Get messages for a specific conversation
  async getMessages(userId: string, otherUserId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          is_read,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { data: null, error };
    }
  },

  // Send a message
  async sendMessage(senderId: string, recipientId: string, content: string, messageType = 'text') {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          is_read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Mark message as read
  async markMessageAsRead(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Test if playlists tables exist
  async testPlaylistsTables() {
    try {
      console.log('🔍 Testing if playlists tables exist...');
      
      // Test 1: Check if playlists table exists
      console.log('📋 Testing playlists table...');
      const { data: playlistsTest, error: playlistsError } = await supabase
        .from('playlists')
        .select('id, name, creator_id, is_public, created_at')
        .limit(1);
      
      if (playlistsError) {
        console.log('❌ Playlists table error:', playlistsError.message);
        console.log('📊 Error details:', playlistsError);
      } else {
        console.log('✅ Playlists table exists! Found', playlistsTest?.length || 0, 'playlists');
        if (playlistsTest && playlistsTest.length > 0) {
          console.log('📋 Sample playlist:', playlistsTest[0]);
        }
      }
      
      // Test 2: Check if playlist_tracks table exists
      console.log('🎵 Testing playlist_tracks table...');
      const { data: tracksTest, error: tracksError } = await supabase
        .from('playlist_tracks')
        .select('id, playlist_id, track_id, position')
        .limit(1);
      
      if (tracksError) {
        console.log('❌ Playlist_tracks table error:', tracksError.message);
        console.log('📊 Error details:', tracksError);
      } else {
        console.log('✅ Playlist_tracks table exists! Found', tracksTest?.length || 0, 'playlist tracks');
        if (tracksTest && tracksTest.length > 0) {
          console.log('🎵 Sample playlist track:', tracksTest[0]);
        }
      }
      
      // Test 3: Check playlists table structure
      console.log('🔧 Testing playlists table structure...');
      const { data: structureTest, error: structureError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          updated_at,
          creator_id
        `)
        .limit(1);
      
      if (structureError) {
        console.log('❌ Playlists table structure issue:', structureError.message);
        console.log('💡 Some columns might be missing or have different names');
      } else {
        console.log('✅ Playlists table structure looks good!');
      }
      
      // Test 4: Check if we can query with relationships
      console.log('🔗 Testing playlists with creator relationship...');
      const { data: relationTest, error: relationError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name
          )
        `)
        .limit(1);
      
      if (relationError) {
        console.log('❌ Playlists relationship error:', relationError.message);
        console.log('💡 Foreign key constraint might be named differently');
      } else {
        console.log('✅ Playlists relationship works!');
        if (relationTest && relationTest.length > 0) {
          console.log('🔗 Sample with creator:', relationTest[0]);
        }
      }
      
      return {
        playlistsTableExists: !playlistsError,
        playlistTracksTableExists: !tracksError,
        structureValid: !structureError,
        relationshipValid: !relationError,
        playlistsCount: playlistsTest?.length || 0,
        tracksCount: tracksTest?.length || 0
      };
      
    } catch (error) {
      console.error('❌ Error testing playlists tables:', error);
      return {
        playlistsTableExists: false,
        playlistTracksTableExists: false,
        structureValid: false,
        relationshipValid: false,
        playlistsCount: 0,
        tracksCount: 0
      };
    }
  },

  // ✅ NEW: Get public playlists (for discovery)
  async getPublicPlaylists(limit = 20) {
    try {
      console.log('🎵 Attempting to fetch public playlists...');
      
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.log('⚠️ Playlists table might not exist yet or has different structure:', error.message);
        // Return empty result instead of throwing error
        return { data: [], error: null };
      }
      
      console.log('✅ Public playlists query successful:', data?.length || 0, 'playlists found');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting public playlists:', error);
      // Return empty result instead of throwing error
      return { data: [], error: null };
    }
  },

  // ✅ NEW: Get playlist details with tracks
  async getPlaylistDetails(playlistId: string) {
    try {
      console.log('🎵 Attempting to fetch playlist details for:', playlistId);
      
      // Get playlist info
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('id', playlistId)
        .single();

      if (playlistError) {
        console.log('⚠️ Playlist not found or table structure issue:', playlistError.message);
        return { data: null, error: playlistError };
      }

      // Get playlist tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          position,
          added_at,
          track:audio_tracks!playlist_tracks_track_id_fkey(
            id,
            title,
            description,
            file_url,
            cover_art_url,
            duration,
            genre,
            play_count,
            likes_count,
            is_public,
            created_at,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) {
        console.log('⚠️ Playlist tracks table might not exist:', tracksError.message);
        // Return playlist without tracks if tracks table doesn't exist
        return { 
          data: { ...playlist, tracks: [] }, 
          error: null 
        };
      }

      console.log('✅ Playlist details loaded:', playlist.name, 'with', tracks?.length || 0, 'tracks');
      return { 
        data: { ...playlist, tracks: tracks || [] }, 
        error: null 
      };
    } catch (error) {
      console.error('❌ Error getting playlist details:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Get user's playlists
  async getUserPlaylists(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return { data: null, error };
    }
  },

  // ✅ NEW: Get user's genre preferences
  async getUserGenres(userId: string) {
    try {
      console.log('🎵 Getting user genres for:', userId);
      
      // First try to get from user_genres table
      const { data: userGenres, error: userGenresError } = await supabase
        .from('user_genres')
        .select(`
          genre_id,
          genres:genre_id(
            id,
            name,
            category,
            description
          )
        `)
        .eq('user_id', userId);

      if (!userGenresError && userGenres && userGenres.length > 0) {
        console.log('✅ Found user genres in user_genres table:', userGenres.length);
        return { data: userGenres.map(ug => ug.genres).filter(Boolean), error: null };
      }

      // Fallback: try to get from profiles.genres column (if it exists)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('genres')
        .eq('id', userId)
        .single();

      if (!profileError && profile?.genres) {
        console.log('✅ Found user genres in profiles.genres:', profile.genres);
        return { data: profile.genres, error: null };
      }

      console.log('ℹ️ No user genres found, returning empty array');
      return { data: [], error: null };
    } catch (error) {
      console.error('❌ Error getting user genres:', error);
      return { data: [], error };
    }
  },

  // ✅ NEW: Get personalized tracks based on user genres (Updated to use PostgreSQL function)
  async getPersonalizedTracks(userId: string, limit = 20) {
    try {
      console.log('🎯 Getting personalized tracks for user:', userId);
      
      // Skip RPC function since it doesn't return creator data
      // Use manual query directly to get proper creator information
      console.log('🔧 Using manual query to get personalized tracks with creator data');
      
      // Get user's genre preferences
      const { data: userGenres } = await this.getUserGenres(userId);
      
      if (!userGenres || userGenres.length === 0) {
        console.log('ℹ️ No user genres found, returning general trending tracks');
        return this.getTrendingTracks(limit);
      }

      const genreIds = userGenres.map(g => g.id);
      console.log('🎵 Filtering by genre IDs:', genreIds);

      // Get tracks that match user's genres using manual JOIN
      const { data: manualData, error: manualError } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          audio_url,
          file_url,
          cover_art_url,
          artwork_url,
          duration,
          play_count,
          likes_count,
          created_at,
          creator:profiles!creator_id(
            id,
            username,
            display_name,
            avatar_url
          ),
          content_genres!inner(
            genre_id
          )
        `)
        .eq('is_public', true)
        .in('content_genres.genre_id', genreIds)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (manualError) {
        console.log('⚠️ Error with manual personalized query, falling back to trending:', manualError.message);
        return this.getTrendingTracks(limit);
      }

      console.log('✅ Found personalized tracks via manual query:', manualData?.length || 0);
      console.log('🔍 Sample personalized track creator data:', manualData?.[0]?.creator);
      return { data: manualData, error: null };
    } catch (error) {
      console.error('❌ Error getting personalized tracks:', error);
      return this.getTrendingTracks(limit);
    }
  },

  // ✅ NEW: Get personalized events based on user location and genres (Updated to use PostgreSQL function)
  async getPersonalizedEvents(userId: string, limit = 20) {
    try {
      console.log('🎯 Getting personalized events for user:', userId);
      
      // First try the new PostgreSQL function
      const { data, error } = await supabase
        .rpc('get_personalized_events', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: 0
        });

      if (!error && data && data.length > 0) {
        console.log('✅ Found personalized events via RPC:', data.length);
        return { data, error: null };
      }

      // Fallback to manual query if RPC function doesn't exist yet
      console.log('⚠️ RPC function not available, using manual query. Error:', error?.message);
      
      // Get user's profile for location
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', userId)
        .single();

      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          image_url,
          event_date,
          location,
          country,
          ticket_price,
          tickets_available,
          created_at,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gte('event_date', new Date().toISOString());

      // Filter by country if available
      if (profile?.country) {
        query = query.eq('country', profile.country);
        console.log('🌍 Filtering events by country:', profile.country);
      }

      const { data: manualData, error: manualError } = await query
        .order('event_date', { ascending: true })
        .limit(limit);

      if (manualError) {
        console.log('⚠️ Error with manual personalized events, falling back to general:', manualError.message);
        return this.getEvents(limit);
      }

      console.log('✅ Found personalized events via manual query:', manualData?.length || 0);
      return { data: manualData, error: null };
    } catch (error) {
      console.error('❌ Error getting personalized events:', error);
      return this.getEvents(limit);
    }
  },

  // ✅ NEW: Get general trending tracks
  async getTrendingTracks(limit = 20) {
    try {
      console.log('🔥 Getting trending tracks...');
      
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          audio_url,
          cover_art_url,
          duration,
          play_count,
          likes_count,
          created_at,
          creator:profiles!creator_id(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Found trending tracks:', data?.length || 0);
      console.log('🔍 Sample trending track creator data:', data?.[0]?.creator);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error getting trending tracks:', error);
      return { data: [], error };
    }
  },

  // ✅ NEW: Get general events
  async getEvents(limit = 20) {
    try {
      console.log('🎪 Getting events...');
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          image_url,
          event_date,
          location,
          country,
          ticket_price,
          tickets_available,
          created_at,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      console.log('✅ Found events:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error getting events:', error);
      return { data: [], error };
    }
  },

  // ===== COLLABORATION CALENDAR SYSTEM =====

  // Get creator's availability slots
  async getCreatorAvailability(creatorId: string): Promise<ApiResponse<CreatorAvailability[]>> {
    try {
      console.log('📅 Getting availability for creator:', creatorId);
      
      const { data, error } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_available', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) {
        console.error('❌ Error fetching creator availability:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Found availability slots:', data?.length || 0);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error getting creator availability:', error);
      return { success: false, error: 'Failed to fetch availability' };
    }
  },

  // Create new availability slot
  async createAvailabilitySlot(slotData: CreateAvailabilityRequest): Promise<ApiResponse<CreatorAvailability>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Validation
      if (slotData.endDate <= slotData.startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      if (slotData.maxRequests < 1) {
        return { success: false, error: 'Maximum requests must be at least 1' };
      }

      console.log('📅 Creating availability slot:', slotData);

      const { data, error } = await supabase
        .from('creator_availability')
        .insert({
          creator_id: user.id,
          start_date: slotData.startDate.toISOString(),
          end_date: slotData.endDate.toISOString(),
          is_available: true,
          max_requests_per_slot: slotData.maxRequests,
          notes: slotData.notes || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating availability slot:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Created availability slot:', data.id);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error creating availability slot:', error);
      return { success: false, error: 'Failed to create availability slot' };
    }
  },

  // Update availability slot
  async updateAvailabilitySlot(slotId: string, updates: Partial<CreateAvailabilityRequest>): Promise<ApiResponse<CreatorAvailability>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('📅 Updating availability slot:', slotId);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.startDate) updateData.start_date = updates.startDate.toISOString();
      if (updates.endDate) updateData.end_date = updates.endDate.toISOString();
      if (updates.maxRequests !== undefined) updateData.max_requests_per_slot = updates.maxRequests;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from('creator_availability')
        .update(updateData)
        .eq('id', slotId)
        .eq('creator_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating availability slot:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Updated availability slot:', data.id);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error updating availability slot:', error);
      return { success: false, error: 'Failed to update availability slot' };
    }
  },

  // Delete availability slot
  async deleteAvailabilitySlot(slotId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('📅 Deleting availability slot:', slotId);

      const { error } = await supabase
        .from('creator_availability')
        .delete()
        .eq('id', slotId)
        .eq('creator_id', user.id);

      if (error) {
        console.error('❌ Error deleting availability slot:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Deleted availability slot:', slotId);
      return { success: true, data: true };
    } catch (error) {
      console.error('❌ Error deleting availability slot:', error);
      return { success: false, error: 'Failed to delete availability slot' };
    }
  },

  // Send collaboration request
  async sendCollaborationRequest(requestData: CreateCollaborationRequest): Promise<ApiResponse<CollaborationRequest>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🤝 Sending collaboration request:', requestData);

      // Validate availability slot exists and is available
      const { data: slot } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('id', requestData.availabilityId)
        .single();

      if (!slot) {
        return { success: false, error: 'Availability slot not found' };
      }

      if (!slot.is_available) {
        return { success: false, error: 'This time slot is no longer available' };
      }

      // Validate proposed times are within availability window
      const proposedStart = requestData.proposedStartDate.toISOString();
      const proposedEnd = requestData.proposedEndDate.toISOString();

      if (proposedStart < slot.start_date || proposedEnd > slot.end_date) {
        return { success: false, error: 'Proposed times are outside availability window' };
      }

      if (proposedEnd <= proposedStart) {
        return { success: false, error: 'End time must be after start time' };
      }

      // Check slot capacity
      const { count } = await supabase
        .from('collaboration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('availability_id', requestData.availabilityId)
        .eq('status', 'pending');

      if (count && count >= slot.max_requests_per_slot) {
        return { success: false, error: 'This time slot has reached maximum request limit' };
      }

      // Prevent self-collaboration
      if (user.id === requestData.creatorId) {
        return { success: false, error: 'Cannot send collaboration request to yourself' };
      }

      // Create request
      const { data: request, error } = await supabase
        .from('collaboration_requests')
        .insert({
          requester_id: user.id,
          creator_id: requestData.creatorId,
          availability_id: requestData.availabilityId,
          proposed_start_date: proposedStart,
          proposed_end_date: proposedEnd,
          subject: requestData.subject,
          message: requestData.message,
          status: 'pending'
        })
        .select(`
          *,
          requester:profiles!collaboration_requests_requester_id_fkey(
            id, display_name, username, avatar_url
          ),
          creator:profiles!collaboration_requests_creator_id_fkey(
            id, display_name, username, avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('❌ Error sending collaboration request:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Sent collaboration request:', request.id);
      return { success: true, data: request };
    } catch (error) {
      console.error('❌ Error sending collaboration request:', error);
      return { success: false, error: 'Failed to send collaboration request' };
    }
  },

  // Get creator booking status
  async getCreatorBookingStatus(creatorId: string): Promise<ApiResponse<BookingStatus>> {
    try {
      console.log('📊 Getting booking status for creator:', creatorId);

      // Get creator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('collaboration_enabled, min_notice_days')
        .eq('id', creatorId)
        .single();

      if (!profile) {
        return { success: false, error: 'Creator not found' };
      }

      // Get availability slots
      const { data: slots } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_available', true)
        .gte('end_date', new Date().toISOString());

      // Calculate available slots (those with capacity)
      let availableSlots = 0;
      if (slots) {
        for (const slot of slots) {
          const { count } = await supabase
            .from('collaboration_requests')
            .select('*', { count: 'exact', head: true })
            .eq('availability_id', slot.id)
            .eq('status', 'pending');
          
          if ((count || 0) < slot.max_requests_per_slot) {
            availableSlots++;
          }
        }
      }

      // Get total pending requests
      const { count: pendingRequests } = await supabase
        .from('collaboration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'pending');

      const totalSlots = slots?.length || 0;
      const nextAvailableSlot = slots?.[0]?.start_date;
      const isAcceptingRequests = (profile.collaboration_enabled ?? true) && availableSlots > 0;

      const bookingStatus: BookingStatus = {
        creator_id: creatorId,
        collaboration_enabled: profile.collaboration_enabled ?? true,
        is_accepting_requests: isAcceptingRequests,
        next_available_slot: nextAvailableSlot,
        total_availability_slots: totalSlots,
        available_slots: availableSlots,
        pending_requests: pendingRequests || 0,
        min_notice_days: profile.min_notice_days || 7
      };

      console.log('✅ Got booking status:', bookingStatus);
      return { success: true, data: bookingStatus };
    } catch (error) {
      console.error('❌ Error getting booking status:', error);
      return { success: false, error: 'Failed to get booking status' };
    }
  },

  // Get collaboration requests with filters
  async getCollaborationRequests(filters: CollaborationFilters = {}): Promise<ApiResponse<PaginatedResponse<CollaborationRequest>>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🤝 Getting collaboration requests:', filters);

      let query = supabase
        .from('collaboration_requests')
        .select(`
          *,
          requester:profiles!collaboration_requests_requester_id_fkey(
            id, display_name, username, avatar_url
          ),
          creator:profiles!collaboration_requests_creator_id_fkey(
            id, display_name, username, avatar_url
          ),
          availability:creator_availability(
            id, start_date, end_date, notes
          )
        `);

      // Filter by type (sent/received)
      if (filters.type === 'sent') {
        query = query.eq('requester_id', user.id);
      } else if (filters.type === 'received') {
        query = query.eq('creator_id', user.id);
      } else {
        // Both sent and received
        query = query.or(`requester_id.eq.${user.id},creator_id.eq.${user.id}`);
      }

      // Filter by status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Get count for pagination
      let countQuery = supabase
        .from('collaboration_requests')
        .select('*', { count: 'exact', head: true });

      if (filters.type === 'sent') {
        countQuery = countQuery.eq('requester_id', user.id);
      } else if (filters.type === 'received') {
        countQuery = countQuery.eq('creator_id', user.id);
      } else {
        countQuery = countQuery.or(`requester_id.eq.${user.id},creator_id.eq.${user.id}`);
      }

      if (filters.status) {
        countQuery = countQuery.eq('status', filters.status);
      }

      const [{ data: requests, error: requestsError }, { count }] = await Promise.all([
        query,
        countQuery
      ]);

      if (requestsError) {
        console.error('❌ Error fetching collaboration requests:', requestsError);
        return { success: false, error: requestsError.message };
      }

      const totalCount = count || 0;
      const hasMore = offset + limit < totalCount;

      console.log('✅ Found collaboration requests:', requests?.length || 0);
      return {
        success: true,
        data: {
          data: requests || [],
          total: totalCount,
          page,
          limit,
          hasMore
        }
      };
    } catch (error) {
      console.error('❌ Error getting collaboration requests:', error);
      return { success: false, error: 'Failed to fetch collaboration requests' };
    }
  },

  // Respond to collaboration request
  async respondToCollaborationRequest(responseData: RespondToRequestData): Promise<ApiResponse<CollaborationRequest>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🤝 Responding to collaboration request:', responseData);

      const { data, error } = await supabase
        .from('collaboration_requests')
        .update({
          status: responseData.response,
          response_message: responseData.responseMessage,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', responseData.requestId)
        .eq('creator_id', user.id) // Ensure only creator can respond
        .select(`
          *,
          requester:profiles!collaboration_requests_requester_id_fkey(
            id, display_name, username, avatar_url
          ),
          creator:profiles!collaboration_requests_creator_id_fkey(
            id, display_name, username, avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('❌ Error responding to collaboration request:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Responded to collaboration request:', data.id);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error responding to collaboration request:', error);
      return { success: false, error: 'Failed to respond to collaboration request' };
    }
  }
};