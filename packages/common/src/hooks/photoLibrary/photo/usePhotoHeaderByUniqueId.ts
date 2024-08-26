import { useQueryClient, InfiniteData, useQuery } from '@tanstack/react-query';
import { TargetDrive, getFileHeaderByUniqueId } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useInfintePhotosReturn } from '../photos/usePhotos';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export const useFileHeaderByUniqueId = ({
  targetDrive,
  photoUniqueId,
}: {
  targetDrive: TargetDrive;
  photoUniqueId?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchCurrent = async (targetDrive: TargetDrive, photoUniqueId: string) => {
    const cacheKeys = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['photos', targetDrive?.alias], exact: false })
      .filter((query) => query.state.status === 'success');

    for (let i = 0; i < cacheKeys.length; i++) {
      const key = cacheKeys[i];
      const dataForDay = queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
        key.queryKey
      );
      if (!dataForDay) continue;

      const dsr = dataForDay?.pages
        ?.flatMap((page) => page.results)
        .find((dsr) => stringGuidsEqual(dsr.fileMetadata.appData.uniqueId, photoUniqueId));
      if (dsr) return dsr;
    }

    return await getFileHeaderByUniqueId(dotYouClient, targetDrive, photoUniqueId);
  };

  return useQuery({
    queryKey: ['photo-header', targetDrive?.alias, photoUniqueId],
    queryFn: () => fetchCurrent(targetDrive, photoUniqueId as string),
    enabled: !!photoUniqueId,
    staleTime: 0,
    gcTime: 0,
    // staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
    // gcTime: Infinity, // Never => react query will never remove the data from the cache
  });
};
