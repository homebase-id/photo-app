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
  EmbeddedThumb,
  getFileHeader,
  UploadFileMetadata,
  MediaConfig,
  uploadFile,
} from '@youfoundation/js-lib/core';
import {
  uint8ArrayToBase64,
  getRandom16ByteArray,
  getNewId,
  jsonStringify64,
  base64ToUint8Array,
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

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  photo: ImageSource,
  fileMetadata?: ImageMetadata,
  uploadMeta?: MediaUploadMeta,
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
    await createThumbnails(photo, uploadMeta?.type, thumbsToGenerate);

  const previewThumbnail: EmbeddedThumb = {
    pixelWidth: naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    pixelHeight: naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    contentType: tinyThumb.contentType,
    content: uint8ArrayToBase64(tinyThumb.payload),
  };

  const additionalThumbs = additionalThumbnails.map(thumb => {
    return {
      pixelHeight: thumb.pixelHeight,
      pixelWidth: thumb.pixelWidth,
      contentType: thumb.contentType,
    };
  });

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
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [
            ...(Array.isArray(uploadMeta.tag)
              ? uploadMeta.tag
              : [uploadMeta.tag]),
          ]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: MediaConfig.MediaFileType,
      jsonContent: fileMetadata ? jsonStringify64(fileMetadata) : null,
      previewThumbnail: previewThumbnail,
      additionalThumbnails: additionalThumbs,
      userDate: uploadMeta?.userDate,
      archivalStatus: uploadMeta?.archivalStatus,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  // Read payload
  const imageData = await FileSystem.readFile(photo.filepath, 'base64');

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    base64ToUint8Array(imageData),
    additionalThumbnails,
    encrypt,
  );

  if (!result) return undefined;

  return { fileId: result.file.fileId, previewThumbnail, type: 'image' };
};
