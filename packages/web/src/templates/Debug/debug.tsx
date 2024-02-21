import {
  PhotoConfig,
  rebuildLibrary,
  useDotYouClientContext,
  usePhotoLibrary,
} from 'photo-app-common';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { useQueryClient } from '@tanstack/react-query';
import Refresh from '../../components/ui/Icons/Refresh/Refresh';

const Debug = () => {
  const {
    fetchLibrary: { data: lib, refetch: refetchLib },
  } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    type: 'photos',
  });

  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  return (
    <>
      <div className="flex flex-row gap-4">
        <ActionButton onClick={() => refetchLib()} type="primary" icon={Refresh}>
          Refresh
        </ActionButton>
        <ActionButton
          onClick={() => {
            queryClient.removeQueries({ queryKey: ['photo-library'], exact: false });
            refetchLib();
          }}
        >
          Fetch from server
        </ActionButton>
        <ActionButton
          type="remove"
          onClick={async () => {
            await rebuildLibrary({
              dotYouClient,
              targetDrive: PhotoConfig.PhotoDrive,
              type: 'photos',
            });
            refetchLib();
          }}
        >
          Full rebuild
        </ActionButton>
      </div>
      <p>Last updated: {lib?.lastUpdated ? new Date(lib?.lastUpdated).toISOString() : null}</p>
      <div className="bg-white p-2 mt-4">
        <pre>
          <code>{lib && JSON.stringify(lib, null, 2)}</code>
        </pre>
      </div>
    </>
  );
};

export default Debug;
