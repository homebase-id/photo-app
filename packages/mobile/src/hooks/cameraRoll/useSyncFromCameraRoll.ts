import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useRef, useState } from 'react';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { InteractionManager, Platform } from 'react-native';

import useAuth from '../auth/useAuth';
import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { PhotoConfig, usePhotoLibrary } from 'photo-app-common';

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
  const {
    lastCameraRollSyncTime,
    setLastCameraRollSyncTime,
    earliestSyncTime,
    setEarliestSyncTime,
  } = useKeyValueStorage();
  const lastCameraRollSyncTimeAsInt = lastCameraRollSyncTime
    ? parseInt(lastCameraRollSyncTime)
    : new Date().getTime();

  const fetchAndUpload = async () => {
    const photos = await CameraRoll.getPhotos({
      first: 50,
      fromTime: lastCameraRollSyncTimeAsInt,
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

  const doSync = async () => {
    // Only one to run at the same time;
    if (isFetching.current) return;

    isFetching.current = true;

    console.log('Syncing.. The camera roll');
    while (await fetchAndUpload()) isFetching.current = false;
  };

  // Only auto sync when last sync was more than 5 minutes ago
  const runCheckAutoSync = async () => {
    if (
      lastCameraRollSyncTimeAsInt &&
      new Date().getTime() - lastCameraRollSyncTimeAsInt < FIVE_MINUTES
    )
      return;

    await doSync();

    if (!earliestSyncTime) setEarliestSyncTime(lastCameraRollSyncTimeAsInt.toString());
    setLastCameraRollSyncTime(new Date().getTime().toString());
  };

  if (enabledAutoSync)
    // Auto sync (trigger check to sync after 5 seconds); After which it will sync at a max of once per 5 minutes):
    InteractionManager.runAfterInteractions(async () => {
      if (!syncFromCameraRoll) return;

      // Check for sync every minute
      setInterval(
        async () => {
          runCheckAutoSync();
        },
        1000 * 60 * 1
      );
    });

  return { forceSync: doSync };
};
