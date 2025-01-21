import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ImageSize, TargetDrive, ImageContentType, SystemFileType } from '@homebase-id/js-lib/core';
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
  const dotYouClient = useDotYouClientContext();

  const { odinId, imageFileId, imageFileKey, imageDrive, size, naturalSize, lastModified } =
    props || {};
  const { authToken } = useAuth();
  const queryClient = useQueryClient();

  const roundToNearest25 = (num: number) => Math.round(num / 25) * 25;
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
      imageDrive?.alias?.replaceAll('-', ''),
      imageFileId?.replaceAll('-', ''),
      imageFileKey,
    ];

    if (size) {
      queryKey.push(`${roundToNearest25(size.pixelHeight)}x${roundToNearest25(size?.pixelWidth)}`);
    }

    if (lastModified) {
      queryKey.push(lastModified + '');
    }

    return queryKey;
  }

  const getCachedImages = (
    odinId: string | undefined,
    imageFileId: string,
    imageFileKey: string,
    imageDrive: TargetDrive
  ) => {
    const cachedEntries = queryClient
      .getQueryCache()
      .findAll({
        queryKey: queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive),
        exact: false,
      })
      .filter((query) => query.state.status === 'success');

    const cachedEntriesWithSize = cachedEntries.map((entry) => {
      const sizeParts = (entry.queryKey[5] as string)?.split('x');
      const size =
        sizeParts?.length === 2
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

    return cachedEntriesWithSize;
  };

  const fetchImageData = async (
    odinId: string | undefined,
    imageFileId: string | undefined,
    imageFileKey: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    naturalSize?: ImageSize,
    lastModified?: number,
    systemFileType?: SystemFileType
  ): Promise<ImageData | null> => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive || !imageFileKey) {
      return null;
    }

    const fetchImageFromServer = async (): Promise<ImageData | null> => {
      const imageBlob = await getDecryptedImageData(
        dotYouClient,
        imageDrive,
        imageFileId,
        imageFileKey,
        size,
        systemFileType,
        lastModified
      );

      if (!imageBlob) return null;

      return {
        url: imageBlob.uri,
        naturalSize: naturalSize,
        type: imageBlob.type as ImageContentType,
      };
    };

    // Find any cached version, the bigger the better and if we have it return it;
    const cachedImages = getCachedImages(odinId, imageFileId, imageFileKey, imageDrive);
    if (cachedImages.length) {
      const largestCachedImage = cachedImages.reduce((prev, current) => {
        if (!prev) return current;

        // No size is bigger than any size
        if (!prev.size) return prev;
        if (!current.size) return current;

        if (
          prev.size.pixelHeight * prev.size.pixelWidth >
          current.size.pixelHeight * current.size.pixelWidth
        ) {
          return prev;
        }
        return current;
      });

      const cachedData = queryClient.getQueryData<ImageData | undefined>(
        largestCachedImage.queryKey
      );
      if (cachedData && (await exists(cachedData.url))) {
        // If the cached version is smaller than what we need, we'll fetch the new one and update the cache for the requested size
        if (
          // If the largestCachedImage has no size, it's the largest possible size
          largestCachedImage.size &&
          // If the requested size is bigger than the cached size
          size &&
          size.pixelHeight > largestCachedImage.size.pixelHeight
        ) {
          setTimeout(async () => {
            const imageData = await fetchImageFromServer();
            if (!imageData) return;

            queryClient.setQueryData<ImageData | undefined>(
              queryKeyBuilder(odinId, imageFileId, imageFileKey, imageDrive, size, lastModified),
              imageData
            );
          }, 0);
        }
        return cachedData;
      }
    }

    const serverImage = await fetchImageFromServer();
    return serverImage;
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
          size
            ? {
                pixelHeight: roundToNearest25(size.pixelHeight),
                pixelWidth: roundToNearest25(size.pixelWidth),
              }
            : undefined,
          naturalSize,
          lastModified
        ),
      // Stale time is 0, to always trigger a fetch,
      //   while the fetch checks if we have anything in cache from before and confirms it on disk
      staleTime: 0,
      enabled: !!imageFileId && imageFileId !== '',
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }),
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
