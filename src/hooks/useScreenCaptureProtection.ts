import { useEffect, useState } from 'react';
import { Platform, NativeModules, NativeEventEmitter, AppState } from 'react-native';

// expo-screen-capture is intentionally NOT imported or required anywhere in this file.
//
// The JS package (v55) is incompatible with the current native binary (built against
// v54-era expo-modules-core). When requireNativeModule('ExpoScreenCapture') fires,
// the TurboModule bridge calls getMethodDescriptorsFromModule at the JNI level and
// throws a Java exception that becomes a JavascriptException BEFORE any JS try/catch
// can intercept it — crashing the app on Android.
//
// iOS screen-recording detection uses the custom IsScreenCapturedIos native module
// directly (no expo-screen-capture needed). Android is skipped entirely.
// Restore the expo-screen-capture import only after the native binary is rebuilt
// with a compatible version.

export function useScreenCaptureProtection(
  onCapturedChange?: (captured: boolean) => void
): { isCaptured: boolean } {
  const [isCaptured, setIsCaptured] = useState(false);

  useEffect(() => {
    // Android: no reliable capture-detection API, and FLAG_SECURE makes the entire
    // screen black in screenshots/recordings — skip entirely.
    if (Platform.OS === 'android') {
      return;
    }

    if (Platform.OS === 'ios') {
      const { IsScreenCapturedIos } = NativeModules;

      if (!IsScreenCapturedIos) {
        return;
      }

      IsScreenCapturedIos.getIsCaptured().then((captured: boolean) => {
        setIsCaptured(captured);
        if (captured) onCapturedChange?.(captured);
      });

      const emitter = new NativeEventEmitter(IsScreenCapturedIos);
      const subscription = emitter.addListener('isScreenCaptured', (captured: boolean) => {
        setIsCaptured(captured);
        // Only fire pause when the app is FULLY in foreground (active).
        // Using !== 'background' would also pass during the 'inactive' transition
        // phase (when the user presses Home), where App Switcher thumbnail generation
        // can briefly trigger isCaptured = true on iOS — incorrectly pausing audio.
        if (AppState.currentState === 'active') {
          onCapturedChange?.(captured);
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

  return { isCaptured };
}
