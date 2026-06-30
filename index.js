import { registerRootComponent } from 'expo';
import { NativeModules } from 'react-native';

import App from './App';
import { markJsBundleEval } from './src/lib/jsBundleTrace';

markJsBundleEval('index.js');

// Register TrackPlayer background service BEFORE the React root mounts.
// This is required for iOS to maintain the audio session while the app is
// in the background — without it, iOS kills the audio process after ~60s.
// Guard with NativeModules check so Expo Go (no native module) doesn't crash.
if (NativeModules.TrackPlayerModule) {
  try {
    const TrackPlayer = require('react-native-track-player').default;
    if (TrackPlayer && typeof TrackPlayer.registerPlaybackService === 'function') {
      TrackPlayer.registerPlaybackService(() => require('./src/services/trackPlayerService'));
    }
  } catch (e) {
    console.warn('[TrackPlayer] registerPlaybackService failed:', e);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
