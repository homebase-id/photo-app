import { TargetDrive, EmbeddedThumb, ImageSize } from '@youfoundation/js-lib';
import { OdinImage, OdinVideo } from '@youfoundation/ui-lib';
import useAuth from '../../../hooks/auth/useAuth';

export const VideoWithLoader = ({
  fileId,
  targetDrive,
  fit = 'cover',
  preview,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  size?: ImageSize;
  fit?: 'cover' | 'contain';
  preview?: boolean;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return (
    <div className="relative h-full w-full">
      {preview ? (
        <OdinImage
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={fileId}
          fit={fit}
          className={`w-full} absolute inset-0 h-full`}
          avoidPayload={true}
        />
      ) : (
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={fileId}
          className={`absolute inset-0 h-full w-full ${
            fit === 'cover' ? 'object-cover' : 'object-contain'
          }`}
        />
      )}
    </div>
  );
};
