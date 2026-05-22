const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Configures ffmpeg-kit-react-native to use the 'audio' package variant on both platforms.
// iOS: overrides the CocoaPods subspec from the default 'https' to 'audio'.
// Android: sets rootProject.ext.ffmpegKitPackage so the Gradle build pulls the correct Maven artifact.
module.exports = function withFFmpegKit(config, { package: pkgVariant = 'audio' } = {}) {
  // ── iOS ─────────────────────────────────────────────────────────────────────
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Skip if already configured (idempotent)
      if (podfile.includes('ffmpeg-kit-react-native')) return cfg;

      // Insert an explicit pod declaration inside the main target block, before
      // use_expo_modules! so it takes precedence over auto-linking's default subspec.
      const podLine =
        `  pod 'ffmpeg-kit-react-native', :subspecs => ['${pkgVariant}'], ` +
        `:podspec => '../node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec'`;

      podfile = podfile.replace(
        /(\s+use_expo_modules!)/m,
        `\n${podLine}\n$1`,
      );

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);

  // ── Android ──────────────────────────────────────────────────────────────────
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const gradlePath = path.join(cfg.modRequest.platformProjectRoot, 'build.gradle');
      if (!fs.existsSync(gradlePath)) return cfg;

      let gradle = fs.readFileSync(gradlePath, 'utf8');

      // Skip if already configured (idempotent)
      if (gradle.includes('ffmpegKitPackage')) return cfg;

      // Inject into the existing ext block if present, otherwise prepend
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
