import {
  InfiniteData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  TargetDrive,
  ImageSize,
  getFileHeader,
  DriveSearchResult,
  deleteFile,
} from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import {
  useFlatPhotosFromDate,
  useInfintePhotosReturn,
  usePhotosByMonth,
} from './usePhotos';
import { usePhotoLibrary } from './usePhotoLibrary';
import { uploadNew } from '../../provider/Image/RNPhotoProvider';
import { syncHeaderFile } from '../../provider/drive/LocalDbProvider';
import { getPhoto, updatePhoto } from '../../provider/photos/PhotoProvider';
import { PhotoConfig, PhotoFile } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';
import { useAlbumThumbnail } from './useAlbum';

const usePhoto = (
  targetDrive?: TargetDrive,
  fileId?: string,
  size?: ImageSize,
) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

  const invalidatePhotosByMonth = usePhotosByMonth({}).invalidateQueries;
  const invalidateFlatPhotos = useFlatPhotosFromDate({}).invalidateFlatPhotos;
  const invalidateAlbumCover = useAlbumThumbnail().invalidateAlbumCover;

  const dotYouClient = getDotYouClient();

  const uploadNewMedia = async ({
    targetDrive,
    newPhoto,
    albumKey,
  }: {
    targetDrive?: TargetDrive;
    newPhoto: {
      fileName?: string | undefined;
      type?: string | undefined;
      uri?: string | undefined;
      fileSize?: number;
      height: number;
      width: number;
    };
    albumKey?: string;
  }) => {
    if (!targetDrive) return null;
    const uploadResult = await uploadNew(dotYouClient, targetDrive, albumKey, {
      ...newPhoto,
      filepath: newPhoto.uri,
      filename: newPhoto.fileName || null,
    });

    const type = undefined;

    addDayToLibrary({ type, date: uploadResult.userDate });
    return { ...uploadResult, type };
  };

  const fetchPhoto = async ({
    targetDrive,
    fileId,
    size,
  }: {
    targetDrive?: TargetDrive;
    fileId?: string;
    size?: ImageSize;
  }) => {
    if (!targetDrive || !fileId) return null;

    return await getPhoto(dotYouClient, targetDrive, fileId, size, true);
  };

  const removePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) return null;

    return await updatePhoto(dotYouClient, targetDrive, photoFileId, {
      archivalStatus: 2,
    });
  };

  const deletePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) return null;

    return await deleteFile(dotYouClient, targetDrive, photoFileId);
  };

  const archivePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) return null;

    return await updatePhoto(dotYouClient, targetDrive, photoFileId, {
      archivalStatus: 1,
    });
  };

  const restorePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) return null;

    return await updatePhoto(dotYouClient, targetDrive, photoFileId, {
      archivalStatus: 0,
    });
  };

  const addTags = async ({
    targetDrive,
    fileId,
    addTags,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
    addTags: string[];
  }) => {
    const header = await getFileHeader(dotYouClient, targetDrive, fileId);

    const existingTags =
      header?.fileMetadata.appData.tags?.map(tag => tag.replaceAll('-', '')) ||
      [];
    const newTags = Array.from(
      new Set([
        ...existingTags,
        ...addTags.map(tag => tag.replaceAll('-', '')),
      ]),
    );

    return await updatePhoto(dotYouClient, targetDrive, fileId, {
      tag: newTags,
    });
  };

  const removeTags = async ({
    targetDrive,
    fileId,
    removeTags,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
    removeTags: string[];
  }) => {
    const header = await getFileHeader(dotYouClient, targetDrive, fileId);
    const existingTags = header?.fileMetadata.appData.tags || [];
    const newTags = [
      ...existingTags.filter(
        tag =>
          !removeTags.some(toRemoveTag => stringGuidsEqual(toRemoveTag, tag)),
      ),
    ];

    return await updatePhoto(dotYouClient, targetDrive, fileId, {
      tag: newTags,
    });
  };

  return {
    fetch: useQuery({
      queryKey: [
        'photo',
        targetDrive?.alias,
        fileId,
        `${size?.pixelHeight}x${size?.pixelWidth}`,
      ],
      queryFn: () => fetchPhoto({ targetDrive, fileId, size }),

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
      gcTime: Infinity, // Never => react query will never remove the data from the cache
      enabled: !!targetDrive && !!fileId,
    }),
    fromCache: (targetDrive: TargetDrive, fileId: string) => {
      const previousKeys = queryClient
        .getQueryCache()
        .findAll({
          queryKey: ['photo', targetDrive?.alias, fileId],
          exact: false,
        })
        .filter(query => query.state.status === 'success');

      if (previousKeys?.length) {
        const bestKey = previousKeys.sort((keyA, keyB) =>
          (keyA.queryKey[keyA.queryKey.length - 1] + '').localeCompare(
            keyB.queryKey[keyB.queryKey.length - 1] + '',
          ),
        )[0].queryKey;

        const existingCachedImage =
          queryClient.getQueryData<PhotoFile>(bestKey);
        if (existingCachedImage) return existingCachedImage;
      }
    },
    upload: useMutation({
      mutationFn: uploadNewMedia,
      onSuccess: async (data, variables) => {
        if (!targetDrive || !data?.fileId) return null;
        await syncHeaderFile(dotYouClient, targetDrive, data.fileId);

        // Need to invalidate the infinite query to update the photoPreview;
        queryClient.invalidateQueries({
          queryKey: [
            'photos-infinite',
            targetDrive?.alias,
            variables.albumKey,
            null,
          ],
        });

        // Invalidate fetchByMonth
        //['photos', targetDrive?.alias, type, date && `${date.getFullYear()}-${date.getMonth()}`]
        queryClient.invalidateQueries({
          queryKey: [
            'photos',
            targetDrive?.alias,
            data?.type,
            data?.userDate &&
              `${data?.userDate.getFullYear()}-${data?.userDate.getMonth()}`,
          ],
          exact: false,
        });
      },
    }),
    remove: useMutation({
      mutationFn: removePhoto,
      onMutate: toRemovePhotoData => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach(query => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as
              | undefined
              | 'bin'
              | 'archive'
              | 'apps'
              | 'favorites';
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
              );

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'bin')
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
                {
                  ...queryData,
                  pages: queryData.pages.map(page => ({
                    ...page,
                    results: page.results.filter(
                      photo => photo.fileId !== toRemovePhotoData.photoFileId,
                    ),
                  })),
                },
              );
          });
      },
      onSettled: async (returnVal, _error, _data) => {
        if (!targetDrive) return null;
        syncHeaderFile(dotYouClient, targetDrive, _data?.photoFileId);

        invalidatePhotosByMonth();
        invalidateFlatPhotos(undefined, 'bin');

        if (returnVal?.date)
          addDayToLibrary({ type: 'bin', date: returnVal.date });
      },
      onError: ex => {
        console.error(ex);
      },
    }),
    deleteFile: useMutation({
      mutationFn: deletePhoto,
      onMutate: toRemovePhotoData => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach(query => {
            const queryKey = query.queryKey;
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
              );

            if (!queryData) return;

            // Remove from all libraryTypes
            queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(
              queryKey,
              {
                ...queryData,
                pages: queryData.pages.map(page => ({
                  ...page,
                  results: page.results.filter(
                    photo => photo.fileId !== toRemovePhotoData.photoFileId,
                  ),
                })),
              },
            );
          });
      },
      onSettled: async (_param, _error, _data) => {
        if (!targetDrive) return null;
        await syncHeaderFile(dotYouClient, targetDrive, _data?.photoFileId);

        invalidatePhotosByMonth('bin');
        invalidateFlatPhotos(undefined, 'bin');
      },
      onError: ex => {
        console.error(ex);
      },
    }),
    archive: useMutation({
      mutationFn: archivePhoto,
      onMutate: toArchivePhotoData => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach(query => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as
              | undefined
              | 'bin'
              | 'archive'
              | 'apps'
              | 'favorites';
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
              );

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'archive')
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
                {
                  ...queryData,
                  pages: queryData.pages.map(page => ({
                    ...page,
                    results: page.results.filter(
                      photo => photo.fileId !== toArchivePhotoData.photoFileId,
                    ),
                  })),
                },
              );
          });
      },
      onSettled: async (_param, _error, _data) => {
        if (!targetDrive) return null;
        await syncHeaderFile(dotYouClient, targetDrive, _data?.photoFileId);

        invalidatePhotosByMonth();

        if (_param?.date)
          addDayToLibrary({ type: 'archive', date: _param.date });
      },
      onError: ex => {
        console.error(ex);
      },
    }),
    restore: useMutation({
      mutationFn: restorePhoto,
      onMutate: toRestorePhotoData => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach(query => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as
              | undefined
              | 'bin'
              | 'archive'
              | string;
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
              );

            if (!queryData) return;

            // Remove from all bin and archive
            if (libraryType === 'archive' || libraryType === 'bin')
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(
                queryKey,
                {
                  ...queryData,
                  pages: queryData.pages.map(page => ({
                    ...page,
                    results: page.results.filter(
                      photo =>
                        !stringGuidsEqual(
                          photo.fileId,
                          toRestorePhotoData.photoFileId,
                        ),
                    ),
                  })),
                },
              );
          });
      },
      onSettled: async (returnVal, _error, _data) => {
        if (!targetDrive) return null;
        await syncHeaderFile(dotYouClient, targetDrive, _data?.photoFileId);

        // Clear photo queries
        invalidatePhotosByMonth();
        invalidateFlatPhotos();

        // Add day to the meta file
        if (returnVal?.date)
          addDayToLibrary({ type: undefined, date: returnVal.date });
      },
      onError: ex => {
        console.error(ex);
      },
    }),
    addTags: useMutation({
      mutationFn: addTags,
      onMutate: toAddData => {
        const queryData = queryClient.getQueryData<DriveSearchResult>([
          'photo-header',
          toAddData.targetDrive.alias,
          toAddData.fileId,
        ]);

        if (queryData) {
          const newQueryData: DriveSearchResult = {
            ...queryData,
            fileMetadata: {
              ...queryData.fileMetadata,
              appData: {
                ...queryData.fileMetadata.appData,
                tags: [
                  ...(queryData.fileMetadata.appData.tags || []),
                  ...toAddData.addTags,
                ],
              },
            },
          };

          queryClient.setQueryData<DriveSearchResult>(
            ['photo-header', toAddData.targetDrive.alias, toAddData.fileId],
            newQueryData,
          );
        }
      },
      onSettled: async (returnVal, _error, _data) => {
        if (!targetDrive) return null;
        await syncHeaderFile(dotYouClient, targetDrive, _data?.fileId);

        _data.addTags.forEach(tag => {
          invalidatePhotosByMonth();
          invalidateFlatPhotos(tag);
          invalidateAlbumCover(tag);
        });

        if (
          returnVal?.date &&
          _data.addTags.includes(PhotoConfig.FavoriteTag)
        ) {
          invalidateFlatPhotos('favorites');

          addDayToLibrary({
            type: 'favorites',
            date: returnVal?.date,
          });
        }
      },
    }),
    removeTags: useMutation({
      mutationFn: removeTags,
      onMutate: toRemoveData => {
        const queryData = queryClient.getQueryData<DriveSearchResult>([
          'photo-header',
          toRemoveData.targetDrive.alias,
          toRemoveData.fileId,
        ]);

        if (queryData) {
          const newQueryData: DriveSearchResult = {
            ...queryData,
            fileMetadata: {
              ...queryData.fileMetadata,
              appData: {
                ...queryData.fileMetadata.appData,
                tags:
                  queryData.fileMetadata.appData.tags?.filter(
                    tag =>
                      !toRemoveData.removeTags.some(removeTag =>
                        stringGuidsEqual(removeTag, tag),
                      ),
                  ) || [],
              },
            },
          };

          queryClient.setQueryData<DriveSearchResult>(
            [
              'photo-header',
              toRemoveData.targetDrive.alias,
              toRemoveData.fileId,
            ],
            newQueryData,
          );
        }
      },
      onSettled: async (_returnVal, _error, _data) => {
        if (!targetDrive) return null;
        await syncHeaderFile(dotYouClient, targetDrive, _data?.fileId);

        _data.removeTags.forEach(tag => {
          invalidatePhotosByMonth();
          invalidateFlatPhotos(tag);
        });

        if (_data.removeTags.includes(PhotoConfig.FavoriteTag)) {
          invalidatePhotosByMonth('favorites');
          invalidateFlatPhotos('favorites');
        }
      },
    }),
  };
};

export default usePhoto;
