import { OdinImage, OdinVideo } from '@youfoundation/ui-lib';
import {
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  ImageSize,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from 'photo-app-common';

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
  const dotYouClient = useDotYouClientContext();

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
          <div className="relative h-full w-full min-w-[20rem] bg-slate-200 dark:bg-indigo-950"></div> // No preview available
        )
      ) : (
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          lastModified={lastModified}
          skipChunkedPlayback={skipChunkedPlayback}
          probablyEncrypted={true}
          className="max-h-[inherit]"
        />
      )}
    </div>
  );
};
