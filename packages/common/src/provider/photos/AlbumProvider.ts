import {
  deleteFile,
  DotYouClient,
  DriveSearchResult,
  getContentFromHeaderOrPayload,
  queryBatch,
  SecurityGroupType,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
} from '@youfoundation/js-lib/core';
import { AlbumDefinition, PhotoConfig } from './PhotoTypes';
import { getRandom16ByteArray, jsonStringify64 } from '@youfoundation/js-lib/helpers';

const encryptAlbums = true;

export const getAllAlbums = async (dotYouClient: DotYouClient): Promise<AlbumDefinition[]> => {
  const batch = await queryBatch(
    dotYouClient,
    {
      targetDrive: PhotoConfig.PhotoDrive,
      fileType: [PhotoConfig.AlbumDefinitionFileType],
    },
    { maxRecords: 1000, includeMetadataHeader: true }
  );

  return (
    await Promise.all(
      batch.searchResults.map(async (dsr) => {
        return await dsrToAlbumDefinition(dotYouClient, dsr);
      })
    )
  ).filter(Boolean) as AlbumDefinition[];
};

const dsrToAlbumDefinition = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult
): Promise<AlbumDefinition | null> => {
  const payload = await getContentFromHeaderOrPayload<AlbumDefinition>(
    dotYouClient,
    PhotoConfig.PhotoDrive,
    dsr,
    true
  );
  if (!payload) return null;
  return {
    ...payload,
    fileId: dsr.fileId,
  };
};

export const saveAlbum = async (dotYouClient: DotYouClient, def: AlbumDefinition) => {
  const payloadJson: string = jsonStringify64({
    ...def,
    acl: undefined,
    fileId: undefined,
  } as AlbumDefinition);

  const instruct: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: def.fileId || undefined,
      drive: PhotoConfig.PhotoDrive,
    },
  };

  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    appData: {
      uniqueId: def.tag,
      tags: [],
      fileType: PhotoConfig.AlbumDefinitionFileType,
      content: payloadJson,
    },
    isEncrypted: encryptAlbums,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  return await uploadFile(dotYouClient, instruct, metadata, undefined, undefined, encryptAlbums);
};

export const removeAlbumDefintion = async (
  dotYouClient: DotYouClient,
  albumDef: AlbumDefinition
) => {
  if (albumDef.fileId)
    return await deleteFile(dotYouClient, PhotoConfig.PhotoDrive, albumDef.fileId);
};
