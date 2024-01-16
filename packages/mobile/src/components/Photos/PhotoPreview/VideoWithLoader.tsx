import { EmbeddedThumb, TargetDrive } from '@youfoundation/js-lib/core';
import React, { memo, useState } from 'react';
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native';
import { OdinImage } from './PhotoWithLoader';
import { Colors } from '../../../app/Colors';
import WebView from 'react-native-webview';
import { TouchableWithoutFeedback } from 'react-native';
import { Play } from '../../ui/Icons/icons';
import Video from 'react-native-video';
import useVideo from '../../../hooks/video/useVideo';
import useAuth from '../../../hooks/auth/useAuth';
import { PhotoConfig } from 'photo-app-common';

// Memo to performance optimize the FlatList
export const VideoWithLoader = memo(
  ({
    fileId,
    targetDrive,
    previewThumbnail,
    fit = 'cover',
    preview,
    imageSize,
    enableZoom,
    onClick,
  }: {
    fileId: string;
    targetDrive: TargetDrive;
    previewThumbnail?: EmbeddedThumb;
    fit?: 'cover' | 'contain';
    preview?: boolean;
    imageSize?: { width: number; height: number };
    enableZoom: boolean;
    onClick?: () => void;
  }) => {
    const [loadVideo, setLoadVideo] = useState(false);
    const { getDotYouClient } = useAuth();
    const dotYouClient = getDotYouClient();

    return (
      <View
        style={{
          backgroundColor: Colors.black,
          ...imageSize,
          position: 'relative',
        }}
      >
        {!loadVideo ? (
          <OdinImage
            dotYouClient={dotYouClient}
            targetDrive={targetDrive}
            fileId={fileId}
            previewThumbnail={previewThumbnail}
            fit={fit}
            imageSize={imageSize}
            enableZoom={enableZoom}
            onClick={onClick}
            avoidPayload={true}
          />
        ) : null}
        {!preview ? (
          loadVideo ? (
            <OdinVideo fileId={fileId} />
          ) : (
            <>
              <OdinImage
                dotYouClient={dotYouClient}
                targetDrive={targetDrive}
                fileId={fileId}
                previewThumbnail={previewThumbnail}
                fit={fit}
                imageSize={imageSize}
                enableZoom={true}
                onClick={() => setLoadVideo(true)}
                avoidPayload={true}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  zIndex: 20,
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TouchableOpacity
                  onPress={() => setLoadVideo(true)}
                  style={{
                    padding: 20,
                    borderRadius: 50,
                    borderWidth: 1,
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Play size={'xl'} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </>
          )
        ) : null}
      </View>
    );
  }
);

const OdinVideo = ({ fileId }: { fileId: string }) => {
  return Platform.OS === 'ios' ? (
    <OdinVideoDownload fileId={fileId} />
  ) : (
    <OdinVideoWeb fileId={fileId} />
  );
};

const OdinVideoWeb = ({ fileId }: { fileId: string }) => {
  const INJECTED_JAVASCRIPT = `(function() {
    const APP_SHARED_SECRET_KEY = 'APSS';
    const APP_AUTH_TOKEN_KEY = 'BX0900';
    const IDENTITY_KEY = 'identity';

    const APP_SHARED_SECRET = '33LjWjGEYhIM/Puo0ZTopw==';
    const APP_AUTH_TOKEN = 'GJh21h4QAKHCQPTA3OjQE85kdatkd/WLKrzl9wHn9vkD';
    const IDENTITY = 'sam.dotyou.cloud';

    window.localStorage.setItem(APP_SHARED_SECRET_KEY, APP_SHARED_SECRET);
    window.localStorage.setItem(APP_AUTH_TOKEN_KEY, APP_AUTH_TOKEN);
    window.localStorage.setItem(IDENTITY_KEY, IDENTITY);

    // Debug
    console = new Object();
    console.log = function(log) {
      window.ReactNativeWebView.postMessage(typeof log === 'object' ? JSON.stringify(log) : log);
    };
    console.debug = console.log;
    console.info = console.log;
    console.warn = console.log;
    console.error = console.log;
  })();`;

  return (
    <TouchableWithoutFeedback>
      <WebView
        source={{
          uri: `https://dev.dotyou.cloud:3005/player/${fileId}`,
        }}
        mixedContentMode="always"
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        allowsInlineMediaPlayback={true}
        allowsProtectedMedia={true}
        onError={(syntheticEvent) => {
          console.log('onerror');
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onMessage={(_data) => console.log(_data.nativeEvent.data)}
      />
    </TouchableWithoutFeedback>
  );
};

const OdinVideoDownload = ({ fileId }: { fileId: string }) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  // Hook to download the video
  const { data: videoUrl, isFetched } = useVideo(
    dotYouClient,
    fileId,
    PhotoConfig.PhotoDrive
  ).fetchVideo;

  // Loading
  if (!isFetched)
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );

  // Error
  if (!videoUrl) return null;

  // Playback of the locally downloaded file
  return (
    <Video
      source={{ uri: videoUrl }}
      onError={(e) => console.error(e)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      }}
      controls={true}
    />
  );
};
