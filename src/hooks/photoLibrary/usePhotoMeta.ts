import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, ImageMetadata, DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import useAuth from '../auth/useAuth';

import {
  getPhotoMetadata,
  updatePhoto,
  updatePhotoMetadata,
} from '../../provider/photos/PhotoProvider';
import { useInfintePhotosReturn } from './usePhotos';
import usePhotoLibrary from './usePhotoLibrary';

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

    addDayToLibrary({ type: undefined, date: new Date(newDate) });
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
        // Remove from existing day
        queryClient
          .getQueryCache()
          .findAll(['photos', targetDrive?.alias])
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
          console.log('Updated photo header', newQueryData);
        }
      },
      onSettled: (_param, error, _data) => {
        queryClient.invalidateQueries(['photo-library', targetDrive?.alias]);
        // queryClient.invalidateQueries(['photo-header', targetDrive?.alias, _data.photoFileId]);
        // Update of the header is too slow on the server side
      },
    }),
  };
};

export default usePhotoMetadata;
