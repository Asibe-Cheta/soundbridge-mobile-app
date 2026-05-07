import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers, supabase } from '../lib/supabase';

/**
 * Hook to get the total unread messages count for the current user.
 * Uses Supabase realtime for instant updates when new messages arrive.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const { success, data } = await dbHelpers.getConversations(user.id);
        if (success && data && data.length > 0) {
          const totalUnread = data.reduce((sum: number, conv: any) => {
            return sum + (conv.unreadCount || 0);
          }, 0);
          setUnreadCount(totalUnread);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error loading unread messages count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCount();

    // Realtime subscription — re-count whenever a new message arrives for this user
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return { unreadCount, loading };
}

