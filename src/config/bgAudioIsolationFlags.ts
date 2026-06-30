import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioLog } from '../lib/audioDebugLog';

export type BgIsolationFlag =
  | 'disableTokenRefresh'
  | 'disableRealtime'
  | 'disableNotificationHooks'
  | 'disableAuthListener';

const STORAGE_KEY = 'sb_bg_audio_isolation_flags';

export interface BgIsolationFlags {
  disableTokenRefresh: boolean;
  disableRealtime: boolean;
  disableNotificationHooks: boolean;
  disableAuthListener: boolean;
}

let flags: BgIsolationFlags = {
  disableTokenRefresh: false,
  disableRealtime: false,
  disableNotificationHooks: false,
  disableAuthListener: false,
};

let loaded = false;

export async function loadBgIsolationFlags(): Promise<BgIsolationFlags> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) flags = { ...flags, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  loaded = true;
  audioLog('BG_ISO_FLAGS_LOADED', { ...flags });
  return { ...flags };
}

export function areBgIsolationFlagsLoaded(): boolean {
  return loaded;
}

export function getBgIsolationFlags(): BgIsolationFlags {
  return { ...flags };
}

export function isBgIsolationEnabled(flag: BgIsolationFlag): boolean {
  return flags[flag];
}

/** Enable one flag at a time for isolated A/B tests (others auto-disabled). */
export async function setBgIsolationFlag(
  flag: BgIsolationFlag,
  enabled: boolean,
): Promise<BgIsolationFlags> {
  if (enabled) {
    flags = {
      disableTokenRefresh: false,
      disableRealtime: false,
      disableNotificationHooks: false,
      disableAuthListener: false,
      [flag]: true,
    };
  } else {
    flags = { ...flags, [flag]: false };
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    /* ignore */
  }
  audioLog('BG_ISO_FLAG_SET', { flag, enabled, active: { ...flags } });
  return { ...flags };
}

export async function clearAllBgIsolationFlags(): Promise<BgIsolationFlags> {
  flags = {
    disableTokenRefresh: false,
    disableRealtime: false,
    disableNotificationHooks: false,
    disableAuthListener: false,
  };
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  audioLog('BG_ISO_FLAGS_CLEARED', {});
  return { ...flags };
}

export function getBgIsolationLogFields(): Record<string, unknown> {
  return { bgIsolation: { ...flags } };
}

/** Headless service reads persisted flags from storage. */
export async function getBgIsolationLogFieldsAsync(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored: BgIsolationFlags = raw
      ? JSON.parse(raw)
      : flags;
    return { bgIsolation: { ...stored } };
  } catch {
    return getBgIsolationLogFields();
  }
}
