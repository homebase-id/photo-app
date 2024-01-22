import { useQueryClient, InfiniteData, useQuery } from '@tanstack/react-query';
import { TargetDrive, getFileHeader } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useInfintePhotosReturn } from './usePhotos';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useFileHeader = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCurrent = async (targetDrive: TargetDrive, photoFileId: string) => {
    const previousKeys = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['photos', targetDrive?.alias], exact: false })
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

  return useQuery({
    queryKey: ['photo-header', targetDrive?.alias, photoFileId],
    queryFn: () => fetchCurrent(targetDrive, photoFileId as string),
    enabled: !!photoFileId,
    staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
    gcTime: Infinity, // Never => react query will never remove the data from the cache
  });
};
