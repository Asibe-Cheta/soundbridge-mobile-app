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
        // Both platforms excluded — ffmpeg-kit-ios-audio 6.0 XCFramework binary
        // was deleted from GitHub releases (HTTP 404). Android Maven artifact
        // status unknown. Excluded until a maintained replacement is available.
        ios: null,
        android: null,
      },
    },
  },
};
