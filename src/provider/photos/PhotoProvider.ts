import {
  DotYouClient,
  TargetDrive,
  queryBatch,
  ThumbSize,
  ImageSize,
  getDecryptedImageUrl,
  DriveSearchResult,
  MediaConfig,
} from '@youfoundation/dotyoucore-js';
import { PhotoFile } from './PhotoTypes';

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  album: string | undefined,
  pageSize: number,
  cursorState?: string
) => {
  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album ? [album] : undefined,
      fileType: [MediaConfig.MediaFileType],
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
