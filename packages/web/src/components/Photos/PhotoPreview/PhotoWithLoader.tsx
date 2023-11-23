import {
  DEFAULT_PAYLOAD_KEY,
  EmbeddedThumb,
  TargetDrive,
  ImageSize,
} from '@youfoundation/js-lib/core';
import { OdinImage } from '@youfoundation/ui-lib';
import useAuth from '../../../hooks/auth/useAuth';

export const PhotoWithLoader = ({
  fileId,
  targetDrive,
  previewThumbnail,
  lastModified,
  size,
  fit = 'cover',
  className,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  lastModified: number | undefined;
  size?: ImageSize;
  fit?: 'cover' | 'contain';
  className?: string;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return (
    <OdinImage
      dotYouClient={dotYouClient}
      targetDrive={targetDrive}
      fileId={fileId}
      fileKey={DEFAULT_PAYLOAD_KEY}
      lastModified={lastModified}
      previewThumbnail={previewThumbnail}
      explicitSize={size}
      fit={fit}
      className={className}
    />
  );
};
