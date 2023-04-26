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
  getPayloadBytes,
  MediaUploadMeta,
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
  const archivalStatus = album === 'bin' ? 2 : album === 'archive' ? 1 : 0;

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album && !typedAlbum ? [album] : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    { cursorState: cursorState, maxRecords: pageSize, includeMetadataHeader: false }
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

export const uploadPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newPhoto: File,
  albumKey?: string
) => {
  const bytes = new Uint8Array(await newPhoto.arrayBuffer());
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

  return await uploadImage(
    dotYouClient,
    targetDrive,
    { requiredSecurityGroup: SecurityGroupType.Owner },
    bytes,
    imageMetadata,
    {
      type: newPhoto.type as ImageContentType,
      userDate: dateTimeOriginal?.getTime() || newPhoto.lastModified || new Date().getTime(),
      tag: albumKey ? [albumKey] : undefined,
      uniqueId: imageUniqueId ? toGuidId(imageUniqueId) : undefined,
    }
  );
};

export const updatePhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newMetaData: MediaUploadMeta
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId, undefined, true);

  const keyheader = header.fileMetadata.payloadIsEncrypted
    ? header.sharedSecretEncryptedKeyHeader
    : undefined;
  const payload = await getPayloadBytes(dotYouClient, targetDrive, photoFileId, keyheader);
  const imageMetadata = await getDecryptedImageMetadata(dotYouClient, targetDrive, photoFileId);

  if (payload) {
    const bytes = new Uint8Array(payload.bytes);
    await uploadImage(
      dotYouClient,
      targetDrive,
      header.serverMetadata.accessControlList,
      bytes,
      imageMetadata || undefined,
      {
        userDate: header.fileMetadata.appData.userDate,
        type: payload.contentType,
        tag: header.fileMetadata.appData.tags || undefined,
        fileId: header.fileId,
        versionTag: header.fileMetadata.versionTag,
        archivalStatus: header.fileMetadata.appData.archivalStatus,
        uniqueId: header.fileMetadata.appData.uniqueId,
        ...newMetaData,
      }
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

  const keyheader = header.fileMetadata.payloadIsEncrypted
    ? header.sharedSecretEncryptedKeyHeader
    : undefined;
  const payload = await getPayloadBytes(dotYouClient, targetDrive, photoFileId, keyheader);
  const imageMetadata = await getDecryptedImageMetadata(dotYouClient, targetDrive, photoFileId);

  if (payload) {
    const bytes = new Uint8Array(payload.bytes);
    await uploadImage(
      dotYouClient,
      targetDrive,
      header.serverMetadata.accessControlList,
      bytes,
      { ...imageMetadata, ...newImageMetadata },
      {
        userDate: header.fileMetadata.appData.userDate,
        type: payload.contentType,
        tag: header.fileMetadata.appData.tags || undefined,
        fileId: header.fileId,
        versionTag: header.fileMetadata.versionTag,
        archivalStatus: header.fileMetadata.appData.archivalStatus,
        uniqueId: header.fileMetadata.appData.uniqueId,
      }
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
