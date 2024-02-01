import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useEffect, useRef, useState } from 'react';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { Platform } from 'react-native';

import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { PhotoConfig, useDotYouClientContext, usePhotoLibrary } from 'photo-app-common';
import { hasAndroidPermission } from './permissionHelper';

const ONE_MINUTE = 60000;
const FIVE_MINUTES = ONE_MINUTE * 5;
const BATCH_SIZE = 50;

const targetDrive = PhotoConfig.PhotoDrive;

export const useSyncFrom = () => {
  // last synced time
  const { lastCameraRollSyncTime } = useKeyValueStorage();
  const lastCameraRollSyncTimeAsInt = lastCameraRollSyncTime
    ? parseInt(lastCameraRollSyncTime)
    : undefined;

  const lastWeek = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  return lastCameraRollSyncTimeAsInt || lastWeek;
};

export const useSyncFromCameraRoll = (enabledAutoSync: boolean) => {
  const { lastCameraRollSyncTime, setLastCameraRollSyncTime } = useKeyValueStorage();
  const lastCameraRollSyncTimeAsInt = lastCameraRollSyncTime
    ? parseInt(lastCameraRollSyncTime)
    : undefined;

  const { syncFromCameraRoll } = useKeyValueStorage();
  const dotYouClient = useDotYouClientContext();
  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
    type: 'photos',
  }).addDay;

  const isFetching = useRef<boolean>(false);

  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const fromTime = useSyncFrom();

  const fetchAndUpload = async () => {
    const photos = await CameraRoll.getPhotos({
      first: BATCH_SIZE,
      fromTime: fromTime,
      assetType: 'All',
      after: cursor,
      include: ['imageSize', 'filename', 'playableDuration', 'fileSize'],

      // fromTime: 1695664801015,
      // assetType: 'Videos',
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
        const uploadResult = await uploadNew(dotYouClient, targetDrive, undefined, photo);

        await addDayToLibrary({ date: uploadResult.userDate, type: 'photos' });
      }
    } catch (e) {
      console.error('failed to sync', e);
      throw e;
    }

    console.log(`synced ${photos.edges.length} photos`);

    setCursor(photos.page_info.end_cursor);
    const hasMoreWork = photos.page_info.has_next_page;

    if (!hasMoreWork) {
      setLastCameraRollSyncTime(new Date().getTime().toString());
      console.log('set new time', new Date().getTime().toString());
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
    if (
      lastCameraRollSyncTimeAsInt &&
      new Date().getTime() - lastCameraRollSyncTimeAsInt < FIVE_MINUTES
    ) {
      return;
    }

    await doSync();
  };

  useEffect(() => {
    if (syncFromCameraRoll && enabledAutoSync) {
      const interval = setInterval(() => runCheckAutoSync(), 1000 * 60 * 1);
      return () => clearInterval(interval);
    }
  }, [syncFromCameraRoll, enabledAutoSync]);

  return { forceSync: doSync };
};
