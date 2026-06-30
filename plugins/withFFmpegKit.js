const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Android only: sets rootProject.ext.ffmpegKitPackage in build.gradle ext block.
// iOS section is intentionally absent — ffmpeg-kit-ios-audio 6.0 XCFramework binary
// was deleted from GitHub releases when arthenica archived the repo (HTTP 404).
// The pod spec exists on CocoaPods trunk but the download URL returns 404, making
// native installation impossible until a maintained fork with hosted binaries is found.
module.exports = function withFFmpegKit(config, { package: pkgVariant = 'audio' } = {}) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const gradlePath = path.join(cfg.modRequest.platformProjectRoot, 'build.gradle');
      if (!fs.existsSync(gradlePath)) return cfg;

      let gradle = fs.readFileSync(gradlePath, 'utf8');

      if (gradle.includes('ffmpegKitPackage')) return cfg;

      if (/\bext\s*\{/.test(gradle)) {
        gradle = gradle.replace(
          /(\bext\s*\{)/,
          `$1\n        ffmpegKitPackage = '${pkgVariant}'`,
        );
      } else {
        gradle = `ext.ffmpegKitPackage = '${pkgVariant}'\n\n` + gradle;
      }

      fs.writeFileSync(gradlePath, gradle);
      return cfg;
    },
  ]);

  return config;
};
