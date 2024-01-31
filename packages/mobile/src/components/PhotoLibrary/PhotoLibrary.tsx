import { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { PhotoDay } from '../Photos/PhotoDay/PhotoDay';
import { Container } from '../ui/Container/Container';
import { useDarkMode } from '../../hooks/useDarkMode';
import {
  useSiblingsRange,
  usePhotoLibrary,
  usePhotosByMonth,
  PhotoConfig,
  createDateObject,
  PhotoMetaDay,
  LibraryType,
} from 'photo-app-common';
import { useQueryClient } from '@tanstack/react-query';

const targetDrive = PhotoConfig.PhotoDrive;

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const thisYearMonthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
};

const PhotoLibrary = ({
  type,
  toggleSelection,
  selectRange,
  isSelected,
  isSelecting,
}: {
  type: LibraryType;
  toggleSelection: (fileId: string) => void;
  selectRange: (fileIds: string[]) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const queryClient = useQueryClient();
  const [selectionRangeFrom, setSelectionRangeFrom] = useState<string | undefined>();
  const [selectionRangeTo, setSelectionRangeTo] = useState<string | undefined>();

  const { data: selection } = useSiblingsRange({
    targetDrive: PhotoConfig.PhotoDrive,
    type,
    fromFileId: selectionRangeFrom,
    toFileId: selectionRangeTo,
  });

  const doToggleSelection = (fileId: string) => {
    if (!isSelected(fileId)) setSelectionRangeFrom(fileId);

    toggleSelection(fileId);
  };

  const doRangeSelection = (fileId: string) => {
    toggleSelection(fileId);
    if (selectionRangeFrom) setSelectionRangeTo(fileId);
  };

  useEffect(() => {
    if (selection && selectionRangeFrom && selectionRangeTo) {
      selectRange(selection);

      setSelectionRangeFrom(undefined);
      setSelectionRangeTo(undefined);
    }
  }, [selection, selectRange, selectionRangeFrom, selectionRangeTo]);

  const { data: photoLibrary, refetch: refetchLibrary } = usePhotoLibrary({
    targetDrive: targetDrive,
    type,
  }).fetchLibrary;
  const invalidatePhotos = usePhotosByMonth({
    type: 'photos',
  }).invalidateQueries;

  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => {
    setRefreshing(true);

    queryClient.invalidateQueries();

    // Refetch library;
    await refetchLibrary();
    // (trigger) Refetch photos
    await invalidatePhotos(type);

    setRefreshing(false);
  };

  const monthsToShow = photoLibrary?.yearsWithMonths?.flatMap((year) =>
    year.months.map((month) => ({ year: year.year, ...month }))
  );

  if (!monthsToShow?.length) {
    return (
      <Text style={{ padding: 5 }}>{'Mmh, this looks empty... Time to add some photos?'}</Text>
    );
  }

  // Fast scrolling performance with the FlatList
  return (
    <FlatList
      data={monthsToShow}
      keyExtractor={(item, index) => `${index}_${item.month}`}
      initialNumToRender={1}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
      renderItem={({ item: month, index }) => (
        <PhotoMonth
          key={`${index}_${month.photosThisMonth}`}
          monthMeta={month}
          type={type}
          toggleSelection={doToggleSelection}
          rangeSelection={doRangeSelection}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
      )}
    />
  );
};

export const PhotoMonth = ({
  monthMeta,
  type,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
}: {
  monthMeta: {
    month: number;
    photosThisMonth: number;
    year: number;
  };
  type: LibraryType;
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const { year, month } = monthMeta;

  const monthInDateObj = createDateObject(year, month, 1);
  const {
    data: photosInfinte,
    isFetched: photosFetched,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotosByMonth({
    targetDrive,
    type,
    date: monthInDateObj,
  }).fetchPhotos;

  const { mutate: updateCount } = usePhotoLibrary({
    targetDrive: targetDrive,
    type,
    disabled: true,
  }).updateCount;

  const photos = useMemo(
    () => photosInfinte?.pages?.flatMap((page) => page.results),
    [photosInfinte]
  );

  useEffect(() => {
    if (!hasNextPage && photosFetched) {
      if (photos?.length !== monthMeta.photosThisMonth) {
        // All photos fetched
        updateCount({
          type,
          date: monthInDateObj,
          newCount: photos?.length || 0,
        });
      }
    }
  }, [photos, type, hasNextPage, photosFetched, monthMeta, updateCount, monthInDateObj]);

  // Might be improved by using a SectionList on the higher level... But for now let's assume the data per month is rather "limited"
  // Also, it would mean we would have to abondon the component structure, with the usePhotosByMonth hook
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Build daily meta from photos for this month
  const days: PhotoMetaDay[] = useMemo(
    () =>
      photos?.reduce((days, photo) => {
        const dateNumber = new Date(
          photo.fileMetadata.appData.userDate || photo.fileMetadata.created
        ).getDate();

        const dayIndex = days.findIndex((metaDay) => metaDay.day === dateNumber);
        if (dayIndex === -1) {
          days.push({
            day: dateNumber,
            photosThisDay: 1,
          });
        } else days[dayIndex].photosThisDay++;

        return days;
      }, [] as PhotoMetaDay[]) || [],
    [photos]
  );

  const title = useMemo(() => {
    return year === new Date().getFullYear()
      ? createDateObject(year, month).toLocaleDateString(undefined, thisYearMonthFormat)
      : createDateObject(year, month).toLocaleDateString(undefined, monthFormat);
  }, [year, month]);

  return (
    <View>
      {monthMeta.photosThisMonth >= 1 ? (
        <Container>
          <Text>{title}</Text>
        </Container>
      ) : null}

      {photosFetched ? (
        days.map((day) => {
          const dayInDateObj = createDateObject(year, month, day.day);

          return (
            <PhotoDay
              date={dayInDateObj}
              photos={
                photos?.filter((photo) => {
                  const photoDate = new Date(
                    photo.fileMetadata.appData.userDate || photo.fileMetadata.created
                  );

                  return photoDate.getDate() === day.day;
                }) || []
              }
              targetDrive={targetDrive}
              type={type}
              key={`${year}-${month}-${day.day}`}
              toggleSelection={toggleSelection}
              rangeSelection={rangeSelection}
              isSelected={isSelected}
              isSelecting={isSelecting}
            />
          );
        })
      ) : (
        <PhotoMonthLoading photosCount={monthMeta.photosThisMonth} />
      )}
    </View>
  );
};

const PhotoMonthLoading = ({ photosCount }: { photosCount: number }) => {
  const { isDarkMode } = useDarkMode();

  const photoLoaders = useMemo(() => {
    const aspect = 1;
    const size = Math.round(Dimensions.get('window').width / 4);

    return new Array(photosCount).fill(0).map((_, index) => (
      <View
        key={index}
        style={{
          height: size,
          width: aspect * size,
          padding: 1,
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? 'rgb(51, 65, 85)' : 'white',

            height: '100%',
            width: '100%',
            margin: 1,
          }}
        />
      </View>
    ));
  }, [photosCount, isDarkMode]);

  return (
    <View
      style={{
        paddingTop: 8,
        margin: -1,
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {photoLoaders}
    </View>
  );
};

export default PhotoLibrary;
