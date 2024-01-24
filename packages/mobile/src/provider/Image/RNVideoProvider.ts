import {
  DotYouClient,
  TargetDrive,
  AccessControlList,
  SecurityGroupType,
  UploadInstructionSet,
  getRandom16ByteArray,
  DEFAULT_PAYLOAD_KEY,
  UploadFileMetadata,
  getNewId,
  uploadFile,
  jsonStringify64,
  getFileHeader,
  ImageContentType,
  base64ToUint8Array,
} from '@youfoundation/js-lib/dist';
import {
  MediaConfig,
  MediaUploadMeta,
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  VideoUploadResult,
} from '@youfoundation/js-lib/media';
import { OdinBlob } from '../../../polyfills/OdinBlob';
import { ImageSource } from './RNImageProvider';
import { createThumbnails } from './RNThumbnailProvider';
import { FileSystem } from 'react-native-file-access';

export type VideoContentType = 'video/mp4';

export interface RNVideoUploadMeta extends MediaUploadMeta {
  type: VideoContentType;
  thumb?: { payload: ImageSource; type: ImageContentType };
}

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  video: ImageSource,
  fileMetadata?: PlainVideoMetadata | SegmentedVideoMetadata,
  uploadMeta?: RNVideoUploadMeta
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
    ? await createThumbnails(
        uploadMeta.thumb.payload,
        DEFAULT_PAYLOAD_KEY,
        uploadMeta.thumb?.type,
        [{ quality: 100, width: 250, height: 250 }]
      )
    : { tinyThumb: undefined, additionalThumbnails: undefined };

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = uploadMeta?.versionTag;
  if (!versionTag && uploadMeta?.fileId) {
    versionTag = await getFileHeader(dotYouClient, targetDrive, uploadMeta.fileId).then(
      (header) => header?.fileMetadata.versionTag
    );
  }

  // Read payload
  const videoData = await FileSystem.readFile((video.filepath || video.uri) as string, 'base64');
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
    [
      {
        payload: new OdinBlob([base64ToUint8Array(videoData)], {
          type: uploadMeta?.type,
        }) as any as Blob,
        key: DEFAULT_PAYLOAD_KEY,
      },
    ],
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error('Upload failed');

  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'video',
  };
};

// export const getDecryptedVideoChunk = async (
//   dotYouClient: DotYouClient,
//   targetDrive: TargetDrive,
//   fileId: string,
//   _globalTransitId: string | undefined, // Kept for compatibility with ...OverPeer signature
//   key: string,
//   chunkStart?: number,
//   chunkEnd?: number,
//   systemFileType?: SystemFileType
// ): Promise<Uint8Array | null> => {
//   const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
//     systemFileType,
//     chunkStart,
//     chunkEnd,
//   });

//   return payload?.bytes || null;
// };

// export const getDecryptedVideoMetadata = async (
//   dotYouClient: DotYouClient,
//   targetDrive: TargetDrive,
//   fileId: string,
//   fileKey: string | undefined,
//   systemFileType?: SystemFileType
// ) => {
//   const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
//   if (!fileHeader) return undefined;

//   const descriptor = fileHeader.fileMetadata.payloads.find((p) => p.key === fileKey)
//     ?.descriptorContent;
//   if (!descriptor) return undefined;

//   return tryJsonParse<PlainVideoMetadata | SegmentedVideoMetadata>(descriptor);
// };

// export const getDecryptedVideoUrl = async (
//   dotYouClient: DotYouClient,
//   targetDrive: TargetDrive,
//   fileId: string,
//   key: string,
//   systemFileType?: SystemFileType,
//   fileSizeLimit?: number
// ): Promise<string> => {
//   const getDirectImageUrl = async () => {
//     const directUrl = `${dotYouClient.getEndpoint()}/drive/files/payload?${stringifyToQueryParams({
//       ...targetDrive,
//       fileId,
//       key,
//       xfst: systemFileType || 'Standard',
//     })}`;

//     if (ss) return await encryptUrl(directUrl, ss);

//     return directUrl;
//   };

//   const ss = dotYouClient.getSharedSecret();

//   // If there is no shared secret, we wouldn't even be able to decrypt
//   if (!ss) {
//     return await getDirectImageUrl();
//   }

//   const meta = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
//   if (!meta?.fileMetadata.isEncrypted) {
//     return await getDirectImageUrl();
//   }

//   // Direct download of the data and potentially decrypt if response headers indicate encrypted
//   // We limit download to 10MB to avoid memory issues
//   return getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
//     systemFileType,
//     chunkStart: fileSizeLimit ? 0 : undefined,
//     chunkEnd: fileSizeLimit,
//   }).then((data) => {
//     if (!data) return '';
//     const url = URL.createObjectURL(new OdinBlob([data.bytes], { type: data.contentType }));
//     return url;
//   });
// };