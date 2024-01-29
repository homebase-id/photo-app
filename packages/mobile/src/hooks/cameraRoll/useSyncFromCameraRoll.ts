import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useEffect, useRef, useState } from 'react';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { Platform } from 'react-native';

import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { PhotoConfig, useDotYouClientContext, usePhotoLibrary } from 'photo-app-common';
import { hasAndroidPermission } from './permissionHelper';

const ONE_MINUTE = 60000;
const FIVE_MINUTES = ONE_MINUTE * 5;

const targetDrive = PhotoConfig.PhotoDrive;

export const useSyncFromCameraRoll = (enabledAutoSync: boolean) => {
  const { syncFromCameraRoll } = useKeyValueStorage();
  const dotYouClient = useDotYouClientContext();
  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

  const isFetching = useRef<boolean>(false);

  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // last synced time
  const { lastCameraRollSyncTime, setLastCameraRollSyncTime } = useKeyValueStorage();
  const lastCameraRollSyncTimeAsInt = lastCameraRollSyncTime
    ? parseInt(lastCameraRollSyncTime)
    : undefined;

  const lastWeek = new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
  const fromTime = lastCameraRollSyncTimeAsInt || lastWeek;

  const fetchAndUpload = async () => {
    const photos = await CameraRoll.getPhotos({
      first: 50,
      // fromTime: 1695664801015,
      fromTime: fromTime,
      after: cursor,
      include: ['imageSize', 'filename', 'playableDuration', 'fileSize'],
      assetType: 'All',
      // assetType: 'Videos',
    });

    try {
      // Regular loop to have the photos uploaded sequentially
      for (let i = 0; i < photos.edges.length; i++) {
        const photo = photos.edges[i];
        const fileData =
          Platform.OS === 'ios'
            ? await CameraRoll.iosGetImageDataById(photo.node.image.uri, {
                convertHeicImages: true,
              })
            : photo;

        if (!fileData?.node?.image) {
          console.warn('Gotten image without imageData', fileData?.node?.image);
          return undefined;
        }

        // Upload new always checkf if it already exists
        const uploadResult = await uploadNew(dotYouClient, targetDrive, undefined, {
          ...fileData.node.image,
          type: fileData.node.type,
          date: fileData.node.timestamp ? fileData.node.timestamp * 1000 : undefined,
        });

        await addDayToLibrary({ date: uploadResult.userDate });
      }
    } catch (e) {
      console.error('failed to sync', e);
      throw e;
    }

    console.log(`synced ${photos.edges.length} photos`);

    setCursor(photos.page_info.end_cursor);
    const hasMoreWork = photos.page_info.has_next_page;
    if (!hasMoreWork) setLastCameraRollSyncTime(new Date().getTime().toString());

    return hasMoreWork;
  };

  const getWhatsPending = async () => {
    const photos = await CameraRoll.getPhotos({
      first: 50,
      fromTime: lastCameraRollSyncTimeAsInt || new Date().getTime(),
      after: cursor,
    });

    return photos.edges.length;
  };

  const doSync = async () => {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      console.log('No permission to sync camera roll');
      return;
    }

    // Only one to run at the same time;
    if (isFetching.current) return;

    isFetching.current = true;

    console.log(
      'Syncing.. The camera roll from:',
      lastCameraRollSyncTimeAsInt || new Date().getTime()
    );
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

  return { forceSync: doSync, getWhatsPending };
};
