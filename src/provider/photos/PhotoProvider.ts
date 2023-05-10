import {
  DotYouClient,
  TargetDrive,
  queryBatch,
  ImageSize,
  getDecryptedImageUrl,
  DriveSearchResult,
  MediaConfig,
  getFileHeader,
  getDecryptedImageMetadata,
  ImageMetadata,
  ImageContentType,
  SecurityGroupType,
  toGuidId,
  uploadImage,
  MediaUploadMeta,
  ArchivalStatus,
  UploadInstructionSet,
  getRandom16ByteArray,
  UploadFileMetadata,
  jsonStringify64,
  VideoContentType,
  uploadVideo,
  uploadHeader,
  mergeByteArrays,
  uint8ArrayToBase64,
  ThumbnailFile,
} from '@youfoundation/js-lib';

import { PhotoFile } from './PhotoTypes';
import exifr from 'exifr/dist/full.esm.mjs'; // to use ES Modules

export const getPhotos = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  album: string | undefined,
  pageSize: number,
  cursorState?: string
) => {
  const typedAlbum = album === 'bin' || album === 'archive';
  const archivalStatus: ArchivalStatus[] =
    album === 'bin' ? [2] : album === 'archive' ? [1] : album ? [0, 1] : [0];

  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: album && !typedAlbum ? [album] : undefined,
      fileType: [MediaConfig.MediaFileType],
      archivalStatus: archivalStatus,
    },
    {
      cursorState: cursorState,
      maxRecords: pageSize,
      includeMetadataHeader: false,
      sorting: 'userDate',
      ordering: 'newestFirst',
    }
  );

  return {
    results: reponse.searchResults,
    cursorState: reponse.cursorState,
  };
};

const getPhotoExifMeta = async (bytes: Uint8Array) => {
  // Read Exif Data for the Created date of the photo itself and not the file;
  let exifData;
  try {
    exifData = await exifr.parse(bytes);
  } catch (ex) {
    // some photos don't have exif data, which fails the parsing
  }
  const dateTimeOriginal = exifData?.DateTimeOriginal;
  const imageUniqueId = exifData?.ImageUniqueID;

  const imageMetadata: ImageMetadata | undefined = exifData
    ? {
        camera: { make: exifData.Make, model: exifData.Model, lens: exifData.LensModel },
        captureDetails: {
          exposureTime: exifData.ExposureTime,
          fNumber: exifData.FNumber,
          iso: exifData.ISO,
          focalLength: exifData.FocalLength,
        },
      }
    : undefined;

  return { imageMetadata, imageUniqueId, dateTimeOriginal };
};

const uploadNewPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newPhoto: File
) => {
  const bytes = new Uint8Array(await newPhoto.arrayBuffer());
  const { imageMetadata, imageUniqueId, dateTimeOriginal } = await getPhotoExifMeta(bytes);
  const userDate = dateTimeOriginal?.getTime() || newPhoto.lastModified || new Date().getTime();

  return {
    ...(await uploadImage(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      bytes,
      imageMetadata,
      {
        type: newPhoto?.type as ImageContentType,
        userDate,
        tag: albumKey ? [albumKey] : undefined,
        uniqueId: imageUniqueId ? toGuidId(imageUniqueId) : undefined,
      },
      [
        { quality: 100, width: 500, height: 500 },
        { quality: 100, width: 2000, height: 2000 },
      ]
    )),
    userDate: new Date(userDate),
  };
};

const uploadNewVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newVideo: File,
  thumb?: ThumbnailFile
) => {
  const userDate = newVideo.lastModified || new Date().getTime();

  // if video is tiny enough (less than 10MB), don't segment just upload
  if (newVideo.size < 10000000)
    return {
      ...(await uploadVideo(
        dotYouClient,
        targetDrive,
        { requiredSecurityGroup: SecurityGroupType.Owner },
        newVideo,
        { isSegmented: false, mimeType: newVideo.type, fileSize: newVideo.size },
        {
          type: newVideo.type as VideoContentType,
          tag: albumKey ? [albumKey] : undefined,
          userDate,
          thumb: thumb,
        }
      )),
      userDate: new Date(userDate),
    };

  // Segment video file
  const segmentVideoFile = (await import('@youfoundation/js-lib')).segmentVideoFile;
  const { bytes: processedBytes, metadata } = await segmentVideoFile(newVideo);

  return {
    ...(await uploadVideo(
      dotYouClient,
      targetDrive,
      { requiredSecurityGroup: SecurityGroupType.Owner },
      processedBytes,
      metadata,
      {
        type: newVideo.type as VideoContentType,
        tag: albumKey ? [albumKey] : undefined,
        userDate,
        thumb: thumb,
      }
    )),
    userDate: new Date(userDate),
  };
};

export const uploadNew = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumKey: string | undefined,
  newFile: File,
  thumb?: ThumbnailFile
): Promise<{ fileId?: string; userDate: Date }> => {
  return newFile.type === 'video/mp4'
    ? uploadNewVideo(dotYouClient, targetDrive, albumKey, newFile, thumb)
    : uploadNewPhoto(dotYouClient, targetDrive, albumKey, newFile);
};

export const updatePhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newMetaData: MediaUploadMeta
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId, undefined, true);
  const imageMetadata = await getDecryptedImageMetadata(dotYouClient, targetDrive, photoFileId);

  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        jsonContent: jsonStringify64({ ...imageMetadata }),
        ...newMetaData,
        tags: newMetaData?.tag
          ? [...(Array.isArray(newMetaData.tag) ? newMetaData.tag : [newMetaData.tag])]
          : header.fileMetadata.appData.tags,
      },
    };

    const uploadResult = await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata
    );

    return {
      fileId: uploadResult.file.fileId,
      date: new Date(
        newMetaData.userDate || header.fileMetadata.appData.userDate || header.fileMetadata.created
      ),
      tags: header.fileMetadata.appData.tags,
    };
  }
};

export const updatePhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  photoFileId: string,
  newImageMetadata: ImageMetadata
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, photoFileId, undefined, true);
  const imageMetadata = await getDecryptedImageMetadata(dotYouClient, targetDrive, photoFileId);

  if (header) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: photoFileId ?? null,
        drive: targetDrive,
        storageIntent: 'metadataOnly',
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      ...header.fileMetadata,
      appData: {
        ...header.fileMetadata.appData,
        jsonContent: jsonStringify64({ ...imageMetadata, ...newImageMetadata }),
      },
    };

    console.log({ oldHeader: header, newHeader: metadata });

    return await uploadHeader(
      dotYouClient,
      header.sharedSecretEncryptedKeyHeader,
      instructionSet,
      metadata
    );
  }
};

export const getPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean
): Promise<PhotoFile> => {
  return {
    fileId: fileId,
    url: await getDecryptedImageUrl(dotYouClient, targetDrive, fileId, size, isProbablyEncrypted),
  };
};

const dsrToPhoto = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: DriveSearchResult,
  size?: ImageSize,
  isProbablyEncrypted?: boolean
): Promise<PhotoFile> => {
  return {
    fileId: dsr.fileId,
    url: await getDecryptedImageUrl(
      dotYouClient,
      targetDrive,
      dsr.fileId,
      size,
      isProbablyEncrypted
    ),
  };
};

export const getPhotoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ImageMetadata | null> => {
  return await getDecryptedImageMetadata(dotYouClient, targetDrive, fileId);
};

export const getAlbumThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  albumTag: string
): Promise<PhotoFile | null> => {
  const reponse = await queryBatch(
    dotYouClient,
    {
      targetDrive: targetDrive,
      tagsMatchAll: [albumTag],
      fileType: [MediaConfig.MediaFileType],
    },
    { cursorState: undefined, maxRecords: 1, includeMetadataHeader: false }
  );

  if (!reponse.searchResults || reponse.searchResults.length === 0) {
    return null;
  }

  return dsrToPhoto(dotYouClient, targetDrive, reponse.searchResults[0], {
    pixelWidth: 50,
    pixelHeight: 50,
  });
};

const convertTimeToGuid = (time: number) => {
  //Convert time number to guid string

  // One year is 3600*24*365.25*1000 = 31,557,600,000 milliseconds (35 bits)
  // Use 9 bits for the years, for a total of 44 bits (5½ bytes)
  // Thus able to hold 557 years since 1970-01-01
  // The counter is 12 bits, for a total of 4096, which gets us to ~1/4ns per guid before clash / wait()
  // Total bit usage of millisecond time+counter is thus 44+12=56 bits aka 7 bytes

  // Create 56 bits (7 bytes) {milliseconds (44 bits), _counter(12 bits)}
  // The counter is naught, since we're constructing this from the UNIX timestamp
  //
  const millisecondsCtr = (BigInt(time) << BigInt(12)) | BigInt(0);

  // I wonder if there is a neat way to not have to both create this and the GUID.
  const byte16 = new Uint8Array(16);
  byte16.fill(0);
  byte16[0] = Number((millisecondsCtr >> BigInt(48)) & BigInt(0xff));
  byte16[1] = Number((millisecondsCtr >> BigInt(40)) & BigInt(0xff));
  byte16[2] = Number((millisecondsCtr >> BigInt(32)) & BigInt(0xff));
  byte16[3] = Number((millisecondsCtr >> BigInt(24)) & BigInt(0xff));
  byte16[4] = Number((millisecondsCtr >> BigInt(16)) & BigInt(0xff));
  byte16[5] = Number((millisecondsCtr >> BigInt(8)) & BigInt(0xff));
  byte16[6] = Number((millisecondsCtr >> BigInt(0)) & BigInt(0xff));

  return byte16;
};

const int64ToBytes = (value: number) => {
  const byte8 = new Uint8Array(8);
  const bigValue = BigInt(value);

  byte8[0] = Number((bigValue >> BigInt(56)) & BigInt(0xff));
  byte8[1] = Number((bigValue >> BigInt(48)) & BigInt(0xff));
  byte8[2] = Number((bigValue >> BigInt(40)) & BigInt(0xff));
  byte8[3] = Number((bigValue >> BigInt(32)) & BigInt(0xff));
  byte8[4] = Number((bigValue >> BigInt(24)) & BigInt(0xff));
  byte8[5] = Number((bigValue >> BigInt(16)) & BigInt(0xff));
  byte8[6] = Number((bigValue >> BigInt(8)) & BigInt(0xff));
  byte8[7] = Number(bigValue & BigInt(0xff));

  return byte8;
};

export const buildCursor = (unixTimeInMs: number) => {
  let bytes = mergeByteArrays([
    convertTimeToGuid(unixTimeInMs),
    new Uint8Array(new Array(16)),
    new Uint8Array(new Array(16)),
  ]);

  const nullBytes = mergeByteArrays([
    new Uint8Array([1]),
    new Uint8Array([0]),
    new Uint8Array([0]),
  ]);

  const bytes2 = mergeByteArrays([
    int64ToBytes(unixTimeInMs),
    new Uint8Array(new Array(8)),
    new Uint8Array(new Array(8)),
  ]);

  bytes = mergeByteArrays([bytes, nullBytes, bytes2]);

  return uint8ArrayToBase64(bytes);
};

export const createDateObject = (year: number, month: number, day?: number) => {
  const newDate = new Date();
  newDate.setFullYear(year);
  newDate.setMonth(month - 1);

  if (day) newDate.setDate(day);

  return newDate;
};
