import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useInfiniteQuery } from '@tanstack/react-query';

const BATCH_SIZE = 50;
export const useCameraRoll = (fromTime?: number) => {
  const getPhotos = async (fromTime: number | undefined, cursor: string | undefined) => {
    return await CameraRoll.getPhotos({
      first: BATCH_SIZE,
      fromTime: fromTime,
      assetType: 'All',
      after: cursor,
      include: ['imageSize', 'filename', 'playableDuration', 'fileSize'],
    });
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['cameraRoll', fromTime || 'now'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => getPhotos(fromTime, pageParam),
      getNextPageParam: (lastPage) => lastPage.page_info.end_cursor,
      gcTime: 0,
      staleTime: 0,
    }),
  };
};
