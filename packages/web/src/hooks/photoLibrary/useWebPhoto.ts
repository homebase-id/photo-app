import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  DriveSearchResult,
  ThumbnailFile,
  getPayloadBytes,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import { DotYouClient } from '@youfoundation/js-lib/core';

import { MediaUploadMeta } from '@youfoundation/js-lib/media';
import { usePhotoLibrary, PhotoConfig, FileLike, getPhotoMetadata } from 'photo-app-common';
import { uploadNew } from '../../provider/photos/WebPhotoProvider';

export const useWebPhoto = (dotYouClient: DotYouClient, targetDrive?: TargetDrive) => {
  const queryClient = useQueryClient();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    dotYouClient,
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

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

    let type: 'favorites' | 'apps' | 'archive' | undefined;
    // Cache updates happen here as they need the context and correct point in time;
    if (uploadResult?.userDate && !meta?.archivalStatus) {
      type = albumKey === PhotoConfig.FavoriteTag ? 'favorites' : undefined;
    } else if (meta?.archivalStatus === 3) {
      type = 'apps';
    } else if (meta?.archivalStatus === 1) {
      type = 'archive';
    }
    addDayToLibrary({ type, date: uploadResult.userDate });

    return { ...uploadResult, type };
  };

  const download = async ({
    targetDrive,
    dsr,
  }: {
    targetDrive: TargetDrive;
    dsr: DriveSearchResult;
  }) => {
    if (!targetDrive) return null;

    const photoMeta = await getPhotoMetadata(dotYouClient, targetDrive, dsr.fileId);

    const decryptedPayload = await getPayloadBytes(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      DEFAULT_PAYLOAD_KEY
    );

    if (!decryptedPayload) return null;

    const url = window.URL.createObjectURL(
      new Blob([decryptedPayload.bytes], {
        type: decryptedPayload.contentType,
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
        //['photos', targetDrive?.alias, type, date && `${date.getFullYear()}-${date.getMonth()}`]
        queryClient.invalidateQueries({
          queryKey: [
            'photos',
            targetDrive?.alias,
            data?.type,
            data?.userDate && `${data?.userDate.getFullYear()}-${data?.userDate.getMonth()}`,
          ],
          exact: false,
        });
      },
    }),
    download: useMutation({ mutationFn: download }),
  };
};