import {
  ArchivalStatus,
  DEFAULT_PAYLOAD_KEY,
  DotYouClient,
  DriveSearchResult,
  ImageMetadata,
  ImageSize,
  MediaConfig,
  MediaUploadMeta,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
  UploadFileMetadata,
  UploadInstructionSet,
  VideoContentType,
  getDecryptedImageMetadata,
  getDecryptedImageUrl,
  getFileHeader,
  queryBatch,
  uploadHeader,
  uploadImage,
  uploadVideo,
} from '@youfoundation/js-lib/core';
import {
  toGuidId,
  jsonStringify64,
  getRandom16ByteArray,
} from '@youfoundation/js-lib/helpers';

import { FileLike, PhotoConfig, PhotoFile } from './PhotoTypes';
import exifr from 'exifr/dist/full.esm.mjs'; // to use ES Modules

export const getPhotos = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  type: 'bin' | 'archive' | 'apps' | 'favorites' | undefined,
  album: string | undefined,
  pageSize: number,
  cursorState?: string,
  ordering?: 'older' | 'newer',
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

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album
        ? [album]
        : type === 'favorites'
        ? [PhotoConfig.FavoriteTag]
        : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    {
      cursorState: cursorState,
      maxRecords: pageSize,
      includeMetadataHeader: false,
      sorting: 'userDate',
      ordering: ordering === 'newer' ? 'oldestFirst' : 'newestFirst',
    },
  );

  return {
    results: reponse.searchResults,
    cursorState: reponse.cursorState,
  };
};

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
  meta?: MediaUploadMeta,
) => {
  const imageBlob =
    'bytes' in newPhoto
      ? new Blob([newPhoto.bytes], { type: newPhoto.type })
      : newPhoto;
  const { imageMetadata, imageUniqueId, dateTimeOriginal } =
    await getPhotoExifMeta(imageBlob);
  const userDate =
    dateTimeOriginal?.getTime() ||
    (newPhoto as File).lastModified ||
    new Date().getTime();

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
      ],
    )),
    userDate: new Date(userDate),
  };
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newVideo: File | Blob | FileLike,
  thumb?: ThumbnailFile,
  meta?: MediaUploadMeta,
) => {
  const userDate = (newVideo as File).lastModified || new Date().getTime();

  // if video is tiny enough (less than 10MB), don't segment just upload
  if (newVideo.size < 10000000 || 'bytes' in newVideo)
    return {
      ...(await uploadVideo(
        dotYouClient,
        targetDrive,
        { requiredSecurityGroup: SecurityGroupType.Owner },
        'bytes' in newVideo
          ? new Blob([newVideo.bytes], { type: newVideo.type })
          : newVideo,
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
        },
      )),
      userDate: new Date(userDate),
    };

  // Segment video file
  const segmentVideoFile = (await import('@youfoundation/js-lib/helpers'))
    .segmentVideoFile;
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
      },
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
  meta?: MediaUploadMeta,
): Promise<{ fileId?: string; userDate: Date }> => {
  return newFile.type === 'video/mp4'
    ? uploadNewVideo(dotYouClient, targetDrive, albumKey, newFile, thumb, meta)
    : uploadNewPhoto(dotYouClient, targetDrive, albumKey, newFile, meta);
};

export const updatePhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newMetaData: MediaUploadMeta,
) => {
  const header = await getFileHeader<ImageMetadata>(
    dotYouClient,
    targetDrive,
    photoFileId,
  );

  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        content: header.fileMetadata.appData.content
          ? jsonStringify64({ ...header.fileMetadata.appData.content })
          : undefined,
        ...newMetaData,
        tags: newMetaData?.tag
          ? [
              ...(Array.isArray(newMetaData.tag)
                ? newMetaData.tag
                : [newMetaData.tag]),
            ]
          : header.fileMetadata.appData.tags,
      },
    };

    const uploadResult = await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata,
    );

    if (!uploadResult) return;
    return {
      fileId: uploadResult.file.fileId,
      date: new Date(
        newMetaData.userDate ||
          header.fileMetadata.appData.userDate ||
          header.fileMetadata.created,
      ),
      tags: header.fileMetadata.appData.tags,
    };
  }
};

export const updatePhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newImageMetadata: ImageMetadata,
) => {
  const header = await getFileHeader<ImageMetadata>(
    dotYouClient,
    targetDrive,
    photoFileId,
  );

  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        content: jsonStringify64({
          ...(header.fileMetadata.appData.content || {}),
          ...newImageMetadata,
        }),
      },
    };

    console.log({ oldHeader: header, newHeader: metadata });

    return await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata,
    );
  }
};

export const getPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
): Promise<PhotoFile> => {
  return {
    fileId: fileId,
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      fileId,
      DEFAULT_PAYLOAD_KEY,
      size,
      isProbablyEncrypted,
    ),
  };
};

const dsrToPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: DriveSearchResult,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
): Promise<PhotoFile> => {
  return {
    fileId: dsr.fileId,
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      DEFAULT_PAYLOAD_KEY,
      size,
      isProbablyEncrypted,
    ),
  };
};

export const getPhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
): Promise<ImageMetadata | null> =>
  await getDecryptedImageMetadata(dotYouClient, targetDrive, fileId);

export const getAlbumThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumTag: string,
): Promise<PhotoFile | null> => {
  const archivalStatus: ArchivalStatus[] =
    albumTag === 'bin'
      ? [2]
      : albumTag === 'archive'
      ? [1]
      : albumTag === 'apps'
      ? [3]
      : albumTag
      ? [0, 1, 3]
      : [0];

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: [albumTag],
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    { cursorState: undefined, maxRecords: 1, includeMetadataHeader: false },
  );

  if (!reponse.searchResults || reponse.searchResults.length === 0) {
    return null;
  }

  return dsrToPhoto(dotYouClient, targetDrive, reponse.searchResults[0], {
    pixelWidth: 50,
    pixelHeight: 50,
  });
};

export const createDateObject = (year: number, month: number, day?: number) => {
  const newDate = new Date(0);
  newDate.setFullYear(year);
  newDate.setMonth(month - 1);

  if (day) newDate.setDate(day);

  return newDate;
};
