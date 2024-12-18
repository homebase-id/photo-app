import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, HomebaseFile } from '@homebase-id/js-lib/core';
import { ImageMetadata } from '@homebase-id/js-lib/media';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

import {
  getPhotoMetadata,
  updatePhoto,
  updatePhotoMetadata,
} from '../../../provider/photos/PhotoProvider';
import { useInfintePhotosReturn } from '../photos/usePhotos';
import { useManagePhotoLibrary } from '../library/usePhotoLibrary';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export const usePhotoMetadata = (targetDrive?: TargetDrive, fileId?: string) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const invalidateLibrary = useManagePhotoLibrary({
    targetDrive: targetDrive,
  }).invalidateLibrary;

  const fetchPhotoMeta = async ({
    targetDrive,
    fileId,
  }: {
    targetDrive?: TargetDrive;
    fileId?: string;
  }) => {
    if (!targetDrive || !fileId) return null;

    return await getPhotoMetadata(dotYouClient, targetDrive, fileId);
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

    invalidateLibrary('photos');
    return await updatePhoto(dotYouClient, targetDrive, photoFileId, {
      userDate: newDate,
    });
  };

  return {
    fetchMeta: useQuery({
      queryKey: ['photo-meta', targetDrive?.alias, fileId],
      queryFn: () => fetchPhotoMeta({ targetDrive, fileId }),

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!targetDrive && !!fileId,
    }),
    updateMeta: useMutation({
      mutationFn: updatePhotoMeta,
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries({
          queryKey: ['photo-meta', targetDrive?.alias, _data.photoFileId],
        });
      },
    }),
    updateDate: useMutation({
      mutationFn: updatePhotoDate,
      onMutate: (_newData) => {
        // Remove from existing day
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['photos', targetDrive?.alias] })
          .forEach((query) => {
            const queryKey = query.queryKey;
            const queryData =
              queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

            if (!queryData) return;

            const newQueryData: InfiniteData<useInfintePhotosReturn> = {
              ...queryData,
              pages: queryData.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.filter(
                    (dsr) => !stringGuidsEqual(dsr.fileId, _newData.photoFileId)
                  ),
                };
              }),
            };

            queryClient.setQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey, newQueryData);
          });

        const queryData = queryClient.getQueryData<HomebaseFile>([
          'photo-header',
          targetDrive?.alias,
          _newData.photoFileId,
        ]);
        if (queryData) {
          const newQueryData: HomebaseFile = {
            ...queryData,
            fileMetadata: {
              ...queryData.fileMetadata,
              appData: {
                ...queryData.fileMetadata.appData,
                userDate: _newData.newDate,
              },
            },
          };

          queryClient.setQueryData(
            ['photo-header', targetDrive?.alias, _newData.photoFileId],
            newQueryData
          );
          console.log('Updated photo header', newQueryData);
        }
      },
    }),
  };
};
