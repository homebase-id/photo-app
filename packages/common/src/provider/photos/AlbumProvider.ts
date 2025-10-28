import {
  deleteFile,
  DotYouClient,
  HomebaseFile,
  getContentFromHeaderOrPayload,
  queryBatch,
  SecurityGroupType,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { AlbumDefinition, PhotoConfig } from './PhotoTypes';
import { getRandom16ByteArray, jsonStringify64 } from '@homebase-id/js-lib/helpers';

const encryptAlbums = true;

export const getAllAlbums = async (dotYouClient: DotYouClient, targetDrive?: TargetDrive): Promise<AlbumDefinition[]> => {
  const batch = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive || PhotoConfig.PhotoDrive,
      fileType: [PhotoConfig.AlbumDefinitionFileType],
    },
    { maxRecords: 1000, includeMetadataHeader: true }
  );

  return (
    await Promise.all(
      batch.searchResults.map(async (dsr) => {
        return await dsrToAlbumDefinition(dotYouClient, dsr, targetDrive);
      })
    )
  ).filter(Boolean) as AlbumDefinition[];
};

const dsrToAlbumDefinition = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive?: TargetDrive
): Promise<AlbumDefinition | null> => {
  const payload = await getContentFromHeaderOrPayload<AlbumDefinition>(
    dotYouClient,
    targetDrive || PhotoConfig.PhotoDrive,
    dsr,
    true
  );
  if (!payload) return null;
  return {
    ...payload,
    fileId: dsr.fileId,
    versionTag: dsr.fileMetadata.versionTag,
  };
};

export const saveAlbum = async (dotYouClient: DotYouClient, def: AlbumDefinition, targetDrive?: TargetDrive) => {
  const payloadJson: string = jsonStringify64({
    ...def,
    acl: undefined,
    fileId: undefined,
  } as AlbumDefinition);

  const instruct: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: def.fileId || undefined,
      drive: targetDrive || PhotoConfig.PhotoDrive,
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
    versionTag: def.versionTag,
  };

  return await uploadFile(dotYouClient, instruct, metadata, undefined, undefined, encryptAlbums);
};

export const removeAlbumDefintion = async (
  dotYouClient: DotYouClient,
  albumDef: AlbumDefinition,
  targetDrive?: TargetDrive,
) => {
  if (albumDef.fileId)
    return await deleteFile(dotYouClient, targetDrive || PhotoConfig.PhotoDrive, albumDef.fileId);
};
