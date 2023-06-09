import { useQueryClient, InfiniteData, useQuery } from '@tanstack/react-query';
import { TargetDrive, getFileHeader } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import useAuth from '../auth/useAuth';
import { useInfintePhotosReturn } from './usePhotos';

export const useFileHeader = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId?: string;
}) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchCurrent = async (targetDrive: TargetDrive, photoFileId: string) => {
    const previousKeys = queryClient
      .getQueryCache()
      .findAll(['photos', targetDrive?.alias], { exact: false })
      .filter((query) => query.state.status === 'success');

    for (let i = 0; i < previousKeys.length; i++) {
      const key = previousKeys[i];
      const dataForDay = queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
        key.queryKey
      );
      if (!dataForDay) continue;

      const dsr = dataForDay?.pages
        ?.flatMap((page) => page.results)
        .find((dsr) => stringGuidsEqual(dsr.fileId, photoFileId));
      if (dsr) return dsr;
    }

    return await getFileHeader(dotYouClient, targetDrive, photoFileId);
  };

  return useQuery(
    ['photo-header', targetDrive?.alias, photoFileId],
    () => fetchCurrent(targetDrive, photoFileId as string),
    { enabled: !!photoFileId }
  );
};
