module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // plugins: [
  //   [
  //     'module-resolver',
  //     {
  //       alias: {
  //         stream: 'stream-browserify',
  //         buffer: '@craftzdog/react-native-buffer',
  //         crypto: 'react-native-quick-crypto',
  //       },
  //     },
  //   ],
  // ],
  plugins: ['react-native-reanimated/plugin'],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
