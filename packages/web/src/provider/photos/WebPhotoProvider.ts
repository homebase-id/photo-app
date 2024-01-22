import {
  DotYouClient,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
} from '@youfoundation/js-lib/core';
import {
  ImageMetadata,
  MediaUploadMeta,
  VideoContentType,
  uploadImage,
  uploadVideo,
} from '@youfoundation/js-lib/media';
import { toGuidId } from '@youfoundation/js-lib/helpers';

import { FileLike } from 'photo-app-common';
import exifr from 'exifr/dist/full.esm.mjs'; // to use ES Modules

const getPhotoExifMeta = async (imageBlob: Blob) => {
  // Read Exif Data for the Created date of the photo itself and not the file;
  let exifData;
  try {
    exifData = await exifr.parse(imageBlob);
  } catch (ex) {
    // some photos don't have exif data, which fails the parsing
  }
  const dateTimeOriginal = exifData?.DateTimeOriginal;
  const imageUniqueId = exifData?.ImageUniqueID;

  const imageMetadata: ImageMetadata | undefined = exifData
    ? {
        camera: {
          make: exifData.Make,
          model: exifData.Model,
          lens: exifData.LensModel,
        },
        captureDetails: {
          exposureTime: exifData.ExposureTime,
          fNumber: exifData.FNumber,
          iso: exifData.ISO,
          focalLength: exifData.FocalLength,
          geolocation:
            exifData.latitude && exifData.longitude
              ? {
                  latitude: exifData.latitude,
                  longitude: exifData.longitude,
                  altitude: exifData.altitude,
                }
              : undefined,
        },
      }
    : undefined;

  return { imageMetadata, imageUniqueId, dateTimeOriginal };
};

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newPhoto: File | Blob | FileLike,
  meta?: MediaUploadMeta
) => {
  const imageBlob =
    'bytes' in newPhoto ? new Blob([newPhoto.bytes], { type: newPhoto.type }) : newPhoto;
  const { imageMetadata, imageUniqueId, dateTimeOriginal } = await getPhotoExifMeta(imageBlob);
  const userDate =
    dateTimeOriginal?.getTime() || (newPhoto as File).lastModified || new Date().getTime();

  return {
    ...(await uploadImage(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      imageBlob,
      {
        ...imageMetadata,
        originalFileName: (newPhoto as File).name || undefined,
      },
      {
        ...meta,
        userDate,
        tag: albumKey ? [albumKey] : undefined,
        uniqueId: imageUniqueId ? toGuidId(imageUniqueId) : undefined,
      },
      [
        { quality: 100, width: 500, height: 500 },
        { quality: 100, width: 2000, height: 2000 },
      ]
    )),
    userDate: new Date(userDate),
  };
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newFile: File | Blob | FileLike,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
): Promise<{ fileId?: string; userDate: Date }> => {
  return newFile.type === 'video/mp4'
    ? uploadNewVideo(dotYouClient, targetDrive, albumKey, newFile, thumb, meta)
    : uploadNewPhoto(dotYouClient, targetDrive, albumKey, newFile, meta);
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newVideo: File | Blob | FileLike,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta
) => {
  const userDate = (newVideo as File).lastModified || new Date().getTime();

  // if video is tiny enough (less than 10MB), don't segment just upload
  if (newVideo.size < 10000000 || 'bytes' in newVideo)
    return {
      ...(await uploadVideo(
        dotYouClient,
        targetDrive,
        { requiredSecurityGroup: SecurityGroupType.Owner },
        'bytes' in newVideo ? new Blob([newVideo.bytes], { type: newVideo.type }) : newVideo,
        {
          isSegmented: false,
          mimeType: newVideo.type,
          fileSize: newVideo.size,
        },
        {
          ...meta,
          type: newVideo.type as VideoContentType,
          tag: albumKey ? [albumKey] : undefined,
          userDate,
          thumb: thumb,
        }
      )),
      userDate: new Date(userDate),
    };

  // Segment video file
  const segmentVideoFile = (await import('@youfoundation/js-lib/media')).segmentVideoFile;
  const { data: processedVideo, metadata } = await segmentVideoFile(newVideo);

  return {
    ...(await uploadVideo(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      processedVideo,
      metadata,
      {
        type: newVideo.type as VideoContentType,
        tag: albumKey ? [albumKey] : undefined,
        userDate,
        thumb: thumb,
      }
    )),
    userDate: new Date(userDate),
  };
};
