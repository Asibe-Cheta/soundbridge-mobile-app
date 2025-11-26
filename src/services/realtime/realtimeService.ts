import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to new posts in feed
   */
  subscribeToFeedPosts(callback: (post: any) => void): () => void {
    const channel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    this.channels.set('feed-posts', channel);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.channels.delete('feed-posts');
    };
  }

  /**
   * Subscribe to post reactions
   */
  subscribeToPostReactions(
    postId: string,
    callback: (reaction: any) => void
  ): () => void {
    const channelName = `post-reactions-${postId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to post comments
   */
  subscribeToPostComments(
    postId: string,
    callback: (comment: any) => void
  ): () => void {
    const channelName = `post-comments-${postId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to connection requests
   */
  subscribeToConnectionRequests(
    userId: string,
    callback: (request: any) => void
  ): () => void {
    const channelName = `connection-requests-${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  subscribeToConnectionUpdates(
    userId: string,
    callback: (update: any) => void
  ): () => void {
    const channelName = `connection-updates-${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `from_user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
  }
}

export const realtimeService = new RealtimeService();

