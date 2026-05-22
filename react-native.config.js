module.exports = {
  dependencies: {
    // iOS-only package — exclude from Android autolinking
    'react-native-is-screen-captured-ios': {
      platforms: {
        android: null,
      },
    },
    // ffmpeg-kit-react-native v6.0 native binaries (iOS XCFramework + Android AAR) are no longer
    // hosted — the upstream arthenica/ffmpeg-kit repo was archived and artifacts removed.
    // Excluded from auto-linking until a maintained replacement is wired up.
    'ffmpeg-kit-react-native': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
