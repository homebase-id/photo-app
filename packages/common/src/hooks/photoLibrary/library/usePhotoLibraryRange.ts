import { HomebaseFile, TargetDrive } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useQuery } from '@tanstack/react-query';
import { fetchPhotosByMonth, usePhotosByMonth } from '../photos/usePhotos';
import { usePhotoLibrary } from './usePhotoLibrary';
import { createDateObject } from '../../../provider/photos/PhotoProvider';
import { useFileHeader } from '../photo/usePhotoHeader';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';
import { LibraryType } from '../../../provider';

const useCurrentPhoto = ({
  targetDrive,
  type,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  type: LibraryType;
  photoFileId?: string;
}) => {
  const { data: fileHeader } = useFileHeader({ targetDrive, photoFileId });

  const date = fileHeader
    ? new Date(fileHeader.fileMetadata.appData.userDate || fileHeader.fileMetadata.created)
    : undefined;
  const { data: photos } = usePhotosByMonth({
    targetDrive,
    type,
    date,
  }).fetchPhotos;

  if (!photoFileId)
    return {
      dataForMonth: undefined,
      currentDate: undefined,
      currentIndex: undefined,
      current: undefined,
    };

  const flatData = photos?.pages?.flatMap((page) => page.results);

  return {
    dataForMonth: flatData,
    currentDate: date,
    currentIndex: flatData?.findIndex((dsr) => stringGuidsEqual(dsr.fileId, photoFileId)),
    current: fileHeader,
  };
};

export const useFlatMonthsFromMeta = ({
  targetDrive,
  type,
}: {
  targetDrive: TargetDrive;
  type: LibraryType;
}) => {
  const { data: photoLibrary } = usePhotoLibrary({
    targetDrive,
    type,
  }).fetchLibrary;

  const fetch = () => {
    return photoLibrary?.yearsWithMonths?.flatMap((year) =>
      year.months.flatMap((month) => ({ ...month, year: year.year }))
    );
  };

  return useQuery({
    queryKey: ['flat-months', targetDrive?.alias, type],
    queryFn: fetch,
    enabled: !!photoLibrary,
  });
};

export const useSiblingsRange = ({
  targetDrive,
  type,
  fromFileId,
  toFileId,
}: {
  targetDrive: TargetDrive;
  type: LibraryType;
  fromFileId?: string;
  toFileId?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const { data: flatMonths } = useFlatMonthsFromMeta({
    targetDrive,
    type,
  });

  const fromCurrentData = useCurrentPhoto({
    targetDrive,
    type,
    photoFileId: fromFileId,
  });
  const toCurrentData = useCurrentPhoto({
    targetDrive,
    type,
    photoFileId: toFileId,
  });

  const getRange = async () => {
    if (
      !flatMonths ||
      !fromCurrentData ||
      fromCurrentData.currentIndex === undefined ||
      !fromCurrentData.dataForMonth?.length ||
      !toCurrentData ||
      toCurrentData.currentIndex === undefined ||
      !toCurrentData.dataForMonth?.length
    )
      return [];

    // If within same month, just return in between, EASY
    if (
      fromCurrentData.currentDate?.getFullYear() === toCurrentData.currentDate?.getFullYear() &&
      fromCurrentData.currentDate?.getMonth() === toCurrentData.currentDate?.getMonth()
    ) {
      const fromIndex = fromCurrentData.currentIndex;
      const toIndex = toCurrentData.currentIndex;
      const dataForMonth = fromCurrentData.dataForMonth;
      if (dataForMonth) {
        return dataForMonth.slice(fromIndex, toIndex + 1);
      }
    }

    // If not, get the data with the index of those photos in the months...
    const returnRange: HomebaseFile[] = [];
    returnRange.push(...fromCurrentData.dataForMonth.slice(fromCurrentData.currentIndex));
    returnRange.push(...toCurrentData.dataForMonth.slice(0, toCurrentData.currentIndex + 1));

    // ... and find months in between the two
    const fromMonth = flatMonths.findIndex(
      (flatDay) =>
        flatDay.year === fromCurrentData.currentDate?.getFullYear() &&
        flatDay.month === fromCurrentData.currentDate?.getMonth() + 1
    );

    const toMonth = flatMonths.findIndex(
      (flatDay) =>
        flatDay.year === toCurrentData.currentDate?.getFullYear() &&
        flatDay.month === toCurrentData.currentDate?.getMonth() + 1
    );

    const montshInBetween = flatMonths.slice(fromMonth + 1, toMonth);
    const dataFromInBetween = await Promise.all(
      montshInBetween.map(
        async (day) =>
          await fetchPhotosByMonth({
            dotYouClient,
            targetDrive,
            type,
            date: createDateObject(day.year, day.month, 1),
          })
      )
    );
    returnRange.push(...dataFromInBetween.flatMap((data) => data.results));

    return returnRange;
  };

  return useQuery({
    queryKey: ['siblings-range', targetDrive?.alias, type, fromFileId, toFileId],
    queryFn: getRange,
    enabled:
      !!flatMonths &&
      fromCurrentData?.currentIndex !== undefined &&
      toCurrentData?.currentIndex !== undefined,
    select: (data) => data.map((dsr) => dsr.fileId),
  });
};
