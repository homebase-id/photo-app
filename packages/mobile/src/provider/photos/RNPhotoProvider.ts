import {
  DotYouClient,
  ImageContentType,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
} from '@youfoundation/js-lib/core';
import { ImageMetadata, MediaUploadMeta, VideoContentType } from '@youfoundation/js-lib/media';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { ImageSource, uploadImage } from '../Image/RNImageProvider';

import Exif from 'react-native-exif';
import { getPhotoByUniqueId } from 'photo-app-common';
import { uploadVideo } from '../Image/RNVideoProvider';
import { processVideo } from '../Image/RNVideoProviderSegmenter';

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

const getPhotoExifMeta = async (photo: {
  filepath?: string | null;
  uri?: string | null;
  filename?: string | null;
}): Promise<{
  imageMetadata: ImageMetadata | undefined;
  imageUniqueId: string;
  dateTimeOriginal: undefined | Date;
} | null> => {
  if (!photo.filepath || !photo.uri) return null;

  return Exif.getExif(photo.filepath || photo.uri).then((metadata: any) => {
    const exifData = metadata.exif;

    if (!exifData || !exifData['{Exif}']) {
      return {
        imageMetadata: undefined,
        imageUniqueId: photo?.filename ? toGuidId(photo?.filename) : undefined,
        dateTimeOriginal: undefined,
      };
    }

    const dateTimeOriginal = elaborateDateParser(exifData['{Exif}'].DateTimeOriginal);

    const imageUniqueId = toGuidId(`${photo.filename}+${dateTimeOriginal?.getTime()}`);

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

    return { imageMetadata, imageUniqueId, dateTimeOriginal } as const;
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

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newPhoto: ImageSource,
  meta?: MediaUploadMeta
) => {
  const exif = await getPhotoExifMeta(newPhoto);

  const { imageMetadata, imageUniqueId, dateTimeOriginal } = exif || {
    imageMetadata: undefined,
    imageUniqueId:
      newPhoto.id || newPhoto.filename
        ? toGuidId((newPhoto.id || newPhoto.filename) as string)
        : undefined,
    dateTimeOriginal: undefined,
  };
  const userDate = dateTimeOriginal || new Date();

  const existingImages = imageUniqueId
    ? await getPhotoByUniqueId(dotYouClient, targetDrive, imageUniqueId)
    : [];
  // Image already exists, we skip it
  if (existingImages.length > 0) {
    const result = existingImages[0];
    return { fileId: result.fileId, userDate, type: 'image' };
  }

  return {
    ...(await uploadImage(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      newPhoto,
      { ...imageMetadata, originalFileName: newPhoto.filename || undefined },
      {
        ...meta,
        type: getMimeType(newPhoto.filename || undefined) as ImageContentType,
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
  };
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newVideo: ImageSource,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
) => {
  const imageUniqueId =
    newVideo.id || newVideo.filename
      ? toGuidId((newVideo.id || newVideo.filename) as string)
      : undefined;
  const userDate = newVideo.date || meta?.userDate || new Date().getTime();

  const existingImages = imageUniqueId
    ? await getPhotoByUniqueId(dotYouClient, targetDrive, imageUniqueId)
    : [];

  // Image already exists, we skip it
  if (existingImages.length > 0) {
    const result = existingImages[0];
    return { fileId: result.fileId, userDate: new Date(userDate), type: 'video' };
  }

  // Segment video file
  const { video: processedMedia, metadata } = await processVideo(newVideo);

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
        // thumb: thumb,
      }
    )),
    userDate: new Date(userDate),
  };
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newFile: ImageSource,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
): Promise<{ fileId?: string; userDate: Date }> => {
  return newFile.type?.includes('video')
    ? uploadNewVideo(dotYouClient, targetDrive, albumKey, newFile, thumb, meta)
    : uploadNewPhoto(dotYouClient, targetDrive, albumKey, newFile, meta);
};

export type PageParam = {
  skip?: number;
  take: number;
};
