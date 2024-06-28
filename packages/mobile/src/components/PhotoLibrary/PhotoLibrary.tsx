import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
  useManagePhotoLibrary,
} from 'photo-app-common';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorNotification } from '../ui/Alert/ErrorNotification';
import React from 'react';

const targetDrive = PhotoConfig.PhotoDrive;

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const thisYearMonthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
};

const PhotoLibrary = memo(
  (props: {
    type: LibraryType;
    toggleSelection: (fileId: string) => void;
    selectRange: (fileIds: string[]) => void;
    isSelected: (fileId: string) => boolean;
    isSelecting?: boolean;
  }) => {
    const { type, toggleSelection, selectRange, isSelected, isSelecting } = props;

    const queryClient = useQueryClient();
    const [selectionRangeFrom, setSelectionRangeFrom] = useState<string | undefined>();
    const [selectionRangeTo, setSelectionRangeTo] = useState<string | undefined>();

    const { data: selection } = useSiblingsRange({
      targetDrive: PhotoConfig.PhotoDrive,
      type,
      fromFileId: selectionRangeFrom,
      toFileId: selectionRangeTo,
    });

    const doToggleSelection = useCallback(
      (fileId: string) => {
        if (!isSelected(fileId)) setSelectionRangeFrom(fileId);

        toggleSelection(fileId);
      },
      [isSelected, toggleSelection]
    );

    const doRangeSelection = useCallback(
      (fileId: string) => {
        toggleSelection(fileId);
        if (selectionRangeFrom) setSelectionRangeTo(fileId);
      },
      [selectionRangeFrom, toggleSelection]
    );

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
    const doRefresh = useCallback(async () => {
      setRefreshing(true);
      queryClient.invalidateQueries();
      // Refetch library;
      await refetchLibrary();
      // (trigger) Refetch photos
      await invalidatePhotos(type);
      setRefreshing(false);
    }, [invalidatePhotos, queryClient, refetchLibrary, type]);

    const monthsToShow = useMemo(
      () =>
        photoLibrary?.yearsWithMonths?.flatMap((year) =>
          year.months.map((month) => ({ year: year.year, ...month }))
        ),
      [photoLibrary]
    );

    const renderItem = useCallback(
      ({
        item: month,
        index,
      }: {
        item: {
          month: number;
          photosThisMonth: number;
          year: number;
        };
        index: number;
      }) => (
        <PhotoMonth
          key={`${index}_${month.photosThisMonth}`}
          monthMeta={month}
          type={type}
          toggleSelection={doToggleSelection}
          rangeSelection={doRangeSelection}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
      ),
      [doRangeSelection, doToggleSelection, isSelected, isSelecting, type]
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
        renderItem={renderItem}
      />
    );
  }
);

export const PhotoMonth = memo(
  (props: {
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
    const { monthMeta, type, toggleSelection, isSelected, isSelecting } = props;
    const { year, month } = monthMeta;

    const monthInDateObj = useMemo(() => createDateObject(year, month, 1), [year, month]);
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

    const photos = useMemo(
      () => photosInfinte?.pages?.flatMap((page) => page.results),
      [photosInfinte]
    );

    const { mutate: updateCount, error: updateCountError } = useManagePhotoLibrary({
      targetDrive: targetDrive,
    }).updateCount;

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
        <ErrorNotification error={updateCountError} />
        {monthMeta.photosThisMonth >= 1 ? (
          <Container>
            <Text>{title}</Text>
          </Container>
        ) : null}

        {photosFetched
          ? days.map((day) => {
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
                  isSelected={isSelected}
                  isSelecting={isSelecting}
                />
              );
            })
          : null}
      </View>
    );
  }
);

export default PhotoLibrary;
