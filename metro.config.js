const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Persist Metro transform cache inside the project so it survives reboots.
// Without this, Metro uses /tmp which is wiped on restart, forcing a full
// cold rebuild (~20 min) on every OTA push after a reboot.
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, '.metro-cache') }),
];

// Metro's default assetExts only contains lowercase 'jpg'; files with uppercase
// '.JPG' extension are never indexed unless we add the uppercase variant too.
config.resolver.assetExts = [...config.resolver.assetExts, 'JPG'];

// Watchman sync times out on this machine; Node crawler is slower but reliable.
config.resolver.useWatchman = false;
config.resolver.blockList = [/node_modules\/.* [0-9].*/];

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
