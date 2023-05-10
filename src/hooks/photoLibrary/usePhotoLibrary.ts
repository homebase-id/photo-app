import { DotYouClient, TargetDrive } from '@youfoundation/js-lib';
import { getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhotoLibraryMetadata } from '../../provider/photos/PhotoTypes';
import {
  addDay,
  buildMetaStructure,
  getPhotoLibrary,
  savePhotoLibraryMetadata,
  updateCount,
} from '../../provider/photos/PhotoLibraryMetaProvider';

const rebuildLibrary = async ({
  dotYouClient,
  targetDrive,
  album,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  album?: string;
}) => {
  const allPhotos = (await getPhotos(dotYouClient, targetDrive, album, 1200, undefined)).results;
  const metaStruc = buildMetaStructure(allPhotos);

  console.log('Rebuilding library', album);

  // Store meta file on server (No need to await, it doesn't need to be on the server already to be used)
  savePhotoLibraryMetadata(dotYouClient, metaStruc, album);

  return metaStruc;
};

const usePhotoLibrary = ({
  targetDrive,
  album,
  disabled,
}: {
  targetDrive: TargetDrive;
  album?: string;
  disabled?: boolean;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async (album?: string): Promise<PhotoLibraryMetadata> => {
    // Check meta file on server
    // if exists return that
    const photoLibOnServer = await getPhotoLibrary(dotYouClient, album);
    if (photoLibOnServer) {
      console.debug('fetched lib from server', photoLibOnServer);
      return photoLibOnServer;
    }

    // Else fetch all photos and build one
    return rebuildLibrary({ dotYouClient, targetDrive, album });
  };

  const saveNewCount = async ({
    album,
    date,
    newCount,
  }: {
    album?: string;
    date: Date;
    newCount: number;
  }) => {
    const currentLib = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);
    if (!currentLib) return;
    console.log('fetched lib from cache', currentLib);

    const updatedLib = updateCount(currentLib, date, newCount);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive.alias, album],
      updatedLib
    );

    return await savePhotoLibraryMetadata(dotYouClient, updatedLib, album);
  };

  // const debouncedSaveOfLib = useDebounce(() => {
  //   // send request to the backend
  //   // access to latest state here
  //   console.log(value);
  // });

  const saveNewDay = async ({ album, date }: { album?: string; date: Date }) => {
    const currentLib = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);
    if (!currentLib) return;

    const updatedLib = addDay(currentLib, date);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive.alias, album],
      updatedLib
    );

    return await savePhotoLibraryMetadata(dotYouClient, updatedLib, album);
  };

  return {
    fetchLibrary: useQuery(['photo-library', targetDrive.alias, album], () => fetch(album), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!targetDrive && album !== 'new' && !disabled,
      onError: (err) => console.error(err),
    }),
    updateCount: useMutation(saveNewCount, {
      onSettled: () => queryClient.invalidateQueries(['photo-library', targetDrive.alias, album]),
    }),
    addDay: useMutation(saveNewDay, {
      onSettled: () => queryClient.invalidateQueries(['photo-library', targetDrive.alias, album]),
      onError: (err, variables) => {
        console.error(err);
        rebuildLibrary({ dotYouClient, targetDrive, album: variables.album });
      },
    }),
  };
};

export default usePhotoLibrary;
