import {
  DotYouClient,
  TargetDrive,
  queryBatch,
  ThumbSize,
  ImageSize,
  getDecryptedImageUrl,
  DriveSearchResult,
  MediaConfig,
  getFileHeader,
  getDecryptedImageMetadata,
  ImageMetadata,
  ImageContentType,
  SecurityGroupType,
  toGuidId,
  uploadImage,
  MediaUploadMeta,
  ArchivalStatus,
  UploadInstructionSet,
  getRandom16ByteArray,
  UploadFileMetadata,
  jsonStringify64,
  VideoContentType,
  uploadVideo,
  uploadHeader,
} from '@youfoundation/js-lib';

import { PhotoFile } from './PhotoTypes';
import exifr from 'exifr/dist/full.esm.mjs'; // to use ES Modules

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  album: string | undefined,
  pageSize: number,
  cursorState?: string
) => {
  const typedAlbum = album === 'bin' || album === 'archive';
  const archivalStatus: ArchivalStatus[] =
    album === 'bin' ? [2] : album === 'archive' ? [1] : album ? [0, 1] : [0];

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album && !typedAlbum ? [album] : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    {
      cursorState: cursorState,
      maxRecords: pageSize,
      includeMetadataHeader: false,
      sorting: 'userDate',
      ordering: 'newestFirst',
    }
  );

  return {
    results: reponse.searchResults,
    cursorState: reponse.cursorState,
  };
};

export const getPhotosFromLibrary = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  pageSize: number,
  cursorState?: string,
  size?: ThumbSize
) => {
  const reponse = await queryBatch(
    dotYouClient,
    { targetDrive: targetDrive },
    { cursorState: cursorState, maxRecords: pageSize, includeMetadataHeader: false }
  );

  return {
    results: await Promise.all(
      reponse.searchResults.map(
        async (dsr) => await dsrToPhoto(dotYouClient, targetDrive, dsr, size)
      )
    ),
    cursorState,
  };
};

const getPhotoExifMeta = async (bytes: Uint8Array) => {
  // Read Exif Data for the Created date of the photo itself and not the file;
  let exifData;
  try {
    exifData = await exifr.parse(bytes);
  } catch (ex) {
    // some photos don't have exif data, which fails the parsing
  }
  const dateTimeOriginal = exifData?.DateTimeOriginal;
  const imageUniqueId = exifData?.ImageUniqueID;

  const imageMetadata: ImageMetadata | undefined = exifData
    ? {
        camera: { make: exifData.Make, model: exifData.Model, lens: exifData.LensModel },
        captureDetails: {
          exposureTime: exifData.ExposureTime,
          fNumber: exifData.FNumber,
          iso: exifData.ISO,
          focalLength: exifData.FocalLength,
        },
      }
    : undefined;

  return { imageMetadata, imageUniqueId, dateTimeOriginal };
};

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newPhoto: File,
  albumKey?: string
) => {
  const bytes = new Uint8Array(await newPhoto.arrayBuffer());
  const { imageMetadata, imageUniqueId, dateTimeOriginal } = await getPhotoExifMeta(bytes);

  return await uploadImage(
    dotYouClient,
    targetDrive,
    { requiredSecurityGroup: SecurityGroupType.Owner },
    bytes,
    imageMetadata,
    {
      type: newPhoto?.type as ImageContentType,
      userDate: dateTimeOriginal?.getTime() || newPhoto.lastModified || new Date().getTime(),
      tag: albumKey ? [albumKey] : undefined,
      uniqueId: imageUniqueId ? toGuidId(imageUniqueId) : undefined,
    }
  );
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newVideo: File,
  albumKey?: string
) => {
  // if video is tiny enough (less than 10MB), don't segment just upload
  if (newVideo.size < 10000000)
    return await uploadVideo(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      newVideo,
      { isSegmented: false, mimeType: newVideo.type, fileSize: newVideo.size },
      {
        type: newVideo.type as VideoContentType,
        tag: albumKey ? [albumKey] : undefined,
      }
    );

  // Segment video file
  const segmentVideoFile = (await import('@youfoundation/js-lib')).segmentVideoFile;
  const { bytes: processedBytes, metadata } = await segmentVideoFile(newVideo);

  return await uploadVideo(
    dotYouClient,
    targetDrive,
    { requiredSecurityGroup: SecurityGroupType.Owner },
    processedBytes,
    metadata,
    {
      type: newVideo.type as VideoContentType,
      tag: albumKey ? [albumKey] : undefined,
    }
  );
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newFile: File,
  albumKey?: string
) => {
  if (newFile.type === 'video/mp4')
    return uploadNewVideo(dotYouClient, targetDrive, newFile, albumKey);

  return uploadNewPhoto(dotYouClient, targetDrive, newFile, albumKey);
};

export const updatePhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newMetaData: MediaUploadMeta
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId, undefined, true);
  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        ...newMetaData,
      },
    };

    await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata
    );
  }
};

export const updatePhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newImageMetadata: ImageMetadata
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId, undefined, true);
  const imageMetadata = await getDecryptedImageMetadata(dotYouClient, targetDrive, photoFileId);

  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        jsonContent: jsonStringify64({ ...imageMetadata, ...newImageMetadata }),
      },
    };

    console.log({ oldHeader: header, newHeader: metadata });

    return await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata
    );
  }
};

export const getPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean
): Promise<PhotoFile> => {
  return {
    fileId: fileId,
    url: await getDecryptedImageUrl(dotYouClient, targetDrive, fileId, size, isProbablyEncrypted),
  };
};

const dsrToPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: DriveSearchResult,
  size?: ImageSize,
  isProbablyEncrypted?: boolean
): Promise<PhotoFile> => {
  return {
    fileId: dsr.fileId,
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      size,
      isProbablyEncrypted
    ),
  };
};

export const getPhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ImageMetadata | null> => {
  return await getDecryptedImageMetadata(dotYouClient, targetDrive, fileId);
};

export const getAlbumThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumTag: string
): Promise<PhotoFile | null> => {
  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: [albumTag],
      fileType: [MediaConfig.MediaFileType],
    },
    { cursorState: undefined, maxRecords: 1, includeMetadataHeader: false }
  );

  if (!reponse.searchResults || reponse.searchResults.length === 0) {
    return null;
  }

  return dsrToPhoto(dotYouClient, targetDrive, reponse.searchResults[0], {
    pixelWidth: 50,
    pixelHeight: 50,
  });
};
