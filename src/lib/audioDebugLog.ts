import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sb_audio_debug_v1';
const HS_KEY = 'sb_hs_debug_v1';
const MAX = 100;

function ts() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

// Fire-and-forget write — callers stay synchronous
export function audioLog(tag: string, detail?: string | number | Record<string, unknown>) {
  const line = detail !== undefined
    ? `${ts()} [${tag}] ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`
    : `${ts()} [${tag}]`;
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const lines: string[] = raw ? JSON.parse(raw) : [];
      lines.push(line);
      if (lines.length > MAX) lines.splice(0, lines.length - MAX);
      await AsyncStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  })();
}

// Merge main log + headless service log, sort by timestamp prefix, return last N lines
export async function getAudioLogs(): Promise<string[]> {
  try {
    const [rawMain, rawHs] = await Promise.all([
      AsyncStorage.getItem(KEY),
      AsyncStorage.getItem(HS_KEY),
    ]);
    const main: string[] = rawMain ? JSON.parse(rawMain) : [];
    const hs: string[] = rawHs ? JSON.parse(rawHs) : [];
    const merged = [...main, ...hs].sort((a, b) => a.localeCompare(b));
    return merged;
  } catch {
    return [];
  }
}

export async function clearAudioLogs(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEY),
      AsyncStorage.removeItem(HS_KEY),
    ]);
  } catch {}
}
