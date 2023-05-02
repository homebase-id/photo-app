import { TargetDrive, EmbeddedThumb, ImageSize } from '@youfoundation/js-lib';
import { OdinVideo } from '@youfoundation/ui-lib';
import useAuth from '../../../hooks/auth/useAuth';

export const VideoWithLoader = ({
  fileId,
  targetDrive,
  fit = 'cover',
  hideControls,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  size?: ImageSize;
  fit?: 'cover' | 'contain';
  hideControls?: boolean;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return (
    <div className="relative h-full w-full">
      <OdinVideo
        dotYouClient={dotYouClient}
        targetDrive={targetDrive}
        fileId={fileId}
        className={`absolute inset-0 h-full w-full ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
        hideControls={hideControls}
      />
    </div>
  );
};
