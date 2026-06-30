import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'sb_post_signup_setup_v1_';

class PostSignupSetupState {
  private onSeenCallbacks: (() => void)[] = [];

  async hasSeen(userId: string): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(`${KEY_PREFIX}${userId}`);
      return val === 'done';
    } catch {
      return false;
    }
  }

  async markSeen(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${KEY_PREFIX}${userId}`, 'done');
    } catch {}
    this.onSeenCallbacks.forEach(cb => cb());
  }

  onSeen(cb: () => void): () => void {
    this.onSeenCallbacks.push(cb);
    return () => {
      this.onSeenCallbacks = this.onSeenCallbacks.filter(fn => fn !== cb);
    };
  }
}

export const postSignupSetupState = new PostSignupSetupState();
