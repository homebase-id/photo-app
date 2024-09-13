import {
  DotYouClient,
  HomebaseFile,
  TargetDrive,
  UploadResult,
  queryBatch,
  queryModified,
} from '@homebase-id/js-lib/core';
import { getArchivalStatusFromType, getPhotos } from '../../../provider/photos/PhotoProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LibraryType,
  PhotoConfig,
  PhotoLibraryMetadata,
} from '../../../provider/photos/PhotoTypes';
import {
  addDay,
  buildMetaStructure,
  getPhotoLibrary,
  savePhotoLibraryMetadata,
  updateCount,
} from '../../../provider/photos/PhotoLibraryMetaProvider';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';
import {
  getQueryBatchCursorFromTime,
  getQueryModifiedCursorFromTime,
} from '@homebase-id/js-lib/helpers';

let saveScheduled = false;
const isDebug = false;

export const rebuildLibrary = async ({
  dotYouClient,
  targetDrive,
  type,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  type: LibraryType;
}) => {
  const allPhotos = (await getPhotos(dotYouClient, targetDrive, type, undefined, 1200, undefined))
    .results;
  const metaStruc = buildMetaStructure(allPhotos);

  isDebug && console.debug('[Metadata] Rebuilding library', { type });

  // Store meta file on server (No need to await, it doesn't need to be on the server already to be used)
  savePhotoLibraryMetadata(dotYouClient, metaStruc, type);

  return metaStruc;
};

export const usePhotoLibrary = ({
  targetDrive,
  type,
}: {
  targetDrive?: TargetDrive;
  type: LibraryType;
}) => {
  const dotYouClient = useDotYouClientContext();

  const fetch = async (type: LibraryType): Promise<PhotoLibraryMetadata | null> => {
    if (!dotYouClient || !targetDrive) return null;

    // Get meta file from server
    const photoLibOnServer = await getPhotoLibrary(dotYouClient, type);

    if (photoLibOnServer && photoLibOnServer.lastUpdated) {
      const newFilesSinceLastUpdate = await queryFilesSince(photoLibOnServer.lastUpdated, type);
      console.log('newFilesSinceLastUpdate', newFilesSinceLastUpdate);
      let runningServerLib = photoLibOnServer;
      newFilesSinceLastUpdate.forEach((file) => {
        if (file.fileMetadata.appData.userDate)
          runningServerLib = addDay(photoLibOnServer, new Date(file.fileMetadata.appData.userDate));
      });

      isDebug && console.debug('[Metadata] get lib from server', runningServerLib, { type });
      return runningServerLib;
    }

    // No local cache and no server version... => rebuild
    return rebuildLibrary({ dotYouClient, targetDrive, type });
  };

  const BATCH_SIZE = 2000;
  const queryFilesSince = async (sinceInIms: number, type: LibraryType) => {
    const modifiedCursor = getQueryModifiedCursorFromTime(sinceInIms); // Friday, 31 May 2024 09:38:54.678
    const batchCursor = getQueryBatchCursorFromTime(new Date().getTime(), sinceInIms);

    const archivalStatus = getArchivalStatusFromType(type);

    const newData = await queryBatch(
      dotYouClient,
      {
        targetDrive: PhotoConfig.PhotoDrive,
        archivalStatus: archivalStatus,
      },
      {
        maxRecords: BATCH_SIZE,
        cursorState: batchCursor,
        includeMetadataHeader: true,
      }
    );

    const modifieData = await queryModified(
      dotYouClient,
      {
        targetDrive: PhotoConfig.PhotoDrive,
        archivalStatus: archivalStatus,
      },
      {
        maxRecords: BATCH_SIZE,
        cursor: modifiedCursor,
        excludePreviewThumbnail: false,
        includeHeaderContent: true,
      }
    );

    return [...newData.searchResults, ...modifieData.searchResults].filter(
      (dsr) =>
        dsr.fileMetadata.appData.fileType !== PhotoConfig.PhotoLibraryMetadataFileType &&
        dsr.fileState !== 'deleted'
    ) as HomebaseFile<string>[];
  };

  return {
    fetchLibrary: useQuery({
      queryKey: ['photo-library', targetDrive?.alias, type],
      queryFn: () => fetch(type),
      gcTime: Infinity, // Never => react query will never remove the data from the cache
      enabled: !!targetDrive,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 1, // 1min
    }),
  };
};

export const useManagePhotoLibrary = ({ targetDrive }: { targetDrive?: TargetDrive }) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const debouncedSaveOfLibs = async () => {
    if (saveScheduled) return;
    saveScheduled = true;

    setTimeout(async () => {
      const libQueries = queryClient
        .getQueryCache()
        .findAll({
          queryKey: ['photo-library', targetDrive?.alias],
          exact: false,
        })
        .filter((query) => query.state.status === 'success');

      await Promise.all(
        libQueries.map(async (query) => {
          const type = query.queryKey[2] as LibraryType; // Can be undefined if it's the root library
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
            const newlyMergedLib = await queryClient.fetchQuery<PhotoLibraryMetadata>({
              queryKey: ['photo-library', targetDrive?.alias, type],
            });

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
      isDebug &&
        console.debug(
          '[Metadata] saved all libs to server',
          libQueries.map((q) => q.queryKey)
        );
      saveScheduled = false;
    }, 2000);
  };

  const saveNewCount = async ({
    type,
    date,
    newCount,
  }: {
    type: LibraryType;
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

    isDebug && console.debug('[Metadata] Photo count mismatch, updated count', type, date);
    debouncedSaveOfLibs();
  };

  return {
    updateCount: useMutation({ mutationFn: saveNewCount }),
    invalidateLibrary: (type: LibraryType) => {
      queryClient.invalidateQueries({
        queryKey: ['photo-library', targetDrive?.alias, type],
        exact: false,
      });
    },
  };
};
