import { OdinImage, OdinVideo } from '@youfoundation/ui-lib';
import useAuth from '../../../hooks/auth/useAuth';
import {
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  ImageSize,
  TargetDrive,
} from '@youfoundation/js-lib/core';

export const VideoWithLoader = ({
  fileId,
  targetDrive,
  previewThumbnail,
  lastModified,
  fit = 'cover',
  preview,
  skipChunkedPlayback,
  className,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  lastModified: number | undefined;
  size?: ImageSize;
  fit?: 'cover' | 'contain';
  preview?: boolean;
  skipChunkedPlayback?: boolean;
  className?: string;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return (
    <div className={className || 'relative h-full w-full'} data-file={fileId}>
      {preview ? (
        previewThumbnail ? (
          <OdinImage
            dotYouClient={dotYouClient}
            targetDrive={targetDrive}
            previewThumbnail={previewThumbnail}
            fileKey={DEFAULT_PAYLOAD_KEY}
            lastModified={lastModified}
            fileId={fileId}
            fit={fit}
            className={`absolute inset-0 h-full w-full`}
            avoidPayload={true}
          />
        ) : (
          <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-950"></div> // No preview available
        )
      ) : (
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          lastModified={lastModified}
          skipChunkedPlayback={skipChunkedPlayback}
          className={`absolute inset-0 h-full w-full ${
            fit === 'cover' ? 'object-cover' : 'object-contain'
          }`}
        />
      )}
    </div>
  );
};
