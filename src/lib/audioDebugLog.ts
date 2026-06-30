import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearOtaLogs, getOtaLogs } from './otaDebugLog';

const KEY = 'sb_audio_debug_v1';
const HS_KEY = 'sb_hs_debug_v1';
const MAX = 150;

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

// Merge audio + OTA + headless service logs, sort by timestamp prefix
export async function getAudioLogs(): Promise<string[]> {
  try {
    const [rawMain, rawHs, ota] = await Promise.all([
      AsyncStorage.getItem(KEY),
      AsyncStorage.getItem(HS_KEY),
      getOtaLogs(),
    ]);
    const main: string[] = rawMain ? JSON.parse(rawMain) : [];
    const hs: string[] = rawHs ? JSON.parse(rawHs) : [];
    const merged = [...main, ...hs, ...ota].sort((a, b) => a.localeCompare(b));
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
      clearOtaLogs(),
    ]);
  } catch {}
}
