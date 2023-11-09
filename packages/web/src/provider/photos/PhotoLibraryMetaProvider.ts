import {
  ArchivalStatus,
  DotYouClient,
  DriveSearchResult,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  getContentFromHeaderOrPayload,
  queryBatch,
  queryModified,
  uploadFile,
} from '@youfoundation/js-lib/core';
import { PhotoLibraryMetadata, PhotoConfig, PhotoMetaYear } from './PhotoTypes';
import {
  getRandom16ByteArray,
  jsonStringify64,
} from '@youfoundation/js-lib/helpers';

const encryptPhotoLibrary = true;

export const getPhotoLibrary = async (
  dotYouClient: DotYouClient,
  type?: 'bin' | 'archive' | 'apps' | 'favorites',
  lastCursor?: number,
): Promise<PhotoLibraryMetadata | null> => {
  const archivalStatus: ArchivalStatus[] =
    type === 'bin'
      ? [2]
      : type === 'archive'
      ? [1]
      : type === 'apps'
      ? [3]
      : type
      ? [0, 1, 3]
      : [0];

  const batch = lastCursor
    ? await queryModified(
        dotYouClient,
        {
          targetDrive: PhotoConfig.PhotoDrive,
          fileType: [PhotoConfig.PhotoLibraryMetadataFileType],
          tagsMatchAtLeastOne:
            type === 'favorites'
              ? [PhotoConfig.FavoriteTag]
              : [PhotoConfig.MainTag],
          archivalStatus,
        },
        {
          maxRecords: 2,
          includeHeaderContent: true,
          cursor: lastCursor,
        },
      )
    : await queryBatch(
        dotYouClient,
        {
          targetDrive: PhotoConfig.PhotoDrive,
          fileType: [PhotoConfig.PhotoLibraryMetadataFileType],
          tagsMatchAtLeastOne:
            type === 'favorites'
              ? [PhotoConfig.FavoriteTag]
              : [PhotoConfig.MainTag],
          archivalStatus,
        },
        {
          maxRecords: 2,
          includeMetadataHeader: true,
        },
      );

  if (batch.searchResults.length === 0) return null;
  if (batch.searchResults.length > 1)
    console.error(
      'broken state, more than one photo library metadata file found',
    );

  const meta = await dsrToPhotoLibraryMetadata(
    dotYouClient,
    batch.searchResults[0],
  );
  if (!meta) return null;
  return {
    ...meta,
    lastCursor: 'cursor' in batch ? batch.cursor : batch.queryTime,
  };
};

const dsrToPhotoLibraryMetadata = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
): Promise<PhotoLibraryMetadata | null> => {
  const payload = await getContentFromHeaderOrPayload<PhotoLibraryMetadata>(
    dotYouClient,
    PhotoConfig.PhotoDrive,
    dsr,
    true,
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
  type?: 'archive' | 'bin' | 'apps' | 'favorites',
  onVersionConflict?: () => void,
) => {
  const archivalStatus: ArchivalStatus =
    type === 'bin' ? 2 : type === 'archive' ? 1 : type === 'apps' ? 3 : 0;

  const existingPhotoLib = await getPhotoLibrary(dotYouClient, type);
  if (existingPhotoLib && existingPhotoLib.fileId !== def.fileId)
    def.fileId = existingPhotoLib.fileId;

  if (existingPhotoLib && !def.versionTag)
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
      tags:
        type === 'favorites'
          ? [PhotoConfig.FavoriteTag]
          : [PhotoConfig.MainTag],
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
    onVersionConflict,
  );
};

const sortRecents = (elements: string[]) =>
  elements.sort((a, b) => parseInt(b) - parseInt(a));
export const buildMetaStructure = (
  headers: DriveSearchResult[],
): PhotoLibraryMetadata => {
  // Filter duplicates (Shouldn't happen anymore):
  headers = headers.reduce((curVal, head) => {
    if (!curVal.find(h => h.fileId === head.fileId)) return [...curVal, head];
    else return curVal;
  }, [] as DriveSearchResult[]);

  // Build easier to use structure
  const arrayStruc = headers.reduce(
    (curVal, head) => {
      const currDate = new Date(
        head.fileMetadata.appData.userDate || head.fileMetadata.created,
      );
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

      returnObj[year][month][day] = returnObj[year][month][day]
        ? returnObj[year][month][day] + 1
        : 1;

      return returnObj;
    },
    {} as Record<string, Record<string, Record<string, number>>>,
  );

  // Convert struc into complex meta object
  const years = sortRecents(Object.keys(arrayStruc));
  const yearsWithMonths = years.map(year => {
    const months = Object.keys(arrayStruc[year]);
    return {
      year: parseInt(year),
      months: sortRecents(months).map(month => {
        const days = Object.keys(arrayStruc[year][month]);

        return {
          month: parseInt(month),
          photosThisMonth: days
            .flatMap(day => {
              return arrayStruc[year][month][day];
            })
            .reduce((partialSum, a) => partialSum + a, 0),
        };
      }),
    };
  });

  return { yearsWithMonths, totalNumberOfPhotos: headers.length };
};

export const updateCount = (
  currLib: PhotoLibraryMetadata,
  date: Date,
  newCount: number,
): PhotoLibraryMetadata | null => {
  const newYear = currLib.yearsWithMonths.find(
    y => y.year === date.getFullYear(),
  );
  const newMonth = newYear?.months.find(m => m.month === date.getMonth() + 1);

  if (!newYear || !newMonth) return null;

  const newMonths = [
    ...newYear.months.filter(m => m.month !== date.getMonth() + 1),
    {
      ...newMonth,
      photosThisMonth: newCount,
    },
  ];
  newMonths.sort((monthA, monthB) => monthB.month - monthA.month);

  const newYears = [
    ...currLib.yearsWithMonths.filter(y => y.year !== date.getFullYear()),
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

export const addDay = (
  currentLib: PhotoLibraryMetadata,
  date: Date,
): PhotoLibraryMetadata => {
  const newYear = currentLib.yearsWithMonths.find(
    y => y.year === date.getFullYear(),
  ) || {
    year: date.getFullYear(),
    months: [],
  };
  const newMonth = newYear?.months?.find(
    m => m.month === date.getMonth() + 1,
  ) || {
    month: date.getMonth() + 1,
    photosThisMonth: 0,
  };

  const newMonths = [
    ...newYear.months.filter(m => m.month !== date.getMonth() + 1),
    {
      ...newMonth,
      photosThisMonth:
        newMonth.photosThisMonth !== undefined
          ? newMonth.photosThisMonth + 1
          : 1,
    },
  ];
  newMonths.sort((monthA, monthB) => monthB.month - monthA.month);

  const newYears = [
    ...currentLib.yearsWithMonths.filter(y => y.year !== date.getFullYear()),
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

export const mergeLibrary = (
  libA: PhotoLibraryMetadata,
  libB: PhotoLibraryMetadata,
) => {
  const libALastUpdated = libA.lastUpdated || 0;
  const libBLastUpdated = libB.lastUpdated || 0;

  const mergedYears = [...libA.yearsWithMonths, ...libB.yearsWithMonths].reduce(
    (curVal, year) => {
      const yearIndex = curVal.findIndex(y => y.year === year.year);
      if (yearIndex === -1)
        return [...curVal, year].sort(
          (yearA, yearB) => yearB.year - yearA.year,
        );

      const yearToMerge = curVal[yearIndex];
      const yearToMergeIsNewer =
        (yearIndex < libA.yearsWithMonths.length &&
          libALastUpdated > libBLastUpdated) ||
        (yearIndex >= libA.yearsWithMonths.length &&
          libBLastUpdated > libALastUpdated);

      const mergedMonths = [...yearToMerge.months, ...year.months].reduce(
        (curVal, month) => {
          const monthIndex = curVal.findIndex(m => m.month === month.month);
          if (monthIndex === -1)
            return [...curVal, month].sort(
              (monthA, monthB) => monthB.month - monthA.month,
            );

          const monthToMerge = curVal[monthIndex];
          const monthToMergeIsNewer =
            monthIndex < yearToMerge.months.length && yearToMergeIsNewer;

          return [
            ...curVal.slice(0, monthIndex),
            {
              ...monthToMerge,
              photosThisMonth: monthToMergeIsNewer
                ? monthToMerge.photosThisMonth
                : month.photosThisMonth,
            },
            ...curVal.slice(monthIndex + 1),
          ].sort((monthA, monthB) => monthB.month - monthA.month);
        },
        yearToMerge.months,
      );

      return [
        ...curVal.slice(0, yearIndex),
        {
          ...yearToMerge,
          months: mergedMonths,
        },
        ...curVal.slice(yearIndex + 1),
      ].sort((yearA, yearB) => yearB.year - yearA.year);
    },
    [] as PhotoMetaYear[],
  );

  const libC: PhotoLibraryMetadata = {
    yearsWithMonths: mergedYears,
    totalNumberOfPhotos: Math.max(
      libA.totalNumberOfPhotos,
      libB.totalNumberOfPhotos,
    ),
    lastUpdated: Math.max(libA.lastUpdated || 0, libB.lastUpdated || 0),
    lastCursor: Math.max(libA.lastUpdated || 0, libB.lastUpdated || 0),
  };

  return libC;
};
