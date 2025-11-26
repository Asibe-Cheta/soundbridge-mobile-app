import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';

/**
 * Hook to get the total unread messages count for the current user
 * Used for displaying the badge on the messages icon in the header
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
          // Sum up all unread counts from conversations
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

    // Refresh unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return { unreadCount, loading };
}

