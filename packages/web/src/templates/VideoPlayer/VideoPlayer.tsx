import { useParams } from 'react-router-dom';
import useAuth from '../../hooks/auth/useAuth';
import { OdinVideo } from '@youfoundation/ui-lib';
import { ErrorBoundary } from '../../components/ui/Layout/ErrorBoundary/ErrorBoundary';
import { DEFAULT_PAYLOAD_KEY } from '@youfoundation/js-lib/core';
import { PhotoConfig, useDotYouClientContext } from 'photo-app-common';

const KILOBYTE = 1024;
const MEGABYTE = 1024 * KILOBYTE;

const targetDrive = PhotoConfig.PhotoDrive;
const VideoPlayer = () => {
  const { getIdentity } = useAuth();
  const dotYouClient = useDotYouClientContext();
  const { photoKey } = useParams();

  return (
    <>
      <ErrorBoundary>
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={photoKey}
          fileKey={DEFAULT_PAYLOAD_KEY}
          lastModified={undefined}
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
