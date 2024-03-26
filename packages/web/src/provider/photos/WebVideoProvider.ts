import {
  DotYouClient,
  TargetDrive,
  AccessControlList,
  TransitOptions,
  ThumbnailFile,
  SecurityGroupType,
  UploadInstructionSet,
  DEFAULT_PAYLOAD_KEY,
  UploadFileMetadata,
  uploadFile,
} from '@youfoundation/js-lib/core';
import { getRandom16ByteArray, getNewId, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import {
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  VideoContentType,
  VideoUploadResult,
  createThumbnails,
} from '@youfoundation/js-lib/media';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Blob | File,
  fileMetadata?: PlainVideoMetadata | SegmentedVideoMetadata,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    versionTag?: string;
    type?: VideoContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
    thumb?: ThumbnailFile;
  }
): Promise<VideoUploadResult | undefined> => {
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

  const { tinyThumb, additionalThumbnails } = uploadMeta?.thumb
    ? await createThumbnails(uploadMeta.thumb.payload, DEFAULT_PAYLOAD_KEY, [
        { quality: 100, width: 250, height: 250 },
      ])
    : { tinyThumb: undefined, additionalThumbnails: undefined };

  const metadata: UploadFileMetadata = {
    versionTag: uploadMeta?.versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      fileType: 0,
      userDate: uploadMeta?.userDate,
      previewThumbnail: tinyThumb,
    },
    isEncrypted: encrypt,
    accessControlList: acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [
      {
        payload: file,
        key: DEFAULT_PAYLOAD_KEY,
        descriptorContent: fileMetadata ? jsonStringify64(fileMetadata) : undefined,
      },
    ],
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'video',
  };
};
