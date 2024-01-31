import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ImageSize,
  TargetDrive,
  SecurityGroupType,
  ImageContentType,
  AccessControlList,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import { getDecryptedImageUrl, uploadImage, removeImage } from '@youfoundation/js-lib/media';
import { OdinBlob } from '../../../polyfills/OdinBlob';
import { useDotYouClientContext } from 'photo-app-common';

interface ImageData {
  url: string;
  naturalSize?: ImageSize;
}

const useImage = (
  odinId?: string,
  imageFileId?: string | undefined,
  imageDrive?: TargetDrive,
  size?: ImageSize,
  probablyEncrypted?: boolean,
  naturalSize?: ImageSize
) => {
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
        queryKey: ['image', odinId, imageDrive?.alias, imageFileId],
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
    probablyEncrypted?: boolean,
    naturalSize?: ImageSize
  ): Promise<ImageData | undefined> => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) return;

    const cachedEntry = checkIfWeHaveLargerCachedImage(odinId, imageFileId, imageDrive, size);
    if (cachedEntry) {
      const cachedData = queryClient.getQueryData<ImageData | undefined>(cachedEntry.queryKey);
      if (cachedData) return cachedData;
    }

    const fetchDataPromise = async () => {
      return {
        url: await getDecryptedImageUrl(
          dotYouClient,
          imageDrive,
          imageFileId,
          DEFAULT_PAYLOAD_KEY,
          size,
          probablyEncrypted
        ),
        naturalSize: naturalSize,
      };
    };

    return await fetchDataPromise();
  };

  const saveImageFile = async ({
    bytes,
    type,
    targetDrive,
    acl = { requiredSecurityGroup: SecurityGroupType.Anonymous },
    fileId = undefined,
    versionTag = undefined,
  }: {
    bytes: Uint8Array;
    type: ImageContentType;
    targetDrive: TargetDrive;
    acl?: AccessControlList;
    fileId?: string;
    versionTag?: string;
  }) => {
    return await uploadImage(
      dotYouClient,
      targetDrive,
      acl,
      new OdinBlob([bytes], { type }) as any as Blob,
      undefined,
      {
        fileId,
        versionTag,
      }
    );
  };

  const removeImageFile = async ({
    targetDrive,
    fileId,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
  }) => {
    return await removeImage(dotYouClient, fileId, targetDrive);
  };

  return {
    fetch: useQuery({
      queryKey: [
        'image',
        odinId,
        imageDrive?.alias,
        imageFileId,
        // Rounding the cache key of the size so close enough sizes will be cached together
        size
          ? `${Math.round(size.pixelHeight / 25) * 25}x${Math.round(size?.pixelWidth / 25) * 25}`
          : undefined,
      ],
      queryFn: () =>
        fetchImageData(odinId, imageFileId, imageDrive, size, probablyEncrypted, naturalSize),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60 * 1, // 1h
      enabled: !!imageFileId && imageFileId !== '',
    }),
    getFromCache: (odinId: string | undefined, imageFileId: string, imageDrive: TargetDrive) => {
      const cachedEntries = queryClient
        .getQueryCache()
        .findAll({
          queryKey: ['image', odinId, imageDrive?.alias, imageFileId],
          exact: false,
        })
        .filter((query) => query.state.status === 'success');

      if (cachedEntries?.length) {
        return queryClient.getQueryData<ImageData | undefined>(cachedEntries[0].queryKey);
      }
    },
    save: useMutation({
      mutationFn: saveImageFile,
      onSuccess: (_data, variables) => {
        // Boom baby!
        if (variables.fileId) {
          queryClient.invalidateQueries({
            queryKey: ['image', odinId, variables.targetDrive.alias, variables.fileId],
          });
        } else queryClient.removeQueries({ queryKey: ['image'] });
      },
    }),
    remove: useMutation({ mutationFn: removeImageFile }),
  };
};

export default useImage;
