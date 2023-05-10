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
  ArchivalStatus,
} from '@youfoundation/js-lib';
import { PhotoLibraryMetadata, PhotoConfig } from './PhotoTypes';

const encryptPhotoLibrary = true;

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  albumTag?: string
): Promise<PhotoLibraryMetadata | null> => {
  const typedAlbum = albumTag === 'bin' || albumTag === 'archive';
  const archivalStatus: ArchivalStatus[] =
    albumTag === 'bin' ? [2] : albumTag === 'archive' ? [1] : albumTag ? [0, 1] : [0];

  const batch = await queryBatch(
    dotYouClient,
    {
      targetDrive: PhotoConfig.PhotoDrive,
      fileType: [PhotoConfig.PhotoLibraryMetadataFileType],
      tagsMatchAtLeastOne: albumTag && !typedAlbum ? [albumTag] : [PhotoConfig.MainTag],
      archivalStatus,
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
  const typedAlbum = albumTag === 'bin' || albumTag === 'archive';
  const archivalStatus: ArchivalStatus = albumTag === 'bin' ? 2 : albumTag === 'archive' ? 1 : 0;

  const existingPhotoLib = await getPhotoLibrary(dotYouClient, albumTag);
  if (existingPhotoLib && existingPhotoLib.fileId !== def.fileId)
    def.fileId = existingPhotoLib.fileId;

  if (existingPhotoLib && existingPhotoLib.versionTag !== def.versionTag)
    def.versionTag = existingPhotoLib.versionTag;

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
      tags: albumTag && !typedAlbum ? [albumTag] : [PhotoConfig.MainTag],
      fileType: PhotoConfig.PhotoLibraryMetadataFileType,
      contentIsComplete: true,
      jsonContent: payloadJson,
      archivalStatus,
    },
    payloadIsEncrypted: encryptPhotoLibrary,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  uploadFile(dotYouClient, instruct, metadata, undefined, undefined, encryptPhotoLibrary);
};

const sortRecents = (elements: string[]) => elements.sort((a, b) => parseInt(b) - parseInt(a));
export const buildMetaStructure = (headers: DriveSearchResult[]): PhotoLibraryMetadata => {
  // Filter duplicates (Shouldn't happen anymore):
  headers = headers.reduce((curVal, head) => {
    if (!curVal.find((h) => h.fileId === head.fileId)) return [...curVal, head];
    else return curVal;
  }, [] as DriveSearchResult[]);

  // Build easier to use structure
  const arrayStruc = headers.reduce((curVal, head) => {
    const currDate = new Date(head.fileMetadata.appData.userDate || head.fileMetadata.created);
    const year = currDate.getFullYear();
    const month = currDate.getMonth() + 1;
    const day = currDate.getDate();

    const returnObj = { ...curVal };
    returnObj[year] = {
      ...returnObj[year],
    };
    returnObj[year][month] = {
      ...returnObj[year][month],
    };

    returnObj[year][month][day] = returnObj[year][month][day] ? returnObj[year][month][day] + 1 : 1;

    return returnObj;
  }, {} as Record<string, Record<string, Record<string, number>>>);

  // Convert struc into complex meta object
  const years = sortRecents(Object.keys(arrayStruc));
  const yearsWithMonths = years.map((year) => {
    const months = Object.keys(arrayStruc[year]);
    return {
      year: parseInt(year),
      months: sortRecents(months).map((month) => {
        const days = Object.keys(arrayStruc[year][month]);

        return {
          month: parseInt(month),
          days: sortRecents(days).map((day) => ({
            day: parseInt(day),
            photosThisDay: arrayStruc[year][month][day],
          })),
          photosThisMonth: days.flatMap((day) => {
            return arrayStruc[year][month][day];
          }).length,
        };
      }),
    };
  });

  return { yearsWithMonths, totalNumberOfPhotos: headers.length };
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
  newDays.sort((dayA, dayB) => dayB.day - dayA.day);

  const newPhotosInMonth = newDays.reduce((currVal, day) => currVal + day.photosThisDay, 0);
  const newMonths = [
    ...newYear.months.filter((m) => m.month !== date.getMonth() + 1),
    {
      ...newMonth,
      photosThisMonth: newPhotosInMonth,
      days: newDays,
    },
  ];
  newMonths.sort((monthA, monthB) => monthB.month - monthA.month);

  const newYears = [
    ...currLib.yearsWithMonths.filter((y) => y.year !== date.getFullYear()),
    {
      ...newYear,
      months: newMonths,
    },
  ];
  newYears.sort((yearA, yearB) => yearB.year - yearA.year);

  const updatedLib: PhotoLibraryMetadata = {
    ...currLib,
    yearsWithMonths: newYears,
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

  const newDays = [
    ...newMonth.days.filter((d) => d.day !== date.getDate()),
    {
      ...newDay,
      photosThisDay: newDay.photosThisDay ? newDay.photosThisDay + 1 : 1,
    },
  ];
  newDays.sort((dayA, dayB) => dayB.day - dayA.day);

  const newMonths = [
    ...newYear.months.filter((m) => m.month !== date.getMonth() + 1),
    {
      ...newMonth,
      photosThisMonth: newMonth.photosThisMonth ? newMonth.photosThisMonth + 1 : 1,
      days: newDays,
    },
  ];
  newMonths.sort((monthA, monthB) => monthB.month - monthA.month);

  const newYears = [
    ...currentLib.yearsWithMonths.filter((y) => y.year !== date.getFullYear()),
    {
      ...newYear,
      months: newMonths,
    },
  ];
  newYears.sort((yearA, yearB) => yearB.year - yearA.year);

  const updatedLib: PhotoLibraryMetadata = {
    ...currentLib,
    yearsWithMonths: newYears,
  };

  return updatedLib;
};
