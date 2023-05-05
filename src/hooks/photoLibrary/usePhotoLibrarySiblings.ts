import {
  DriveSearchResult,
  TargetDrive,
  getFileHeader,
  stringGuidsEqual,
} from '@youfoundation/js-lib';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPhotos, usePhotos, usePhotosReturn } from './usePhotos';
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
      const dataForDay = queryClient.getQueryData<usePhotosReturn>(key.queryKey);
      if (!dataForDay) continue;

      const dsr = dataForDay?.find((dsr) => stringGuidsEqual(dsr.fileId, photoFileId));
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
  const { data: photos } = usePhotos({ targetDrive, album, date }).fetchPhotos;

  if (!photoFileId)
    return {
      dataForDay: undefined,
      currentDate: undefined,
      currentIndex: undefined,
      current: undefined,
    };

  return {
    dataForDay: photos,
    currentDate: date,
    currentIndex: photos?.findIndex((dsr) => stringGuidsEqual(dsr.fileId, photoFileId)),
    current: fileHeader,
  };
};

export const useFlatDaysFromMeta = ({
  targetDrive,
  album,
}: {
  targetDrive: TargetDrive;
  album?: string;
}) => {
  const { data: photoLibrary } = usePhotoLibrary({ targetDrive, album }).fetchLibrary;

  const fetch = () => {
    const flatMonths = photoLibrary?.yearsWithMonths?.flatMap((year) =>
      year.months.flatMap((month) => ({ ...month, year: year.year }))
    );
    return flatMonths?.flatMap((month) =>
      month.days
        .sort((a, b) => b.day - a.day)
        .flatMap((day) => ({ day: day.day, year: month.year, month: month.month }))
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
  const { currentIndex, dataForDay, current } = useCurrentPhoto({
    targetDrive,
    album,
    photoFileId,
  });
  const { data: flatDays } = useFlatDaysFromMeta({ targetDrive, album });

  const prevInSameDay = dataForDay && currentIndex !== undefined && dataForDay[currentIndex - 1];
  const nextInSameDay = dataForDay && currentIndex !== undefined && dataForDay[currentIndex + 1];

  const currentDate = current
    ? new Date(current.fileMetadata.appData.userDate || current.fileMetadata.created)
    : undefined;
  const currentYear = currentDate?.getFullYear();
  const currentMonth = currentDate ? currentDate.getMonth() + 1 : undefined;
  const currentDay = currentDate?.getDate();

  const flatIndex = flatDays?.findIndex(
    (flat) => flat.year === currentYear && flat.month === currentMonth && flat.day === currentDay
  );
  const prevDay = flatDays && flatIndex !== undefined ? flatDays[flatIndex - 1] : undefined;
  const nextDay = flatDays && flatIndex !== undefined ? flatDays[flatIndex + 1] : undefined;

  const { data: prevData } = usePhotos({
    targetDrive,
    album,
    date: prevDay ? createDateObject(prevDay.year, prevDay.month, prevDay.day) : undefined,
  }).fetchPhotos;
  const { data: nextData } = usePhotos({
    targetDrive,
    album,
    date: nextDay ? createDateObject(nextDay.year, nextDay.month, nextDay.day) : undefined,
  }).fetchPhotos;

  const prevSibling = prevInSameDay || prevData?.[prevData.length - 1];
  const nextSibling = nextInSameDay || nextData?.[0];

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
  const { data: flatDays } = useFlatDaysFromMeta({
    targetDrive,
    album,
  });

  const fromCurrentData = useCurrentPhoto({ targetDrive, album, photoFileId: fromFileId });
  const toCurrentData = useCurrentPhoto({ targetDrive, album, photoFileId: toFileId });

  const getRange = async () => {
    if (
      !flatDays ||
      !fromCurrentData ||
      fromCurrentData.currentIndex === undefined ||
      !fromCurrentData.dataForDay?.length ||
      !toCurrentData ||
      toCurrentData.currentIndex === undefined ||
      !toCurrentData.dataForDay?.length
    )
      return [];

    // If within same day, just return in between, EASY
    if (
      fromCurrentData.currentDate?.getFullYear() === toCurrentData.currentDate?.getFullYear() &&
      fromCurrentData.currentDate?.getMonth() === toCurrentData.currentDate?.getMonth() &&
      fromCurrentData.currentDate?.getDate() === toCurrentData.currentDate?.getDate()
    ) {
      const fromIndex = fromCurrentData.currentIndex;
      const toIndex = toCurrentData.currentIndex;
      const dataForDay = fromCurrentData.dataForDay;
      if (dataForDay) {
        return dataForDay.slice(fromIndex, toIndex + 1);
      }
    }

    // If not, get the data with the index of those photos in the days...
    const returnRange: DriveSearchResult[] = [];
    returnRange.push(...fromCurrentData.dataForDay.slice(fromCurrentData.currentIndex));
    returnRange.push(...toCurrentData.dataForDay.slice(0, toCurrentData.currentIndex + 1));

    // ... and find days in between the two
    const fromDay = flatDays.findIndex(
      (flatDay) =>
        flatDay.year === fromCurrentData.currentDate?.getFullYear() &&
        flatDay.month === fromCurrentData.currentDate?.getMonth() + 1 &&
        flatDay.day === fromCurrentData.currentDate?.getDate()
    );

    const toDay = flatDays.findIndex(
      (flatDay) =>
        flatDay.year === toCurrentData.currentDate?.getFullYear() &&
        flatDay.month === toCurrentData.currentDate?.getMonth() + 1 &&
        flatDay.day === toCurrentData.currentDate?.getDate()
    );

    const daysInBetween = flatDays.slice(fromDay + 1, toDay);
    const dataFromInBetween = await Promise.all(
      daysInBetween.map(
        async (day) =>
          await fetchPhotos({
            dotYouClient,
            targetDrive,
            album,
            date: createDateObject(day.year, day.month, day.day),
          })
      )
    );
    returnRange.push(...dataFromInBetween.flat());

    return returnRange;
  };

  return useQuery(
    ['siblings-range', targetDrive?.alias, album, fromFileId, toFileId],
    () => getRange(),
    {
      enabled:
        !!flatDays &&
        fromCurrentData?.currentIndex !== undefined &&
        toCurrentData?.currentIndex !== undefined,
      select: (data) => data.map((dsr) => dsr.fileId),
    }
  );
};
