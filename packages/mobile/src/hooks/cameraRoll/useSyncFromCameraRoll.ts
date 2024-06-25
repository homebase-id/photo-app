import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { hasAndroidPermission } from './permissionHelper';
import { useUploadPhoto } from '../photo/useUploadPhoto';

const ONE_MINUTE = 60000;
const TEN_MINUTES = ONE_MINUTE * 10;
// const BATCH_SIZE = 50;

export const useSyncFrom = () => {
  // last synced time
  const { lastCameraRollSyncTime } = useKeyValueStorage();

  const lastWeek = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  return lastCameraRollSyncTime || lastWeek;
};

export const fetchAndUpload = async (
  fromTime: number,
  maxBatch: number,
  uploadPhoto: (
    photo: PhotoIdentifier
  ) => Promise<{ fileId?: string; userDate: Date; imageUniqueId: string }>,
  cursor?: string | undefined
): Promise<{ lastTimestamp: number; uploaded: number; errors: string[] }> => {
  const photos = await CameraRoll.getPhotos({
    first: maxBatch,
    fromTime: fromTime,
    assetType: 'All',
    after: cursor,
    include: ['imageSize', 'filename', 'playableDuration', 'fileSize', 'location'],
  });

  let lastTimestamp = 0;
  const errors: string[] = [];

  // Regular loop to have the photos uploaded sequentially
  for (let i = 0; i < photos.edges.length; i++) {
    try {
      const photo = photos.edges[i];

      if (!photo?.node?.image) {
        errors.push('Gotten image without imageData');
        continue;
      }

      // Upload new always checkf if it already exists
      await uploadPhoto(photo);
      lastTimestamp = photo.node.timestamp;
    } catch (e: unknown) {
      // console.error('failed to sync', e);
      errors.push(
        e && typeof e === 'object' ? e.toString() : e && typeof e === 'string' ? e : 'Unknown error'
      );
      // Skip & continue to next one
    }
  }

  const uploadedCount = photos.edges.length - errors.length;
  return { lastTimestamp: lastTimestamp || new Date().getTime(), uploaded: uploadedCount, errors };
};

export const useSyncFromCameraRoll = () => {
  const { mutateAsync: uploadPhoto } = useUploadPhoto().upload;
  const { setLastCameraRollSyncTime } = useKeyValueStorage();

  const isFetching = useRef<boolean>(false);

  const fromTime = useSyncFrom();

  const doSync = async () => {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      console.log('No permission to sync camera roll');
      return;
    }

    // Only one to run at the same time;
    if (isFetching.current) return;
    isFetching.current = true;

    const { uploaded, errors, lastTimestamp } = await fetchAndUpload(fromTime, 10, uploadPhoto);
    console.log(
      `Sync from ${fromTime}, uploaded ${uploaded} photos, with ${errors.length} errors.`
    );
    isFetching.current = false;

    setLastCameraRollSyncTime(lastTimestamp);
    return errors;
  };

  return { forceSync: doSync };
};
