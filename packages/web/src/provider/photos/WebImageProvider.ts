import {
  DotYouClient,
  TargetDrive,
  AccessControlList,
  SecurityGroupType,
  UploadInstructionSet,
  DEFAULT_PAYLOAD_KEY,
  getFileHeader,
  UploadFileMetadata,
  uploadFile,
} from '@youfoundation/js-lib/core';
import { getRandom16ByteArray, getNewId, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import {
  ImageMetadata,
  MediaUploadMeta,
  ThumbnailInstruction,
  ImageUploadResult,
  createThumbnails,
  MediaConfig,
} from '@youfoundation/js-lib/media';

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  imageData: Blob | File,
  fileMetadata?: ImageMetadata,
  uploadMeta?: MediaUploadMeta,
  thumbsToGenerate?: ThumbnailInstruction[],
  onUpdate?: (progress: number) => void
): Promise<ImageUploadResult | undefined> => {
  if (!targetDrive) throw 'Missing target drive';

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

  const { tinyThumb, additionalThumbnails } = await createThumbnails(
    imageData,
    DEFAULT_PAYLOAD_KEY,
    thumbsToGenerate
  );

  onUpdate?.(0.5);

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = uploadMeta?.versionTag;
  if (!versionTag && uploadMeta?.fileId) {
    versionTag = await getFileHeader(dotYouClient, targetDrive, uploadMeta.fileId).then(
      (header) => header?.fileMetadata.versionTag
    );
  }

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

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [{ payload: imageData, key: DEFAULT_PAYLOAD_KEY }],
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  onUpdate?.(0.5);
  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'image',
  };
};
