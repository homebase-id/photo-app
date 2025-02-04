import { OdinImage, OdinVideo, OdinVideoProps, useImage } from '@homebase-id/ui-lib';
import {
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  ImageSize,
  TargetDrive,
} from '@homebase-id/js-lib/core';
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
            preferObjectUrl={true}
            probablyEncrypted={true}
          />
        ) : (
          <div className="relative h-full w-full min-w-[20rem] bg-slate-200 dark:bg-indigo-950"></div> // No preview available
        )
      ) : (
        <OdinVideoWrapper
          targetDrive={targetDrive}
          fileId={fileId}
          fileKey={DEFAULT_PAYLOAD_KEY}
          lastModified={lastModified}
          skipChunkedPlayback={skipChunkedPlayback}
          probablyEncrypted={true}
          className="max-h-[inherit] w-full h-full"
        />
      )}
    </div>
  );
};

type OdinVideoWrapperProps = Omit<OdinVideoProps, 'dotYouClient'>;
export const OdinVideoWrapper = ({ ...props }: OdinVideoWrapperProps) => {
  const dotYouClient = useDotYouClientContext();

  const { data: image } = useImage({
    dotYouClient,
    probablyEncrypted: props.probablyEncrypted,
    imageDrive: props.targetDrive,
    imageFileId: props.fileId,
    imageFileKey: props.fileKey,
    imageGlobalTransitId: props.globalTransitId,
    lastModified: props.lastModified,
    odinId: props.odinId,
    preferObjectUrl: true,
    size: { pixelWidth: 100, pixelHeight: 100 },
  }).fetch;

  return (
    <OdinVideo dotYouClient={dotYouClient} {...props} poster={image ? image.url : props.poster} />
  );
};
