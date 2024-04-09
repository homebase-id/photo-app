const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
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
    // unstable_enableSymlinks: true,
    // unstable_enablePackageExports: true,
    // enableSymlinks: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
