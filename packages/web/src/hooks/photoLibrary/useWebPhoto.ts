import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  HomebaseFile,
  ThumbnailFile,
  getPayloadBytes,
  DEFAULT_PAYLOAD_KEY,
  getThumbBytes,
} from '@youfoundation/js-lib/core';

import { MediaUploadMeta } from '@youfoundation/js-lib/media';
import {
  PhotoConfig,
  FileLike,
  getPhotoMetadata,
  useDotYouClientContext,
  LibraryType,
  useManagePhotoLibrary,
} from 'photo-app-common';
import { uploadNew } from '../../provider/photos/WebPhotoProvider';

export const useWebPhoto = (targetDrive?: TargetDrive) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const invalidateLibrary = useManagePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
  }).invalidateLibrary;

  const uploadNewMedia = async ({
    newPhoto,
    albumKey,
    thumb,
    meta,
  }: {
    newPhoto: File | Blob | FileLike;
    albumKey?: string;
    thumb?: ThumbnailFile;
    meta?: MediaUploadMeta;
  }) => {
    if (!targetDrive) return null;
    const uploadResult = await uploadNew(
      dotYouClient,
      targetDrive,
      albumKey,
      newPhoto,
      thumb,
      meta
    );

    let type: LibraryType = 'photos';
    // Cache updates happen here as they need the context and correct point in time;
    if (uploadResult?.userDate && !meta?.archivalStatus) {
      type = albumKey === PhotoConfig.FavoriteTag ? 'favorites' : type;
    } else if (meta?.archivalStatus === 3) {
      type = 'apps';
    } else if (meta?.archivalStatus === 1) {
      type = 'archive';
    }

    invalidateLibrary(type);

    return { ...uploadResult, type };
  };

  const download = async ({
    targetDrive,
    dsr,
  }: {
    targetDrive: TargetDrive;
    dsr: HomebaseFile;
  }) => {
    if (!targetDrive) return null;

    const photoMeta = await getPhotoMetadata(dotYouClient, targetDrive, dsr.fileId);

    const decryptedData = await (async () => {
      const defaultPayload = dsr.fileMetadata.payloads.find(
        (payload) => payload.key === DEFAULT_PAYLOAD_KEY
      );
      if (defaultPayload?.contentType === 'image/heic') {
        const biggestThumb = defaultPayload.thumbnails.reduce((prev, current) => {
          return prev.pixelWidth > current.pixelWidth ? prev : current;
        }, defaultPayload.thumbnails[0]);

        const thumbBytes = await getThumbBytes(
          dotYouClient,
          targetDrive,
          dsr.fileId,
          DEFAULT_PAYLOAD_KEY,
          biggestThumb.pixelWidth,
          biggestThumb.pixelHeight,
          {}
        );

        if (thumbBytes) return thumbBytes;
      }

      const decryptedPayload = await getPayloadBytes(
        dotYouClient,
        targetDrive,
        dsr.fileId,
        DEFAULT_PAYLOAD_KEY
      );

      return decryptedPayload;
    })();

    if (!decryptedData) return null;

    const url = window.URL.createObjectURL(
      new Blob([decryptedData.bytes], {
        type: decryptedData.contentType,
      })
    );

    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = photoMeta?.originalFileName || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return {
    upload: useMutation({
      mutationFn: uploadNewMedia,
      onSuccess: (data, variables) => {
        // Need to invalidate the infinite query to update the photoPreview;
        queryClient.invalidateQueries({
          queryKey: ['photos-infinite', targetDrive?.alias, variables.albumKey, null],
        });

        // Invalidate fetchByMonth
        queryClient.invalidateQueries({
          queryKey: [
            'photos',
            targetDrive?.alias,
            data?.type,
            data?.userDate && `${data?.userDate.getFullYear()}-${data?.userDate.getMonth()}`,
          ],
        });
      },
      onError: (error) => {
        console.error(error);
      },
    }),
    download: useMutation({ mutationFn: download }),
  };
};
