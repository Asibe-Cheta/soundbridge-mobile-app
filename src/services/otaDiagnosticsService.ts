import { Alert, AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import type { Manifest, UpdatesLogEntry } from 'expo-updates';
import { otaLog, getOtaLogs } from '../lib/otaDebugLog';

/** Bundle marker for build 267+ embedded OTA probe verification. */
export const EMBEDDED_OTA_PROBE_MARKER = 'runEmbeddedOtaDiagnosticsOnLaunch';

const ALERT_SEEN_PREFIX = 'sb_ota_embedded_alert_seen_';
const ERROR_LOG_CODES = new Set([
  'UpdateAssetsNotAvailable',
  'UpdateServerUnreachable',
  'UpdateHasInvalidSignature',
  'UpdateCodeSigningError',
  'UpdateFailedToLoad',
  'AssetsFailedToLoad',
  'JSRuntimeError',
  'InitializationError',
  'Unknown',
]);
const ERROR_LOG_LEVELS = new Set(['error', 'warn', 'fatal']);

export type OtaNativeSnapshot = {
  isEnabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  isEmergencyLaunch: boolean;
  emergencyLaunchReason: string | null;
  checkAutomatically: string | null;
  launchDurationMs: number | null;
  nativeAppVersion: string | null;
  nativeBuildVersion: string | null;
  manifestUpdateId: string | null;
  createdAt: string | null;
  devMode: boolean;
};

let diagnosticsRunning = false;
let launchAlertScheduled = false;

function manifestUpdateId(manifest: Partial<Manifest> | undefined): string | null {
  if (!manifest || typeof manifest !== 'object') return null;
  const id = (manifest as { id?: string }).id;
  return typeof id === 'string' ? id : null;
}

function shortId(id: string | null | undefined): string {
  if (!id) return 'null';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function readOtaNativeSnapshotSync(): OtaNativeSnapshot {
  return {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    isEmergencyLaunch: Updates.isEmergencyLaunch,
    emergencyLaunchReason: Updates.emergencyLaunchReason,
    checkAutomatically: Updates.checkAutomatically,
    launchDurationMs: Updates.launchDuration,
    nativeAppVersion: Application.nativeApplicationVersion,
    nativeBuildVersion: Application.nativeBuildVersion,
    manifestUpdateId: manifestUpdateId(Updates.manifest),
    createdAt: Updates.createdAt?.toISOString?.() ?? null,
    devMode: __DEV__,
  };
}

function formatNativeLogEntry(entry: UpdatesLogEntry): string {
  const time = new Date(entry.timestamp).toISOString().slice(11, 23);
  const extras = [entry.updateId, entry.assetId].filter(Boolean).join(' ');
  const stack = entry.stacktrace?.length ? ` | ${entry.stacktrace.slice(0, 1).join(' ')}` : '';
  return `${time} [${entry.code}] ${entry.level}: ${entry.message}${extras ? ` (${extras})` : ''}${stack}`;
}

function formatSnapshotLines(snapshot: OtaNativeSnapshot): string[] {
  return [
    `enabled: ${snapshot.isEnabled}`,
    `channel: ${snapshot.channel ?? 'null'}`,
    `runtime: ${snapshot.runtimeVersion ?? 'null'}`,
    `updateId: ${shortId(snapshot.updateId)}`,
    `manifestId: ${shortId(snapshot.manifestUpdateId)}`,
    `embedded launch: ${snapshot.isEmbeddedLaunch}`,
    `emergency launch: ${snapshot.isEmergencyLaunch}`,
    snapshot.emergencyLaunchReason
      ? `emergency reason: ${snapshot.emergencyLaunchReason}`
      : null,
    `check: ${snapshot.checkAutomatically ?? 'null'}`,
    `app: ${snapshot.nativeAppVersion ?? '?'} (${snapshot.nativeBuildVersion ?? '?'})`,
  ].filter(Boolean) as string[];
}

async function readNativeLogEntries(label: string, maxAgeMs = 3600000): Promise<UpdatesLogEntry[]> {
  try {
    const entries = await Updates.readLogEntriesAsync(maxAgeMs);
    otaLog(`${label}_NATIVE_COUNT`, entries.length);
    if (entries.length === 0) {
      otaLog(`${label}_NATIVE`, 'no native expo-updates log entries');
    } else {
      for (const entry of entries.slice(-50)) {
        otaLog(`${label}_NATIVE`, formatNativeLogEntry(entry));
      }
    }
    return entries;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    otaLog(`${label}_NATIVE_ERR`, message);
    return [];
  }
}

async function runRemoteCheck(label: string) {
  if (!Updates.isEnabled) {
    otaLog(`${label}_REMOTE_SKIP`, 'Updates.isEnabled=false — checkForUpdateAsync unavailable');
    return null;
  }
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      otaLog(`${label}_REMOTE`, {
        isAvailable: true,
        remoteUpdateId: manifestUpdateId(result.manifest),
        runningUpdateId: Updates.updateId,
      });
    } else if ('isRollBackToEmbedded' in result && result.isRollBackToEmbedded) {
      otaLog(`${label}_REMOTE`, { isRollBackToEmbedded: true });
    } else {
      otaLog(`${label}_REMOTE`, {
        isAvailable: false,
        reason: 'reason' in result ? result.reason : 'unknown',
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    otaLog(`${label}_REMOTE_ERR`, message);
    return null;
  }
}

function nativeErrorLines(entries: UpdatesLogEntry[]): string[] {
  const lines: string[] = [];
  if (!Updates.isEnabled) {
    lines.push('expo-updates is DISABLED in this build/session');
  }
  if (Updates.isEmergencyLaunch) {
    lines.push(`Emergency launch: ${Updates.emergencyLaunchReason ?? 'unknown'}`);
  }
  for (const entry of entries) {
    if (ERROR_LOG_CODES.has(entry.code) || ERROR_LOG_LEVELS.has(entry.level)) {
      lines.push(`[${entry.code}] ${entry.message}`);
    }
  }
  return lines;
}

export async function formatOtaDebugReport(): Promise<string> {
  const snapshot = readOtaNativeSnapshotSync();
  const nativeEntries = await readNativeLogEntries('MENU', 3600000).catch(() => [] as UpdatesLogEntry[]);
  const storedLogs = await getOtaLogs();
  const errors = nativeErrorLines(nativeEntries);

  const sections = [
    '--- Native snapshot (live) ---',
    ...formatSnapshotLines(snapshot),
    errors.length ? '\n--- Native errors ---' : '',
    ...errors.slice(0, 8),
    nativeEntries.length
      ? `\n--- Native log (${Math.min(nativeEntries.length, 12)} recent) ---`
      : '\n--- Native log ---\n(none)',
    ...nativeEntries.slice(-12).map(formatNativeLogEntry),
    storedLogs.length
      ? `\n--- Stored OTA trace (${Math.min(storedLogs.length, 15)} recent) ---`
      : '',
    ...storedLogs.slice(-15),
  ].filter((line) => line !== '');

  return sections.join('\n').slice(-3800);
}

async function alertSeenKey(): Promise<string> {
  const build = Application.nativeBuildVersion ?? 'unknown';
  return `${ALERT_SEEN_PREFIX}${build}`;
}

async function shouldShowEmbeddedLaunchAlert(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(await alertSeenKey());
    return seen !== '1';
  } catch {
    return true;
  }
}

async function markEmbeddedLaunchAlertSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(await alertSeenKey(), '1');
  } catch {}
}

export function showOtaDebugAlert(
  body: string,
  buttons?: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>,
) {
  Alert.alert(
    'OTA Native Diagnostic',
    body.slice(-3500),
    buttons ?? [{ text: 'OK' }],
  );
}

async function showEmbeddedLaunchAlert(snapshot: OtaNativeSnapshot, nativeEntries: UpdatesLogEntry[]) {
  if (!(await shouldShowEmbeddedLaunchAlert())) return;

  const errors = nativeErrorLines(nativeEntries);
  const body = [
    'Embedded OTA probe (build 267+). Native expo-updates state:',
    '',
    ...formatSnapshotLines(snapshot),
    '',
    errors.length
      ? `Issues (${errors.length}):\n${errors.slice(0, 4).join('\n')}`
      : 'No native errors detected in log window.',
    '',
    'Full report: Settings → About → tap version badge 5×.',
  ].join('\n');

  showOtaDebugAlert(body);
  await markEmbeddedLaunchAlertSeen();
}

async function runDiagnosticsPass(pass: 'LAUNCH' | 'FOREGROUND' | 'MENU') {
  if (diagnosticsRunning && pass !== 'MENU') return;
  if (pass !== 'MENU') diagnosticsRunning = true;

  try {
    const snapshot = readOtaNativeSnapshotSync();
    otaLog(`${pass}_START`, AppState.currentState);
    otaLog(`${pass}_SNAPSHOT`, snapshot);

    const nativeEntries = await readNativeLogEntries(`${pass}_T0`);

    if (pass === 'LAUNCH') {
      await delay(3000);
      await runRemoteCheck(`${pass}_CHECK`);
      const nativeLate = await readNativeLogEntries(`${pass}_T1`);
      const allEntries = nativeLate.length >= nativeEntries.length ? nativeLate : nativeEntries;

      if (!launchAlertScheduled) {
        launchAlertScheduled = true;
        await showEmbeddedLaunchAlert(snapshot, allEntries);
      }
    } else if (pass === 'FOREGROUND') {
      await delay(1500);
      await runRemoteCheck(`${pass}_CHECK`);
      await readNativeLogEntries(`${pass}_T1`);
    }

    otaLog(`${pass}_END`, 'embedded probe — no JS fetchUpdateAsync');
  } finally {
    if (pass !== 'MENU') diagnosticsRunning = false;
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Embedded-native OTA probe — runs from the App Store binary without requiring any OTA.
 * Surfaces native expo-updates state via one-time launch alert + 5-tap debug menu.
 */
export function runEmbeddedOtaDiagnosticsOnLaunch() {
  otaLog('EMBEDDED_BOOT', EMBEDDED_OTA_PROBE_MARKER);
  otaLog('EMBEDDED_BOOT', readOtaNativeSnapshotSync());

  if (__DEV__ && !Updates.isEnabled) {
    otaLog('EMBEDDED_BOOT_SKIP', 'Dev client / Expo Go without expo-updates');
    return () => {};
  }

  void runDiagnosticsPass('LAUNCH');

  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') {
      void runDiagnosticsPass('FOREGROUND');
    }
  });

  return () => sub.remove();
}

/** @deprecated Use runEmbeddedOtaDiagnosticsOnLaunch */
export const runOtaDiagnosticsOnLaunch = runEmbeddedOtaDiagnosticsOnLaunch;
