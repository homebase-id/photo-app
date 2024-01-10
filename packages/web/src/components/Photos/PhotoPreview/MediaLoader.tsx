import { DEFAULT_PAYLOAD_KEY, DriveSearchResult } from '@youfoundation/js-lib/core';
import { PhotoWithLoader } from './PhotoWithLoader';
import { VideoWithLoader } from './VideoWithLoader';
import { PhotoConfig } from 'photo-app-common';

const targetDrive = PhotoConfig.PhotoDrive;

const MediaWithLoader = ({
  media,
  fileId,
  lastModified,
  className,
  original,
}: {
  media?: DriveSearchResult;
  fileId?: string;
  lastModified: number | undefined;
  className?: string;
  original?: boolean;
}) => {
  if (!media || !fileId) return <div className="relative h-full w-[100vw]"></div>;

  return media?.fileMetadata.payloads
    .find((payload) => payload.key === DEFAULT_PAYLOAD_KEY)
    ?.contentType.startsWith('video/') ? (
    <VideoWithLoader
      fileId={fileId}
      targetDrive={targetDrive}
      lastModified={lastModified}
      fit="contain"
      className={className}
      skipChunkedPlayback={original}
    />
  ) : (
    <PhotoWithLoader
      fileId={fileId}
      targetDrive={targetDrive}
      lastModified={lastModified}
      previewThumbnail={media?.fileMetadata.appData.previewThumbnail}
      size={!original ? { pixelWidth: 1600, pixelHeight: 1600 } : undefined}
      fit="contain"
      key={fileId}
      className={className}
    />
  );
};

export default MediaWithLoader;
