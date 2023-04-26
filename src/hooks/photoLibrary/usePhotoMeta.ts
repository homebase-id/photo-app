import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, ImageMetadata, DriveSearchResult } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

import {
  getPhotoMetadata,
  updatePhoto,
  updatePhotoMetadata,
} from '../../provider/photos/PhotoProvider';
import { usePhotoLibraryPartReturn } from './usePhotoLibraryPart';

const usePhotoMetadata = (targetDrive?: TargetDrive, fileId?: string) => {
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetchPhotoMeta = async ({
    targetDrive,
    fileId,
  }: {
    targetDrive?: TargetDrive;
    fileId?: string;
  }) => {
    if (!targetDrive || !fileId) {
      return null;
    }

    const fetchDataPromise = () => {
      return getPhotoMetadata(dotYouClient, targetDrive, fileId);
    };

    return await fetchDataPromise();
  };

  const updatePhotoMeta = async ({
    photoFileId,
    newImageMetadata,
  }: {
    photoFileId: string;
    newImageMetadata: ImageMetadata;
  }) => {
    if (!targetDrive) return null;

    return await updatePhotoMetadata(dotYouClient, targetDrive, photoFileId, newImageMetadata);
  };

  const updatePhotoDate = async ({
    photoFileId,
    newDate,
  }: {
    photoFileId: string;
    newDate: number;
  }) => {
    if (!targetDrive) return null;

    return await updatePhoto(dotYouClient, targetDrive, photoFileId, { userDate: newDate });
  };

  return {
    fetchMeta: useQuery(
      ['photo-meta', targetDrive?.alias, fileId],
      () => fetchPhotoMeta({ targetDrive, fileId }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!targetDrive && !!fileId,
      }
    ),
    updateMeta: useMutation(updatePhotoMeta, {
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo-meta', targetDrive?.alias, _data.photoFileId]);
      },
    }),
    updateDate: useMutation(updatePhotoDate, {
      onMutate: (_newData) => {
        let updatedDsr: DriveSearchResult | undefined;

        const getUpdatedDsr = (existingDsr: DriveSearchResult) => {
          if (updatedDsr) return updatedDsr;

          updatedDsr = {
            ...existingDsr,
            fileMetadata: {
              ...existingDsr.fileMetadata,
              appData: {
                ...existingDsr.fileMetadata.appData,
                userDate: _newData.newDate,
              },
            },
          };

          return updatedDsr;
        };

        queryClient
          .getQueryCache()
          .findAll(['photo-library-parts', targetDrive?.alias])
          .forEach((query) => {
            const queryKey = query.queryKey;
            const queryData =
              queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey);

            if (!queryData) return;

            // Remove from all other libraryTypes
            queryClient.setQueryData<InfiniteData<usePhotoLibraryPartReturn>>(queryKey, {
              ...queryData,
              pages: queryData.pages.map((page) => ({
                ...page,
                results: page.results.map((result) =>
                  result.fileId === _newData.photoFileId ? getUpdatedDsr(result) : result
                ),
              })),
            });
          });
      },
      onSettled: (_param, _data) => {
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
    }),
  };
};

export default usePhotoMetadata;
