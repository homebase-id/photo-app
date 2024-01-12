# Photo App Monorepo

## Run on ios

```
cd ios && pod install && cd -
npm run ios -- --simulator="iPhone 15"
```

## Copy video to ios

Emulator: drag and drop
Device: air drop

## Run in android

```
npm run android
```

## Deploy release build to android

```
./gradlew clean build
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

## Copy video to android

`adb push /Users/seb/tmp/BigBuckBunny.mp4 /sdcard/Download/`

## Log in as `frodo.dotyou.cloud` on Android

```
# run adb as root:
adb root

# adb proxy port 443
adb reverse tcp:443 tcp:443
```

Now you can login with `frodo.dotyou.cloud`.

## React Native Video Libraries

- react-native-ffmpeg
- react-native-compressor

## IOS Video Libraries

- AVFoundation
- FFmpeg
- MobileFFmpeg / MobileVLCKit
- GPUImage

## Android Video Libraries

- FFmpeg for Android
- MediaCodec API
- ExoPlayer
- Glide
- Litr
- Telegram's Video Compression Library (JavaCPP Preset for FFmpeg)
