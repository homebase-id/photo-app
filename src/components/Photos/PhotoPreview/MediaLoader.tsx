import { DriveSearchResult } from '@youfoundation/js-lib';
import { PhotoWithLoader } from './PhotoWithLoader';
import { VideoWithLoader } from './VideoWithLoader';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';

const targetDrive = PhotoConfig.PhotoDrive;

const MediaWithLoader = ({
  media,
  fileId,
  className,
}: {
  media?: DriveSearchResult;
  fileId?: string;
  className?: string;
}) => {
  if (!media || !fileId) return <div className="relative h-full w-[100vw]"></div>;

  return media?.fileMetadata.contentType.startsWith('video/') ? (
    <VideoWithLoader
      fileId={fileId}
      targetDrive={targetDrive}
      fit="contain"
      className={className}
    />
  ) : (
    <PhotoWithLoader
      fileId={fileId}
      targetDrive={targetDrive}
      previewThumbnail={media?.fileMetadata.appData.previewThumbnail}
      size={{ pixelWidth: 1600, pixelHeight: 1600 }}
      fit="contain"
      key={fileId}
      className={className}
    />
  );
};

export default MediaWithLoader;
