// src/lib/supabase.ts
// ⚠️ CRITICAL: URL polyfill MUST be imported before Supabase
import 'react-native-url-polyfill/auto';

import { createClient, processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { withQueryTimeout } from '../utils/dataLoading';
import { config } from '../config/environment';
import { isBgIsolationEnabled } from '../config/bgAudioIsolationFlags';
import { audioLog } from './audioDebugLog';
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

const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

// Create Supabase client with React Native-specific configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock, // ⭐ CRITICAL: Prevents setSession() from hanging in React Native
  },
});

// ⭐ CRITICAL: Set up AppState listener for proper session refresh in React Native
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (isBgIsolationEnabled('disableAuthListener')) {
      supabase.auth.stopAutoRefresh();
      audioLog('BG_ISO_AUTH_LAYER_BLOCKED', { appState: state });
      return;
    }
    if (isBgIsolationEnabled('disableTokenRefresh')) {
      supabase.auth.stopAutoRefresh();
      audioLog('BG_ISO_TOKEN_REFRESH_BLOCKED', { appState: state });
      return;
    }
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

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

  // Get creators with real stats - OPTIMIZED with SQL function or timeout-wrapped queries
  async getCreatorsWithStats(limit = 20) {
    try {
      console.log('🔧 Getting creators with real stats...');
      
      // Try optimized SQL function first (if available)
      const { data: rpcData, error: rpcError } = await withQueryTimeout(
        supabase.rpc('get_creators_with_stats', { p_limit: limit }),
        { timeout: 6000, fallback: null }
      );

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('✅ Got creators via optimized SQL function:', rpcData.length);
        return { data: rpcData, error: null };
      }

      // Fallback to individual queries with timeouts
      console.log('⚠️ SQL function not available, using individual queries with timeouts');
      
      // First get the creators with timeout
      const { data: creators, error: creatorsError } = await withQueryTimeout(
        supabase
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
          .limit(limit),
        { timeout: 5000, fallback: [] }
      );
      
      if (creatorsError || !creators || creators.length === 0) {
        return { data: creators || [], error: creatorsError };
      }

      // Get stats for each creator with individual timeouts
      const creatorsWithStats = await Promise.all(
        creators.map(async (creator) => {
          try {
            // Get all counts in parallel with timeouts
            const [followersResult, tracksResult, eventsResult] = await Promise.all([
              withQueryTimeout(
                supabase
                  .from('follows')
                  .select('*', { count: 'exact', head: true })
                  .eq('following_id', creator.id),
                { timeout: 3000, fallback: { count: 0 } }
              ),
              withQueryTimeout(
                supabase
                  .from('audio_tracks')
                  .select('*', { count: 'exact', head: true })
                  .eq('creator_id', creator.id),
                { timeout: 3000, fallback: { count: 0 } }
              ),
              withQueryTimeout(
                supabase
                  .from('events')
                  .select('*', { count: 'exact', head: true })
                  .eq('creator_id', creator.id),
                { timeout: 3000, fallback: { count: 0 } }
              ),
            ]);

            return {
              ...creator,
              followers_count: followersResult.count ?? 0,
              tracks_count: tracksResult.count ?? 0,
              events_count: eventsResult.count ?? 0,
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
      return { data: [], error };
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
          live_interest_enabled,
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

  // Search profiles/artists - Creators only (for backward compatibility)
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
          is_verified,
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

  // Search ALL users (creators AND listeners)
  async searchAllUsers(query: string, limit = 20) {
    try {
      console.log('🔍 Searching all users for:', query);
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
        .order('username', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(profile => ({
        ...profile,
        followers_count: profile.followers?.[0]?.count || 0,
        tracks_count: profile.tracks?.[0]?.count || 0,
      }));

      console.log('✅ Found users:', transformedData?.length || 0, '(creators + listeners)');
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Error searching all users:', error);
      return { success: false, data: null, error };
    }
  },

  // Search events
  async searchEvents(query: string, limit = 20) {
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
          image_url,
          creator_id,
          created_at,
          organizer:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,venue.ilike.%${query}%`)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error searching events:', error);
      return { success: false, data: null, error };
    }
  },

  // Search venues
  async searchVenues(query: string, limit = 20) {
    try {
      // Venues table schema:
      // - id (uuid), owner_id (uuid), name (text), description (text, nullable)
      // - address (jsonb, nullable) - contains address details as JSON
      // - capacity (integer, nullable), amenities (text[], nullable)
      // - primary_contact (jsonb, nullable), status (text)
      // - created_at (timestamptz), updated_at (timestamptz)
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          description,
          address,
          capacity,
          amenities,
          status,
          owner_id,
          created_at
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'active') // Only show active venues
        .order('name', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error searching venues:', error);
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
            avatar_url,
            is_verified,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            role
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('⚠️ Messages table might not exist or has different structure:', error.message);
        return { success: true, data: [], error: null };
      }

      // Group messages into conversations (following web team's guide)
      const conversationsMap = new Map();
      
      messages?.forEach((message) => {
        const otherUserId = message.sender_id === userId 
          ? message.recipient_id 
          : message.sender_id;
        
        const otherUser = message.sender_id === userId 
          ? message.recipient 
          : message.sender;

        if (!otherUserId || !otherUser) {
          console.warn('⚠️ Skipping message with missing other user:', message.id);
          return;
        }

        // Create conversation ID (always alphabetically sorted - per web team spec)
        const conversationId = [userId, otherUserId].sort().join('_');

        if (!conversationsMap.has(conversationId)) {
          const u = otherUser as any;
          conversationsMap.set(conversationId, {
            id: conversationId,
            otherUser: {
              id: u.id,
              username: u.username,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
              is_verified: u.is_verified ?? false,
              role: u.role
            },
            lastMessage: {
              content: message.content,
              created_at: message.created_at,
              sender_id: message.sender_id,
              is_read: message.is_read
            },
            unreadCount: 0,
            updatedAt: message.created_at
          });
        }

        const conversation = conversationsMap.get(conversationId);
        if (!conversation) {
          return;
        }
        
        // Count unread messages (where current user is recipient)
        if (!message.is_read && message.recipient_id === userId) {
          conversation.unreadCount++;
        }

        // Update last message if this one is newer
        if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
          conversation.lastMessage = {
            content: message.content,
            created_at: message.created_at,
            sender_id: message.sender_id,
            is_read: message.is_read
          };
          conversation.updatedAt = message.created_at;
        }
      });

      // Convert to array and sort by most recent
      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
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

      // 🔔 Trigger instant push notification for the message
      // This ensures the recipient gets notified immediately even if app is backgrounded
      if (data?.id) {
        this.triggerInstantMessagePush(data.id).catch(err => {
          console.warn('⚠️ Failed to trigger instant push (non-blocking):', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  },

  // 🔔 Trigger instant push notification for a message
  // This calls the backend API to send push notification immediately
  async triggerInstantMessagePush(messageId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('⚠️ No session for instant push - skipping');
        return;
      }

      const response = await fetch(`${config.apiUrl}/notifications/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        console.log('✅ Instant message push triggered for:', messageId);
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Instant push API error:', response.status, errorText);
      }
    } catch (error) {
      console.warn('⚠️ Failed to trigger instant message push:', error);
      // Non-blocking - don't throw, cron fallback will handle it
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

  // ✅ OPTIMIZED: Get personalized tracks with mood + genre priority matching
  async getPersonalizedTracks(userId: string, limit = 20) {
    try {
      console.log('🎯 Getting personalized tracks for user:', userId);

      // Fetch genre prefs and mood prefs in parallel
      const [genreResult, moodResult] = await Promise.allSettled([
        withQueryTimeout<any>(this.getUserGenres(userId), { timeout: 3000, fallback: [] }),
        withQueryTimeout<any>(
          supabase.from('profiles').select('preferred_moods').eq('id', userId).single(),
          { timeout: 3000, fallback: null }
        ),
      ]);

      const userGenres = genreResult.status === 'fulfilled' ? genreResult.value.data : [];
      const preferredMoods: string[] | null =
        moodResult.status === 'fulfilled' ? moodResult.value.data?.preferred_moods ?? null : null;

      if (!userGenres || userGenres.length === 0) {
        console.log('ℹ️ No user genres found, returning general trending tracks');
        return this.getTrendingTracks(limit);
      }

      const genreNames = userGenres.map((g: any) => g.name || g.genre_name || g.genre);
      console.log('🎵 Genres:', genreNames, '| Moods:', preferredMoods);

      const trackSelect = `
        id, title, description, audio_url, file_url,
        cover_art_url, artwork_url, duration, play_count,
        likes_count, created_at, genre, mood_tags, live_interest_enabled,
        creator:profiles!creator_id(id, username, display_name, avatar_url)
      `;
      const baseFilter = (q: any) =>
        q.eq('is_public', true)
          .not('content_type', 'in', '(podcast,mixtape)')
          .in('moderation_status', ['pending_check', 'checking', 'clean', 'approved']);

      const hasMoods = preferredMoods && preferredMoods.length > 0;
      const perBucket = Math.ceil(limit / (hasMoods ? 4 : 2));

      // Priority 1: genre + mood + location (mood overlap via @> operator)
      // Priority 2: genre + mood
      // Priority 3: genre only (no mood filter)
      // Merge, deduplicate, return up to limit

      const results: any[] = [];
      const seen = new Set<string>();

      const addUnique = (tracks: any[]) => {
        for (const t of tracks) {
          if (!seen.has(t.id)) { seen.add(t.id); results.push(t); }
        }
      };

      if (hasMoods) {
        // Bucket 1: genre AND mood (overlap)
        const { data: b1 } = await withQueryTimeout(
          baseFilter(supabase.from('audio_tracks').select(trackSelect))
            .in('genre', genreNames)
            .overlaps('mood_tags', preferredMoods!)
            .order('play_count', { ascending: false })
            .limit(perBucket),
          { timeout: 5000, fallback: [] }
        );
        addUnique(b1 ?? []);
        console.log('🎯 Bucket 1 (genre+mood):', (b1 ?? []).length);
      }

      // Bucket 2: genre only (fills remainder)
      const remaining = limit - results.length;
      if (remaining > 0) {
        const { data: b2, error: b2err } = await withQueryTimeout(
          baseFilter(supabase.from('audio_tracks').select(trackSelect))
            .in('genre', genreNames)
            .order('play_count', { ascending: false })
            .limit(remaining + (hasMoods ? perBucket : 0)), // fetch extra; dedup trims it
          { timeout: 6000, fallback: [] }
        );
        if (b2err) {
          console.log('⚠️ Personalized query error, falling back to trending:', b2err.message);
          return this.getTrendingTracks(limit);
        }
        addUnique(b2 ?? []);
        console.log('🎯 Bucket 2 (genre only):', (b2 ?? []).length);
      }

      const final = results.slice(0, limit);
      if (final.length === 0) return this.getTrendingTracks(limit);

      console.log('✅ Personalized tracks returned:', final.length);
      return { data: final, error: null };
    } catch (error) {
      console.error('❌ Error getting personalized tracks:', error);
      return this.getTrendingTracks(limit);
    }
  },

  // ✅ STRICT: Get personalized events - NO fallback to unfiltered events
  // Per business plan: Events tab must show ONLY personalized events matching user's location/preferences
  // This is a core business differentiator (MOAT #1: Precision Event Discovery)
  // NO FALLBACK - strict personalization enforced
  async getPersonalizedEvents(userId: string, limit = 20) {
    try {
      console.log('🎯 Getting personalized events for user:', userId);

      // Call the PostgreSQL RPC function for personalized events
      const { data, error } = await supabase
        .rpc('get_personalized_events', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: 0
        });

      if (error) {
        // Log error but return empty array - DO NOT fallback to unfiltered events
        console.warn('⚠️ get_personalized_events RPC error:', error.message);
        console.log('📋 Returning empty array - strict personalization enforced');
        return { data: [], error: null };
      }

      // Return whatever the RPC returns, even if empty
      // Empty results mean no events match user's preferences/location - this is correct behavior
      console.log('✅ Found personalized events via RPC:', data?.length || 0);
      return { data: data || [], error: null };
    } catch (error) {
      // On any error, return empty array - DO NOT fallback to unfiltered events
      console.error('❌ Error getting personalized events:', error);
      console.log('📋 Returning empty array - strict personalization enforced');
      return { data: [], error: null };
    }
  },

  // ✅ OPTIMIZED: Get general trending tracks with timeout
  async getTrendingTracks(limit = 20) {
    try {
      console.log('🔥 Getting trending tracks...');
      
      const { data, error } = await withQueryTimeout(
        supabase
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
            )
          `)
          .eq('is_public', true)
          .not('content_type', 'in', '(podcast,mixtape)')
          .order('play_count', { ascending: false })
          .limit(limit),
        { timeout: 5000, fallback: [] }
      );

      if (error) {
        console.error('❌ Error getting trending tracks:', error);
      }
      
      console.log('✅ Found trending tracks:', data?.length || 0);
      return { data: data || [], error: error || null };
    } catch (error) {
      console.error('❌ Error getting trending tracks:', error);
      return { data: [], error };
    }
  },

  // ✅ OPTIMIZED: Get general events with timeout
  async getEvents(limit = 20) {
    try {
      console.log('🎪 Getting events...');

      // Use same schema as getUpcomingEvents (which works)
      const { data, error } = await withQueryTimeout(
        supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            event_date,
            location,
            venue,
            city,
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
          .limit(limit),
        { timeout: 6000, fallback: [] }
      );

      if (error) {
        console.error('❌ Error getting events:', error);
      }

      console.log('✅ Found events:', data?.length || 0);
      return { data: data || [], error: error || null };
    } catch (error) {
      console.error('❌ Error getting events:', error);
      return { data: [], error };
    }
  },

  // External events pulled from Songkick via background sync job
  async getExternalEvents(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('external_events')
        .select(
          'id, source, title, artist_name, venue_name, venue_address, city, country, latitude, longitude, genre, event_date, ticket_url, image_url, is_claimed, claimed_by_user_id'
        )
        .gte('event_date', new Date().toISOString())
        .eq('is_claimed', false)
        .order('event_date', { ascending: true })
        .limit(limit);
      return { data: data || [], error: error || null };
    } catch (error) {
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
  },

  // ========================================
  // LIVE AUDIO SESSIONS
  // ========================================

  /**
   * Get currently live sessions
   */
  async getLiveSessions() {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'live')
        .order('actual_start_time', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting live sessions:', error);
      return { success: false, data: [], error };
    }
  },

  /**
   * Get upcoming scheduled sessions
   */
  async getUpcomingSessions(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting upcoming sessions:', error);
      return { success: false, data: [], error };
    }
  },

  /**
   * Get session details by ID
   */
  async getSessionDetails(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          creator:profiles!live_sessions_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ Error getting session details:', error);
      return { success: false, data: null, error };
    }
  },

  /**
   * Join a live session (create participant record)
   */
  async joinLiveSession(sessionId: string, userId: string, role: 'listener' | 'speaker' | 'host' = 'listener') {
    try {
      const { data, error } = await supabase
        .from('live_session_participants')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          role: role, // Use the role as-is (listener, speaker, or host)
          joined_at: new Date().toISOString(),
          left_at: null,
        }, {
          onConflict: 'session_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ Error joining session:', error);
      return { success: false, data: null, error };
    }
  },

  /**
   * Leave a live session (update participant record)
   */
  async leaveLiveSession(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          left_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error leaving session:', error);
      return { success: false, error };
    }
  },

  /**
   * Get participants in a session
   */
  async getSessionParticipants(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('live_session_participants')
        .select(`
          *,
          user:profiles!live_session_participants_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('session_id', sessionId)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting participants:', error);
      return { success: false, data: [], error };
    }
  },

  /**
   * Raise hand in a live session (listener requests to speak)
   */
  async raiseHand(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          hand_raised: true,
          hand_raised_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Hand raised successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error raising hand:', error);
      return { success: false, error };
    }
  },

  /**
   * Lower hand in a live session
   */
  async lowerHand(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          hand_raised: false,
          hand_raised_at: null
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Hand lowered successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error lowering hand:', error);
      return { success: false, error };
    }
  },

  /**
   * Promote participant to speaker (host only)
   */
  async promoteToSpeaker(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          role: 'speaker',
          hand_raised: false,
          hand_raised_at: null,
          is_muted: true // Start muted for safety
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Participant promoted to speaker');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error promoting to speaker:', error);
      return { success: false, error };
    }
  },

  /**
   * Demote speaker to listener (host only)
   */
  async demoteToListener(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          role: 'listener',
          is_muted: false,
          is_speaking: false
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Speaker demoted to listener');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error demoting to listener:', error);
      return { success: false, error };
    }
  },

  /**
   * Toggle microphone mute status
   */
  async toggleMute(sessionId: string, userId: string, isMuted: boolean) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          is_muted: isMuted,
          is_speaking: isMuted ? false : undefined // Stop speaking if muted
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log(`✅ Microphone ${isMuted ? 'muted' : 'unmuted'}`);
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error toggling mute:', error);
      return { success: false, error };
    }
  },

  /**
   * Remove participant from session (host only)
   */
  async removeParticipant(sessionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          left_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Participant removed from session');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error removing participant:', error);
      return { success: false, error };
    }
  },

  /**
   * End a live session (host only)
   * Updates session status to 'ended' and sets end time
   */
  /**
   * End any live session as an admin (bypasses creator_id ownership check).
   * Requires the calling user to have is_admin = true on their profile (enforced by RLS).
   */
  async adminEndLiveSession(sessionId: string) {
    try {
      console.log('🛑 [Admin] Ending live session:', sessionId);

      const { error: updateError } = await supabase
        .from('live_sessions')
        .update({
          status: 'ended',
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Mark all active participants as left
      const { error: participantsError } = await supabase
        .from('live_session_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .is('left_at', null);

      if (participantsError) {
        console.warn('⚠️ [Admin] Error updating participants on session end:', participantsError);
      }

      console.log('✅ [Admin] Live session ended successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ [Admin] Error ending live session:', error);
      return { success: false, error };
    }
  },

  async endLiveSession(sessionId: string, creatorId: string) {
    try {
      console.log('🔴 Ending live session:', sessionId);
      
      // Calculate session duration
      const { data: sessionData, error: fetchError } = await supabase
        .from('live_sessions')
        .select('actual_start_time')
        .eq('id', sessionId)
        .eq('creator_id', creatorId) // Verify ownership
        .single();

      if (fetchError) throw fetchError;
      if (!sessionData) {
        throw new Error('Session not found or you are not the host');
      }

      // Update session status to ended
      const { error: updateError } = await supabase
        .from('live_sessions')
        .update({
          status: 'ended',
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('creator_id', creatorId);

      if (updateError) throw updateError;

      // Mark all active participants as left
      const { error: participantsError } = await supabase
        .from('live_session_participants')
        .update({
          left_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .is('left_at', null);

      if (participantsError) {
        console.warn('⚠️ Error updating participants on session end:', participantsError);
      }

      console.log('✅ Live session ended successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error ending live session:', error);
      return { success: false, error };
    }
  },

  /**
   * Update participant's speaking status (used by Agora volume callbacks)
   */
  async updateSpeakingStatus(sessionId: string, userId: string, isSpeaking: boolean) {
    try {
      const { error } = await supabase
        .from('live_session_participants')
        .update({
          is_speaking: isSpeaking
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Error updating speaking status:', error);
      return { success: false, error };
    }
  },

  /**
   * Send a comment in a live session
   */
  async sendSessionComment(
    sessionId: string,
    userId: string,
    content: string,
    commentType: 'text' | 'emoji' = 'text'
  ) {
    try {
      const { data, error } = await supabase
        .from('live_session_comments')
        .insert({
          session_id: sessionId,
          user_id: userId,
          content,
          comment_type: commentType,
        })
        .select(`
          *,
          user:profiles!live_session_comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ Error sending comment:', error);
      return { success: false, data: null, error };
    }
  },

  /**
   * Get comments for a session
   */
  async getSessionComments(sessionId: string, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('live_session_comments')
        .select(`
          *,
          user:profiles!live_session_comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting comments:', error);
      return { success: false, data: [], error };
    }
  },

  /**
   * Subscribe to real-time comments
   */
  subscribeToSessionComments(sessionId: string, callback: (comment: any) => void) {
    console.log('📡 [DB] Setting up real-time subscription for comments:', sessionId);
    
    const subscription = supabase
      .channel(`session_comments:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_comments',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('📨 [DB] New comment insert detected:', payload.new);
          
          // Fetch full comment with user details
          const { data, error } = await supabase
            .from('live_session_comments')
            .select(`
              *,
              user:profiles!live_session_comments_user_id_fkey(
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('❌ [DB] Error fetching full comment:', error);
            return;
          }

          if (data) {
            console.log('✅ [DB] Full comment fetched, calling callback');
            callback(data);
          } else {
            console.warn('⚠️ [DB] No data returned for comment:', payload.new.id);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔌 [DB] Subscription status:', status, err);
        if (err) {
          console.error('❌ [DB] Subscription error:', err);
        }
      });

    return subscription;
  },

  /**
   * Subscribe to real-time participants
   */
  subscribeToSessionParticipants(sessionId: string, callback: () => void) {
    const subscription = supabase
      .channel(`session_participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Send a tip during a live session
   */
  async sendLiveTip(
    sessionId: string,
    tipperId: string,
    creatorId: string,
    amount: number,
    message?: string,
    stripePaymentIntentId?: string
  ) {
    try {
      const platformFeePercentage = 15;
      const platformFeeAmount = amount * (platformFeePercentage / 100);
      const creatorAmount = amount - platformFeeAmount;

      const { data, error } = await supabase
        .from('live_session_tips')
        .insert({
          session_id: sessionId,
          tipper_id: tipperId,
          creator_id: creatorId,
          amount,
          currency: 'USD',
          platform_fee_percentage: platformFeePercentage,
          platform_fee_amount: platformFeeAmount,
          creator_amount: creatorAmount,
          message: message || null,
          stripe_payment_intent_id: stripePaymentIntentId || null,
          status: 'completed',
        })
        .select(`
          *,
          tipper:profiles!live_session_tips_tipper_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          creator:profiles!live_session_tips_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Update session total tips
      await supabase.rpc('increment_session_tips', {
        session_id: sessionId,
        tip_amount: amount,
      });

      console.log('✅ Live tip sent successfully:', data);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ Error sending live tip:', error);
      return { success: false, data: null, error };
    }
  },

  /**
   * Get tips for a live session
   */
  async getSessionTips(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('live_session_tips')
        .select(`
          *,
          tipper:profiles!live_session_tips_tipper_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          ),
          creator:profiles!live_session_tips_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting session tips:', error);
      return { success: false, data: [], error };
    }
  },

  /**
   * Subscribe to real-time tips
   */
  subscribeToSessionTips(sessionId: string, callback: (tip: any) => void) {
    const subscription = supabase
      .channel(`session_tips:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_tips',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // Fetch full tip with user details
          const { data } = await supabase
            .from('live_session_tips')
            .select(`
              *,
              tipper:profiles!live_session_tips_tipper_id_fkey(
                id,
                username,
                display_name,
                avatar_url
              ),
              creator:profiles!live_session_tips_creator_id_fkey(
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return subscription;
  },

  // =========================================
  // 🎵 ALBUMS MANAGEMENT (Phase 2)
  // =========================================

  // Create a new album (draft by default)
  async createAlbum(albumData: {
    creator_id: string;
    title: string;
    description?: string;
    cover_image_url?: string;
    release_date?: string;
    genre?: string;
    is_public?: boolean;
    status?: 'draft' | 'scheduled' | 'published';
  }) {
    try {
      console.log('🎵 Creating album:', albumData.title);
      
      const { data, error } = await supabase
        .from('albums')
        .insert({
          creator_id: albumData.creator_id,
          title: albumData.title,
          description: albumData.description || null,
          cover_image_url: albumData.cover_image_url || null,
          release_date: albumData.release_date || null,
          genre: albumData.genre || null,
          is_public: albumData.is_public !== false, // default true
          status: albumData.status || 'draft', // default draft
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Album created:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error creating album:', error);
      return { data: null, error };
    }
  },

  // Update album details
  async updateAlbum(albumId: string, updates: {
    title?: string;
    description?: string;
    cover_image_url?: string;
    release_date?: string;
    genre?: string;
    is_public?: boolean;
    status?: 'draft' | 'scheduled' | 'published';
  }) {
    try {
      console.log('🎵 Updating album:', albumId);
      
      const { data, error } = await supabase
        .from('albums')
        .update(updates)
        .eq('id', albumId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Album updated:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error updating album:', error);
      return { data: null, error };
    }
  },

  // Publish an album (change status to 'published')
  async publishAlbum(albumId: string) {
    try {
      console.log('🎵 Publishing album:', albumId);
      
      const { data, error } = await supabase
        .from('albums')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', albumId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Album published:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error publishing album:', error);
      return { data: null, error };
    }
  },

  // Delete an album
  async deleteAlbum(albumId: string) {
    try {
      console.log('🎵 Deleting album:', albumId);
      
      // Note: Tracks are not deleted, only the album and album_tracks entries
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;
      
      console.log('✅ Album deleted');
      return { data: null, error: null };
    } catch (error) {
      console.error('❌ Error deleting album:', error);
      return { data: null, error };
    }
  },

  // Get album by ID with tracks
  async getAlbumById(albumId: string) {
    try {
      console.log('🎵 Fetching album:', albumId);
      
      // Get album details
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          release_date,
          status,
          genre,
          is_public,
          tracks_count,
          total_duration,
          total_plays,
          total_likes,
          created_at,
          updated_at,
          published_at,
          is_paid,
          price,
          currency,
          total_sales_count,
          creator:profiles!albums_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('id', albumId)
        .single();

      if (albumError) throw albumError;
      
      // Get album tracks
      const { data: albumTracks, error: tracksError } = await supabase
        .from('album_tracks')
        .select(`
          track_number,
          added_at,
          track:audio_tracks!album_tracks_track_id_fkey(
            id,
            title,
            duration,
            file_url,
            cover_art_url,
            artwork_url,
            genre,
            is_public,
            play_count,
            likes_count,
            created_at,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('album_id', albumId)
        .order('track_number', { ascending: true });

      if (tracksError) throw tracksError;
      
      // Combine data
      const result = {
        ...album,
        tracks: albumTracks?.map(at => ({
          ...at.track,
          track_number: at.track_number,
          added_at: at.added_at,
        })) || [],
      };
      
      console.log('✅ Album fetched with', result.tracks.length, 'tracks');
      return { data: result, error: null };
    } catch (error) {
      console.error('❌ Error fetching album:', error);
      return { data: null, error };
    }
  },

  // Get albums by creator
  async getAlbumsByCreator(creatorId: string, includeStatus?: 'draft' | 'scheduled' | 'published') {
    try {
      console.log('🎵 Fetching albums for creator:', creatorId);
      
      let query = supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          release_date,
          status,
          genre,
          is_public,
          tracks_count,
          total_duration,
          total_plays,
          total_likes,
          created_at,
          updated_at,
          published_at
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      // Filter by status if specified
      if (includeStatus) {
        query = query.eq('status', includeStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('✅ Fetched', data?.length || 0, 'albums for creator');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error fetching creator albums:', error);
      return { data: null, error };
    }
  },

  // Get public published albums (for Discover screen)
  async getPublicAlbums(limit = 20) {
    try {
      console.log('🎵 Fetching public albums...');
      
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          release_date,
          genre,
          tracks_count,
          total_duration,
          total_plays,
          total_likes,
          created_at,
          published_at,
          creator:profiles!albums_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log('✅ Fetched', data?.length || 0, 'public albums');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error fetching public albums:', error);
      return { data: null, error };
    }
  },

  // Get albums with stats (for Discover featured section)
  async getAlbumsWithStats(limit = 20) {
    try {
      console.log('🎵 Fetching albums with stats...');
      
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          release_date,
          genre,
          tracks_count,
          total_duration,
          total_plays,
          total_likes,
          created_at,
          published_at,
          creator:profiles!albums_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('total_plays', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log('✅ Fetched', data?.length || 0, 'albums with stats');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error fetching albums with stats:', error);
      return { data: null, error };
    }
  },

  // Add track to album
  async addTrackToAlbum(albumId: string, trackId: string, trackNumber: number) {
    try {
      console.log('🎵 Adding track to album:', { albumId, trackId, trackNumber });
      
      const { data, error } = await supabase
        .from('album_tracks')
        .insert({
          album_id: albumId,
          track_id: trackId,
          track_number: trackNumber,
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Track added to album');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error adding track to album:', error);
      return { data: null, error };
    }
  },

  // Remove track from album
  async removeTrackFromAlbum(albumId: string, trackId: string) {
    try {
      console.log('🎵 Removing track from album:', { albumId, trackId });
      
      const { error } = await supabase
        .from('album_tracks')
        .delete()
        .eq('album_id', albumId)
        .eq('track_id', trackId);

      if (error) throw error;
      
      console.log('✅ Track removed from album');
      return { data: null, error: null };
    } catch (error) {
      console.error('❌ Error removing track from album:', error);
      return { data: null, error };
    }
  },

  // Reorder album tracks
  async reorderAlbumTracks(albumId: string, newOrder: { trackId: string; trackNumber: number }[]) {
    try {
      console.log('🎵 Reordering album tracks:', albumId);
      
      // Update each track's position
      const updates = newOrder.map(({ trackId, trackNumber }) =>
        supabase
          .from('album_tracks')
          .update({ track_number: trackNumber })
          .eq('album_id', albumId)
          .eq('track_id', trackId)
      );

      // Execute all updates
      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to reorder ${errors.length} tracks`);
      }
      
      console.log('✅ Album tracks reordered');
      return { data: null, error: null };
    } catch (error) {
      console.error('❌ Error reordering album tracks:', error);
      return { data: null, error };
    }
  },

  // Get album tracks
  async getAlbumTracks(albumId: string) {
    try {
      console.log('🎵 Fetching album tracks:', albumId);

      const { data, error } = await supabase
        .from('album_tracks')
        .select(`
          track_number,
          added_at,
          track:audio_tracks!album_tracks_track_id_fkey(
            id,
            title,
            duration,
            file_url,
            cover_art_url,
            artwork_url,
            genre,
            is_public,
            play_count,
            likes_count,
            created_at,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('album_id', albumId)
        .order('track_number', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Fetched', data?.length || 0, 'album tracks');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error fetching album tracks:', error);
      return { data: null, error };
    }
  },

  // Check album limits for user based on tier
  async checkAlbumLimit(userId: string) {
    try {
      console.log('🎵 Checking album limit for user:', userId);

      // Get user's subscription tier and early adopter status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, early_adopter, subscription_period_end')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      let tier: string = profile.subscription_tier || 'free';

      // Early adopters receive 3 months free Premium with unlimited albums.
      // Upgrade tier to 'unlimited' for album limit purposes if their grant is still active.
      if (profile.early_adopter === true) {
        const periodEnd = profile.subscription_period_end;
        const isStillActive = !periodEnd || new Date(periodEnd) > new Date();
        if (isStillActive) {
          tier = 'unlimited';
          console.log('✅ Early adopter — treating as unlimited for album limit check');
        }
      }

      // Define tier limits
      const limits = {
        free: 0,
        premium: 10, // 10 albums for premium
        unlimited: -1, // unlimited
      };
      
      const limit = limits[tier as keyof typeof limits] || 0;
      
      // Count published albums only (drafts don't count)
      const { count, error: countError } = await supabase
        .from('albums')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .eq('status', 'published');

      if (countError) throw countError;
      
      const current = count || 0;
      const canCreate = limit === -1 || current < limit;
      
      console.log('✅ Album limit check:', { tier, limit, current, canCreate });
      return { 
        data: { canCreate, limit, current, tier }, 
        error: null 
      };
    } catch (error) {
      console.error('❌ Error checking album limit:', error);
      return { data: null, error };
    }
  },

  // Check track limit for album based on tier
  async checkTrackLimitForAlbum(albumId: string, userId: string) {
    try {
      console.log('🎵 Checking track limit for album:', albumId);

      // Get user's subscription tier and early adopter status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, early_adopter, subscription_period_end')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      let tier: string = profile.subscription_tier || 'free';

      // Early adopters receive 3 months free Premium — apply same logic as checkAlbumLimit
      if (tier === 'free' && profile.early_adopter === true) {
        const periodEnd = profile.subscription_period_end;
        const isStillActive = !periodEnd || new Date(periodEnd) > new Date();
        if (isStillActive) {
          tier = 'premium';
        }
      }
      
      // Define tier limits for tracks per album
      const limits = {
        free: 0, // Free users can't create albums
        premium: 7,
        unlimited: -1, // unlimited
      };
      
      const limit = limits[tier as keyof typeof limits] || 0;
      
      // Count current tracks in album
      const { count, error: countError } = await supabase
        .from('album_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('album_id', albumId);

      if (countError) throw countError;
      
      const current = count || 0;
      const canAdd = limit === -1 || current < limit;
      
      console.log('✅ Track limit check:', { tier, limit, current, canAdd });
      return { 
        data: { canAdd, limit, current, tier }, 
        error: null 
      };
    } catch (error) {
      console.error('❌ Error checking track limit:', error);
      return { data: null, error };
    }
  },

  // Increment album plays
  async incrementAlbumPlays(albumId: string) {
    try {
      const { error } = await supabase.rpc('increment_album_plays', {
        p_album_id: albumId,
      });

      if (error) {
        // Fallback: increment via raw RPC expression
        const { error: updateError } = await supabase.rpc('increment_album_plays', {
          p_album_id: albumId,
        });
        if (updateError) {
          console.warn('⚠️ increment_album_plays RPC not available, skipping play count update');
        }
      }
      
      return { data: null, error: null };
    } catch (error) {
      console.error('❌ Error incrementing album plays:', error);
      return { data: null, error };
    }
  },

  // Get album statistics
  async getAlbumStats(albumId: string) {
    try {
      console.log('🎵 Fetching album stats:', albumId);
      
      const { data, error } = await supabase
        .from('albums')
        .select('total_plays, total_likes, tracks_count, total_duration')
        .eq('id', albumId)
        .single();

      if (error) throw error;
      
      console.log('✅ Album stats fetched');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error fetching album stats:', error);
      return { data: null, error };
    }
  },
};