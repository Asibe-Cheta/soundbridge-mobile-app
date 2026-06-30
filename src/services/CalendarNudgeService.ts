import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { calendarIntegrationService } from './CalendarIntegrationService';

const MIN_APP_OPENS = 3;
const MAX_NUDGE_SHOWS = 2;
const APP_OPENS_KEY = (userId: string) => `calendar_nudge_app_opens_${userId}`;
const SESSION_HIDDEN_KEY = (userId: string) => `calendar_nudge_session_hidden_${userId}`;

export interface CalendarNudgeEvaluation {
  shouldShow: boolean;
  appOpenCount: number;
  nudgeShownCount: number;
  calendarConnected: boolean;
}

class CalendarNudgeService {
  async recordAppOpen(userId: string): Promise<number> {
    try {
      const key = APP_OPENS_KEY(userId);
      const current = parseInt((await AsyncStorage.getItem(key)) || '0', 10);
      const next = current + 1;
      await AsyncStorage.setItem(key, String(next));
      await AsyncStorage.removeItem(SESSION_HIDDEN_KEY(userId));
      return next;
    } catch (err) {
      console.warn('[CalendarNudgeService] recordAppOpen failed:', err);
      return 0;
    }
  }

  async getAppOpenCount(userId: string): Promise<number> {
    try {
      return parseInt((await AsyncStorage.getItem(APP_OPENS_KEY(userId))) || '0', 10);
    } catch {
      return 0;
    }
  }

  private async getNudgeProfileFields(userId: string): Promise<{
    calendar_nudge_shown_count: number;
    calendar_nudge_last_shown_at: string | null;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('calendar_nudge_shown_count, calendar_nudge_last_shown_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[CalendarNudgeService] profile read failed:', error.message);
      return { calendar_nudge_shown_count: 0, calendar_nudge_last_shown_at: null };
    }

    return {
      calendar_nudge_shown_count: data?.calendar_nudge_shown_count ?? 0,
      calendar_nudge_last_shown_at: data?.calendar_nudge_last_shown_at ?? null,
    };
  }

  async isHiddenForCurrentSession(userId: string): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(SESSION_HIDDEN_KEY(userId))) === '1';
    } catch {
      return false;
    }
  }

  async markHiddenForCurrentSession(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_HIDDEN_KEY(userId), '1');
    } catch (err) {
      console.warn('[CalendarNudgeService] markHiddenForCurrentSession failed:', err);
    }
  }

  async evaluateNudge(userId: string, session: Session | null): Promise<CalendarNudgeEvaluation> {
    const [appOpenCount, nudgeProfile, calendarStatus, hiddenThisSession] = await Promise.all([
      this.getAppOpenCount(userId),
      this.getNudgeProfileFields(userId),
      calendarIntegrationService.getStatus(session),
      this.isHiddenForCurrentSession(userId),
    ]);

    const nudgeShownCount = nudgeProfile.calendar_nudge_shown_count;
    const calendarConnected = calendarStatus.connected && !calendarStatus.needs_reconnect;

    const shouldShow =
      appOpenCount >= MIN_APP_OPENS &&
      !calendarConnected &&
      nudgeShownCount < MAX_NUDGE_SHOWS &&
      !hiddenThisSession;

    return {
      shouldShow,
      appOpenCount,
      nudgeShownCount,
      calendarConnected,
    };
  }

  async recordNudgeShown(userId: string): Promise<void> {
    try {
      const { calendar_nudge_shown_count } = await this.getNudgeProfileFields(userId);
      const nextCount = calendar_nudge_shown_count + 1;

      const { error } = await supabase
        .from('profiles')
        .update({
          calendar_nudge_shown_count: nextCount,
          calendar_nudge_last_shown_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.warn('[CalendarNudgeService] recordNudgeShown failed:', error.message);
      }
    } catch (err) {
      console.warn('[CalendarNudgeService] recordNudgeShown error:', err);
    }
  }
}

export const calendarNudgeService = new CalendarNudgeService();
