const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only looks in the local node_modules, not parent directories
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules')
];

// Prevent Metro from looking up the directory tree
config.watchFolders = [__dirname];

// Redirect @stripe/stripe-react-native's NativeOnrampSdkModule to a safe local
// mock that uses TurboModuleRegistry.get() (graceful null) instead of
// getEnforcing() (crash if native module missing from dev client binary).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('NativeOnrampSdkModule')) {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/NativeOnrampSdkModule.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
