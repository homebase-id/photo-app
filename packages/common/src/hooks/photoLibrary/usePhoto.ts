import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  getFileHeader,
  DriveSearchResult,
  deleteFile,
} from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import { updatePhoto } from '../../provider/photos/PhotoProvider';
import { PhotoConfig, PhotoFile } from '../../provider/photos/PhotoTypes';
import { useInfintePhotosReturn } from './usePhotos';
import { usePhotoLibrary } from './usePhotoLibrary';
import { useAlbumThumbnail } from './useAlbum';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const usePhoto = (targetDrive?: TargetDrive) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const invalidateAlbumCover = useAlbumThumbnail().invalidateAlbumCover;

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

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
      header?.fileMetadata.appData.tags?.map((tag) => tag.replaceAll('-', '')) || [];
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
    const existingTags = header?.fileMetadata.appData.tags || [];
    const newTags = [
      ...existingTags.filter(
        (tag) => !removeTags.some((toRemoveTag) => stringGuidsEqual(toRemoveTag, tag))
      ),
    ];

    return await updatePhoto(dotYouClient, targetDrive, fileId, {
      tag: newTags,
    });
  };

  return {
    fromCache: (targetDrive: TargetDrive, fileId: string) => {
      const previousKeys = queryClient
        .getQueryCache()
        .findAll({
          queryKey: ['photo', targetDrive?.alias, fileId],
          exact: false,
        })
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
    remove: useMutation({
      mutationFn: removePhoto,
      onMutate: (toRemovePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
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
        queryClient.invalidateQueries({
          queryKey: ['photos', targetDrive?.alias, 'bin'],
        });
        queryClient.invalidateQueries({
          queryKey: ['photos-infinite', targetDrive?.alias],
        });

        if (_param?.date) addDayToLibrary({ type: 'bin', date: _param.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    deleteFile: useMutation({
      mutationFn: deletePhoto,
      onMutate: (toRemovePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach((query) => {
            const queryKey = query.queryKey;
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all libraryTypes
            queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey, {
              ...queryData,
              pages: queryData.pages.map((page) => ({
                ...page,
                results: page.results.filter(
                  (photo) => photo.fileId !== toRemovePhotoData.photoFileId
                ),
              })),
            });
          });
      },
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries({
          queryKey: ['photos', targetDrive?.alias, 'bin'],
        });
        queryClient.invalidateQueries({
          queryKey: ['photos-infinite', targetDrive?.alias],
        });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    archive: useMutation({
      mutationFn: archivePhoto,
      onMutate: (toArchivePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
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
        queryClient.invalidateQueries({
          queryKey: ['photos', targetDrive?.alias, undefined],
        }); // Removed from the photos library

        queryClient.invalidateQueries({
          queryKey: ['photos', targetDrive?.alias, 'archive'],
        }); // Added to the archive library
        queryClient.invalidateQueries({
          queryKey: ['photos-infinte', targetDrive?.alias, 'archive'],
        }); // Added to the archive photoPreview

        if (_param?.date) addDayToLibrary({ type: 'archive', date: _param.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    restore: useMutation({
      mutationFn: restorePhoto,
      onMutate: (toRestorePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
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
        queryClient.invalidateQueries({
          queryKey: ['photos', targetDrive?.alias, undefined],
        });
        queryClient.invalidateQueries({
          queryKey: ['photos-infinite', targetDrive?.alias],
        });

        // Add day to the meta file
        if (returnVal?.date) addDayToLibrary({ type: undefined, date: returnVal.date });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    addTags: useMutation({
      mutationFn: addTags,
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
          queryClient.invalidateQueries({
            queryKey: ['photos', targetDrive?.alias, '', tag],
          });
          queryClient.invalidateQueries({
            queryKey: ['photos-infinite', targetDrive?.alias, '', tag],
          });
          invalidateAlbumCover(tag);
        });

        if (data?.date && variables.addTags.includes(PhotoConfig.FavoriteTag)) {
          queryClient.invalidateQueries({
            queryKey: ['photos-infinite', targetDrive?.alias, 'favorites'],
            exact: false,
          });
          queryClient.invalidateQueries({
            queryKey: ['photos', targetDrive?.alias, 'favorites'],
            exact: false,
          });

          addDayToLibrary({
            type: 'favorites',
            date: data?.date,
          });
        }
      },
    }),
    removeTags: useMutation({
      mutationFn: removeTags,
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
          queryClient.invalidateQueries({
            queryKey: ['photos', targetDrive?.alias, '', tag],
          });
          queryClient.invalidateQueries({
            queryKey: ['photos-infinite', targetDrive?.alias, '', tag],
          });
          invalidateAlbumCover(tag);
        });

        if (variables.removeTags.includes(PhotoConfig.FavoriteTag)) {
          queryClient.invalidateQueries({
            queryKey: ['photos', targetDrive?.alias, 'favorites'],
          });
          queryClient.invalidateQueries({
            queryKey: ['photos-infinite', targetDrive?.alias, 'favorites'],
          });
        }
      },
    }),
  };
};
