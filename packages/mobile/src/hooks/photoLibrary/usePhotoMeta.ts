import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, DriveSearchResult } from '@youfoundation/js-lib/core';
import { ImageMetadata } from '@youfoundation/js-lib/media';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import { useInfintePhotosReturn } from './usePhotos';
import { usePhotoLibrary } from './usePhotoLibrary';
import { getHeaderFromLocalDb } from '../../provider/drive/LocalDbProvider';
import useAuth from '../auth/useAuth';
import {
  getPhotoMetadata,
  updatePhoto,
  updatePhotoMetadata,
} from '../../provider/photos/PhotoProvider';

const usePhotoMetadata = (targetDrive?: TargetDrive, fileId?: string) => {
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: targetDrive,
    disabled: true,
  }).addDay;

  const fetchPhotoMeta = async ({
    targetDrive,
    fileId,
  }: {
    targetDrive?: TargetDrive;
    fileId?: string;
  }) => {
    if (!targetDrive || !fileId) return null;

    const fetchDataPromise = async () => {
      const localHeader = await getHeaderFromLocalDb(targetDrive, fileId);
      if (!localHeader) return getPhotoMetadata(dotYouClient, targetDrive, fileId);

      return localHeader.fileMetadata.appData.content as ImageMetadata;
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

    addDayToLibrary({ type: undefined, date: new Date(newDate) });
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

        const queryData = queryClient.getQueryData<DriveSearchResult>([
          'photo-header',
          targetDrive?.alias,
          _newData.photoFileId,
        ]);
        if (queryData) {
          const newQueryData: DriveSearchResult = {
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
        }
      },
    }),
  };
};

export default usePhotoMetadata;