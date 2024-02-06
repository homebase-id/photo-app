import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { hasAndroidPermission } from './permissionHelper';
import { useUploadPhoto } from '../photo/useUploadPhoto';

const ONE_MINUTE = 60000;
const FIVE_MINUTES = ONE_MINUTE * 5;
const BATCH_SIZE = 50;

export const useSyncFrom = () => {
  // last synced time
  const { lastCameraRollSyncTime } = useKeyValueStorage();

  const lastWeek = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  return lastCameraRollSyncTime || lastWeek;
};

export const useSyncFromCameraRoll = (enabledAutoSync: boolean) => {
  const { mutateAsync: uploadPhoto } = useUploadPhoto().upload;

  const { lastCameraRollSyncTime, setLastCameraRollSyncTime } = useKeyValueStorage();

  const { syncFromCameraRoll } = useKeyValueStorage();
  const isFetching = useRef<boolean>(false);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const fromTime = useSyncFrom();

  const fetchAndUpload = async () => {
    const photos = await CameraRoll.getPhotos({
      first: BATCH_SIZE,
      fromTime: fromTime,
      assetType: 'All',
      after: cursor,
      include: ['imageSize', 'filename', 'playableDuration', 'fileSize', 'location'],
    });

    try {
      // Regular loop to have the photos uploaded sequentially
      for (let i = 0; i < photos.edges.length; i++) {
        const photo = photos.edges[i];

        if (!photo?.node?.image) {
          console.warn('Gotten image without imageData', photo?.node?.image);
          return undefined;
        }

        // Upload new always checkf if it already exists
        await uploadPhoto(photo);
      }
    } catch (e) {
      console.error('failed to sync', e);
      throw e;
    }

    console.log(`synced ${photos.edges.length} photos`);

    setCursor(photos.page_info.end_cursor);
    const hasMoreWork = photos.page_info.has_next_page;

    if (!hasMoreWork) {
      setLastCameraRollSyncTime(new Date().getTime());
      console.log('set new time', new Date().getTime());
    }

    return hasMoreWork;
  };

  const doSync = async () => {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      console.log('No permission to sync camera roll');
      return;
    }

    // Only one to run at the same time;
    if (isFetching.current) return;

    isFetching.current = true;

    console.log('Syncing.. The camera roll from:', fromTime);
    while (await fetchAndUpload()) {}

    isFetching.current = false;
  };

  // Only auto sync when last sync was more than 5 minutes ago
  const runCheckAutoSync = async () => {
    if (lastCameraRollSyncTime && new Date().getTime() - lastCameraRollSyncTime < FIVE_MINUTES) {
      return;
    }

    await doSync();
  };

  useEffect(() => {
    if (syncFromCameraRoll && enabledAutoSync) {
      const interval = setInterval(() => runCheckAutoSync(), ONE_MINUTE);
      return () => clearInterval(interval);
    }
  }, [syncFromCameraRoll, enabledAutoSync]);

  return { forceSync: doSync };
};
