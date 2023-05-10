import {
  DotYouClient,
  queryBatch,
  DriveSearchResult,
  getPayload,
  jsonStringify64,
  UploadInstructionSet,
  getRandom16ByteArray,
  UploadFileMetadata,
  SecurityGroupType,
  uploadFile,
} from '@youfoundation/js-lib';
import { PhotoLibraryMetadata, PhotoConfig } from './PhotoTypes';

const encryptPhotoLibrary = true;

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  albumTag?: string
): Promise<PhotoLibraryMetadata | null> => {
  const batch = await queryBatch(
    dotYouClient,
    {
      targetDrive: PhotoConfig.PhotoDrive,
      fileType: [PhotoConfig.PhotoLibraryMetadataFileType],
      tagsMatchAtLeastOne: albumTag ? [albumTag] : [PhotoConfig.MainTag],
    },
    { maxRecords: 2, includeMetadataHeader: true }
  );

  if (batch.searchResults.length === 0) return null;
  if (batch.searchResults.length > 1)
    console.error('broken state, more than one photo library metadata file found');

  return await dsrToPhotoLibraryMetadata(dotYouClient, batch.searchResults[0]);
};

const dsrToPhotoLibraryMetadata = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult
): Promise<PhotoLibraryMetadata> => {
  const payload = await getPayload<PhotoLibraryMetadata>(
    dotYouClient,
    PhotoConfig.PhotoDrive,
    dsr,
    true
  );
  return {
    ...payload,
    fileId: dsr.fileId,
    versionTag: dsr.fileMetadata.versionTag,
  };
};

export const savePhotoLibraryMetadata = async (
  dotYouClient: DotYouClient,
  def: PhotoLibraryMetadata,
  albumTag?: string
) => {
  const existingPhotoLib = await getPhotoLibrary(dotYouClient, albumTag);
  if (existingPhotoLib && existingPhotoLib.fileId !== def.fileId)
    def.fileId = existingPhotoLib.fileId;

  if (existingPhotoLib && existingPhotoLib.versionTag !== def.versionTag) {
    console.error(
      'broken state, photo library metadata file found with different version tag, we might be overwriting a newer version'
    );
    def.versionTag = existingPhotoLib.versionTag;
  }

  const payloadJson: string = jsonStringify64({
    ...def,
    versionTag: undefined,
    fileId: undefined,
  } as PhotoLibraryMetadata);

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
    versionTag: def.versionTag,
    appData: {
      tags: albumTag ? [albumTag] : [PhotoConfig.MainTag],
      fileType: PhotoConfig.PhotoLibraryMetadataFileType,
      contentIsComplete: true,
      jsonContent: payloadJson,
    },
    payloadIsEncrypted: encryptPhotoLibrary,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  uploadFile(dotYouClient, instruct, metadata, undefined, undefined, encryptPhotoLibrary);
};

export const updateCount = (
  currLib: PhotoLibraryMetadata,
  date: Date,
  newCount: number
): PhotoLibraryMetadata | null => {
  const newYear = currLib.yearsWithMonths.find((y) => y.year === date.getFullYear());
  const newMonth = newYear?.months.find((m) => m.month === date.getMonth() + 1);
  const newDay = newMonth?.days.find((d) => d.day === date.getDate());

  if (!newYear || !newMonth || !newDay) return null;

  const newDays = [
    ...newMonth.days.filter((d) => d.day !== date.getDate()),
    { ...newDay, photosThisDay: newCount },
  ];
  const newPhotosInMonth = newDays.reduce((currVal, day) => currVal + day.photosThisDay, 0);

  const updatedLib: PhotoLibraryMetadata = {
    ...currLib,
    yearsWithMonths: [
      ...currLib.yearsWithMonths.filter((y) => y.year !== date.getFullYear()),
      {
        ...newYear,
        months: [
          ...newYear.months.filter((m) => m.month !== date.getMonth() + 1),
          {
            ...newMonth,
            photosThisMonth: newPhotosInMonth,
            days: newDays,
          },
        ],
      },
    ],
  };

  return updatedLib;
};

export const addDay = (currentLib: PhotoLibraryMetadata, date: Date): PhotoLibraryMetadata => {
  const newYear = currentLib.yearsWithMonths.find((y) => y.year === date.getFullYear()) || {
    year: date.getFullYear(),
    months: [],
  };
  const newMonth = newYear?.months?.find((m) => m.month === date.getMonth() + 1) || {
    month: date.getMonth() + 1,
    days: [],
    photosThisMonth: 1,
  };
  const newDay = newMonth?.days.find((d) => d.day === date.getDate()) || {
    day: date.getDate(),
    photosThisDay: 1,
  };

  const updatedLib: PhotoLibraryMetadata = {
    ...currentLib,
    yearsWithMonths: [
      ...currentLib.yearsWithMonths.filter((y) => y.year !== date.getFullYear()),
      {
        ...newYear,
        months: [
          ...newYear.months.filter((m) => m.month !== date.getMonth() + 1),
          {
            ...newMonth,
            days: [
              ...newMonth.days.filter((d) => d.day !== date.getDate()),
              {
                ...newDay,
              },
            ],
          },
        ],
      },
    ],
  };

  return updatedLib;
};
