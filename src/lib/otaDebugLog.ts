import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sb_ota_debug_v1';
const MAX = 200;

function ts() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function otaLog(tag: string, detail?: string | number | Record<string, unknown>) {
  const line = detail !== undefined
    ? `${ts()} [OTA:${tag}] ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`
    : `${ts()} [OTA:${tag}]`;
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

export async function getOtaLogs(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearOtaLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
