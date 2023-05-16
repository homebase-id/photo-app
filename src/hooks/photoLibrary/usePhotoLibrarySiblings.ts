import {
  DriveSearchResult,
  TargetDrive,
  getFileHeader,
  stringGuidsEqual,
} from '@youfoundation/js-lib';
import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPhotosByMonth, useInfintePhotosReturn, usePhotosByMonth } from './usePhotos';
import usePhotoLibrary from './usePhotoLibrary';
import { createDateObject } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

const useFileHeader = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId?: string;
}) => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchCurrent = async (targetDrive: TargetDrive, photoFileId: string) => {
    const previousKeys = queryClient
      .getQueryCache()
      .findAll(['photos', targetDrive?.alias], { exact: false })
      .filter((query) => query.state.status === 'success');

    for (let i = 0; i < previousKeys.length; i++) {
      const key = previousKeys[i];
      const dataForDay = queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(
        key.queryKey
      );
      if (!dataForDay) continue;

      const dsr = dataForDay?.pages
        ?.flatMap((page) => page.results)
        .find((dsr) => stringGuidsEqual(dsr.fileId, photoFileId));
      if (dsr) return dsr;
    }

    return await getFileHeader(dotYouClient, targetDrive, photoFileId);
  };

  return useQuery(
    ['photo-header', targetDrive?.alias, photoFileId],
    () => fetchCurrent(targetDrive, photoFileId as string),
    { enabled: !!photoFileId }
  );
};

const useCurrentPhoto = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId?: string;
}) => {
  const { data: fileHeader } = useFileHeader({ targetDrive, photoFileId });

  const date = fileHeader
    ? new Date(fileHeader.fileMetadata.appData.userDate || fileHeader.fileMetadata.created)
    : undefined;
  const { data: photos } = usePhotosByMonth({ targetDrive, album, date }).fetchPhotos;

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
  album,
}: {
  targetDrive: TargetDrive;
  album?: string;
}) => {
  const { data: photoLibrary } = usePhotoLibrary({ targetDrive, album }).fetchLibrary;

  const fetch = () => {
    return photoLibrary?.yearsWithMonths?.flatMap((year) =>
      year.months.flatMap((month) => ({ ...month, year: year.year }))
    );
  };

  return useQuery(['flat-photos', targetDrive?.alias, album], fetch, { enabled: !!photoLibrary });
};

export const usePhotoLibrarySiblings = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId: string;
}) => {
  const { currentIndex, dataForMonth, current } = useCurrentPhoto({
    targetDrive,
    album,
    photoFileId,
  });
  const { data: flatMonths } = useFlatMonthsFromMeta({ targetDrive, album });

  const prevInSameMonth =
    dataForMonth && currentIndex !== undefined && dataForMonth[currentIndex - 1];
  const nextInSameMonth =
    dataForMonth && currentIndex !== undefined && dataForMonth[currentIndex + 1];

  const currentDate = current
    ? new Date(current.fileMetadata.appData.userDate || current.fileMetadata.created)
    : undefined;
  const currentYear = currentDate?.getFullYear();
  const currentMonth = currentDate ? currentDate.getMonth() + 1 : undefined;

  const flatIndex = flatMonths?.findIndex(
    (flat) => flat.year === currentYear && flat.month === currentMonth
  );
  const prevMonth = flatMonths && flatIndex !== undefined ? flatMonths[flatIndex - 1] : undefined;
  const nextMonth = flatMonths && flatIndex !== undefined ? flatMonths[flatIndex + 1] : undefined;

  const { data: prevData } = usePhotosByMonth({
    targetDrive,
    album,
    date: prevMonth ? createDateObject(prevMonth.year, prevMonth.month, 1) : undefined,
  }).fetchPhotos;
  const { data: nextData } = usePhotosByMonth({
    targetDrive,
    album,
    date: nextMonth ? createDateObject(nextMonth.year, nextMonth.month, 1) : undefined,
  }).fetchPhotos;

  const prevSibling =
    prevInSameMonth ||
    prevData?.pages[prevData?.pages.length - 1].results[
      prevData?.pages[prevData?.pages.length - 1].results.length - 1
    ];
  const nextSibling = nextInSameMonth || nextData?.pages[0].results[0];

  return {
    current,
    nextSibling,
    prevSibling,
  };
};

export const useSiblingsRange = ({
  targetDrive,
  album,
  fromFileId,
  toFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  fromFileId?: string;
  toFileId?: string;
}) => {
  const dotYouClient = useAuth().getDotYouClient();
  const { data: flatMonths } = useFlatMonthsFromMeta({
    targetDrive,
    album,
  });

  const fromCurrentData = useCurrentPhoto({ targetDrive, album, photoFileId: fromFileId });
  const toCurrentData = useCurrentPhoto({ targetDrive, album, photoFileId: toFileId });

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
    const returnRange: DriveSearchResult[] = [];
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
            album,
            date: createDateObject(day.year, day.month, 1),
          })
      )
    );
    returnRange.push(...dataFromInBetween.flatMap((data) => data.results));

    return returnRange;
  };

  return useQuery(['siblings-range', targetDrive?.alias, album, fromFileId, toFileId], getRange, {
    enabled:
      !!flatMonths &&
      fromCurrentData?.currentIndex !== undefined &&
      toCurrentData?.currentIndex !== undefined,
    select: (data) => data.map((dsr) => dsr.fileId),
  });
};
