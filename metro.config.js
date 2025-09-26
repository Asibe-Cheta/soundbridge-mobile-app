const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only looks in the local node_modules, not parent directories
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules')
];

// Prevent Metro from looking up the directory tree
config.watchFolders = [__dirname];

module.exports = config;
