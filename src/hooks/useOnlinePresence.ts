import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CHANNEL_NAME = 'global_presence';

export function useOnlinePresence() {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  // Tracks the last time we observed each user going offline (within this session)
  const lastSeenMapRef = useRef<Map<string, Date>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isShowingOnlineStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const stored = await AsyncStorage.getItem(`privacy_show_online_status_${user.id}`);
    return stored === null ? true : stored === 'true';
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || channelRef.current) return;

    const showStatus = await isShowingOnlineStatus();

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUserIds(new Set(Object.keys(state)));
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        setOnlineUserIds(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        // Record when this user was last seen going offline
        lastSeenMapRef.current.set(key, new Date());
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && showStatus) {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  }, [user, isShowingOnlineStatus]);

  const unsubscribe = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      await channelRef.current.untrack();
      await supabase.removeChannel(channelRef.current);
    } catch {
      // Ignore cleanup errors
    }
    channelRef.current = null;
  }, []);

  useEffect(() => {
    subscribe();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        subscribe();
      } else {
        unsubscribe();
      }
    });

    return () => {
      appStateSub.remove();
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  /** Returns the last time we observed this user going offline this session.
   *  Returns null if we haven't seen them go offline (either they're online,
   *  or we opened the app after they were already offline).
   *  For persistent last seen across sessions, the web team needs to add a
   *  `last_seen` column to `profiles` — see WEB_TEAM_ONLINE_PRESENCE.md. */
  const getLastSeen = useCallback(
    (userId: string): Date | null => lastSeenMapRef.current.get(userId) ?? null,
    []
  );

  return { isUserOnline, getLastSeen, onlineUserIds };
}
