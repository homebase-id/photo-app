import { MMKVLoader } from 'react-native-mmkv-storage';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  FORCE_LOWER_QUALITY,
  IDENTITY,
  LAST_SYNC_TIME,
  SYNC_FROM_CAMERA_ROLL,
} from '../hooks/auth/useEncryptedStorage';
import { fetchAndUpload } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import { uploadNew } from '../provider/photos/RNPhotoProvider';
import { PhotoConfig, getPhotoLibrary, addDay, savePhotoLibraryMetadata } from 'photo-app-common';
import { PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';

const headlessSync = async () => {
  try {
    const storage = new MMKVLoader().initialize();
    const getFromStorage = (key: string) =>
      new Promise<string | undefined>((resolve) =>
        storage.getString(key, (_err, result) => resolve(result || undefined))
      );
    const getBooleanFromStorage = (key: string) =>
      new Promise<boolean | undefined>((resolve) =>
        storage.getBool(key, (_err, result) => resolve(result || undefined))
      );
    const getIntFromStorage = (key: string) =>
      new Promise<number | undefined>((resolve) =>
        storage.getInt(key, (_err, result) => resolve(result || undefined))
      );

    const syncFromCameraRoll = await getBooleanFromStorage(SYNC_FROM_CAMERA_ROLL);
    if (!syncFromCameraRoll) return;

    const fromTime =
      (await getIntFromStorage(LAST_SYNC_TIME)) || new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
    const sharedSecret = await getFromStorage(APP_SHARED_SECRET);
    const identity = await getFromStorage(IDENTITY);
    const authToken = await getFromStorage(APP_AUTH_TOKEN);

    const dotYouClient = (() => {
      if (!sharedSecret || !identity) {
        return new DotYouClient({
          api: ApiType.App,
        });
      }

      const headers: Record<string, string> = {};
      if (authToken) headers.bx0900 = authToken;

      return new DotYouClient({
        sharedSecret: base64ToUint8Array(sharedSecret),
        api: ApiType.App,
        identity: identity,
        headers: headers,
      });
    })();
    const targetDrive = PhotoConfig.PhotoDrive;
    const forceLowerQuality = await getBooleanFromStorage(FORCE_LOWER_QUALITY);

    let currentLib = await getPhotoLibrary(dotYouClient, 'photos');
    const uploadPhoto = async (newPhoto: PhotoIdentifier) => {
      const uploadResult = await uploadNew(
        dotYouClient,
        targetDrive,
        undefined,
        newPhoto,
        forceLowerQuality
      );
      if (uploadResult && currentLib) {
        currentLib = addDay(currentLib, uploadResult.userDate);
      }
      return uploadResult;
    };

    const { uploaded, errors } = await fetchAndUpload(fromTime, uploadPhoto);
    if (uploaded > 0 && currentLib) {
      await savePhotoLibraryMetadata(dotYouClient, currentLib, 'photos');
    }

    console.log(
      `Sync from ${fromTime}, uploaded ${uploaded} photos, with ${errors.length} errors.`
    );
    await storage.setInt(LAST_SYNC_TIME, new Date().getTime());
  } catch (e) {
    console.error('Error in headlessSync', e);
    return;
  }
};

export default headlessSync;
