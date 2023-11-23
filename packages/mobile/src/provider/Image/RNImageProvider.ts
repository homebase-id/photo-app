import {
  DotYouClient,
  TargetDrive,
  AccessControlList,
  ImageMetadata,
  MediaUploadMeta,
  ThumbnailInstruction,
  ImageUploadResult,
  SecurityGroupType,
  UploadInstructionSet,
  getFileHeader,
  UploadFileMetadata,
  MediaConfig,
  uploadFile,
  ImageContentType,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import {
  getRandom16ByteArray,
  getNewId,
  jsonStringify64,
} from '@youfoundation/js-lib/helpers';
import { createThumbnails } from './RNThumbnailProvider';
import { FileSystem } from 'react-native-file-access';

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
  thumbsToGenerate?: ThumbnailInstruction[],
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
      overwriteFileId: uploadMeta?.fileId ?? null,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions || null,
  };

  const { naturalSize, tinyThumb, additionalThumbnails } =
    await createThumbnails(
      photo,
      DEFAULT_PAYLOAD_KEY,
      uploadMeta?.type,
      thumbsToGenerate,
    );

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = uploadMeta?.versionTag;
  if (!versionTag && uploadMeta?.fileId)
    versionTag = await getFileHeader(
      dotYouClient,
      targetDrive,
      uploadMeta.fileId,
    ).then(header => header?.fileMetadata.versionTag);

  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    appData: {
      tags: uploadMeta?.tag
        ? [
            ...(Array.isArray(uploadMeta.tag)
              ? uploadMeta.tag
              : [uploadMeta.tag]),
          ]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      fileType: MediaConfig.MediaFileType,
      content: fileMetadata ? jsonStringify64(fileMetadata) : null,
      previewThumbnail: tinyThumb,
      userDate: uploadMeta?.userDate,
      archivalStatus: uploadMeta?.archivalStatus,
    },
    isEncrypted: encrypt,
    accessControlList: acl,
  };

  // Read payload
  const imageData = await FileSystem.readFile(photo.filepath, 'base64');

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [
      {
        payload: imageData,
        key: 'payload',
      },
    ],
    additionalThumbnails,
    encrypt,
  );

  if (!result) return undefined;

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'image',
  };
};
