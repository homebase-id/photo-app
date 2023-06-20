import { EmbeddedThumb, ImageSize, TargetDrive, ThumbSize } from '@youfoundation/js-lib/core';
import { OdinImage } from '@youfoundation/ui-lib';
import useAuth from '../../../hooks/auth/useAuth';

export const PhotoWithLoader = ({
  fileId,
  targetDrive,
  previewThumbnail,
  size,
  fit = 'cover',
  className,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
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
      previewThumbnail={previewThumbnail}
      explicitSize={size as ThumbSize}
      fit={fit}
      className={className}
    />
  );
};
