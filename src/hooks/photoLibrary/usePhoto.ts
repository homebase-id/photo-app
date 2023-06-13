import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  ImageSize,
  getFileHeader,
  DriveSearchResult,
  ThumbnailFile,
  MediaUploadMeta,
  getPayloadBytes,
} from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import useAuth from '../auth/useAuth';

import { getPhoto, updatePhoto, uploadNew } from '../../provider/photos/PhotoProvider';
import { FileLike, PhotoConfig, PhotoFile } from '../../provider/photos/PhotoTypes';
import { useInfintePhotosReturn } from './usePhotos';
import usePhotoLibrary from './usePhotoLibrary';

const usePhoto = (targetDrive?: TargetDrive, fileId?: string, size?: ImageSize) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

  const dotYouClient = getDotYouClient();

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

  const uploadNewMedia = async ({
    newPhoto,
    albumKey,
    thumb,
    meta,
  }: {
    newPhoto: File | Blob | FileLike;
    albumKey?: string;
    thumb?: ThumbnailFile;
    meta?: MediaUploadMeta;
  }) => {
    if (!targetDrive) return null;
    const uploadResult = await uploadNew(
      dotYouClient,
      targetDrive,
      albumKey,
      newPhoto,
      thumb,
      meta
    );

    // Cache updates happen here as they need the context and correct point in time;
    if (uploadResult?.userDate && !meta?.archivalStatus) {
      addDayToLibrary({
        type: albumKey === PhotoConfig.FavoriteTag ? 'favorites' : undefined,
        date: uploadResult.userDate,
      });
    }

    if (meta?.archivalStatus === 3) {
      addDayToLibrary({ type: 'apps', date: uploadResult.userDate });
    } else if (meta?.archivalStatus === 1) {
      addDayToLibrary({ type: 'archive', date: uploadResult.userDate });
    }

    return uploadResult;
  };

  const removePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) return null;

    return await updatePhoto(dotYouClient, targetDrive, photoFileId, {
      archivalStatus: 2,
    });
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
      header.fileMetadata.appData.tags?.map((tag) => tag.replaceAll('-', '')) || [];
    const newTags = Array.from(
      new Set([...existingTags, ...addTags.map((tag) => tag.replaceAll('-', ''))])
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
    const existingTags = header.fileMetadata.appData.tags || [];
    const newTags = [
      ...existingTags.filter(
        (tag) => !removeTags.some((toRemoveTag) => stringGuidsEqual(toRemoveTag, tag))
      ),
    ];

    return await updatePhoto(dotYouClient, targetDrive, fileId, {
      tag: newTags,
    });
  };

  const download = async ({
    targetDrive,
    dsr,
  }: {
    targetDrive: TargetDrive;
    dsr: DriveSearchResult;
  }) => {
    if (!targetDrive) return null;

    const decryptedPayload = await getPayloadBytes(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      dsr.fileMetadata.payloadIsEncrypted ? dsr.sharedSecretEncryptedKeyHeader : undefined
    );

    if (!decryptedPayload) return null;

    const url = window.URL.createObjectURL(
      new Blob([decryptedPayload.bytes], { type: decryptedPayload.contentType })
    );

    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return {
    fetch: useQuery(
      ['photo', targetDrive?.alias, fileId, `${size?.pixelHeight}x${size?.pixelWidth}`],
      () => fetchPhoto({ targetDrive, fileId, size }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
        cacheTime: Infinity, // Never => react query will never remove the data from the cache
        enabled: !!targetDrive && !!fileId,
      }
    ),
    fromCache: (targetDrive: TargetDrive, fileId: string) => {
      const previousKeys = queryClient
        .getQueryCache()
        .findAll(['photo', targetDrive?.alias, fileId], { exact: false })
        .filter((query) => query.state.status === 'success');

      if (previousKeys?.length) {
        const bestKey = previousKeys.sort((keyA, keyB) =>
          (keyA.queryKey[keyA.queryKey.length - 1] + '').localeCompare(
            keyB.queryKey[keyB.queryKey.length - 1] + ''
          )
        )[0].queryKey;

        const existingCachedImage = queryClient.getQueryData<PhotoFile>(bestKey);
        if (existingCachedImage) return existingCachedImage;
      }
    },
    upload: useMutation(uploadNewMedia, {
      onSuccess: (data, variables) => {
        // Need to invalidate the infinite query to update the photoPreview;
        queryClient.invalidateQueries([
          'photos-infinite',
          targetDrive?.alias,
          variables.albumKey,
          null,
        ]);
      },
    }),
    remove: useMutation(removePhoto, {
      onMutate: (toRemovePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photos', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | 'apps' | 'favorites';
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'bin') {
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey, {
                ...queryData,
                pages: queryData.pages.map((page) => ({
                  ...page,
                  results: page.results.filter(
                    (photo) => photo.fileId !== toRemovePhotoData.photoFileId
                  ),
                })),
              });
            }
          });
      },
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photos', targetDrive?.alias, 'bin']);
        queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias]);

        if (_param?.date) addDayToLibrary({ type: 'bin', date: _param.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    archive: useMutation(archivePhoto, {
      onMutate: (toArchivePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photos', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | 'apps' | 'favorites';
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'archive') {
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey, {
                ...queryData,
                pages: queryData.pages.map((page) => ({
                  ...page,
                  results: page.results.filter(
                    (photo) => photo.fileId !== toArchivePhotoData.photoFileId
                  ),
                })),
              });
            }
          });
      },
      onSettled: (_param, _error, data) => {
        queryClient.invalidateQueries(['photos', targetDrive?.alias, undefined]); // Removed from the photos library

        queryClient.invalidateQueries(['photos', targetDrive?.alias, 'archive']); // Added to the archive library
        queryClient.invalidateQueries(['photos-infinte', targetDrive?.alias, 'archive']); // Added to the archive photoPreview

        if (_param?.date) addDayToLibrary({ type: 'archive', date: _param.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    restore: useMutation(restorePhoto, {
      onMutate: (toRestorePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photos', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all bin and archive
            if (libraryType === 'archive' || libraryType === 'bin') {
              queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey, {
                ...queryData,
                pages: queryData.pages.map((page) => ({
                  ...page,
                  results: page.results.filter(
                    (photo) => !stringGuidsEqual(photo.fileId, toRestorePhotoData.photoFileId)
                  ),
                })),
              });
            }
          });
      },
      onSettled: (returnVal, _data) => {
        // Clear photo queries
        queryClient.invalidateQueries(['photos', targetDrive?.alias, undefined]);
        queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias]);

        // Add day to the meta file
        if (returnVal?.date) addDayToLibrary({ type: undefined, date: returnVal.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    addTags: useMutation(addTags, {
      onMutate: (toAddData) => {
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
                tags: [...(queryData.fileMetadata.appData.tags || []), ...toAddData.addTags],
              },
            },
          };

          queryClient.setQueryData<DriveSearchResult>(
            ['photo-header', toAddData.targetDrive.alias, toAddData.fileId],
            newQueryData
          );
        }
      },
      onSettled: (data, error, variables) => {
        variables.addTags.forEach((tag) => {
          queryClient.invalidateQueries(['photos', targetDrive?.alias, undefined, tag]);
          queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias, undefined, tag]);
        });

        if (data?.date && variables.addTags.includes(PhotoConfig.FavoriteTag)) {
          queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias, 'favorites']);

          addDayToLibrary({
            type: 'favorites',
            date: data?.date,
          });
        }
      },
    }),
    removeTags: useMutation(removeTags, {
      onMutate: (toRemoveData) => {
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
                    (tag) =>
                      !toRemoveData.removeTags.some((removeTag) => stringGuidsEqual(removeTag, tag))
                  ) || [],
              },
            },
          };

          console.log('newQueryData', newQueryData);

          queryClient.setQueryData<DriveSearchResult>(
            ['photo-header', toRemoveData.targetDrive.alias, toRemoveData.fileId],
            newQueryData
          );
        }
      },
      onSettled: (data, error, variables) => {
        variables.removeTags.forEach((tag) => {
          queryClient.invalidateQueries(['photo-library', targetDrive?.alias, undefined, tag]);
          queryClient.invalidateQueries(['photos', targetDrive?.alias, undefined, tag]);
          queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias, undefined, tag]);
        });

        if (variables.removeTags.includes(PhotoConfig.FavoriteTag)) {
          queryClient.invalidateQueries(['photo-library', targetDrive?.alias, 'favorites']);
          queryClient.invalidateQueries(['photos', targetDrive?.alias, 'favorites']);
          queryClient.invalidateQueries(['photos-infinite', targetDrive?.alias, 'favorites']);
        }
      },
    }),
    download: useMutation(download),
  };
};

export default usePhoto;
