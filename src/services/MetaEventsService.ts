import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_LOGGED_KEY = 'meta_app_install_logged';

class MetaEventsService {
  /**
   * Call once at app startup (inside App useEffect).
   * Initialises the SDK, logs AppOpen every launch,
   * and logs AppInstall exactly once (guarded by AsyncStorage).
   *
   * Uses a dynamic require so the native module is only resolved at runtime.
   * This allows the app to run in dev (Expo Go / dev client without fbsdk)
   * without crashing — the SDK simply no-ops when the native module is absent.
   */
  async initialize(): Promise<void> {
    // Skip entirely in dev — native module not compiled into Expo Go / dev builds.
    if (__DEV__) return;
    try {
      // Verify the native module is actually present in this binary before using it.
      // The production binary built before react-native-fbsdk-next was added will
      // not have the bridge compiled in — NativeModules check prevents a crash.
      const { NativeModules } = require('react-native');
      if (!NativeModules.FBSDK && !NativeModules.FBSDKCoreKit) return;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppEventsLogger, Settings } = require('react-native-fbsdk-next');
      await Settings.initializeSDK();
      AppEventsLogger.logEvent('fb_mobile_activate_app');
      const alreadyLogged = await AsyncStorage.getItem(INSTALL_LOGGED_KEY);
      if (!alreadyLogged) {
        AppEventsLogger.logEvent('fb_mobile_first_app_launch');
        await AsyncStorage.setItem(INSTALL_LOGGED_KEY, 'true');
      }
    } catch (e) {
      console.warn('MetaEventsService: init failed', e);
    }
  }
}

export const metaEventsService = new MetaEventsService();
