import { useQuery } from '@tanstack/react-query';
import { TargetDrive, getFileHeader } from '@youfoundation/js-lib/core';

import { getHeaderFromLocalDb } from '../../provider/drive/LocalDbProvider';
import useAuth from '../auth/useAuth';

export const useFileHeader = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId?: string;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchCurrent = async (
    targetDrive: TargetDrive,
    photoFileId: string,
  ) => {
    const localHeader = await getHeaderFromLocalDb(targetDrive, photoFileId);
    if (localHeader) return localHeader;

    return await getFileHeader(dotYouClient, targetDrive, photoFileId);
  };

  return useQuery(
    ['photo-header', targetDrive?.alias, photoFileId],
    () => fetchCurrent(targetDrive, photoFileId as string),
    {
      enabled: !!photoFileId,
      staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
      cacheTime: Infinity, // Never => react query will never remove the data from the cache
    },
  );
};
