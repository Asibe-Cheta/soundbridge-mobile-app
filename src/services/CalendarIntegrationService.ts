import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

/** Mobile OAuth return URL — web redirect target after Google consent */
export const GOOGLE_CALENDAR_CALLBACK_URL = 'soundbridge://calendar/google/callback';

export interface CalendarConnectionStatus {
  connected: boolean;
  provider?: 'google';
  calendar_connected_at?: string | null;
  last_synced_at?: string | null;
  needs_reconnect?: boolean;
}

type StatusResponse = {
  success?: boolean;
  status?: CalendarConnectionStatus;
  connected?: boolean;
  calendar_connected_at?: string | null;
  last_synced_at?: string | null;
  needs_reconnect?: boolean;
};

type ConnectUrlResponse = {
  success?: boolean;
  url?: string;
};

type DisconnectResponse = {
  success?: boolean;
  message?: string;
};

type PollInsightResponse = {
  success?: boolean;
  insight?: string | null;
};

function normalizeStatus(data: StatusResponse): CalendarConnectionStatus {
  if (data.status) return data.status;
  return {
    connected: !!data.connected,
    provider: 'google',
    calendar_connected_at: data.calendar_connected_at ?? null,
    last_synced_at: data.last_synced_at ?? null,
    needs_reconnect: !!data.needs_reconnect,
  };
}

class CalendarIntegrationService {
  async getStatus(session: Session | null): Promise<CalendarConnectionStatus> {
    if (!session) {
      return { connected: false, provider: 'google' };
    }

    try {
      const data = await apiFetch<StatusResponse>('/api/calendar/google/status', {
        method: 'GET',
        session,
      });
      return normalizeStatus(data ?? {});
    } catch (err: any) {
      if (err?.status === 404) {
        return { connected: false, provider: 'google' };
      }
      console.warn('[CalendarIntegrationService] getStatus error:', err?.message);
      return { connected: false, provider: 'google' };
    }
  }

  async getConnectUrl(session: Session): Promise<string> {
    try {
      const data = await apiFetch<ConnectUrlResponse>('/api/calendar/google/connect-url', {
        method: 'GET',
        session,
      });

      if (!data?.url) {
        throw new Error('Calendar connect URL not available');
      }

      return data.url;
    } catch (err: any) {
      if (err?.status === 503) {
        throw new Error(
          'Google Calendar is not available yet. Please try again after the server configuration is complete.',
        );
      }
      throw err;
    }
  }

  /**
   * Opens Google OAuth (FreeBusy scope only — consent URL from web backend).
   * Tokens are stored encrypted server-side; mobile never persists refresh tokens.
   */
  async connect(session: Session): Promise<{ success: boolean; error?: string }> {
    try {
      const url = await this.getConnectUrl(session);
      const result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_CALENDAR_CALLBACK_URL);

      if (result.type !== 'success' || !result.url) {
        return { success: false, error: 'Calendar connection was cancelled' };
      }

      const parsed = new URL(result.url);
      const error = parsed.searchParams.get('error');
      if (error) {
        return { success: false, error: decodeURIComponent(error) };
      }

      const success =
        parsed.searchParams.get('success') === '1' ||
        parsed.searchParams.get('connected') === 'true' ||
        parsed.pathname.includes('callback');

      if (!success) {
        return { success: false, error: 'Calendar connection did not complete' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect Google Calendar';
      console.error('[CalendarIntegrationService] connect error:', err);
      return { success: false, error: message };
    }
  }

  async disconnect(session: Session): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await apiFetch<DisconnectResponse>('/api/calendar/google/disconnect', {
        method: 'POST',
        session,
        body: JSON.stringify({}),
      });

      if (data?.success === false) {
        return { success: false, error: data.message ?? 'Disconnect failed' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect Google Calendar';
      console.error('[CalendarIntegrationService] disconnect error:', err);
      return { success: false, error: message };
    }
  }

  /** Creator poll dashboard — calendar-derived availability copy (web-computed). */
  async getPollAvailabilityInsight(
    session: Session,
    campaignId: string,
  ): Promise<string | null> {
    try {
      const data = await apiFetch<PollInsightResponse>(
        `/api/calendar/poll-availability-insight?campaignId=${encodeURIComponent(campaignId)}`,
        { method: 'GET', session },
      );
      return data?.insight?.trim() || null;
    } catch (err: any) {
      if (err?.status === 404) return null;
      console.warn('[CalendarIntegrationService] getPollAvailabilityInsight error:', err?.message);
      return null;
    }
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();
