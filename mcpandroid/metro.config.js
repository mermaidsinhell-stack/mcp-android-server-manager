const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add nodejs-mobile assets to be bundled
config.resolver.assetExts.push('node');

module.exports = config;
