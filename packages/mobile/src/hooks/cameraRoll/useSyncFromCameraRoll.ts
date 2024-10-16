import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { useKeyValueStorage } from '../auth/useEncryptedStorage';

// const ONE_MINUTE = 60000;
// const TEN_MINUTES = ONE_MINUTE * 10;
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
