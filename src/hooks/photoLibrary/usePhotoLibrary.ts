import { DotYouClient, TargetDrive } from '@youfoundation/js-lib';
import { getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhotoConfig, PhotoLibraryMetadata } from '../../provider/photos/PhotoTypes';
import {
  addDay,
  buildMetaStructure,
  getPhotoLibrary,
  mergeLibrary,
  savePhotoLibraryMetadata,
  updateCount,
} from '../../provider/photos/PhotoLibraryMetaProvider';
import useDebounce from '../debounce/useDebounce';

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

  console.log('Rebuilding library', { album });

  // Store meta file on server (No need to await, it doesn't need to be on the server already to be used)
  savePhotoLibraryMetadata(dotYouClient, metaStruc, album);

  return metaStruc;
};

const usePhotoLibrary = ({
  targetDrive,
  album,
  disabled,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  disabled?: boolean;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async (album?: string): Promise<PhotoLibraryMetadata | null> => {
    if (!dotYouClient || !targetDrive) return null;

    // We don't manage meta files for normal albums
    if (album && ![PhotoConfig.FavoriteTag, 'bin', 'archive'].includes(album)) return null;

    // Get meta file from client
    const photoLibOnClient = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);

    // Get meta file from server
    const photoLibOnServer = await getPhotoLibrary(dotYouClient, album);
    if (photoLibOnServer) {
      // Merge with local cache
      if (photoLibOnClient) {
        const mergedLib = mergeLibrary(photoLibOnServer, photoLibOnClient);
        console.log('get merged lib', mergedLib, { album });
        return mergedLib;
      }

      console.log('get fetched lib from server', photoLibOnServer, { album });
      return photoLibOnServer;
    }

    if (photoLibOnClient) {
      console.error(
        'You are late... The meta is not on the server yet, and it is fetched already...'
      );
      return photoLibOnClient;
    }

    // No local cache and no server version... => rebuild
    return rebuildLibrary({ dotYouClient, targetDrive, album });
  };

  const debouncedSaveOfLibs = useDebounce(async () => {
    const libQueries = queryClient
      .getQueryCache()
      .findAll(['photo-library', targetDrive?.alias], { exact: false })
      .filter((query) => query.state.status === 'success');

    await Promise.all(
      libQueries.map(async (query) => {
        const albumKey = query.queryKey[2] as string | undefined; // Can be undefined if it's the root library
        const libToSave = queryClient.getQueryData<PhotoLibraryMetadata>(query.queryKey);
        if (!libToSave) return;

        try {
          await savePhotoLibraryMetadata(dotYouClient, libToSave, albumKey);
        } catch (err) {
          // Something went wrong while saving.. Probably version conflict...
          console.warn(err);
          // Call the fetch (fetches and merges with local copy again)
          const newlyMergedLib = await queryClient.fetchQuery<PhotoLibraryMetadata>([
            'photo-library',
            targetDrive?.alias,
            albumKey,
          ]);
          await savePhotoLibraryMetadata(dotYouClient, newlyMergedLib, albumKey);
        }
      })
    );

    // send request to the backend
    // access to latest state here
    console.log(
      'saved all libs to server',
      libQueries.map((q) => q.queryKey)
    );
  });

  const saveNewCount = async ({
    album,
    date,
    newCount,
  }: {
    album?: string;
    date: Date;
    newCount: number;
  }) => {
    if (!targetDrive) return;

    const currentLib = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);
    if (!currentLib) return;
    console.log('fetched lib from cache', currentLib);

    const updatedLib = updateCount(currentLib, date, newCount);
    if (!updatedLib) return;

    console.log('updated lib from cache', updatedLib);

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive.alias, album],
      updatedLib
    );

    debouncedSaveOfLibs();
  };

  const saveNewDay = async ({ album, date }: { album?: string; date: Date }) => {
    const photoLibOnClient =
      queryClient.getQueryData<PhotoLibraryMetadata>([
        'photo-library',
        targetDrive?.alias,
        album,
      ]) || (await getPhotoLibrary(dotYouClient, album));
    if (!photoLibOnClient) return;

    const updatedLib = addDay(photoLibOnClient, date);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive?.alias, album],
      updatedLib
    );

    debouncedSaveOfLibs();
  };

  return {
    fetchLibrary: useQuery(['photo-library', targetDrive?.alias, album], () => fetch(album), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!targetDrive && album !== 'new' && !disabled,
      onError: (err) => console.error(err),
    }),
    updateCount: useMutation(saveNewCount, {
      onSettled: () => queryClient.invalidateQueries(['photo-library', targetDrive?.alias, album]),
    }),
    addDay: useMutation(saveNewDay, {
      onSettled: () => queryClient.invalidateQueries(['photo-library', targetDrive?.alias, album]),
    }),
  };
};

export default usePhotoLibrary;
