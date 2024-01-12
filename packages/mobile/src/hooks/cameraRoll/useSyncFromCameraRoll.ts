import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useEffect, useRef, useState } from 'react';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { Platform } from 'react-native';

import useAuth from '../auth/useAuth';
import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { PhotoConfig, usePhotoLibrary } from 'photo-app-common';
import { hasAndroidPermission } from './permissionHelper';

const ONE_MINUTE = 60000;
const FIVE_MINUTES = ONE_MINUTE * 5;

const targetDrive = PhotoConfig.PhotoDrive;

export const useSyncFromCameraRoll = (enabledAutoSync: boolean) => {
  const { syncFromCameraRoll } = useKeyValueStorage();
  const dotYouClient = useAuth().getDotYouClient();
  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    dotYouClient,
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

  const fetchAndUpload = async () => {
    const photos = await CameraRoll.getPhotos({
      first: 50,
      fromTime: lastCameraRollSyncTimeAsInt || new Date().getTime(),
      after: cursor,
    });

    // Regular loop to have the photos uploaded sequentially
    for (let i = 0; i < photos.edges.length; i++) {
      const photo = photos.edges[i];
      const fileData =
        Platform.OS === 'ios'
          ? await CameraRoll.iosGetImageDataById(photo.node.image.uri, true)
          : photo;

      if (!fileData?.node?.image?.filepath) return undefined;

      // Upload new always checkf if it already exists
      const uploadResult = await uploadNew(
        dotYouClient,
        targetDrive,
        undefined,
        fileData.node.image
      );
      await addDayToLibrary({ date: uploadResult.userDate });
    }

    console.log(`synced ${photos.edges.length} photos`);

    setCursor(photos.page_info.end_cursor);
    return photos.page_info.has_next_page;
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
    // Only one to run at the same time;
    if (isFetching.current) return;

    isFetching.current = true;

    console.log(
      'Syncing.. The camera roll from:',
      lastCameraRollSyncTimeAsInt || new Date().getTime()
    );
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      console.log('No permission to sync camera roll');
      return;
    }
    while (await fetchAndUpload()) {}

    setLastCameraRollSyncTime(new Date().getTime().toString());

    isFetching.current = false;
  };

  // Only auto sync when last sync was more than 5 minutes ago
  const runCheckAutoSync = async () => {
    if (
      lastCameraRollSyncTimeAsInt &&
      new Date().getTime() - lastCameraRollSyncTimeAsInt < FIVE_MINUTES
    )
      return;

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
