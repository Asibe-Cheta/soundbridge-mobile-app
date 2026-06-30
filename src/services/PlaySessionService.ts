import { supabase } from '../lib/supabase';

export interface PlaySessionRecordResult {
  recorded: boolean;
  isValid: boolean;
  isRejected: boolean;
  isSuspicious: boolean;
  fraudReason: string | null;
  playCount: number | null;
}

type RpcRow = {
  is_valid?: boolean;
  is_rejected?: boolean;
  is_suspicious?: boolean;
  fraud_reason?: string | null;
  play_count?: number | null;
};

function normalizeRpcResult(data: unknown): PlaySessionRecordResult {
  const row = (data ?? {}) as RpcRow;
  return {
    recorded: true,
    isValid: row.is_valid ?? true,
    isRejected: row.is_rejected ?? false,
    isSuspicious: row.is_suspicious ?? false,
    fraudReason: row.fraud_reason ?? null,
    playCount: row.play_count ?? null,
  };
}

function getValidPlayThreshold(trackTotalDuration: number): number {
  if (trackTotalDuration <= 0) return 30;
  return Math.min(30, trackTotalDuration * 0.5);
}

class PlaySessionService {
  /**
   * Record a play session with server-side fraud validation.
   * Web RPC `record_play_session` applies all fraud rules and only bumps
   * public play_count when the play is valid and not rejected.
   */
  async recordPlaySession(
    trackId: string,
    userId: string,
    durationListened: number,
    trackTotalDuration: number,
  ): Promise<PlaySessionRecordResult> {
    const roundedDuration = Math.max(0, Math.round(durationListened));
    const completed = trackTotalDuration > 0 && durationListened >= trackTotalDuration * 0.9;

    if (roundedDuration <= 0) {
      return {
        recorded: false,
        isValid: false,
        isRejected: false,
        isSuspicious: false,
        fraudReason: null,
        playCount: null,
      };
    }

    try {
      const { data, error } = await supabase.rpc('record_play_session', {
        p_track_id: trackId,
        p_user_id: userId,
        p_play_duration_seconds: roundedDuration,
        p_completed: completed,
      });

      if (!error) {
        return normalizeRpcResult(data);
      }

      // Fallback until web migration is live
      if (this.isMissingRpc(error, 'record_play_session')) {
        return this.recordViaLegacyRpc(trackId, userId, durationListened, trackTotalDuration);
      }

      console.warn('[PlaySessionService] record_play_session error:', error.message);
      return {
        recorded: false,
        isValid: false,
        isRejected: false,
        isSuspicious: false,
        fraudReason: error.message,
        playCount: null,
      };
    } catch (err) {
      console.warn('[PlaySessionService] recordPlaySession error:', err);
      return {
        recorded: false,
        isValid: false,
        isRejected: false,
        isSuspicious: false,
        fraudReason: null,
        playCount: null,
      };
    }
  }

  private isMissingRpc(error: { message?: string; code?: string }, fnName: string): boolean {
    const msg = error.message?.toLowerCase() ?? '';
    return (
      error.code === '42883' ||
      msg.includes(`function ${fnName}`) ||
      msg.includes('could not find the function') ||
      msg.includes('does not exist')
    );
  }

  /** Pre-fraud RPC — only records plays that pass client duration gate. */
  private async recordViaLegacyRpc(
    trackId: string,
    userId: string,
    durationListened: number,
    trackTotalDuration: number,
  ): Promise<PlaySessionRecordResult> {
    const threshold = getValidPlayThreshold(trackTotalDuration);
    if (durationListened < threshold) {
      return {
        recorded: false,
        isValid: false,
        isRejected: false,
        isSuspicious: false,
        fraudReason: 'below_minimum_duration',
        playCount: null,
      };
    }

    const completed = trackTotalDuration > 0 && durationListened >= trackTotalDuration * 0.9;
    const { error } = await supabase.rpc('record_valid_play_session', {
      p_track_id: trackId,
      p_user_id: userId,
      p_play_duration_seconds: Math.round(durationListened),
      p_completed: completed,
    });

    if (error) {
      console.warn('[PlaySessionService] record_valid_play_session fallback error:', error.message);
      return {
        recorded: false,
        isValid: false,
        isRejected: false,
        isSuspicious: false,
        fraudReason: error.message,
        playCount: null,
      };
    }

    return {
      recorded: true,
      isValid: true,
      isRejected: false,
      isSuspicious: false,
      fraudReason: null,
      playCount: null,
    };
  }
}

export const playSessionService = new PlaySessionService();
