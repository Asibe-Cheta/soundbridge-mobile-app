import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_D_TRACE_KEY = 'sb_session_d_active';

let sessionDActive = false;
let sessionDSince: number | null = null;

export async function markSessionDActive(active: boolean): Promise<void> {
  sessionDActive = active;
  sessionDSince = active ? Date.now() : null;
  try {
    if (active) {
      await AsyncStorage.setItem(
        SESSION_D_TRACE_KEY,
        JSON.stringify({ since: sessionDSince }),
      );
    } else {
      await AsyncStorage.removeItem(SESSION_D_TRACE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getSessionDLogFields(): Record<string, unknown> {
  return {
    sessionD: sessionDActive,
    sessionDSince,
    secInSessionD: sessionDSince
      ? Math.round((Date.now() - sessionDSince) / 1000)
      : null,
  };
}

export async function getSessionDLogFieldsAsync(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_D_TRACE_KEY);
    if (!raw) return { sessionD: false, sessionDSince: null, secInSessionD: null };
    const { since } = JSON.parse(raw);
    return {
      sessionD: true,
      sessionDSince: since,
      secInSessionD: since ? Math.round((Date.now() - since) / 1000) : null,
    };
  } catch {
    return getSessionDLogFields();
  }
}
