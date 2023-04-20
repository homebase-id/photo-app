import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, ImageSize } from '@youfoundation/dotyoucore-js';
import useAuth from '../auth/useAuth';

import { getPhotoMetadata } from '../../provider/photos/PhotoProvider';

const usePhotoMetadata = (targetDrive?: TargetDrive, fileId?: string, size?: ImageSize) => {
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();

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
  };
};

export default usePhotoMetadata;
