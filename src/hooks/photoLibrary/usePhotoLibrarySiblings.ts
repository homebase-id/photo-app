import { TargetDrive, getFileHeader, stringGuidsEqual } from '@youfoundation/js-lib';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePhotos, usePhotosReturn } from './usePhotos';
import usePhotoLibrary from './usePhotoLibrary';
import { createDateObject } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

const useFileHeader = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId: string;
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

  return useQuery(['photo-header', targetDrive?.alias, photoFileId], () =>
    fetchCurrent(targetDrive, photoFileId)
  );
};

const useCurrentPhoto = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId: string;
}) => {
  const { data: fileHeader } = useFileHeader({ targetDrive, photoFileId });
  const date = fileHeader
    ? new Date(fileHeader.fileMetadata.appData.userDate || fileHeader.fileMetadata.created)
    : undefined;
  const { data: photos } = usePhotos({ targetDrive, album, date }).fetchPhotos;

  return {
    dataForDay: photos,
    currentIndex: photos?.findIndex((dsr) => stringGuidsEqual(dsr.fileId, photoFileId)),
  };
};

const useFlatDaysFromMeta = ({
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

const usePhotoLibrarySiblings = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId: string;
}) => {
  const { currentIndex, dataForDay } = useCurrentPhoto({ targetDrive, album, photoFileId });
  const { data: flatDays } = useFlatDaysFromMeta({ targetDrive, album });

  const current = currentIndex !== undefined && dataForDay ? dataForDay[currentIndex] : undefined;
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

export default usePhotoLibrarySiblings;
