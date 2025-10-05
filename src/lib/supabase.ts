// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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


  // ✅ NEW: Get messages for a specific conversation
  async getMessages(userId: string, otherUserId: string) {
    try {
      console.log('💬 Fetching messages between:', userId, 'and', otherUserId);
      
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

      if (error) {
        console.log('⚠️ Messages table might not exist or has different structure:', error.message);
        return { data: [], error: null };
      }
      
      console.log('✅ Messages loaded:', data?.length || 0);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return { data: [], error };
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
  }
};