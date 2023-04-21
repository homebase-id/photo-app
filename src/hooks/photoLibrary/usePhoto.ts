import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  ImageSize,
  getFileHeader,
  stringGuidsEqual,
  DriveSearchResult,
} from '@youfoundation/dotyoucore-js';
import useAuth from '../auth/useAuth';

import { usePhotoLibraryPartReturn } from './usePhotoLibraryPart';
import { getPhoto, updatePhoto, uploadPhoto } from '../../provider/photos/PhotoProvider';
import { PhotoFile } from '../../provider/photos/PhotoTypes';

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

  const uploadNewPhoto = async ({ newPhoto, albumKey }: { newPhoto: File; albumKey?: string }) => {
    if (!targetDrive) return null;

    return await uploadPhoto(dotYouClient, targetDrive, newPhoto, albumKey);
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
    upload: useMutation(uploadNewPhoto, {
      onSuccess: () => {
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    remove: useMutation(removePhoto, {
      onMutate: (toRemovePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photo-library-parts', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData =
              queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'bin') {
              queryClient.setQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey, {
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
        queryClient.invalidateQueries(['photo', targetDrive?.alias, _data.photoFileId]);
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    archive: useMutation(archivePhoto, {
      onMutate: (toArchivePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photo-library-parts', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData =
              queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType !== 'archive') {
              queryClient.setQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey, {
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
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo', targetDrive?.alias, _data.photoFileId]);
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    restore: useMutation(restorePhoto, {
      onMutate: (toRestorePhotoData) => {
        queryClient
          .getQueryCache()
          .findAll(['photo-library-parts', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const libraryType = queryKey[2] as undefined | 'bin' | 'archive' | string;
            const queryData =
              queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            if (libraryType === 'archive' || libraryType === 'bin') {
              queryClient.setQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey, {
                ...queryData,
                pages: queryData.pages.map((page) => ({
                  ...page,
                  results: page.results.filter(
                    (photo) => photo.fileId !== toRestorePhotoData.photoFileId
                  ),
                })),
              });
            }
          });
      },
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo', targetDrive?.alias, _data.photoFileId]);
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    addTags: useMutation(addTags, {
      onMutate: (newPhotoData) => {
        let updatedDsr: DriveSearchResult | undefined;

        const getUpdatedDsr = (existingDsr: DriveSearchResult) => {
          if (updatedDsr) return updatedDsr;

          updatedDsr = {
            ...existingDsr,
            fileMetadata: {
              ...existingDsr.fileMetadata,
              appData: {
                ...existingDsr.fileMetadata.appData,
                tags: [
                  ...(existingDsr.fileMetadata.appData.tags || []),
                  ...newPhotoData.addTags.map((tag) => tag.replaceAll('-', '')),
                ],
              },
            },
          };

          return updatedDsr;
        };

        [...newPhotoData.addTags, undefined].forEach((tag) => {
          const previousParts = queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>([
            'photo-library-parts',
            targetDrive?.alias,
            tag,
          ]);

          if (previousParts?.pages) {
            const newParts: InfiniteData<usePhotoLibraryPartReturn> = {
              ...previousParts,
              pages: previousParts.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.map((photoDsr) => {
                    if (photoDsr.fileId === newPhotoData.fileId) {
                      return getUpdatedDsr(photoDsr);
                    }
                    return photoDsr;
                  }),
                };
              }),
            };
            queryClient.setQueryData(['photo-library-parts', targetDrive?.alias, tag], newParts);
          }
        });
      },
      onSettled: (data, error, variables) => {
        variables.addTags.forEach((tag) => {
          queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias, tag]);
        });
      },
    }),
    removeTags: useMutation(removeTags, {
      onMutate: (newPhotoData) => {
        let updatedDsr: DriveSearchResult | undefined;

        const getUpdatedDsr = (existingDsr: DriveSearchResult) => {
          if (updatedDsr) return updatedDsr;

          updatedDsr = {
            ...existingDsr,
            fileMetadata: {
              ...existingDsr.fileMetadata,
              appData: {
                ...existingDsr.fileMetadata.appData,
                tags: [
                  ...(existingDsr.fileMetadata.appData.tags?.filter(
                    (tag) =>
                      !newPhotoData.removeTags.some((toRemoveTag) =>
                        stringGuidsEqual(toRemoveTag, tag)
                      )
                  ) || []),
                ],
              },
            },
          };

          return updatedDsr;
        };

        [...newPhotoData.removeTags, undefined].forEach((tag) => {
          const previousParts = queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>([
            'photo-library-parts',
            targetDrive?.alias,
            tag,
          ]);

          if (previousParts?.pages) {
            const newParts: InfiniteData<usePhotoLibraryPartReturn> = {
              ...previousParts,
              pages: previousParts.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.map((photoDsr) => {
                    if (photoDsr.fileId === newPhotoData.fileId) {
                      return getUpdatedDsr(photoDsr);
                    }
                    return photoDsr;
                  }),
                };
              }),
            };
            queryClient.setQueryData(['photo-library-parts', targetDrive?.alias, tag], newParts);
          }
        });
      },
      onSettled: (data, error, variables) => {
        variables.removeTags.forEach((tag) => {
          queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias, tag]);
        });
      },
    }),
  };
};

export default usePhoto;
