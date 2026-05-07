const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Copies the patched MusicModule.kt (all @ReactMethod fns use Promise, compatible with New Arch TurboModule interop)
module.exports = function withTrackPlayerFix(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const src = path.join(__dirname, 'TrackPlayerMusicModule.kt');
      const dest = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt'
      );
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
      return config;
    },
  ]);
};
