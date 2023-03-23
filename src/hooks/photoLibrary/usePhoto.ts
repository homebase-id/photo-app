import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  uploadImage,
  SecurityGroupType,
  ImageSize,
  getPhoto,
  ImageContentType,
  deleteFile,
  PhotoFile,
  getFileHeader,
  getPayloadBytes,
} from '@youfoundation/dotyoucore-js';
import useAuth from '../auth/useAuth';

import exifr from 'exifr/dist/full.esm.mjs'; // to use ES Modules
import { usePhotoLibraryPartReturn } from './usePhotoLibraryPart';

interface UpdatableMeta {
  tag?: string | undefined | string[];
  userDate?: number;
}

const usePhoto = (targetDrive?: TargetDrive, fileId?: string, size?: ImageSize) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();

  const fetchPhoto = async ({
    targetDrive,
    fileId,
    size,
  }: {
    targetDrive?: TargetDrive;
    fileId?: string;
    size?: ImageSize;
  }) => {
    if (!targetDrive || !fileId) {
      return null;
    }

    const fetchDataPromise = () => {
      return getPhoto(dotYouClient, targetDrive, fileId, size, true);
    };

    return await fetchDataPromise();
  };

  const uploadPhoto = async ({ newPhoto }: { newPhoto: File }) => {
    if (!targetDrive) {
      return null;
    }

    const bytes = new Uint8Array(await newPhoto.arrayBuffer());
    // Read Exif Data for the Created date of the photo itself and not the file;
    let exifData;
    try {
      exifData = await exifr.parse(bytes, ['DateTimeOriginal']);
    } catch (ex) {
      // some photos don't have exif data, which fails the parsing
    }
    const DateTimeOriginal = exifData?.DateTimeOriginal;

    return await uploadImage(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      bytes,
      {
        type: newPhoto.type as ImageContentType,
        userDate: DateTimeOriginal?.getTime() || newPhoto.lastModified || new Date().getTime(),
      }
    );
  };

  const removePhoto = async ({ photoFileId }: { photoFileId: string }) => {
    if (!targetDrive) {
      return null;
    }
    return await deleteFile(dotYouClient, targetDrive, photoFileId);
  };

  const updateMeta = async ({
    targetDrive,
    fileId,
    metadata,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
    metadata: UpdatableMeta;
  }) => {
    const header = await getFileHeader(dotYouClient, targetDrive, fileId);
    const keyheader = header.fileMetadata.payloadIsEncrypted
      ? header.sharedSecretEncryptedKeyHeader
      : undefined;
    const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, keyheader);

    if (payload) {
      const bytes = new Uint8Array(payload.bytes);
      console.log({
        userDate: header.fileMetadata.appData.userDate,
        type: payload.contentType,
        ...metadata,
        fileId: fileId,
      });
      await uploadImage(dotYouClient, targetDrive, header.serverMetadata.accessControlList, bytes, {
        userDate: header.fileMetadata.appData.userDate,
        type: payload.contentType,
        ...metadata,
        fileId: fileId,
      });
    }
  };

  return {
    fetch: useQuery(
      ['photo', targetDrive?.alias, fileId, `${size?.pixelHeight}x${size?.pixelWidth}`],
      () => fetchPhoto({ targetDrive, fileId, size }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!targetDrive && !!fileId,
      }
    ),
    fromCache: (targetDrive: TargetDrive, fileId: string) => {
      const previousKeys = queryClient
        .getQueryCache()
        .findAll(['photo', targetDrive?.alias, fileId], { exact: false })
        .filter((query) => query.state.status === 'success');

      if (previousKeys?.length) {
        const bestKey = previousKeys.sort((keyA, keyB) =>
          (keyA.queryKey[keyA.queryKey.length - 1] + '').localeCompare(
            keyB.queryKey[keyB.queryKey.length - 1] + ''
          )
        )[0].queryKey;

        const existingCachedImage = queryClient.getQueryData<PhotoFile>(bestKey);
        if (existingCachedImage) {
          return existingCachedImage;
        }
      }
    },
    upload: useMutation(uploadPhoto, {
      onSuccess: () => {
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    remove: useMutation(removePhoto, {
      onSuccess: (_param, _data) => {
        queryClient.invalidateQueries(['photo', targetDrive?.alias, _data.photoFileId]);
        queryClient.invalidateQueries(['photo-library-parts', targetDrive?.alias]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    updatePhoto: useMutation(updateMeta, {
      onMutate: (newPhotoData) => {
        const previousParts = queryClient.getQueryData<InfiniteData<usePhotoLibraryPartReturn>>([
          'photo-library-parts',
          targetDrive?.alias,
        ]);

        if (previousParts?.pages) {
          const newParts: InfiniteData<usePhotoLibraryPartReturn> = {
            ...previousParts,
            pages: previousParts.pages.map((page) => {
              return {
                ...page,
                results: page.results.map((photo) => {
                  if (photo.fileId === newPhotoData.fileId) {
                    return {
                      ...photo,
                      fileMetadata: {
                        ...photo.fileMetadata,
                        appData: {
                          ...photo.fileMetadata.appData,
                          tags: newPhotoData.metadata.tag
                            ? [
                                ...(Array.isArray(newPhotoData.metadata.tag)
                                  ? newPhotoData.metadata.tag
                                  : [newPhotoData.metadata.tag]),
                              ]
                            : null,
                          userDate:
                            newPhotoData.metadata.userDate || photo.fileMetadata.appData.userDate,
                        },
                      },
                    };
                  }
                  return photo;
                }),
              };
            }),
          };
          queryClient.setQueryData(['photo-library-parts', targetDrive?.alias], newParts);
        }
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default usePhoto;
