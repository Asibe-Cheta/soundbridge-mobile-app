module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily disabled reanimated plugin to fix bundling issues
      // 'react-native-reanimated/plugin',
    ],
  };
};
