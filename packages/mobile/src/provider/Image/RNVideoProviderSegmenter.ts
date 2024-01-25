import { ImageSource } from './RNImageProvider';
import { getNewId } from '@youfoundation/js-lib/helpers';

import { Dirs, FileSystem } from 'react-native-file-access';
import { Video } from 'react-native-compressor';
import { Platform } from 'react-native';

import { FFmpegKit, SessionState } from 'ffmpeg-kit-react-native';
import { SegmentedVideoMetadata } from '@youfoundation/js-lib/media';

const CompressVideo = async (video: ImageSource): Promise<ImageSource> => {
  const source = video.filepath || video.uri;

  if (!source || !(await FileSystem.exists(source))) {
    throw new Error(`File not found: ${source}`);
  }

  const resultUri = await Video.compress(
    source,
    {
      compressionMethod: 'manual',
      maxSize: 1280,
      bitrate: 3000000,
    },
    (progress) => {
      if (Math.round(progress * 100) % 10 === 0) {
        console.log(`Compression Progress: ${progress}`);
      }
    }
  );

  return {
    ...video,
    uri: resultUri,
    filepath: resultUri,
  };
};

const FragmentVideo = async (video: ImageSource) => {
  const source = video.filepath || video.uri;

  if (!source || !(await FileSystem.exists(source))) {
    throw new Error(`File not found: ${source}`);
  }

  const dirPath = Dirs.CacheDir;

  const destinationPrefix = Platform.OS === 'ios' ? '' : 'file://';
  const destinationUri = `${destinationPrefix}${dirPath}/ffmpeg-fragmented-${getNewId()}.mp4`;

  // MDN docs (https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API/Transcoding_assets_for_MSE#fragmenting)
  // FFMPEG fragmenting: https://ffmpeg.org/ffmpeg-formats.html#Fragmentation
  const command = `-i ${source} -c:v copy -c:a copy -movflags frag_keyframe+empty_moov+default_base_moof ${destinationUri}`;

  // empty_moov (older version of the above)
  // const command = `-i ${source} -c copy -movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov ${destinationUri}`;

  // faststart (this doesn't work in firefox)
  // const command = `-i ${source} -c copy -movflags +frag_keyframe+separate_moof+omit_tfhd_offset+faststart ${destinationUri}`;

  try {
    const session = await FFmpegKit.execute(command);
    const state = await session.getState();
    const returnCode = await session.getReturnCode();
    // const failStackTrace = await session.getFailStackTrace();
    // const output = await session.getOutput();

    if (state === SessionState.FAILED || !returnCode.isValueSuccess()) {
      throw new Error(`FFmpeg process failed with state: ${state} and rc: ${returnCode}.`);
    }
    return {
      ...video,
      uri: destinationUri,
      filePath: destinationUri,
    };
  } catch (error) {
    throw new Error(`FFmpeg process failed with error: ${error}`);
  }
};

export const processVideo = async (
  video: ImageSource
): Promise<{ video: ImageSource; metadata: SegmentedVideoMetadata }> => {
  // const compressedVideo = await CompressVideo(video);
  const fragmentedVideo = await FragmentVideo(video);
  const metadata: SegmentedVideoMetadata = {
    isSegmented: true,
    mimeType: 'video/mp4',
    codec: '',
    fileSize: video.fileSize || 0,
    duration: video.playableDuration || 0,
    segmentMap: [],
  };

  return { video: fragmentedVideo, metadata };
};
