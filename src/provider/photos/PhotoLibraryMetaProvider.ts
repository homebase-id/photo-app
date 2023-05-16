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
import { PhotoLibraryMetadata, PhotoConfig, PhotoMetaYear } from './PhotoTypes';

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
): Promise<PhotoLibraryMetadata | null> => {
  const payload = await getPayload<PhotoLibraryMetadata>(
    dotYouClient,
    PhotoConfig.PhotoDrive,
    dsr,
    true
  );
  if (!payload) return null;

  return {
    ...payload,
    fileId: dsr.fileId,
    versionTag: dsr.fileMetadata.versionTag,
    lastUpdated: dsr.fileMetadata.updated,
  };
};

export const savePhotoLibraryMetadata = async (
  dotYouClient: DotYouClient,
  def: PhotoLibraryMetadata,
  albumTag?: string,
  onVersionConflict?: () => void
) => {
  const typedAlbum = albumTag === 'bin' || albumTag === 'archive';
  const archivalStatus: ArchivalStatus = albumTag === 'bin' ? 2 : albumTag === 'archive' ? 1 : 0;

  const existingPhotoLib = await getPhotoLibrary(dotYouClient, albumTag);
  if (existingPhotoLib && existingPhotoLib.fileId !== def.fileId)
    def.fileId = existingPhotoLib.fileId;

  if (existingPhotoLib && !def.versionTag) def.versionTag = existingPhotoLib.versionTag;

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

  return await uploadFile(
    dotYouClient,
    instruct,
    metadata,
    undefined,
    undefined,
    encryptPhotoLibrary,
    onVersionConflict
  );
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
    lastUpdated: new Date().getTime(),
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
    lastUpdated: new Date().getTime(),
  };

  return updatedLib;
};

export const mergeLibrary = (libA: PhotoLibraryMetadata, libB: PhotoLibraryMetadata) => {
  const libALastUpdated = libA.lastUpdated || 0;
  const libBLastUpdated = libB.lastUpdated || 0;

  const mergedYears = [...libA.yearsWithMonths, ...libB.yearsWithMonths].reduce((curVal, year) => {
    const yearIndex = curVal.findIndex((y) => y.year === year.year);
    if (yearIndex === -1) return [...curVal, year].sort((yearA, yearB) => yearB.year - yearA.year);

    const yearToMerge = curVal[yearIndex];
    const yearToMergeIsNewer =
      (yearIndex < libA.yearsWithMonths.length && libALastUpdated > libBLastUpdated) ||
      (yearIndex >= libA.yearsWithMonths.length && libBLastUpdated > libALastUpdated);

    const mergedMonths = [...yearToMerge.months, ...year.months].reduce((curVal, month) => {
      const monthIndex = curVal.findIndex((m) => m.month === month.month);
      if (monthIndex === -1)
        return [...curVal, month].sort((monthA, monthB) => monthB.month - monthA.month);

      const monthToMerge = curVal[monthIndex];
      const monthToMergeIsNewer = monthIndex < yearToMerge.months.length && yearToMergeIsNewer;
      const mergedDays = [...monthToMerge.days, ...month.days].reduce((curVal, day) => {
        const dayIndex = curVal.findIndex((d) => d.day === day.day);
        if (dayIndex === -1) return [...curVal, day].sort((dayA, dayB) => dayB.day - dayA.day);

        const dayToMerge = curVal[dayIndex];
        const dayToMergeIsNewer = dayIndex < monthToMerge.days.length && monthToMergeIsNewer;
        return [
          ...curVal.slice(0, dayIndex),
          {
            ...dayToMerge,
            photosThisDay: dayToMergeIsNewer ? dayToMerge.photosThisDay : day.photosThisDay,
          },
          ...curVal.slice(dayIndex + 1),
        ].sort((dayA, dayB) => dayB.day - dayA.day);
      }, monthToMerge.days);

      return [
        ...curVal.slice(0, monthIndex),
        {
          ...monthToMerge,
          days: mergedDays,
          photosThisMonth: monthToMergeIsNewer
            ? monthToMerge.photosThisMonth
            : month.photosThisMonth,
        },
        ...curVal.slice(monthIndex + 1),
      ].sort((monthA, monthB) => monthB.month - monthA.month);
    }, yearToMerge.months);

    return [
      ...curVal.slice(0, yearIndex),
      {
        ...yearToMerge,
        months: mergedMonths,
      },
      ...curVal.slice(yearIndex + 1),
    ].sort((yearA, yearB) => yearB.year - yearA.year);
  }, [] as PhotoMetaYear[]);

  const libC: PhotoLibraryMetadata = {
    yearsWithMonths: mergedYears,
    totalNumberOfPhotos: Math.max(libA.totalNumberOfPhotos, libB.totalNumberOfPhotos),
  };

  return libC;
};
