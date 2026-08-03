import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const KEY_PREFIX = 'sb_post_signup_setup_v1_';

class PostSignupSetupState {
  private onSeenCallbacks: (() => void)[] = [];

  async hasSeen(userId: string): Promise<boolean> {
    try {
      // Supabase auth metadata is the authoritative source — survives reinstalls/storage eviction.
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.setup_seen === true) return true;

      // Fallback: local AsyncStorage (fast path on subsequent launches once written)
      const val = await AsyncStorage.getItem(`${KEY_PREFIX}${userId}`);
      return val === 'done';
    } catch {
      return false;
    }
  }

  async markSeen(userId: string): Promise<void> {
    // Fire callbacks immediately so the navigator transitions without waiting on I/O.
    this.onSeenCallbacks.forEach(cb => cb());

    // Persist to both stores in the background.
    AsyncStorage.setItem(`${KEY_PREFIX}${userId}`, 'done').catch(() => {});
    supabase.auth.updateUser({ data: { setup_seen: true } }).catch(() => {});
  }

  onSeen(cb: () => void): () => void {
    this.onSeenCallbacks.push(cb);
    return () => {
      this.onSeenCallbacks = this.onSeenCallbacks.filter(fn => fn !== cb);
    };
  }
}

export const postSignupSetupState = new PostSignupSetupState();
