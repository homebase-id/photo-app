import { EmbeddedThumb, ImageSize, TargetDrive } from '@youfoundation/js-lib/core';
import React, { memo, useMemo } from 'react';
import ImageZoom from 'react-native-image-pan-zoom';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import useImage from '../../../hooks/image/useImage';
import useTinyThumb from '../../../hooks/image/useTinyThumb';

// Memo to performance optimize the FlatList
export const PhotoWithLoader = memo(
  ({
    fileId,
    targetDrive,
    previewThumbnail,
    fit = 'cover',
    imageSize,
    enableZoom,
    onClick,
  }: {
    fileId: string;
    targetDrive: TargetDrive;
    previewThumbnail?: EmbeddedThumb;
    fit?: 'cover' | 'contain';
    imageSize?: { width: number; height: number };
    enableZoom: boolean;
    onClick?: () => void;
  }) => {
    return (
      <OdinImage
        targetDrive={targetDrive}
        fileId={fileId}
        previewThumbnail={previewThumbnail}
        fit={fit}
        imageSize={imageSize}
        enableZoom={enableZoom}
        onClick={onClick}
      />
    );
  }
);

export interface OdinImageProps {
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  fit?: 'cover' | 'contain';
  imageSize?: { width: number; height: number };
  alt?: string;
  title?: string;
  previewThumbnail?: EmbeddedThumb;
  probablyEncrypted?: boolean;
  avoidPayload?: boolean;
  enableZoom: boolean;
  onClick?: () => void;
}

export const OdinImage = ({
  odinId,
  targetDrive,
  fileId,
  fit,
  imageSize,
  alt,
  title,
  previewThumbnail,
  probablyEncrypted,
  avoidPayload,
  enableZoom,
  onClick,
}: OdinImageProps) => {
  const loadSize = {
    pixelHeight:
      (imageSize?.height ? Math.round(imageSize?.height * (enableZoom ? 3 : 1)) : undefined) || 800,
    pixelWidth:
      (imageSize?.width ? Math.round(imageSize?.width * (enableZoom ? 3 : 1)) : undefined) || 800,
  };

  const embeddedThumbUrl = useMemo(() => {
    if (!previewThumbnail) return;

    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  const { getFromCache } = useImage();
  const cachedImage = useMemo(
    () => (fileId ? getFromCache(odinId, fileId, targetDrive) : undefined),
    [fileId, getFromCache, odinId, targetDrive]
  );
  const skipTiny = !!previewThumbnail || !!cachedImage;

  const { data: tinyThumb } = useTinyThumb(odinId, !skipTiny ? fileId : undefined, targetDrive);
  const previewUrl = cachedImage?.url || embeddedThumbUrl || tinyThumb?.url;

  const naturalSize: ImageSize | undefined = tinyThumb
    ? {
        pixelHeight: tinyThumb.naturalSize.height,
        pixelWidth: tinyThumb.naturalSize.width,
      }
    : cachedImage?.naturalSize || previewThumbnail;

  const {
    fetch: { data: imageData },
  } = useImage(
    odinId,
    loadSize !== undefined ? fileId : undefined,
    targetDrive,
    avoidPayload ? { pixelHeight: 200, pixelWidth: 200 } : loadSize,
    probablyEncrypted,
    naturalSize
  );

  return (
    <View
      style={{
        position: 'relative',
      }}
    >
      {/* Blurry image */}
      {previewUrl ? (
        <Image
          source={{ uri: previewUrl }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            resizeMode: fit,

            ...imageSize,
          }}
          blurRadius={2}
        />
      ) : null}

      {!imageData?.url ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            ...imageSize,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator style={{}} size="large" />
        </View>
      ) : null}

      {/* Actual image */}
      {imageData?.url && imageSize ? (
        <ZoomableImage
          uri={imageData.url}
          fit={fit}
          imageSize={imageSize}
          enableZoom={enableZoom}
          alt={alt || title}
          onClick={onClick}
          maxScale={3}
        />
      ) : null}
    </View>
  );
};

const ZoomableImage = ({
  uri,
  alt,
  imageSize,

  fit,
  enableZoom,
  onClick,
  maxScale,
}: {
  uri: string;
  imageSize: { width: number; height: number };
  alt?: string;

  fit?: 'cover' | 'contain';
  enableZoom: boolean;
  onClick?: () => void;
  maxScale: number;
}) => {
  const innerImage = (
    <Image
      source={{ uri }}
      alt={alt}
      style={{
        resizeMode: fit,

        ...imageSize,
      }}
    />
  );

  if (!enableZoom) return innerImage;

  return (
    <ImageZoom
      cropWidth={Dimensions.get('window').width}
      cropHeight={Dimensions.get('window').height}
      imageWidth={imageSize.width}
      imageHeight={imageSize.height}
      minScal={1}
      onClick={onClick}
      maxScale={maxScale}
    >
      {innerImage}
    </ImageZoom>
  );
};
