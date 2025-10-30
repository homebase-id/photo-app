import { DEFAULT_PAYLOAD_KEY, EmbeddedThumb, TargetDrive } from '@homebase-id/js-lib/core';
import { OdinImage } from '@homebase-id/ui-lib';
import { useDotYouClientContext } from 'photo-app-common';

export const PhotoWithLoader = ({
  fileId,
  targetDrive,
  previewThumbnail,
  lastModified,
  fit = 'cover',
  className,
  fileKey,
}: {
  fileId: string;
  fileKey?: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  lastModified: number | undefined;
  fit?: 'cover' | 'contain';
  className?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  return (
    <OdinImage
      dotYouClient={dotYouClient}
      targetDrive={targetDrive}
      fileId={fileId}
      fileKey={fileKey || DEFAULT_PAYLOAD_KEY}
      lastModified={lastModified}
      previewThumbnail={previewThumbnail}
      fit={fit}
      className={className}
      preferObjectUrl={true}
      probablyEncrypted={true}
      // => Prefer image urls over base64
    />
  );
};
