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

let saveScheduled = false;

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

  console.log('[Metadata] Rebuilding library', { album });

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
    if (album && ![PhotoConfig.FavoriteTag, 'bin', 'archive', 'apps'].includes(album)) return null;

    // Get meta file from client
    const photoLibOnClient = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);

    // Get meta file from server
    const photoLibOnServer = await getPhotoLibrary(
      dotYouClient,
      album,
      photoLibOnClient?.lastCursor
    );
    if (photoLibOnServer) {
      // Merge with local cache
      if (photoLibOnClient) {
        const mergedLib = mergeLibrary(photoLibOnServer, photoLibOnClient);
        console.log('[Metadata] get merged lib', mergedLib, { album });
        return mergedLib;
      }

      console.log('[Metadata] get lib from server', photoLibOnServer, { album });
      return photoLibOnServer;
    }

    if (photoLibOnClient) {
      console.log('[Metadata] Server has no "new" lib, local cache is up to date');
      return photoLibOnClient;
    }

    // No local cache and no server version... => rebuild
    return rebuildLibrary({ dotYouClient, targetDrive, album });
  };

  const debouncedSaveOfLibs = async () => {
    if (saveScheduled) return;
    saveScheduled = true;

    setTimeout(async () => {
      const libQueries = queryClient
        .getQueryCache()
        .findAll(['photo-library', targetDrive?.alias], { exact: false })
        .filter((query) => query.state.status === 'success');

      await Promise.all(
        libQueries.map(async (query) => {
          const albumKey = query.queryKey[2] as string | undefined; // Can be undefined if it's the root library
          const libToSave = queryClient.getQueryData<PhotoLibraryMetadata>(query.queryKey);
          if (!libToSave) return;

          const fetchAndMergeAgain = async () => {
            const newlyMergedLib = await queryClient.fetchQuery<PhotoLibraryMetadata>([
              'photo-library',
              targetDrive?.alias,
              albumKey,
            ]);

            // TODO Should we avoid endless loops here? (Shouldn't happen, but...)
            await savePhotoLibraryMetadata(dotYouClient, newlyMergedLib, albumKey, () =>
              setTimeout(fetchAndMergeAgain, 1000)
            );
          };

          try {
            const { newVersionTag } = await savePhotoLibraryMetadata(
              dotYouClient,
              libToSave,
              albumKey,
              fetchAndMergeAgain
            );
            // Update versionTag in cache
            queryClient.setQueryData<PhotoLibraryMetadata>(query.queryKey, {
              ...libToSave,
              versionTag: newVersionTag,
            });
          } catch (err) {
            console.warn(err);
          }
        })
      );
      // send request to the backend
      // access to latest state here
      console.log(
        '[Metadata] saved all libs to server',
        libQueries.map((q) => q.queryKey)
      );
      saveScheduled = false;
    }, 10000);
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
    if (!targetDrive) return;

    const currentLib = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      album,
    ]);
    if (!currentLib) return;

    const updatedLib = updateCount(currentLib, date, newCount);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive.alias, album],
      updatedLib
    );

    console.log('[Metadata] Photo count mismatch, updated count', album, date);
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

    console.log('[Metadata] Added (to)', date, album, updatedLib);
    debouncedSaveOfLibs();
  };

  return {
    fetchLibrary: useQuery(['photo-library', targetDrive?.alias, album], () => fetch(album), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
      cacheTime: Infinity, // Never => react query will never remove the data from the cache
      enabled: !!targetDrive && album !== 'new' && !disabled,
      onError: (err) => console.error(err),
    }),
    updateCount: useMutation(saveNewCount),
    addDay: useMutation(saveNewDay),
  };
};

export default usePhotoLibrary;
