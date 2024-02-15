import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ImageSize,
  TargetDrive,
  ImageContentType,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import { useDotYouClientContext } from 'photo-app-common';
import { getDecryptedImageData } from '../../provider/Image/RNImageProvider';
import { useAuth } from '../auth/useAuth';
import RNFS from 'react-native-fs';

interface ImageData {
  url: string;
  naturalSize?: ImageSize;
  type?: ImageContentType;
}

const useImage = (
  odinId?: string,
  imageFileId?: string | undefined,
  imageDrive?: TargetDrive,
  size?: ImageSize,
  naturalSize?: ImageSize
) => {
  const { authToken } = useAuth();
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const checkIfWeHaveLargerCachedImage = (
    odinId: string | undefined,
    imageFileId: string,
    imageDrive: TargetDrive,
    size?: ImageSize
  ) => {
    const cachedEntries = queryClient
      .getQueryCache()
      .findAll({
        queryKey: ['image', odinId || '', imageDrive?.alias, imageFileId],
        exact: false,
      })
      .filter((query) => query.state.status !== 'error');

    const cachedEntriesWithSize = cachedEntries.map((entry) => {
      const sizeParts = (entry.queryKey[4] as string)?.split('x');
      const size = sizeParts
        ? {
            pixelHeight: parseInt(sizeParts[0]),
            pixelWidth: parseInt(sizeParts[1]),
          }
        : undefined;

      return {
        ...entry,
        size,
      };
    });

    if (!size) return cachedEntriesWithSize.find((entry) => !entry.size);

    return cachedEntriesWithSize
      .filter((entry) => !!entry.size)
      .find((entry) => {
        if (
          entry.size &&
          entry.size.pixelHeight >= size.pixelHeight &&
          entry.size.pixelWidth >= size.pixelWidth
        ) {
          return true;
        }
      });
  };

  const fetchImageData = async (
    odinId: string | undefined,
    imageFileId: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    naturalSize?: ImageSize
  ): Promise<ImageData | undefined> => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive || !authToken) return;

    const cachedEntry = checkIfWeHaveLargerCachedImage(odinId, imageFileId, imageDrive, size);
    if (cachedEntry) {
      const cachedData = queryClient.getQueryData<ImageData | undefined>(cachedEntry.queryKey);
      if (cachedData && (await RNFS.exists(cachedData.url))) return cachedData;
    }

    const imageBlob = await getDecryptedImageData(
      dotYouClient,
      imageDrive,
      imageFileId,
      DEFAULT_PAYLOAD_KEY,
      authToken,
      size
    );

    if (!imageBlob) return undefined;

    return {
      url: imageBlob.uri,
      naturalSize: naturalSize,
      type: imageBlob.type as ImageContentType,
    };
  };

  return {
    fetch: useQuery({
      queryKey: [
        'image',
        odinId || '',
        imageDrive?.alias,
        imageFileId,
        // Rounding the cache key of the size so close enough sizes will be cached together
        size
          ? `${Math.round(size.pixelHeight / 25) * 25}x${Math.round(size?.pixelWidth / 25) * 25}`
          : undefined,
      ],
      queryFn: () => fetchImageData(odinId, imageFileId, imageDrive, size, naturalSize),
      staleTime: 1000 * 60 * 60 * 1, // 1h
      enabled: !!imageFileId && imageFileId !== '',
    }),
    getFromCache: (odinId: string | undefined, imageFileId: string, imageDrive: TargetDrive) => {
      const cachedEntries = queryClient
        .getQueryCache()
        .findAll({
          queryKey: ['image', odinId || '', imageDrive?.alias, imageFileId],
          exact: false,
        })
        .filter((query) => query.state.status === 'success');

      if (cachedEntries?.length) {
        return queryClient.getQueryData<ImageData | undefined>(cachedEntries[0].queryKey);
      }
    },
  };
};

export default useImage;
