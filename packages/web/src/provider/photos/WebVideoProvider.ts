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
  DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
} from '@homebase-id/js-lib/core';
import { getRandom16ByteArray, getNewId } from '@homebase-id/js-lib/helpers';
import { processVideoFile, VideoContentType, VideoUploadResult } from '@homebase-id/js-lib/media';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Blob | File,
  thumb: ThumbnailFile | undefined,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    versionTag?: string;
    type?: VideoContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
  }
): Promise<VideoUploadResult | undefined> => {
  if (!targetDrive) throw 'Missing target drive';

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const aesKey: Uint8Array | undefined = encrypt ? getRandom16ByteArray() : undefined;

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions,
  };

  // Segment video file
  // const processVideoFile = (await import('@homebase-id/js-lib/media')).processVideoFile;
  const {
    tinyThumb,
    thumbnails: thumbnailsFromVideo,
    payloads: payloadsFromVideo,
  } = await processVideoFile({ file: file, thumbnail: thumb }, DEFAULT_PAYLOAD_KEY, DEFAULT_PAYLOAD_DESCRIPTOR_KEY, aesKey);

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
    payloadsFromVideo,
    thumbnailsFromVideo,
    encrypt,
    undefined,
    {
      aesKey,
    }
  );
  if (!result) throw new Error(`Upload failed`);

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'video',
  };
};
