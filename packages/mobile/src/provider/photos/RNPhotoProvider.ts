import {
  DotYouClient,
  ImageContentType,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
  getFileHeaderByUniqueId,
} from '@youfoundation/js-lib/core';
import { ImageMetadata, MediaUploadMeta, VideoContentType } from '@youfoundation/js-lib/media';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { ImageSource, uploadImage } from '../Image/RNImageProvider';

import Exif from 'react-native-exif';
import { uploadVideo } from '../Image/RNVideoProvider';
import { grabThumbnail, processVideo } from '../Image/RNVideoProviderSegmenter';
import { CameraRoll, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { Platform } from 'react-native';

const elaborateDateParser = (dateString: string) => {
  try {
    if (!isNaN(Date.parse(dateString))) return new Date(dateString);

    const dateParts = dateString.split(' ');
    const timeParts = dateParts[1].split(':');

    const alteredDate = dateParts[0].replaceAll(':', '-');
    if (!isNaN(Date.parse(alteredDate))) {
      const returnDate = new Date(alteredDate);
      returnDate.setHours(parseInt(timeParts[0]));
      returnDate.setMinutes(parseInt(timeParts[1]));
      returnDate.setSeconds(parseInt(timeParts[2]));

      return returnDate;
    }
  } catch (ex) {
    return undefined;
  }
};

const getPhotoExifMeta = async (
  photo: PhotoIdentifier
): Promise<{
  imageMetadata: ImageMetadata | undefined;
  dateTimeOriginal: undefined | Date;
}> => {
  if (!photo.node.image.filepath || !photo.node.image.uri) {
    return {
      imageMetadata: undefined,
      dateTimeOriginal: undefined,
    };
  }

  return Exif.getExif(photo.node.image.filepath || photo.node.image.uri).then((metadata: any) => {
    const exifData = metadata.exif;

    if (!exifData || !exifData['{Exif}']) {
      return {
        imageMetadata: undefined,
        dateTimeOriginal: undefined,
      };
    }

    const dateTimeOriginal = elaborateDateParser(exifData['{Exif}'].DateTimeOriginal);
    const imageMetadata: ImageMetadata | undefined = metadata
      ? {
          camera: {
            make: exifData['{TIFF}']?.Make,
            model: exifData['{TIFF}']?.Model,
            lens: exifData['{ExifAux}']?.LensModel,
          },
          captureDetails: {
            exposureTime: exifData['{Exif}'].ExposureTime,
            fNumber: exifData['{Exif}'].FNumber,
            iso: (exifData['{Exif}'].ISOSpeedRatings || [undefined])[0],
            focalLength: exifData['{Exif}'].FocalLength,
            geolocation:
              exifData['{GPS}']?.latitude && exifData['{GPS}']?.longitude
                ? {
                    latitude: exifData['{GPS}'].latitude,
                    longitude: exifData['{GPS}'].longitude,
                    altitude: exifData['{GPS}'].altitude,
                  }
                : undefined,
          },
        }
      : undefined;

    return { imageMetadata, dateTimeOriginal } as const;
  });
};

const mimeTypes = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'mp4', mime: 'video/mp4' },
  { ext: 'avi', mime: 'video/avi' },
  { ext: 'mp3', mime: 'video/mp3' },
  { ext: 'mov', mime: 'video/mov' },
  { ext: 'mpg', mime: 'video/mpg' },
  { ext: 'mpeg', mime: 'video/mpeg' },
  { ext: 'bmp', mime: 'image/bmp' },
  { ext: 'raw', mime: 'image/raw' },
];

const getMimeType = (fileName?: string) => {
  if (!fileName) return 'application/octet-stream'; // default to binary (unknown)

  const fileExt = fileName.split('.').pop()?.toLowerCase();
  return mimeTypes.find((m) => m.ext === fileExt)?.mime || 'application/octet-stream';
};

export const getUniqueId = (item: PhotoIdentifier) => {
  return item.node.id
    ? toGuidId(item.node.id as string)
    : toGuidId(`${item.node.image.filename}x${item.node.image.width}x${item.node.image.height}`);
};

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newPhoto: PhotoIdentifier,
  meta?: MediaUploadMeta
) => {
  const exif = await getPhotoExifMeta(newPhoto);

  const { imageMetadata, dateTimeOriginal } = exif;
  const imageUniqueId = getUniqueId(newPhoto);
  const userDate = dateTimeOriginal || new Date();

  console.log('imageUniqueId', imageUniqueId, newPhoto.node.id);

  const existingImage = imageUniqueId
    ? await getFileHeaderByUniqueId(dotYouClient, targetDrive, imageUniqueId)
    : null;
  // Image already exists, we skip it
  if (existingImage) {
    return { fileId: existingImage.fileId, userDate, type: 'image', imageUniqueId };
  }

  return {
    ...(await uploadImage(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      newPhoto.node.image,
      { ...imageMetadata, originalFileName: newPhoto.node.image.filename || undefined },
      {
        ...meta,
        type: getMimeType(newPhoto.node.image.filename || undefined) as ImageContentType,
        userDate: userDate.getTime(),
        tag: albumKey ? [albumKey] : undefined,
        uniqueId: imageUniqueId,
      },
      [
        { quality: 100, width: 500, height: 500 },
        // { quality: 100, width: 2000, height: 2000 },
      ]
    )),
    userDate: userDate,
    imageUniqueId,
  };
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newVideo: PhotoIdentifier,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
) => {
  const imageUniqueId = getUniqueId(newVideo);
  const userDate =
    (newVideo.node.timestamp ? newVideo.node.timestamp * 1000 : undefined) ||
    meta?.userDate ||
    new Date().getTime();

  const existingImage = imageUniqueId
    ? await getFileHeaderByUniqueId(dotYouClient, targetDrive, imageUniqueId)
    : null;

  // Image already exists, we skip it
  if (existingImage) {
    return {
      fileId: existingImage.fileId,
      userDate: new Date(userDate),
      type: 'video',
      imageUniqueId,
    };
  }

  // Segment video file
  const { video: processedMedia, metadata } = await processVideo(newVideo.node.image);

  const thumbnail = await grabThumbnail(newVideo.node.image);
  const thumbSource: ImageSource = {
    uri: thumbnail.uri,
    width: 1920,
    height: 1080,
    type: thumbnail.type,
  };

  return {
    ...(await uploadVideo(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      processedMedia,
      metadata,
      {
        ...meta,
        type: 'video/mp4' as VideoContentType,
        tag: albumKey ? [albumKey] : undefined,
        userDate: userDate,
        uniqueId: imageUniqueId,
        thumb: {
          payload: thumbSource,
          type: thumbnail.type as ImageContentType,
        },
      }
    )),
    userDate: new Date(userDate),
    imageUniqueId,
  };
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newFile: PhotoIdentifier,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
): Promise<{ fileId?: string; userDate: Date; imageUniqueId: string }> => {
  const fileData =
    Platform.OS === 'ios'
      ? await CameraRoll.iosGetImageDataById(newFile.node.image.uri, {
          convertHeicImages: true,
        })
      : undefined;

  const toUpload: PhotoIdentifier = {
    ...newFile,
    ...fileData,
    node: {
      ...newFile.node,
      ...fileData?.node,
      image: {
        ...newFile.node.image,
        ...fileData?.node?.image,
      },
    },
  };

  return toUpload.node.type?.includes('video')
    ? uploadNewVideo(dotYouClient, targetDrive, albumKey, toUpload, thumb, meta)
    : uploadNewPhoto(dotYouClient, targetDrive, albumKey, toUpload, meta);
};

export type PageParam = {
  skip?: number;
  take: number;
};
