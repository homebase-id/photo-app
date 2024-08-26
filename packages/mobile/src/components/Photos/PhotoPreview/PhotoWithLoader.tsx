import { DEFAULT_PAYLOAD_KEY, EmbeddedThumb, TargetDrive } from '@homebase-id/js-lib/core';
import { memo } from 'react';
import { OdinImage } from '../../ui/OdinImage/OdinImage';

// Memo to performance optimize the FlatList
export const PhotoWithLoader = memo(
  ({
    fileId,
    targetDrive,
    previewThumbnail,
    fit = 'cover',
    imageSize,
    enableZoom,
    onPress,
    onLongPress,
  }: {
    fileId: string;
    targetDrive: TargetDrive;
    previewThumbnail?: EmbeddedThumb;
    fit?: 'cover' | 'contain';
    imageSize?: { width: number; height: number };
    enableZoom?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
  }) => {
    return (
      <OdinImage
        targetDrive={targetDrive}
        fileId={fileId}
        fileKey={DEFAULT_PAYLOAD_KEY}
        previewThumbnail={previewThumbnail}
        fit={fit}
        imageSize={imageSize}
        enableZoom={enableZoom}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );
  }
);
