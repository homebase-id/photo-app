import { DotYouClient, TargetDrive, UploadResult } from '@youfoundation/js-lib/core';
import { getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhotoLibraryMetadata } from '../../provider/photos/PhotoTypes';
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
  type,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  type?: 'bin' | 'archive' | 'apps' | 'favorites';
}) => {
  const allPhotos = (await getPhotos(dotYouClient, targetDrive, type, undefined, 1200, undefined))
    .results;
  const metaStruc = buildMetaStructure(allPhotos);

  console.log('[Metadata] Rebuilding library', { type });

  // Store meta file on server (No need to await, it doesn't need to be on the server already to be used)
  savePhotoLibraryMetadata(dotYouClient, metaStruc, type);

  return metaStruc;
};

const usePhotoLibrary = ({
  targetDrive,
  type,
  disabled,
}: {
  targetDrive?: TargetDrive;
  type?: 'bin' | 'archive' | 'apps' | 'favorites';
  disabled?: boolean;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async (
    type: 'archive' | 'bin' | 'apps' | 'favorites' | undefined
  ): Promise<PhotoLibraryMetadata | null> => {
    if (!dotYouClient || !targetDrive) return null;
    // Get meta file from client
    const photoLibOnClient = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      type,
    ]);

    // Get meta file from server
    const photoLibOnServer = await getPhotoLibrary(
      dotYouClient,
      type,
      photoLibOnClient?.lastCursor
    );
    if (photoLibOnServer) {
      // Merge with local cache
      if (photoLibOnClient) {
        const mergedLib = mergeLibrary(photoLibOnServer, photoLibOnClient);
        console.log('[Metadata] get merged lib', mergedLib, { type });
        return mergedLib;
      }

      console.log('[Metadata] get lib from server', photoLibOnServer, { type });
      return photoLibOnServer;
    }

    if (photoLibOnClient) {
      console.log('[Metadata] Server has no "new" lib, local cache is up to date');
      return photoLibOnClient;
    }

    // No local cache and no server version... => rebuild
    return rebuildLibrary({ dotYouClient, targetDrive, type });
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
          const type = query.queryKey[2] as 'archive' | 'apps' | 'bin' | undefined; // Can be undefined if it's the root library
          const libToSave = queryClient.getQueryData<PhotoLibraryMetadata>(query.queryKey);
          if (!libToSave) return;

          const saveNewVersionTag = async (uploadResult: UploadResult) => {
            if (!uploadResult) return;
            const { newVersionTag } = uploadResult;
            // Update versionTag in cache
            queryClient.setQueryData<PhotoLibraryMetadata>(query.queryKey, {
              ...libToSave,
              versionTag: newVersionTag,
            });
          };

          const fetchAndMerge = async () => {
            const newlyMergedLib = await queryClient.fetchQuery<PhotoLibraryMetadata>([
              'photo-library',
              targetDrive?.alias,
              type,
            ]);

            // TODO Should we avoid endless loops here? (Shouldn't happen, but...)
            const uploadResult = await savePhotoLibraryMetadata(
              dotYouClient,
              newlyMergedLib,
              type,
              () => setTimeout(fetchAndMerge, 1000)
            );
            if (!uploadResult) return;
            saveNewVersionTag(uploadResult);
          };

          try {
            const uploadResult = await savePhotoLibraryMetadata(
              dotYouClient,
              libToSave,
              type,
              fetchAndMerge
            );
            if (!uploadResult) return;
            saveNewVersionTag(uploadResult);
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
    type,
    date,
    newCount,
  }: {
    type?: 'archive' | 'bin' | 'apps' | 'favorites';
    date: Date;
    newCount: number;
  }) => {
    if (!targetDrive) return;

    const currentLib = queryClient.getQueryData<PhotoLibraryMetadata>([
      'photo-library',
      targetDrive.alias,
      type,
    ]);
    if (!currentLib) return;

    const updatedLib = updateCount(currentLib, date, newCount);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive.alias, type],
      updatedLib
    );

    console.log('[Metadata] Photo count mismatch, updated count', type, date);
    debouncedSaveOfLibs();
  };

  const saveNewDay = async ({
    type,
    date,
  }: {
    type?: 'archive' | 'bin' | 'apps' | 'favorites';
    date: Date;
  }) => {
    const photoLibOnClient =
      queryClient.getQueryData<PhotoLibraryMetadata>(['photo-library', targetDrive?.alias, type]) ||
      (await getPhotoLibrary(dotYouClient, type));
    if (!photoLibOnClient) return;

    const updatedLib = addDay(photoLibOnClient, date);
    if (!updatedLib) return;

    queryClient.setQueryData<PhotoLibraryMetadata>(
      ['photo-library', targetDrive?.alias, type],
      updatedLib
    );

    console.log('[Metadata] Added (to)', date, type, updatedLib);
    debouncedSaveOfLibs();
  };

  return {
    fetchLibrary: useQuery(['photo-library', targetDrive?.alias, type], () => fetch(type), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
      cacheTime: Infinity, // Never => react query will never remove the data from the cache
      enabled: !!targetDrive && !disabled,
      onError: (err) => console.error(err),
    }),
    updateCount: useMutation(saveNewCount),
    addDay: useMutation(saveNewDay),
  };
};

export default usePhotoLibrary;
