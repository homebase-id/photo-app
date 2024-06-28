import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ImageSize, TargetDrive, ImageContentType } from '@youfoundation/js-lib/core';
import { exists } from 'react-native-fs';
import { useAuth } from '../../../../hooks/auth/useAuth';

import { useDotYouClientContext } from 'photo-app-common';
import { getDecryptedImageData } from '../../../../provider/Image/RNImageProvider';

interface ImageData {
  url: string;
  naturalSize?: ImageSize;
  type?: ImageContentType;
}

const useImage = (props?: {
  odinId?: string;
  imageFileId?: string | undefined;
  imageFileKey?: string | undefined;
  imageDrive?: TargetDrive;
  size?: ImageSize;
  naturalSize?: ImageSize;
  lastModified?: number;
}) => {
  const { odinId, imageFileId, imageFileKey, imageDrive, size, naturalSize, lastModified } =
    props || {};
  const { authToken } = useAuth();
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  function queryKeyBuilder(
    odinId: string | undefined,
    imageFileId: string | undefined,
    imageFileKey: string | undefined,
    imageDrive: TargetDrive | undefined,
    size?: ImageSize,
    lastModified?: number
  ) {
    const queryKey = [
      'image',
      odinId || '',
      imageDrive?.alias,
      imageFileId?.replaceAll('-', ''),
      imageFileKey,
    ];

    if (size) {
      queryKey.push(
        `${Math.round(size.pixelHeight / 25) * 25}x${Math.round(size?.pixelWidth / 25) * 25}`
      );
    }

    if (lastModified) {
      queryKey.push(lastModified + '');
    }

    return queryKey;
  }

  const checkIfWeHaveLargerCachedImage = (
    odinId: string | undefined,
    imageFileId: string,
    imageFileKey: string,
    imageDrive: TargetDrive,
    size?: ImageSize
  ) => {
    const cachedEntries = queryClient
      .getQueryCache()
      .findAll({
        queryKey: queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive),
        exact: false,
      })
      .filter((query) => query.state.status !== 'error');

    const cachedEntriesWithSize = cachedEntries.map((entry) => {
      const sizeParts = (entry.queryKey[5] as string)?.split('x');
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

    const cachedEntry = cachedEntriesWithSize
      .filter((entry) => !!entry.size)
      .find((entry) => {
        if (
          entry.size &&
          (entry.size.pixelHeight >= size.pixelHeight || entry.size.pixelWidth >= size.pixelWidth)
        ) {
          return true;
        }
      });

    if (cachedEntry) return cachedEntry;

    return null;
  };

  const fetchImageData = async (
    odinId: string | undefined,
    imageFileId: string | undefined,
    imageFileKey: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    naturalSize?: ImageSize,
    lastModified?: number
  ): Promise<ImageData | null> => {
    if (
      imageFileId === undefined ||
      imageFileId === '' ||
      !imageDrive ||
      !imageFileKey ||
      !authToken
    ) {
      return null;
    }

    const cachedEntry = checkIfWeHaveLargerCachedImage(
      odinId,
      imageFileId,
      imageFileKey,
      imageDrive,
      size
    );

    if (cachedEntry) {
      const cachedData = queryClient.getQueryData<ImageData | undefined>(cachedEntry.queryKey);
      if (cachedData && (await exists(cachedData.url))) return cachedData;
    }

    const imageBlob = await getDecryptedImageData(
      dotYouClient,
      imageDrive,
      imageFileId,
      imageFileKey,
      authToken,
      size,
      undefined,
      lastModified
    );

    if (!imageBlob) return null;

    return {
      url: imageBlob.uri,
      naturalSize: naturalSize,
      type: imageBlob.type as ImageContentType,
    };
  };

  return {
    fetch: useQuery({
      queryKey: queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive, size, lastModified),
      queryFn: () =>
        fetchImageData(
          odinId,
          imageFileId,
          imageFileKey,
          imageDrive,
          size,
          naturalSize,
          lastModified
        ),
      // Stale time is 0, to always trigger a fetch,
      //   while the fetch checks if we have anything in cache from before and confirms it on disk
      staleTime: 0,
      enabled: !!imageFileId && imageFileId !== '',
    }),
    getFromCache: (
      odinId: string | undefined,
      imageFileId: string,
      imageFileKey: string,
      imageDrive: TargetDrive,
      size?: ImageSize
    ) => {
      const largerCache = checkIfWeHaveLargerCachedImage(
        odinId,
        imageFileId,
        imageFileKey,
        imageDrive,
        size
      );

      if (largerCache) {
        return {
          size: largerCache?.size,
          imageData: queryClient.getQueryData<ImageData | undefined>(largerCache?.queryKey),
        };
      }

      const cachedEntries = queryClient
        .getQueryCache()
        .findAll({
          queryKey: queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive),
          exact: false,
        })
        .filter((query) => query.state.status === 'success');

      if (cachedEntries?.length) {
        return {
          size: undefined,
          imageData: queryClient.getQueryData<ImageData | undefined>(cachedEntries[0].queryKey),
        };
      }
    },
    invalidateCache: (
      odinId: string | undefined,
      imageFileId: string | undefined,
      imageFileKey: string | undefined,
      imageDrive: TargetDrive,
      size?: ImageSize
    ) => {
      if (
        imageFileId === undefined ||
        imageFileId === '' ||
        !imageDrive ||
        !imageFileKey ||
        !authToken
      ) {
        return null;
      }
      const queryKey = queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive, size);
      queryClient.invalidateQueries({ queryKey, exact: true });
    },
  };
};

export default useImage;