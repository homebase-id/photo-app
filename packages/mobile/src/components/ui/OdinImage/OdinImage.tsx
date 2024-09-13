import { EmbeddedThumb, ImageContentType, ImageSize, TargetDrive } from '@homebase-id/js-lib/core';
import { memo, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  ImageStyle,
  Platform,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import useImage from './hooks/useImage';
import { SvgUri } from 'react-native-svg';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';

export interface OdinImageProps {
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  fileKey?: string;
  lastModified?: number;
  fit?: 'cover' | 'contain';
  imageSize?: { width: number; height: number };
  alt?: string;
  title?: string;
  previewThumbnail?: EmbeddedThumb;
  avoidPayload?: boolean;
  enableZoom?: boolean;
  style?: ImageStyle;
  onPress?: () => void;
  onLongPress?: (e: GestureResponderEvent) => void;
}

const thumblessContentTypes = ['image/svg+xml', 'image/gif'];

export const OdinImage = memo(
  ({
    odinId,
    targetDrive,
    fileId,
    fileKey,
    lastModified,
    fit,
    imageSize,
    alt,
    title,
    previewThumbnail,
    enableZoom,
    style,
    onPress,
    onLongPress,
  }: OdinImageProps) => {
    // Don't set load size if it's a thumbnessLessContentType; As they don't have a thumb
    const loadSize = useMemo(
      () =>
        previewThumbnail?.contentType &&
        thumblessContentTypes.includes(previewThumbnail?.contentType)
          ? undefined
          : {
              pixelHeight:
                (imageSize?.height
                  ? Math.round(imageSize?.height * (enableZoom ? 6 : 1))
                  : undefined) || 800,
              pixelWidth:
                (imageSize?.width
                  ? Math.round(imageSize?.width * (enableZoom ? 6 : 1))
                  : undefined) || 800,
            },
      [enableZoom, imageSize, previewThumbnail?.contentType]
    );

    const embeddedThumbUrl = useMemo(() => {
      if (!previewThumbnail) return;
      return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
    }, [previewThumbnail]);

    const [thumbLoaded, setThumbLoaded] = useState(false);
    const loadFinal = !embeddedThumbUrl || (!!embeddedThumbUrl && thumbLoaded);
    const {
      fetch: { data: imageData },
    } = useImage({
      odinId,
      imageFileId: loadFinal ? fileId : undefined,
      imageFileKey: fileKey,
      imageDrive: targetDrive,
      size: loadSize,
      naturalSize: previewThumbnail || undefined,
      lastModified,
    });

    if (enableZoom) {
      return (
        <ZoomableImage
          uri={imageData?.url || embeddedThumbUrl}
          imageSize={imageSize}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      );
    } else {
      return (
        <InnerImage
          onLoad={() => setThumbLoaded(true)}
          uri={imageData?.url || embeddedThumbUrl || ''}
          contentType={imageData?.type || previewThumbnail?.contentType}
          style={{
            position: 'absolute', // Absolute so it takes up the full imageSize defined by the wrapper view
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            resizeMode: fit,
            zIndex: 5, // Displayed underneath the actual image
            ...style,
          }}
          alt={alt || title}
          imageMeta={{
            odinId,
            imageFileId: fileId,
            imageFileKey: fileKey,
            imageDrive: targetDrive,
            size: loadSize,
          }}
          imageSize={imageSize}
          blurRadius={!imageData ? 2 : 0}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      );
    }
  }
);

const InnerImage = memo(
  ({
    uri,
    alt,
    imageSize,
    blurRadius,
    style,
    fit,
    onLoad,
    onPress,
    onLongPress,
    contentType,
    imageMeta,
  }: {
    uri: string;
    imageSize?: { width: number; height: number };
    blurRadius?: number;
    alt?: string;
    style?: ImageStyle;
    fit?: 'cover' | 'contain';
    onLoad?: () => void;
    onLongPress?: (e: GestureResponderEvent) => void;
    onPress?: () => void;
    imageMeta?: {
      odinId: string | undefined;
      imageFileId: string | undefined;
      imageFileKey: string | undefined;
      imageDrive: TargetDrive;
      size?: ImageSize;
    };

    contentType: string | undefined;
  }) => {
    const { invalidateCache } = useImage();
    return (
      <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
        {contentType === 'image/svg+xml' ? (
          <View
            style={[
              {
                ...imageSize,
                ...style,
              },
              // SVGs styling are not supported on Android
              Platform.OS === 'android' ? style : undefined,
            ]}
          >
            <SvgUri
              width={imageSize?.width}
              height={imageSize?.height}
              uri={uri}
              style={{ overflow: 'hidden', ...style }}
              onLoad={onLoad}
            />
          </View>
        ) : (
          <Image
            onError={
              imageMeta
                ? () =>
                    invalidateCache(
                      imageMeta?.odinId,
                      imageMeta?.imageFileId,
                      imageMeta?.imageFileKey,
                      imageMeta?.imageDrive,
                      imageMeta?.size
                    )
                : undefined
            }
            onLoadEnd={onLoad}
            source={uri ? { uri } : undefined}
            alt={alt}
            style={{
              resizeMode: fit,
              ...imageSize,
              ...style,
            }}
            blurRadius={blurRadius}
          />
        )}
      </TouchableWithoutFeedback>
    );
  }
);

const ZoomableImage = memo(
  ({
    uri,
    imageSize,
    onPress,
    onLongPress,
    imageMeta,
  }: {
    uri: string | undefined;
    imageSize?: { width: number; height: number };
    onPress?: () => void;
    onLongPress?: (e: GestureResponderEvent) => void;
    imageMeta?: {
      odinId: string | undefined;
      imageFileId: string | undefined;
      imageFileKey: string | undefined;
      imageDrive: TargetDrive;
      size?: ImageSize;
    };

    contentType?: ImageContentType;
  }) => {
    const { invalidateCache } = useImage();
    return (
      <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
        <View
          style={{
            ...imageSize,
          }}
        >
          <ImageZoom
            uri={uri}
            minScale={1}
            maxScale={3}
            isDoubleTapEnabled={true}
            isPinchEnabled
            resizeMode="contain"
            style={{
              ...imageSize,
            }}
            onError={
              imageMeta
                ? () =>
                    invalidateCache(
                      imageMeta?.odinId,
                      imageMeta?.imageFileId,
                      imageMeta?.imageFileKey,
                      imageMeta?.imageDrive,
                      imageMeta?.size
                    )
                : undefined
            }
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }
);
