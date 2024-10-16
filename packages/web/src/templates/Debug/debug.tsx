import {
  PhotoConfig,
  rebuildLibrary,
  t,
  useDotYouClientContext,
  usePhotoLibrary,
} from 'photo-app-common';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { useQueryClient } from '@tanstack/react-query';
import Refresh from '../../components/ui/Icons/Refresh/Refresh';
import { PageMeta } from '../../components/ui/Layout/PageMeta/PageMeta';

const Debug = () => {
  const { data: lib, refetch: refetchLib } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    type: 'photos',
  }).fetchLibrary;

  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  return (
    <>
      <PageMeta title={t('Diagnostics')} />
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
            await refetchLib();
            alert('Rebuild finished');
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
