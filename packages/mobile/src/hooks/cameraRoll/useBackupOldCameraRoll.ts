import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { useRef, useState } from 'react';
import { uploadNew } from '../../provider/photos/RNPhotoProvider';
import { InteractionManager, Platform } from 'react-native';

import { useKeyValueStorage } from '../auth/useEncryptedStorage';
import { PhotoConfig, useDotYouClientContext, usePhotoLibrary } from 'photo-app-common';
import { hasAndroidPermission } from './permissionHelper';

const targetDrive = PhotoConfig.PhotoDrive;

const useBackupOldCameraRoll = () => {
  const { backupFromCameraRoll } = useKeyValueStorage();
  const dotYouClient = useDotYouClientContext();

  const { mutateAsync: addDayToLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    disabled: true,
  }).addDay;

  const isFetching = useRef<boolean>(false);
  const isFinished = useRef<boolean>(false);

  const {
    cameraRollBackupCursor,
    setCameraRollBackupCursor,
    earliestSyncTime,
    setEarliestSyncTime,
  } = useKeyValueStorage();

  const [cursor, setCursor] = useState<string | undefined>(cameraRollBackupCursor || undefined);

  if (!earliestSyncTime) setEarliestSyncTime(new Date().getTime().toString());
  const earliestSyncTimeAsInt = earliestSyncTime
    ? parseInt(earliestSyncTime)
    : new Date().getTime();

  const fetchAndUpload = async () => {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
      console.log('No permission to backup camera roll');
      return;
    }

    const photos = await CameraRoll.getPhotos({
      first: 50,
      toTime: earliestSyncTimeAsInt,
      after: cursor,
      include: ['imageSize'],
    });

    // Regular loop to have the photos uploaded sequentially
    for (let i = 0; i < photos.edges.length; i++) {
      const photo = photos.edges[i];
      const fileData =
        Platform.OS === 'ios'
          ? await CameraRoll.iosGetImageDataById(photo.node.image.uri, { convertHeicImages: true })
          : photo;

      if (!fileData?.node?.image) {
        console.warn('Gotten image without imageData', fileData?.node?.image);
        return undefined;
      }

      // Upload new always checkf if it already exists
      const uploadResult = await uploadNew(
        dotYouClient,
        targetDrive,
        undefined,
        fileData.node.image
      );
      await addDayToLibrary({ date: uploadResult.userDate });
    }

    console.log(`Backed up ${photos.edges.length} photos`);

    setCursor(photos.page_info.end_cursor);
    setCameraRollBackupCursor(photos.page_info.end_cursor || '');

    return photos.page_info.has_next_page;
  };

  InteractionManager.runAfterInteractions(async () => {
    if (!backupFromCameraRoll) return;

    setTimeout(async () => {
      // Only one to start/run per startup;
      if (isFetching.current || isFinished.current) return;
      isFetching.current = true;

      console.log('fetching...');
      while (await fetchAndUpload()) console.log('fetching next...');
      console.log('finished');

      isFetching.current = false;
      isFinished.current = true;
    }, 5000);
  });
};

export default useBackupOldCameraRoll;
