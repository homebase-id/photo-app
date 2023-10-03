import {
  ThumbnailInstruction,
  ImageContentType,
  ImageSize,
  ThumbnailFile,
} from '@youfoundation/js-lib/core';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { Platform } from 'react-native';
import { FileSystem } from 'react-native-file-access';
import ImageResizer, {
  ResizeFormat,
} from '@bam.tech/react-native-image-resizer';
import { ImageSource } from './RNImageProvider';

export const baseThumbSizes: ThumbnailInstruction[] = [
  { quality: 75, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
  { quality: 75, width: 1600, height: 1600 },
];

const tinyThumbSize: ThumbnailInstruction = {
  quality: 10,
  width: 20,
  height: 20,
};

const svgType = 'image/svg+xml';

export const createThumbnails = async (
  photo: ImageSource,
  contentType?: ImageContentType,
  thumbSizes?: ThumbnailInstruction[],
): Promise<{
  naturalSize: ImageSize;
  tinyThumb: ThumbnailFile;
  additionalThumbnails: ThumbnailFile[];
}> => {
  if (contentType === svgType) {
    if (!photo.filepath) throw new Error('No filepath found in image source');
    const vectorThumb = await createVectorThumbnail(photo.filepath);

    return {
      tinyThumb: vectorThumb.thumb,
      naturalSize: vectorThumb.naturalSize,
      additionalThumbnails: [],
    };
  }

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const { naturalSize, thumb: tinyThumb } = await createImageThumbnail(
    photo,
    tinyThumbSize,
  );

  const applicableThumbSizes = (thumbSizes || baseThumbSizes).reduce(
    (currArray, thumbSize) => {
      if (tinyThumb.contentType === svgType) return currArray;

      if (
        naturalSize.pixelWidth < thumbSize.width &&
        naturalSize.pixelHeight < thumbSize.height
      )
        return currArray;

      return [...currArray, thumbSize];
    },
    [] as ThumbnailInstruction[],
  );

  if (
    applicableThumbSizes.length !== (thumbSizes || baseThumbSizes).length &&
    !applicableThumbSizes.some(
      thumbSize => thumbSize.width === naturalSize.pixelWidth,
    )
  )
    // Source image is too small for some of the requested sizes so we add the source dimensions as exact size
    applicableThumbSizes.push({
      quality: 100,
      width: naturalSize.pixelWidth,
      height: naturalSize.pixelHeight,
    });

  // Create additionalThumbnails
  const additionalThumbnails: ThumbnailFile[] = [
    tinyThumb,
    ...(await Promise.all(
      applicableThumbSizes.map(
        async thumbSize =>
          await (
            await createImageThumbnail(photo, thumbSize)
          ).thumb,
      ),
    )),
  ];

  return { naturalSize, tinyThumb, additionalThumbnails };
};

const createVectorThumbnail = async (
  imageFilePath: string,
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  const imageBytes = base64ToUint8Array(
    await FileSystem.readFile(imageFilePath, 'base64'),
  );

  return {
    naturalSize: {
      pixelWidth: 50,
      pixelHeight: 50,
    },
    thumb: {
      pixelWidth: 50,
      pixelHeight: 50,
      payload: imageBytes,
      contentType: 'image/svg+xml',
    },
  };
};

const createImageThumbnail = async (
  photo: ImageSource,
  instruction: ThumbnailInstruction,
  format: 'webp' | 'png' | 'jpeg' = Platform.OS === 'android' ? 'webp' : 'jpeg',
): Promise<{ naturalSize: ImageSize; thumb: ThumbnailFile }> => {
  if (!photo.filepath) throw new Error('No filepath found in image source');

  return ImageResizer.createResizedImage(
    photo.filepath,
    instruction.width,
    instruction.height,
    format.toUpperCase() as ResizeFormat,
    instruction.quality,
    undefined,
    undefined,
  ).then(async resizedData => {
    const base64Bytes = await FileSystem.readFile(resizedData.path, 'base64');

    return {
      naturalSize: {
        pixelWidth: photo.width,
        pixelHeight: photo.height,
      },
      thumb: {
        pixelWidth: resizedData.width,
        pixelHeight: resizedData.height,
        payload: base64ToUint8Array(base64Bytes),
        contentType: `image/${instruction.type || format}`,
      },
    };
  });
};
