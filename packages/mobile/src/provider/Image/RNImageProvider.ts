import {
  DotYouClient,
  TargetDrive,
  AccessControlList,
  SecurityGroupType,
  UploadInstructionSet,
  getFileHeader,
  UploadFileMetadata,
  uploadFile,
  ImageContentType,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import {
  ImageMetadata,
  MediaUploadMeta,
  ThumbnailInstruction,
  ImageUploadResult,
  MediaConfig,
} from '@youfoundation/js-lib/media';
import {
  getRandom16ByteArray,
  getNewId,
  jsonStringify64,
  base64ToUint8Array,
} from '@youfoundation/js-lib/helpers';
import { createThumbnails } from './RNThumbnailProvider';
import { FileSystem } from 'react-native-file-access';
import { OdinBlob } from '../../../polyfills/OdinBlob';

export interface ImageSource {
  filename?: string | null;
  filepath?: string | null;
  uri?: string;
  height: number;
  width: number;
  fileSize?: number | null;
  orientation?: number | null;
}

export interface RNMediaUploadMeta extends MediaUploadMeta {
  type: ImageContentType;
}

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  photo: ImageSource,
  fileMetadata?: ImageMetadata,
  uploadMeta?: RNMediaUploadMeta,
  thumbsToGenerate?: ThumbnailInstruction[]
): Promise<ImageUploadResult | undefined> => {
  if (!targetDrive) throw 'Missing target drive';
  if (!photo.filepath) throw 'Missing filepath';

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions,
  };

  const { naturalSize, tinyThumb, additionalThumbnails } = await createThumbnails(
    photo,
    DEFAULT_PAYLOAD_KEY,
    uploadMeta?.type,
    thumbsToGenerate
  );

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = uploadMeta?.versionTag;
  if (!versionTag && uploadMeta?.fileId)
    versionTag = await getFileHeader(dotYouClient, targetDrive, uploadMeta.fileId).then(
      (header) => header?.fileMetadata.versionTag
    );

  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      fileType: MediaConfig.MediaFileType,
      content: fileMetadata ? jsonStringify64(fileMetadata) : undefined,
      previewThumbnail: tinyThumb,
      userDate: uploadMeta?.userDate,
      archivalStatus: uploadMeta?.archivalStatus,
    },
    isEncrypted: encrypt,
    accessControlList: acl,
  };

  // Read payload
  const imageData = await FileSystem.readFile(photo.filepath, 'base64');
  console.log('going to upload');
  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [
      {
        payload: new OdinBlob([base64ToUint8Array(imageData)], {
          type: uploadMeta?.type,
        }) as any as Blob,
        key: DEFAULT_PAYLOAD_KEY,
      },
    ],
    additionalThumbnails,
    encrypt
  );

  if (!result) return undefined;

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'image',
  };
};
