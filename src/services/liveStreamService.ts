/**
 * Live Streaming (video) service — thin client for the web team's API routes.
 * Backend + DB are already built (soundbridge web repo, commit 5067afb1); this
 * file only calls the endpoints, it never touches Cloudflare or `live_streams`
 * directly except for the Realtime subscription (done inline where needed,
 * per MOBILE_TEAM_LIVE_STREAMING.MD's exact snippet, not from this file).
 *
 * Separate from and unrelated to the existing Agora audio-live feature
 * (`live_sessions` table, LiveSessionsScreen etc.) — do not conflate the two.
 */
import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export const LIVE_STREAM_FALLBACK_ERROR =
  'We are currently running some improvements to our live feature. Please bear with us and try again shortly.';

export interface LiveEligibility {
  eligible: boolean;
  reason?: string;
  followerCount?: number;
  message?: string;
}

export interface StartLiveStreamResponse {
  liveStreamId: string;
  rtmpUrl: string;
  streamKey: string;
  hlsPlaybackUrl: string;
}

export interface LiveStreamCredentials {
  rtmpUrl: string;
  streamKey: string;
  hlsPlaybackUrl: string;
}

export interface ActiveLiveStreamStatus {
  live: boolean;
  liveStreamId?: string;
  hlsPlaybackUrl?: string;
  viewerCount?: number;
  title?: string | null;
  startedAt?: string;
}

/** Extracts the backend's own friendly `{ error }` message — per spec, show this as-is, never apiFetch's generic message or raw JSON. */
function friendlyError(err: any): string {
  return err?.body?.error || err?.message || LIVE_STREAM_FALLBACK_ERROR;
}

class LiveStreamService {
  async checkEligibility(session: Session | null): Promise<LiveEligibility> {
    try {
      return await apiFetch<LiveEligibility>('/api/live-streams/eligibility', { session, method: 'GET' });
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  async startLiveStream(session: Session | null, title?: string): Promise<StartLiveStreamResponse> {
    try {
      return await apiFetch<StartLiveStreamResponse>('/api/live-streams/start', {
        session,
        method: 'POST',
        body: JSON.stringify({ title: title || undefined }),
      });
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  async endLiveStream(session: Session | null, liveStreamId: string): Promise<{ success: boolean }> {
    try {
      return await apiFetch<{ success: boolean }>(`/api/live-streams/${liveStreamId}/end`, {
        session,
        method: 'POST',
      });
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  async getCredentials(session: Session | null, liveStreamId: string): Promise<LiveStreamCredentials> {
    try {
      return await apiFetch<LiveStreamCredentials>(`/api/live-streams/${liveStreamId}/credentials`, {
        session,
        method: 'GET',
      });
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  /** No session required — any authenticated user can check if a creator is live; callers should still pass a session if available for consistent auth. */
  async getActiveStatus(session: Session | null, userId: string): Promise<ActiveLiveStreamStatus> {
    try {
      return await apiFetch<ActiveLiveStreamStatus>(`/api/live-streams/active?userId=${encodeURIComponent(userId)}`, {
        session,
        method: 'GET',
      });
    } catch (err) {
      // A "not live" check failing shouldn't break profile screens — fail closed to `live: false`.
      console.warn('[liveStreamService] getActiveStatus error (treating as not live):', err);
      return { live: false };
    }
  }

  async joinAsViewer(session: Session | null, liveStreamId: string): Promise<void> {
    try {
      await apiFetch(`/api/live-streams/${liveStreamId}/viewer`, { session, method: 'POST' });
    } catch (err) {
      // Best-effort — a failed join shouldn't block watching the stream.
      console.warn('[liveStreamService] joinAsViewer error (non-fatal):', err);
    }
  }

  async leaveAsViewer(session: Session | null, liveStreamId: string): Promise<void> {
    try {
      await apiFetch(`/api/live-streams/${liveStreamId}/viewer`, { session, method: 'DELETE' });
    } catch (err) {
      // Best-effort — matches the doc: a viewer who force-quits just leaves the count slightly high, not something to over-engineer.
      console.warn('[liveStreamService] leaveAsViewer error (non-fatal):', err);
    }
  }
}

export const liveStreamService = new LiveStreamService();
