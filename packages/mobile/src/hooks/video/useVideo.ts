import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PAYLOAD_KEY, getPayloadBytes, TargetDrive } from '@youfoundation/js-lib/core';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import { useDotYouClientContext } from 'photo-app-common';
import RNFS from 'react-native-fs';

const chunkSize = 7 * 1024 * 1024;

const useVideo = (videoFileId?: string | undefined, videoDrive?: TargetDrive) => {
  const dotYouClient = useDotYouClientContext();

  const fetchVideoData = async (videoFileId: string | undefined, videoDrive?: TargetDrive) => {
    if (videoFileId === undefined || videoFileId === '' || !videoDrive) return null;

    // Check if we have the video file locally already
    const localPath = RNFS.CachesDirectoryPath + `/${videoFileId}.mp4`;
    if (await RNFS.exists(localPath)) return localPath;

    let runningOffset = 0;

    while (true) {
      console.log('fetching video chunk', runningOffset);
      // Fetch bytes in chunks of max 7MB
      const videoFile = await getPayloadBytes(
        dotYouClient,
        videoDrive,
        videoFileId,
        DEFAULT_PAYLOAD_KEY,
        {
          chunkStart: runningOffset,
          chunkEnd: runningOffset + chunkSize,
        }
      );
      if (!videoFile) return localPath;
      const base64 = uint8ArrayToBase64(videoFile?.bytes);

      if (runningOffset === 0) await RNFS.writeFile(localPath, base64, 'base64');
      else await RNFS.appendFile(localPath, base64, 'base64');

      if (videoFile.bytes.length < chunkSize) break;
      runningOffset += chunkSize;
    }

    return localPath;
  };

  return {
    fetchVideo: useQuery({
      queryKey: ['video', videoDrive?.alias, videoFileId],
      queryFn: () => fetchVideoData(videoFileId, videoDrive),

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!videoFileId && videoFileId !== '',
      staleTime: 1000 * 60 * 60 * 24, // 24h
    }),
  };
};

export default useVideo;
