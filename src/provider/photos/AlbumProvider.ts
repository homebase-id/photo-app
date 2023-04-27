import {
  deleteFile,
  DotYouClient,
  DriveSearchResult,
  getPayload,
  getRandom16ByteArray,
  jsonStringify64,
  queryBatch,
  SecurityGroupType,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
} from '@youfoundation/js-lib';
import { AlbumDefinition, PhotoConfig } from './PhotoTypes';

const encryptAlbums = true;

export const getAllAlbums = async (dotYouClient: DotYouClient): Promise<AlbumDefinition[]> => {
  const batch = await queryBatch(
    dotYouClient,
    { targetDrive: PhotoConfig.PhotoDrive, fileType: [PhotoConfig.AlbumDefinitionFileType] },
    { maxRecords: 1000, includeMetadataHeader: true }
  );

  return await Promise.all(
    batch.searchResults.map(async (dsr) => {
      return await dsrToAlbumDefinition(dotYouClient, dsr);
    })
  );
};

const dsrToAlbumDefinition = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult
): Promise<AlbumDefinition> => {
  const payload = await getPayload<AlbumDefinition>(
    dotYouClient,
    PhotoConfig.PhotoDrive,
    dsr,
    true
  );
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
    transitOptions: null,
  };

  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: 'application/json',
    appData: {
      uniqueId: def.tag,
      tags: [],
      fileType: PhotoConfig.AlbumDefinitionFileType,
      contentIsComplete: true,
      jsonContent: payloadJson,
    },
    payloadIsEncrypted: encryptAlbums,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  uploadFile(dotYouClient, instruct, metadata, undefined, undefined, encryptAlbums);
};

export const removeAlbumDefintion = async (
  dotYouClient: DotYouClient,
  albumDef: AlbumDefinition
) => {
  if (albumDef.fileId)
    return await deleteFile(dotYouClient, PhotoConfig.PhotoDrive, albumDef.fileId, encryptAlbums);
};
