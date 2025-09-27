import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@soundbridge/types';
import { SUPABASE_CONFIG } from '../config/supabase';

// Use configuration from config file
const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration not set up for mobile app');
  console.error('Please update src/config/supabase.ts with your Supabase credentials');
  throw new Error('Supabase configuration not set up. Please update src/config/supabase.ts');
}

// Create Supabase client for React Native with AsyncStorage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable to detect OAuth session
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// Auth service for mobile app
export class MobileAuthService {
  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, data: null, error };
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, metadata?: any) {
    try {
      console.log('🔧 MOBILE SIGNUP: Starting signup process');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          // Let Supabase use default email redirect (will go to /auth/callback)
          // Our smart callback route will handle mobile detection and redirect
        },
      });
      
      console.log('🔧 MOBILE SIGNUP: Supabase response:', { data: !!data, error: !!error });
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, data: null, error };
    }
  }

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'apple') {
    try {
      console.log(`🔐 Attempting ${provider} sign in...`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: 'soundbridge://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error(`${provider} OAuth error:`, error);
        // If OAuth isn't configured, provide helpful message
        if (error.message.includes('Provider not found') || error.message.includes('400')) {
          return { 
            success: false, 
            data: null, 
            error: new Error(`${provider} authentication is not configured yet. Please use email/password for now.`) 
          };
        }
        throw error;
      }
      
      console.log(`✅ ${provider} OAuth initiated successfully`);
      return { success: true, data, error: null };
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      return { success: false, data: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
  }

  // Get current session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return { success: true, session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { success: false, session: null, error };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      return { success: true, user, error: null };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, user: null, error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Password reset
  async resetPassword(email: string) {
    try {
      console.log('🔐 Sending password reset email to:', email);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'soundbridge://auth/reset-password',
      });
      
      if (error) throw error;
      
      console.log('✅ Password reset email sent successfully');
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, data: null, error };
    }
  }

  // Update password
  async updatePassword(newPassword: string) {
    try {
      console.log('🔐 Updating user password...');
      
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      console.log('✅ Password updated successfully');
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, data: null, error };
    }
  }

  // Resend email confirmation
  async resendConfirmation(email: string) {
    try {
      console.log('🔐 Resending confirmation email to:', email);
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) throw error;
      
      console.log('✅ Confirmation email resent successfully');
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { success: false, data: null, error };
    }
  }
}

// Export singleton instance
export const authService = new MobileAuthService();

// Database helper functions for mobile
export const db = {
  // Direct access to supabase client
  supabase,

  // Helper function to get proper storage URLs
  getStorageUrl(bucket: string, path: string | null): string | null {
    if (!path) return null;
    
    // If path is already a full URL, return as is
    if (path.startsWith('http')) {
      console.log('🔗 URL already full:', path);
      return path;
    }
    
    // Generate public URL for storage access
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    console.log(`🔗 Generated URL for ${bucket}/${path}:`, data.publicUrl);
    return data.publicUrl;
  },
  // Get user profile
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, data: null, error };
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get audio tracks
  async getAudioTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      console.log('🎵 Raw recent tracks data:', JSON.stringify(data?.slice(0, 1), null, 2)); // Log first track for debugging
      
      // Transform data to ensure proper URL format and add cover art
      const transformedData = data?.map(track => {
        console.log(`🎵 Processing recent track: ${track.title}, file_url: ${track.file_url}, cover_art_url: ${track.cover_art_url}, duration: ${track.duration}`);
        
        const transformed = {
          ...track,
          audio_url: track.file_url, // Map file_url to audio_url for compatibility
          cover_image_url: track.cover_art_url || 'https://picsum.photos/300/300?random=' + track.id, // Map cover_art_url to cover_image_url for compatibility
          // Web app uses likes_count, comments_count, shares_count (already correct)
          plays_count: track.play_count,
          // Keep original URLs as they should already be complete
          file_url: track.file_url,
          artwork_url: track.cover_art_url || 'https://picsum.photos/300/300?random=' + track.id, // Map to artwork_url for mobile compatibility
        };
        
        console.log(`🎵 Transformed recent track - audio_url: ${transformed.audio_url}, cover_image_url: ${transformed.cover_image_url}, cover_art_url: ${track.cover_art_url}`);
        return transformed;
      });
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Get audio tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get trending tracks
  async getTrendingTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      console.log('🎵 Raw trending tracks data:', JSON.stringify(data?.slice(0, 1), null, 2)); // Log first track for debugging
      
      // Transform data to ensure proper URL format and add cover art
      const transformedData = data?.map(track => {
        console.log(`🎵 Processing track: ${track.title}, file_url: ${track.file_url}, cover_art_url: ${track.cover_art_url}, duration: ${track.duration}`);
        
        const transformed = {
          ...track,
          audio_url: track.file_url, // Map file_url to audio_url for compatibility
          cover_image_url: track.cover_art_url || 'https://picsum.photos/300/300?random=' + track.id, // Map cover_art_url to cover_image_url for compatibility
          // Web app uses likes_count, comments_count, shares_count (already correct)
          plays_count: track.play_count,
          // Keep original URLs as they should already be complete
          file_url: track.file_url,
          artwork_url: track.cover_art_url || 'https://picsum.photos/300/300?random=' + track.id, // Map to artwork_url for mobile compatibility
        };
        
        console.log(`🎵 Transformed track - audio_url: ${transformed.audio_url}, cover_image_url: ${transformed.cover_image_url}, cover_art_url: ${track.cover_art_url}`);
        return transformed;
      });
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Get trending tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get events
  async getEvents(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(*)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get events error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get notifications
  async getNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, data: null, error };
    }
  },

  // Search functionality
  async searchTracks(query: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .or(`title.ilike.%${query}%, description.ilike.%${query}%, tags.cs.{${query}}`)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Transform data to ensure proper URL format and add cover art
      const transformedData = data?.map(track => ({
        ...track,
        audio_url: track.file_url, // Map file_url to audio_url for compatibility
        cover_image_url: track.cover_art_url, // Map cover_art_url to cover_image_url for compatibility
        plays_count: track.play_count,
        // Ensure proper Supabase signed URLs for storage files
        file_url: track.file_url ? this.getStorageUrl('audio-tracks', track.file_url) : null,
        artwork_url: track.cover_art_url ? this.getStorageUrl('cover-art', track.cover_art_url) : null,
      }));
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Search tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  async searchProfiles(query: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%, display_name.ilike.%${query}%, bio.ilike.%${query}%`)
        .order('followers_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Search profiles error:', error);
      return { success: false, data: null, error };
    }
  },

  // Track interactions
  async likeTrack(userId: string, trackId: string) {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('track_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('track_likes')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', trackId);

        if (error) throw error;

        // Decrement like count
        await supabase.rpc('decrement_track_likes', { track_id: trackId });
        
        return { success: true, liked: false, error: null };
      } else {
        // Like
        const { error } = await supabase
          .from('track_likes')
          .insert({ user_id: userId, track_id: trackId });

        if (error) throw error;

        // Increment like count
        await supabase.rpc('increment_track_likes', { track_id: trackId });
        
        return { success: true, liked: true, error: null };
      }
    } catch (error) {
      console.error('Like track error:', error);
      return { success: false, liked: false, error };
    }
  },

  async incrementPlayCount(trackId: string) {
    try {
      const { error } = await supabase.rpc('increment_track_plays', { track_id: trackId });
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Increment play count error:', error);
      return { success: false, error };
    }
  },

  // Follow functionality
  async followUser(followerId: string, followingId: string) {
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);

        if (error) throw error;

        // Update counts
        await Promise.all([
          supabase.rpc('decrement_follower_count', { user_id: followingId }),
          supabase.rpc('decrement_following_count', { user_id: followerId })
        ]);
        
        return { success: true, following: false, error: null };
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: followerId, following_id: followingId });

        if (error) throw error;

        // Update counts
        await Promise.all([
          supabase.rpc('increment_follower_count', { user_id: followingId }),
          supabase.rpc('increment_following_count', { user_id: followerId })
        ]);
        
        return { success: true, following: true, error: null };
      }
    } catch (error) {
      console.error('Follow user error:', error);
      return { success: false, following: false, error };
    }
  },

  // Get user's tracks
  async getUserTracks(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('creator_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Transform data to ensure proper URL format and add cover art
      const transformedData = data?.map(track => ({
        ...track,
        audio_url: track.file_url, // Map file_url to audio_url for compatibility
        cover_image_url: track.cover_art_url, // Map cover_art_url to cover_image_url for compatibility
        plays_count: track.play_count,
        // Ensure proper Supabase signed URLs for storage files
        file_url: track.file_url ? this.getStorageUrl('audio-tracks', track.file_url) : null,
        artwork_url: track.cover_art_url ? this.getStorageUrl('cover-art', track.cover_art_url) : null,
      }));
      
      return { success: true, data: transformedData, error: null };
    } catch (error) {
      console.error('Get user tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get user's liked tracks
  async getUserLikedTracks(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('track_likes')
        .select(`
          audio_tracks (
            *,
            creator:profiles(*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get user liked tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  // Get tracks by genre
  async getTracksByGenre(genre: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('genre', genre)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get tracks by genre error:', error);
      return { success: false, data: null, error };
    }
  },

  // Comments functionality
  async getTrackComments(trackId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('track_id', trackId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get track comments error:', error);
      return { success: false, data: null, error };
    }
  },

  async addComment(userId: string, trackId: string, content: string) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: userId,
          track_id: trackId,
          content: content
        })
        .select(`
          *,
          user:profiles(*)
        `)
        .single();
      
      if (error) throw error;

      // Increment comment count
      await supabase.rpc('increment_track_comments', { track_id: trackId });
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Add comment error:', error);
      return { success: false, data: null, error };
    }
  },

  // Featured content
  async getFeaturedTracks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles(*)
        `)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get featured tracks error:', error);
      return { success: false, data: null, error };
    }
  },

  async getFeaturedCreators(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get featured creators error:', error);
      return { success: false, data: null, error };
    }
  },

  // Messages functionality  
  async getConversations(userId: string) {
    try {
      // Get unique conversation partners from messages (web app uses messages table, not conversations)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          sender_id,
          recipient_id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id, username, display_name, avatar_url
          ),
          recipient:profiles!messages_recipient_id_fkey(
            id, username, display_name, avatar_url
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner to create conversation-like structure
      const conversationsMap = new Map();
      data?.forEach((message: any) => {
        const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
        const otherUser = message.sender_id === userId ? message.recipient : message.sender;
        
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            id: `${userId}-${otherUserId}`,
            participant1_id: userId,
            participant2_id: otherUserId,
            participant1: null,
            participant2: otherUser,
            last_message: [message],
            updated_at: message.created_at
          });
        }
      });

      const conversations = Array.from(conversationsMap.values());
      return { success: true, data: conversations, error: null };
    } catch (error) {
      console.error('Get conversations error:', error);
      return { success: false, data: null, error };
    }
  },

  async getMessages(conversationId: string, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Get messages error:', error);
      return { success: false, data: null, error };
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string, messageType = 'text') {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content,
          message_type: messageType
        })
        .select(`
          *,
          sender:profiles(*)
        `)
        .single();
      
      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, data: null, error };
    }
  },

  // File Upload functionality
  async uploadAudioFile(userId: string, file: { uri: string; name: string; type: string }) {
    try {
      console.log('🎵 Uploading audio file:', file.name);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // For React Native, read file as binary data
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('audio-tracks')
        .upload(fileName, uint8Array, {
          contentType: file.type,
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(fileName);
      
      console.log('✅ Audio file uploaded:', publicUrl);
      return { success: true, data: { path: data.path, url: publicUrl }, error: null };
    } catch (error) {
      console.error('Upload audio file error:', error);
      return { success: false, data: null, error };
    }
  },

  async uploadImage(userId: string, file: { uri: string; name: string; type: string }, bucket = 'cover-art') {
    try {
      console.log('🖼️ Uploading image:', file.name, 'Type:', file.type);
      
      // Ensure proper file extension and MIME type
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // Validate and set proper MIME type
      const validMimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg', 
        'png': 'image/png',
        'webp': 'image/webp'
      };
      
      const contentType = validMimeTypes[fileExt as keyof typeof validMimeTypes] || 'image/jpeg';
      console.log('🖼️ Using MIME type:', contentType, 'for extension:', fileExt);
      
      // For React Native, read file as binary data
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, uint8Array, {
          contentType: contentType, // Use validated MIME type
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      console.log('✅ Image uploaded:', publicUrl);
      return { success: true, data: { path: data.path, url: publicUrl }, error: null };
    } catch (error) {
      console.error('Upload image error:', error);
      return { success: false, data: null, error };
    }
  },

  // Create audio track record (matching web app schema)
  async createAudioTrack(userId: string, trackData: {
    title: string;
    description?: string | null;
    file_url: string;
    cover_art_url?: string | null; // Web app uses cover_art_url
    duration?: number;
    tags?: string | null;
    is_public?: boolean;
    genre?: string | null;
  }) {
    try {
      console.log('🎵 Creating audio track record:', trackData.title);
      
      const insertData = {
        title: trackData.title,
        description: trackData.description,
        creator_id: userId,
        file_url: trackData.file_url,
        cover_art_url: trackData.cover_art_url, // Web app field name
        duration: trackData.duration || 0,
        tags: trackData.tags ? trackData.tags.split(',').map(tag => tag.trim()) : null,
        is_public: trackData.is_public !== false, // Default to true
        play_count: 0,
        likes_count: 0, // Web app field name
        comments_count: 0, // Web app field name
        shares_count: 0, // Web app field name
        genre: trackData.genre,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('audio_tracks')
        .insert(insertData)
        .select(`
          *,
          creator:profiles(*)
        `)
        .single();
      
      if (error) throw error;
      
      console.log('✅ Audio track created:', data.id);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Create audio track error:', error);
      return { success: false, data: null, error };
    }
  },

  // Update profile avatar
  async updateProfileAvatar(userId: string, avatarUrl: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Update profile avatar error:', error);
      return { success: false, data: null, error };
    }
  },
};
