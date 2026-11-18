// Local, per-device state for the one-time notification permission re-ask
// sheet (TestFeedScreen's existing "Notification permission sheet" modal).
// Deliberately AsyncStorage-only, no database column — this is a lightweight
// nudge, not something that needs to be visible across devices or to an
// admin.
//
// Two different outcomes, two different cooldowns:
// - User actually acted on it (tapped "Allow notifications" / "Open
//   Settings"): suppressed permanently. They made a real decision, showing
//   it again regardless of what they chose would be naggy.
// - User tapped "Not now": suppressed for REASK_AFTER_DISMISS_DAYS, then
//   eligible to show again (still gated on permission still not granted,
//   checked separately by the caller). They just hadn't decided yet.

import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEW_COUNT_KEY = (userId: string) => `notif_reask_event_view_count_${userId}`;
const ACTED_KEY = (userId: string) => `notif_reask_acted_${userId}`;
const DISMISSED_AT_KEY = (userId: string) => `notif_reask_dismissed_at_${userId}`;

export const EVENT_VIEWS_BEFORE_REASK = 2;
export const REASK_AFTER_DISMISS_DAYS = 30;

class NotificationReAskService {
  async recordEventView(userId: string): Promise<number> {
    try {
      const key = VIEW_COUNT_KEY(userId);
      const current = parseInt((await AsyncStorage.getItem(key)) || '0', 10);
      const next = current + 1;
      await AsyncStorage.setItem(key, String(next));
      return next;
    } catch {
      return 0;
    }
  }

  async getEventViewCount(userId: string): Promise<number> {
    try {
      return parseInt((await AsyncStorage.getItem(VIEW_COUNT_KEY(userId))) || '0', 10);
    } catch {
      return 0;
    }
  }

  // Combines both cooldowns into the one check callers actually need.
  async shouldShow(userId: string): Promise<boolean> {
    try {
      const acted = await AsyncStorage.getItem(ACTED_KEY(userId));
      if (acted === '1') return false;

      const viewCount = await this.getEventViewCount(userId);
      if (viewCount < EVENT_VIEWS_BEFORE_REASK) return false;

      const dismissedAtRaw = await AsyncStorage.getItem(DISMISSED_AT_KEY(userId));
      if (!dismissedAtRaw) return true; // never dismissed, never acted, seen enough events

      const dismissedAt = parseInt(dismissedAtRaw, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return daysSince >= REASK_AFTER_DISMISS_DAYS;
    } catch {
      return false;
    }
  }

  async markActed(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTED_KEY(userId), '1');
    } catch {
      /* non-critical */
    }
  }

  async markDismissed(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(DISMISSED_AT_KEY(userId), String(Date.now()));
    } catch {
      /* non-critical */
    }
  }
}

export const notificationReAskService = new NotificationReAskService();
