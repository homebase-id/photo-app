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

const MAX_BATCH = 10;
module.exports = async (taskData?: any) => {
  const storage = new MMKVLoader().initialize();
  const customLog: string[] = [];
  const log = (...msg: string[]) =>
    customLog.push(...msg) && console.log(`[SyncWorker][HeadlessSync]`, msg);
  log(`Start sync ${new Date().toISOString()}, args: ${JSON.stringify(taskData)}`);

  try {
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

    // Last sync time or starting last week
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
      // TODO: Replace by invalidation of photo library cache
      // if (uploadResult && currentLib) {
      //   currentLib = addDay(currentLib, uploadResult.userDate);
      // }
      return uploadResult;
    };

    const { uploaded, errors, lastTimestamp } = await fetchAndUpload(
      fromTime,
      MAX_BATCH,
      uploadPhoto
    );
    if (uploaded > 0 && currentLib) {
      await savePhotoLibraryMetadata(dotYouClient, currentLib, 'photos');
    }

    log(`Sync from ${fromTime}, uploaded ${uploaded} photos, with ${errors.length} errors.`);
    if (errors?.length) log(...errors);

    log(`Sync done with ${lastTimestamp}`);
    await storage.setInt(LAST_SYNC_TIME, lastTimestamp);
  } catch (e: any) {
    log('Error in headlessSync', e.toString());
  }

  await storage.setItem('headlessSyncLog', JSON.stringify(customLog));
};
