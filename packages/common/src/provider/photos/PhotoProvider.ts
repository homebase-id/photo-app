import {
  ArchivalStatus,
  DEFAULT_PAYLOAD_KEY,
  DotYouClient,
  HomebaseFile,
  ImageSize,
  TargetDrive,
  UpdateLocalInstructionSet,
  UploadFileMetadata,
  getFileHeader,
  patchFile,
  queryBatch,
} from '@homebase-id/js-lib/core';
import {
  ImageMetadata,
  MediaConfig,
  MediaUploadMeta,
  getDecryptedImageMetadata,
  getDecryptedImageUrl,
} from '@homebase-id/js-lib/media';
import { jsonStringify64 } from '@homebase-id/js-lib/helpers';

import { LibraryType, PhotoConfig, PhotoFile } from './PhotoTypes';

export const getArchivalStatusFromType = (type: LibraryType, album?: string): ArchivalStatus[] =>
  type === 'bin'
    ? [2]
    : type === 'archive'
      ? [1]
      : type === 'apps'
        ? [3]
        : album || type === 'favorites'
          ? [0, 1, 3]
          : [0];

export const getPhotos = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  type: LibraryType,
  album: string | undefined,
  pageSize: number,
  cursorState?: string,
  ordering?: 'older' | 'newer'
) => {
  const archivalStatus = getArchivalStatusFromType(type, album);

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album ? [album] : type === 'favorites' ? [PhotoConfig.FavoriteTag] : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    {
      cursorState: cursorState,
      maxRecords: pageSize,
      includeMetadataHeader: false,
      sorting: 'userDate',
      ordering: ordering === 'newer' ? 'oldestFirst' : 'newestFirst',
    }
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
  newMetaData: MediaUploadMeta
) => {
  const header = await getFileHeader<ImageMetadata>(dotYouClient, targetDrive, photoFileId);

  if (header) {
    const instructionSet: UpdateLocalInstructionSet = {
      file: {
        fileId: photoFileId,
        targetDrive: targetDrive,
      },
      locale: 'local',
      versionTag: header.fileMetadata.versionTag,
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
          ? [...(Array.isArray(newMetaData.tag) ? newMetaData.tag : [newMetaData.tag])]
          : header.fileMetadata.appData.tags,
      },
    };

    const uploadResult = await patchFile(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata
    );

    if (!uploadResult) return;
    return {
      fileId: header.fileId,
      date: new Date(
        newMetaData.userDate || header.fileMetadata.appData.userDate || header.fileMetadata.created
      ),
      tags: header.fileMetadata.appData.tags,
    };
  }
};

export const updatePhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newImageMetadata: ImageMetadata
) => {
  const header = await getFileHeader<ImageMetadata>(dotYouClient, targetDrive, photoFileId);

  if (header) {
    const instructionSet: UpdateLocalInstructionSet = {
      file: {
        fileId: photoFileId,
        targetDrive: targetDrive,
      },
      locale: 'local',
      versionTag: header.fileMetadata.versionTag,
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

    return await patchFile(
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
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      fileId,
      DEFAULT_PAYLOAD_KEY,
      isProbablyEncrypted,
      undefined,
      {
        size,
      }
    ),
  };
};

const dsrToPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: HomebaseFile,
  size?: ImageSize,
  isProbablyEncrypted?: boolean
): Promise<PhotoFile> => {
  return {
    fileId: dsr.fileId,
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      DEFAULT_PAYLOAD_KEY,
      isProbablyEncrypted,
      undefined,
      {
        size,
      }
    ),
  };
};

export const getPhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ImageMetadata | null> =>
  await getDecryptedImageMetadata(dotYouClient, targetDrive, fileId);

export const getAlbumThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumTag: string
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

export const createDateObject = (year: number, month: number, day?: number) => {
  const newDate = new Date(0);
  newDate.setFullYear(year);
  newDate.setMonth(month - 1);

  if (day) newDate.setDate(day);

  return newDate;
};
