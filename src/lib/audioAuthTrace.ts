import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUDIO_AUTH_TRACE_KEY = 'sb_audio_auth_trace';

export interface AudioAuthTrace {
  userId: string | null;
  hasUserId: boolean;
  signedOutAt: number | null;
  lastAuthEvent: string | null;
  lastAuthEventAt: number | null;
}

let trace: AudioAuthTrace = {
  userId: null,
  hasUserId: false,
  signedOutAt: null,
  lastAuthEvent: null,
  lastAuthEventAt: null,
};

async function persistTrace(): Promise<void> {
  try {
    await AsyncStorage.setItem(AUDIO_AUTH_TRACE_KEY, JSON.stringify(trace));
  } catch {
    /* ignore */
  }
}

/** Restore trace from storage — call early on app launch (headless reads storage directly). */
export async function loadAudioAuthTrace(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIO_AUTH_TRACE_KEY);
    if (raw) trace = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}

/** Update from AuthContext on every auth state transition. */
export function recordAuthEvent(event: string, userId: string | null): void {
  const now = Date.now();
  const signedOutAt =
    event === 'SIGNED_OUT' || (event === 'NO_SESSION' && !userId)
      ? now
      : userId
        ? null
        : trace.signedOutAt;

  trace = {
    userId,
    hasUserId: !!userId,
    signedOutAt,
    lastAuthEvent: event,
    lastAuthEventAt: now,
  };

  persistTrace();
}

export function getAudioAuthLogFields(): Record<string, unknown> {
  const now = Date.now();
  return {
    hasUserId: trace.hasUserId,
    userIdPrefix: trace.userId ? trace.userId.slice(0, 8) : null,
    signedOutAt: trace.signedOutAt,
    secSinceSignedOut: trace.signedOutAt
      ? Math.round((now - trace.signedOutAt) / 1000)
      : null,
    lastAuthEvent: trace.lastAuthEvent,
  };
}

/** Headless service — read persisted trace (separate JS context). */
export async function getAudioAuthLogFieldsAsync(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(AUDIO_AUTH_TRACE_KEY);
    if (!raw) return getAudioAuthLogFields();
    const stored: AudioAuthTrace = JSON.parse(raw);
    const now = Date.now();
    return {
      hasUserId: stored.hasUserId,
      userIdPrefix: stored.userId ? stored.userId.slice(0, 8) : null,
      signedOutAt: stored.signedOutAt,
      secSinceSignedOut: stored.signedOutAt
        ? Math.round((now - stored.signedOutAt) / 1000)
        : null,
      lastAuthEvent: stored.lastAuthEvent,
    };
  } catch {
    return getAudioAuthLogFields();
  }
}
