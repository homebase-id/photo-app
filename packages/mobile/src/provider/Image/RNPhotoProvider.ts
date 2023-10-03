import {
  ArchivalStatus,
  DotYouClient,
  ImageContentType,
  ImageMetadata,
  MediaConfig,
  MediaUploadMeta,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
} from '@youfoundation/js-lib/core';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { ImageSource, uploadImage } from './RNImageProvider';

import Exif from 'react-native-exif';
import { queryLocalDb } from '../drive/LocalDbProvider';
import { PhotoConfig } from '../photos/PhotoTypes';

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
  filename?: string | null;
}): Promise<{
  imageMetadata: ImageMetadata | undefined;
  imageUniqueId: string;
  dateTimeOriginal: undefined | Date;
}> => {
  if (!photo.filepath)
    return {
      imageMetadata: undefined,
      imageUniqueId: '',
      dateTimeOriginal: undefined,
    };

  return Exif.getExif(photo.filepath).then((metadata: any) => {
    const exifData = metadata.exif;

    if (!exifData || !exifData['{Exif}'])
      return {
        imageMetadata: undefined,
        imageUniqueId: undefined,
        dateTimeOriginal: undefined,
      };

    const dateTimeOriginal = elaborateDateParser(
      exifData['{Exif}'].DateTimeOriginal,
    );

    const imageUniqueId = toGuidId(
      `${photo.filename}+${dateTimeOriginal?.getTime()}`,
    );

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
  return (
    mimeTypes.find(m => m.ext === fileExt)?.mime || 'application/octet-stream'
  );
};

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newPhoto: ImageSource,
  meta?: MediaUploadMeta,
) => {
  if (!newPhoto.filepath) throw 'Missing file';
  // const photo: ImageSource = newPhoto as ImageSource;

  const { imageMetadata, imageUniqueId, dateTimeOriginal } =
    await getPhotoExifMeta(newPhoto);
  const userDate = dateTimeOriginal || new Date();

  const existingImages = await queryLocalDb({
    targetDrive,
    clientUniqueIdAtLeastOne: [imageUniqueId],
  });
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
        { quality: 100, width: 2000, height: 2000 },
      ],
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
  meta?: MediaUploadMeta,
) => {
  throw 'Not implemented';

  // const userDate = (newVideo as File).lastModified || new Date().getTime();

  // // if video is tiny enough (less than 10MB), don't segment just upload
  // if (newVideo.size < 10000000 || 'bytes' in newVideo)
  //   return {
  //     ...(await uploadVideo(
  //       dotYouClient,
  //       targetDrive,
  //       { requiredSecurityGroup: SecurityGroupType.Owner },
  //       'bytes' in newVideo ? newVideo.bytes : newVideo,
  //       {
  //         isSegmented: false,
  //         mimeType: newVideo.type,
  //         fileSize: newVideo.size,
  //       },
  //       {
  //         ...meta,
  //         type: newVideo.type as VideoContentType,
  //         tag: albumKey ? [albumKey] : undefined,
  //         userDate,
  //         thumb: thumb,
  //       },
  //     )),
  //     userDate: new Date(userDate),
  //   };

  // // Segment video file
  // const segmentVideoFile = (await import('@youfoundation/js-lib/helpers'))
  //   .segmentVideoFile;
  // const { bytes: processedBytes, metadata } = await segmentVideoFile(newVideo);

  // return {
  //   ...(await uploadVideo(
  //     dotYouClient,
  //     targetDrive,
  //     { requiredSecurityGroup: SecurityGroupType.Owner },
  //     processedBytes,
  //     metadata,
  //     {
  //       type: newVideo.type as VideoContentType,
  //       tag: albumKey ? [albumKey] : undefined,
  //       userDate,
  //       thumb: thumb,
  //     },
  //   )),
  //   userDate: new Date(userDate),
  // };
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newFile: ImageSource,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta,
): Promise<{ fileId?: string; userDate: Date }> => {
  // return newFile.type.includes('video')
  //   ? uploadNewVideo(dotYouClient, targetDrive, albumKey, newFile, thumb, meta)
  return uploadNewPhoto(dotYouClient, targetDrive, albumKey, newFile, meta);
};

export type PageParam = {
  skip?: number;
  take: number;
};

export const getPhotosLocal = async (
  targetDrive: TargetDrive,
  type: 'bin' | 'archive' | 'apps' | 'favorites' | undefined,
  album: string | undefined,
  from?: Date,
  to?: Date,
  ordering?: 'older' | 'newer',
  pageParam?: PageParam,
) => {
  const archivalStatus: ArchivalStatus[] =
    type === 'bin'
      ? [2]
      : type === 'archive'
      ? [1]
      : type === 'apps'
      ? [3]
      : album || type === 'favorites'
      ? [0, 1, 3]
      : [0];

  const searchResults = await queryLocalDb(
    {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: album
        ? [album]
        : type === 'favorites'
        ? [PhotoConfig.FavoriteTag]
        : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
      userDate: from
        ? { start: from.getTime(), end: to?.getTime() }
        : undefined,
    },
    {
      sorting: 'userDate',
      ordering: ordering === 'newer' ? 'newestFirst' : 'oldestFirst',
      pageParam,
    },
  );

  return searchResults;
};
