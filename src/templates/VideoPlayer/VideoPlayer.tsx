import { useParams } from 'react-router-dom';
import useAuth from '../../hooks/auth/useAuth';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import { OdinVideo } from '@youfoundation/ui-lib';
import { ErrorBoundary } from '../../components/ui/Layout/ErrorBoundary/ErrorBoundary';

const KILOBYTE = 1024;
const MEGABYTE = 1024 * KILOBYTE;

const targetDrive = PhotoConfig.PhotoDrive;
const VideoPlayer = () => {
  const { getDotYouClient, getIdentity } = useAuth();
  const dotYouClient = getDotYouClient();
  const { photoKey } = useParams();

  return (
    <>
      <ErrorBoundary>
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={photoKey}
          className={`absolute inset-0 h-full w-full bg-black object-contain`}
          skipChunkedPlayback={false}
          autoPlay={true}
          directFileSizeLimit={10 * MEGABYTE}
        />
      </ErrorBoundary>
      {photoKey}
      {getIdentity()}
    </>
  );
};

export default VideoPlayer;
