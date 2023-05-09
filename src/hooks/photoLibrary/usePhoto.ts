import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  ImageSize,
  getFileHeader,
  stringGuidsEqual,
  DriveSearchResult,
  ThumbnailFile,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

import { getPhoto, updatePhoto, uploadNew } from '../../provider/photos/PhotoProvider';
import { PhotoFile } from '../../provider/photos/PhotoTypes';
import { usePhotosReturn } from './usePhotos';

const usePhoto = (targetDrive?: TargetDrive, fileId?: string, size?: ImageSize) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();

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
  }: {
    newPhoto: File;
    albumKey?: string;
    thumb?: ThumbnailFile;
  }) => {
    if (!targetDrive) return null;
    return await uploadNew(dotYouClient, targetDrive, albumKey, newPhoto, thumb);
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
    const header = await getFileHeader(dotYouClient, targetDrive, fileId, undefined, true);

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
    const header = await getFileHeader(dotYouClient, targetDrive, fileId, undefined, true);
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

  return {
    fetch: useQuery(
      ['photo', targetDrive?.alias, fileId, `${size?.pixelHeight}x${size?.pixelWidth}`],
      () => fetchPhoto({ targetDrive, fileId, size }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
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
      onSuccess: () => {
        queryClient.invalidateQueries(['photo-library', targetDrive?.alias]);
      },
    }),
    remove: useMutation(removePhoto, {
      onMutate: (toRemovePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photos', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData = queryClient.getQueryData<usePhotosReturn>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'bin') {
              queryClient.setQueryData<usePhotosReturn>(
                queryKey,
                queryData.filter((photo) => photo.fileId !== toRemovePhotoData.photoFileId)
              );
            }
          });
      },
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo-library', targetDrive?.alias]);
        queryClient.invalidateQueries(['photos', targetDrive?.alias, 'bin']);
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
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData = queryClient.getQueryData<usePhotosReturn>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'archive') {
              queryClient.setQueryData<usePhotosReturn>(
                queryKey,
                queryData.filter((photo) => photo.fileId !== toArchivePhotoData.photoFileId)
              );
            }
          });
      },
      onSettled: (_param, _error, data) => {
        queryClient.invalidateQueries(['photo-library', targetDrive?.alias]);
        queryClient.invalidateQueries(['photos', targetDrive?.alias, 'archive']);
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
            const queryData = queryClient.getQueryData<usePhotosReturn>(queryKey);

            if (!queryData) return;

            // Remove from all bin and archive
            if (libraryType === 'archive' || libraryType === 'bin') {
              queryClient.setQueryData<usePhotosReturn>(
                queryKey,
                queryData.filter((photo) => photo.fileId !== toRestorePhotoData.photoFileId)
              );
            }
          });
      },
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo-library', targetDrive?.alias]);
        queryClient.invalidateQueries(['photos', targetDrive?.alias]);
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
          queryClient.invalidateQueries(['photo-library', targetDrive?.alias, tag]);
        });
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
                    (tag) => !toRemoveData.removeTags.includes(tag)
                  ) || [],
              },
            },
          };

          queryClient.setQueryData<DriveSearchResult>(
            ['photo-header', toRemoveData.targetDrive.alias, toRemoveData.fileId],
            newQueryData
          );
        }
      },
      onSettled: (data, error, variables) => {
        variables.removeTags.forEach((tag) => {
          queryClient.invalidateQueries(['photo-library', targetDrive?.alias, tag]);
        });
      },
    }),
  };
};

export default usePhoto;
