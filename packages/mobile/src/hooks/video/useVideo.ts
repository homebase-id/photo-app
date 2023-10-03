import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  getPayloadBytes,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { uint8ArrayToBase64 } from '@youfoundation/js-lib/helpers';
import { Dirs, FileSystem } from 'react-native-file-access';

const chunkSize = 7 * 1024 * 1024;

const useVideo = (
  dotYouClient: DotYouClient,

  videoFileId?: string | undefined,
  videoDrive?: TargetDrive,
) => {
  const fetchVideoData = async (
    videoFileId: string | undefined,
    videoDrive?: TargetDrive,
  ) => {
    if (videoFileId === undefined || videoFileId === '' || !videoDrive)
      return null;

    // Check if we have the video file locally already
    const localPath = Dirs.CacheDir + `/${videoFileId}.mp4`;
    if (await FileSystem.exists(localPath)) return localPath;

    let runningOffset = 0;

    while (true) {
      console.log('fetching video chunk', runningOffset);
      // Fetch bytes in chunks of max 7MB
      const videoFile = await getPayloadBytes(
        dotYouClient,
        videoDrive,
        videoFileId,
        undefined,
        'Standard',
        runningOffset,
        runningOffset + chunkSize,
      );
      if (!videoFile) return localPath;
      const base64 = uint8ArrayToBase64(videoFile?.bytes);

      if (runningOffset === 0)
        await FileSystem.writeFile(localPath, base64, 'base64');
      else await FileSystem.appendFile(localPath, base64, 'base64');

      if (videoFile.bytes.length < chunkSize) break;
      runningOffset += chunkSize;
    }

    return localPath;
  };

  return {
    fetchVideo: useQuery(
      ['video', videoDrive?.alias, videoFileId],
      () => fetchVideoData(videoFileId, videoDrive),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!videoFileId && videoFileId !== '',
      },
    ),
  };
};

export default useVideo;
