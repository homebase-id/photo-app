const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
// console.log('metro.config.js', path.resolve(__dirname, '../../node_modules'));
const config = {
  // projectRoot: path.resolve(__dirname, '../../'),
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '../../'), path.resolve(__dirname, '../../packages')],
  // extraNodeModules: [
  //   path.resolve(__dirname, '../../web/node_modules'),
  //   path.resolve(__dirname, '../../node_modules'),
  // ],
  resolver: {
    extraNodeModules: {
      'photo-app-common': path.resolve(__dirname, '../../packages/common'),
      '@react-native-community/netinfo': path.resolve(
        __dirname,
        '../../node_modules/@react-native-community/netinfo'
      ),
    },
    resetCache: true,
    unstable_enableSymlinks: true, // Enable for monorepo symlink issues
    unstable_enablePackageExports: true, // Helps with package.json exports
  },
};

module.exports = wrapWithReanimatedMetroConfig(mergeConfig(getDefaultConfig(__dirname), config));
