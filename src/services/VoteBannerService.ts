// "Vote for SoundBridge" home banner dismiss/reshow logic (VOTE_FOR_SOUNDBRIDGE.MD Step 6).
// Mirrors CalendarNudgeService's AsyncStorage-backed evaluate/record shape.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVoteCountdown } from '../utils/voteCountdown';

const DISMISSED_KEY = 'vote_banner_dismissed';
const DISMISSED_IN_FINAL_WINDOW_KEY = 'vote_banner_dismissed_final_window';

class VoteBannerService {
  async shouldShow(): Promise<boolean> {
    const countdown = getVoteCountdown();
    if (countdown.closed) return false;

    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
    if (dismissed !== '1') return true;

    // Dismissed once already — allowed back only inside the final 48 hours, and only
    // once (not re-shown every app open during that window once dismissed again).
    if (!countdown.useHours) return false;
    const dismissedInFinalWindow = await AsyncStorage.getItem(DISMISSED_IN_FINAL_WINDOW_KEY);
    return dismissedInFinalWindow !== '1';
  }

  async recordDismissed(): Promise<void> {
    const countdown = getVoteCountdown();
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, '1');
      if (countdown.useHours) {
        await AsyncStorage.setItem(DISMISSED_IN_FINAL_WINDOW_KEY, '1');
      }
    } catch {}
  }
}

export const voteBannerService = new VoteBannerService();
