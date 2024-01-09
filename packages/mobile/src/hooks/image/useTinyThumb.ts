import { useQuery } from '@tanstack/react-query';

import { TargetDrive, DotYouClient, DEFAULT_PAYLOAD_KEY } from '@youfoundation/js-lib/core';
import { getDecryptedThumbnailMeta } from '@youfoundation/js-lib/media';

const useTinyThumb = (
  dotYouClient: DotYouClient,
  odinId?: string,
  imageFileId?: string,
  imageDrive?: TargetDrive
) => {
  const fetchImageData = async (odinId: string, imageFileId?: string, imageDrive?: TargetDrive) => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) return;

    return (
      (await getDecryptedThumbnailMeta(
        dotYouClient,
        imageDrive,
        imageFileId,
        DEFAULT_PAYLOAD_KEY,
        'Standard'
      )) || null
    );
  };

  return useQuery({
    queryKey: ['tinyThumb', odinId, imageFileId, imageDrive?.alias],
    queryFn: () => fetchImageData(odinId as string, imageFileId, imageDrive),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: 1000 * 60 * 60 * 24, // 24h
    enabled: !!imageFileId && imageFileId !== '' && !!odinId,
  });
};

export default useTinyThumb;
