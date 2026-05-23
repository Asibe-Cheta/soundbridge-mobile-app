import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '../lib/supabase';

export interface AppVersionConfig {
  id: number;
  min_supported_version_ios: string;
  min_supported_version_android: string;
  latest_version_ios: string;
  latest_version_android: string;
  force_update_message: string;
  soft_update_message: string;
  min_version_creator_card_ios: string;
  min_version_creator_card_android: string;
  min_version_ai_adviser_ios: string;
  min_version_ai_adviser_android: string;
  min_version_audio_trimmer_ios: string;
  min_version_audio_trimmer_android: string;
  min_version_request_room_ios: string;
  min_version_request_room_android: string;
  updated_at: string;
}

export type VersionCheckResult = 'force' | 'soft' | 'ok';
export type FeatureKey = 'creator_card' | 'ai_adviser' | 'audio_trimmer' | 'request_room';

// Session-level cache — populated once per app launch, cleared on next launch
let sessionCache: AppVersionConfig | null = null;

// Numeric semver comparison — handles "1.10.0" > "1.9.0" correctly
export function compareVersions(a: string, b: string): number {
  const partsA = (a || '0').split('.').map(Number);
  const partsB = (b || '0').split('.').map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

export async function fetchVersionConfig(): Promise<AppVersionConfig | null> {
  if (sessionCache) return sessionCache;

  try {
    const { data, error } = await supabase
      .from('app_version_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.warn('[VersionCheck] Config fetch failed:', error?.message);
      return null;
    }

    sessionCache = data as AppVersionConfig;
    return sessionCache;
  } catch (err) {
    console.warn('[VersionCheck] Unexpected error:', err);
    return null;
  }
}

// Call this at the start of every app launch to get the version check result
export async function checkAppVersion(): Promise<{
  result: VersionCheckResult;
  config: AppVersionConfig | null;
  installedVersion: string;
}> {
  const config = await fetchVersionConfig();
  const installedVersion = Application.nativeApplicationVersion ?? '0.0.0';

  if (!config) {
    // If Supabase is unreachable, allow the user through — don't block on network errors
    return { result: 'ok', config: null, installedVersion };
  }

  const isIOS = Platform.OS === 'ios';
  const minVersion = isIOS
    ? config.min_supported_version_ios
    : config.min_supported_version_android;
  const latestVersion = isIOS
    ? config.latest_version_ios
    : config.latest_version_android;

  if (compareVersions(installedVersion, minVersion) < 0) {
    return { result: 'force', config, installedVersion };
  }

  if (compareVersions(installedVersion, latestVersion) < 0) {
    return { result: 'soft', config, installedVersion };
  }

  return { result: 'ok', config, installedVersion };
}

// Feature flag check — use the already-fetched config to avoid extra network calls
export function isFeatureAvailable(
  config: AppVersionConfig,
  feature: FeatureKey,
): boolean {
  const installedVersion = Application.nativeApplicationVersion ?? '0.0.0';
  const isIOS = Platform.OS === 'ios';

  const minVersionKeys: Record<FeatureKey, { ios: keyof AppVersionConfig; android: keyof AppVersionConfig }> = {
    creator_card: { ios: 'min_version_creator_card_ios', android: 'min_version_creator_card_android' },
    ai_adviser:   { ios: 'min_version_ai_adviser_ios',   android: 'min_version_ai_adviser_android' },
    audio_trimmer:{ ios: 'min_version_audio_trimmer_ios',android: 'min_version_audio_trimmer_android' },
    request_room: { ios: 'min_version_request_room_ios', android: 'min_version_request_room_android' },
  };

  const key = isIOS ? minVersionKeys[feature].ios : minVersionKeys[feature].android;
  const minVersion = config[key] as string | undefined;

  if (!minVersion) return true;
  return compareVersions(installedVersion, minVersion) >= 0;
}

// Expose cached config for components that need it synchronously after launch
export function getCachedVersionConfig(): AppVersionConfig | null {
  return sessionCache;
}
