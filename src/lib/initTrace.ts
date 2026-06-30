import { AppState } from 'react-native';
import { audioLog } from './audioDebugLog';
import { getJsBundleLoadId } from './jsBundleTrace';

let bgServiceCtorCount = 0;
let appMountEffectCount = 0;

export function recordBgServiceConstructor(): { instanceSeq: number; loadId: string } {
  bgServiceCtorCount += 1;
  const loadId = getJsBundleLoadId();
  audioLog('BG_SERVICE_CTOR', {
    instanceSeq: bgServiceCtorCount,
    jsBundleLoadId: loadId,
    appState: AppState.currentState,
  });
  return { instanceSeq: bgServiceCtorCount, loadId };
}

/** Trace App.tsx mount effect — distinguishes duplicate effect vs new JS bundle. */
export function logAppMountEffectTrace(willSkip: boolean): void {
  appMountEffectCount += 1;
  audioLog('APP_MOUNT_EFFECT_TRACE', {
    invocation: appMountEffectCount,
    willSkipDuplicateInit: willSkip,
    jsBundleLoadId: getJsBundleLoadId(),
    appState: AppState.currentState,
    verdict: willSkip
      ? 'SKIPPED_servicesInitializedRef_same_bundle'
      : 'CALLING_initialize',
  });
}
