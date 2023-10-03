import {
  ArchivalStatus,
  DotYouClient,
  DriveSearchResult,
  ImageMetadata,
  ImageSize,
  MediaConfig,
  MediaUploadMeta,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  getDecryptedImageMetadata,
  getDecryptedImageUrl,
  getFileHeader,
  getRandom16ByteArray,
  queryBatch,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

import { PhotoConfig, PhotoFile } from './PhotoTypes';

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

export const updatePhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newMetaData: MediaUploadMeta,
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId);
  const imageMetadata = await getDecryptedImageMetadata(
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
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        jsonContent: imageMetadata
          ? jsonStringify64({ ...imageMetadata })
          : null,
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
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId);
  const imageMetadata = await getDecryptedImageMetadata(
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
      size,
      isProbablyEncrypted,
    ),
  };
};

export const getPhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
): Promise<ImageMetadata | null> => {
  //return null;
  return await getDecryptedImageMetadata(dotYouClient, targetDrive, fileId);
};

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

  if (!reponse.searchResults || reponse.searchResults.length === 0) return null;

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