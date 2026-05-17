module.exports = {
  dependencies: {
    // iOS-only package — exclude from Android autolinking
    'react-native-is-screen-captured-ios': {
      platforms: {
        android: null,
      },
    },
  },
};
