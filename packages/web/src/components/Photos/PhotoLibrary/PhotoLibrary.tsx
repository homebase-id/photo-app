import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { t } from '../../../helpers/i18n/dictionary';
import ActionButton from '../../ui/Buttons/ActionButton';
import PhotoScroll from '../PhotoScroll/PhotoScroll';
import { PhotoDay } from '../PhotoDay/PhotoDay';
import {
  useSiblingsRange,
  PhotoConfig,
  usePhotoLibrary,
  createDateObject,
  usePhotosByMonth,
  PhotoMetaDay,
  LibraryType,
  useManagePhotoLibrary,
} from 'photo-app-common';
const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const thisYearMonthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
};

export const PhotoLibrary = ({
  type,
  toggleSelection,
  selectRange,
  isSelected,
  isSelecting,
  setFileSelectorOpen,
}: {
  type: LibraryType;
  toggleSelection: (fileId: string) => void;
  selectRange: (fileIds: string[]) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
  setFileSelectorOpen?: (isOpen: boolean) => void;
}) => {
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
  }, [selection]);

  useEffect(() => {
    if (!isSelecting) {
      setSelectionRangeFrom(undefined);
      setSelectionRangeTo(undefined);
    }
  }, [isSelecting]);

  const { data: photoLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    type,
  }).fetchLibrary;

  console.info('PhotoLibrary render', photoLibrary);

  const monthsToShow = photoLibrary?.yearsWithMonths?.flatMap((year) =>
    year.months.map((month) => ({ year: year.year, ...month }))
  );

  /// Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: (monthsToShow?.length || 0) + 1, // Add 1 so we have an index for the 'no more photos row'
    estimateSize: () => 1000, // Rough size of a photoSection
    scrollMargin: parentOffsetRef.current,
    overscan: 2, // Overscan as small as possible as the months are expected to span more than one screen height
  });

  const items = virtualizer.getVirtualItems();

  if (!monthsToShow || !photoLibrary) return null;

  if (!monthsToShow?.length) {
    return (
      <div className="flex flex-row">
        <p className="my-auto italic text-gray-400">
          {t('Mmh, this looks empty... Time to add some photos?')}{' '}
        </p>
        {setFileSelectorOpen && (
          <ActionButton
            onClick={(e) => {
              e.preventDefault();
              setFileSelectorOpen && setFileSelectorOpen(true);

              return false;
            }}
            type="primary"
            className="ml-2"
          >
            {t('Add')}
          </ActionButton>
        )}
      </div>
    );
  }

  return (
    <>
      <div ref={parentRef}>
        <div
          className="relative w-full select-none"
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          <div
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {items.map((virtualRow) => {
              const isFinalRow = virtualRow.index > monthsToShow.length - 1;
              if (isFinalRow)
                return (
                  <div
                    className="pt-5 italic opacity-50"
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                  >
                    {t('No more photos')}
                  </div>
                );

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <PhotoMonth
                    monthMeta={monthsToShow[virtualRow.index]}
                    type={type}
                    toggleSelection={doToggleSelection}
                    rangeSelection={doRangeSelection}
                    isSelected={isSelected}
                    isSelecting={isSelecting}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PhotoScroll
        type={type}
        onJumpInTime={(time) => {
          const target = monthsToShow.findIndex((month) => {
            return month.year === time.year && month.month === time.month;
          });
          virtualizer.scrollToIndex(target, { align: 'start' });
        }}
        onScroll={(scrollPercentage) => {
          virtualizer.scrollToOffset(scrollPercentage * virtualizer.getTotalSize());
        }}
      />
    </>
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { year, month } = monthMeta;

  const monthInDateObj = createDateObject(year, month, 1);
  const {
    data: photosInfinte,
    isFetched: photosFetched,
    hasNextPage,
    fetchNextPage,
  } = usePhotosByMonth({
    targetDrive: PhotoConfig.PhotoDrive,
    type,
    date: monthInDateObj,
  }).fetchPhotos;

  const { mutate: updateCount } = useManagePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
  }).updateCount;

  const photos = useMemo(
    () => photosInfinte?.pages?.flatMap((page) => page.results),
    [photosInfinte, photosInfinte?.pages]
  );

  console.info('PhotoMonth render', { year, month, photos, photosInfinte });

  useEffect(() => {
    if (!hasNextPage && photosFetched) {
      // All photos fetched
      if (photos?.length !== monthMeta.photosThisMonth) {
        updateCount({
          type,
          date: monthInDateObj,
          newCount: photos?.length || 0,
        });
      }
    }
  }, [photos, monthMeta]);

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
        } else {
          days[dayIndex].photosThisDay++;
        }

        return days;
      }, [] as PhotoMetaDay[]) || [],
    [photos]
  );

  const title = useMemo(() => {
    return year === new Date().getFullYear()
      ? createDateObject(year, month).toLocaleDateString(undefined, thisYearMonthFormat)
      : createDateObject(year, month).toLocaleDateString(undefined, monthFormat);
  }, [monthMeta]);

  return (
    <div ref={wrapperRef}>
      {monthMeta.photosThisMonth >= 1 ? <h1 className="text-2xl">{title}</h1> : null}

      {photosFetched ? (
        days.map((day, index) => {
          const lastDay = index === days.length - 1;
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
              targetDrive={PhotoConfig.PhotoDrive}
              key={`${year}-${month}-${day.day}`}
              toggleSelection={toggleSelection}
              rangeSelection={rangeSelection}
              isSelected={isSelected}
              isSelecting={isSelecting}
              setIsInView={lastDay && hasNextPage ? () => fetchNextPage() : undefined}
            />
          );
        })
      ) : (
        <PhotoMonthLoading photosCount={monthMeta.photosThisMonth} />
      )}
    </div>
  );
};

const gridClasses = `grid grid-cols-4 gap-[0.1rem] md:gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
const divClasses = `relative aspect-square lg:aspect-auto lg:h-[200px] lg:flex-grow overflow-hidden`;
const imgWrapperClasses = `h-full w-full object-cover lg:h-[200px] lg:min-w-full lg:max-w-xs lg:align-bottom`;

const PhotoMonthLoading = ({ photosCount }: { photosCount: number }) => {
  const photoLoaders = useMemo(() => {
    const aspect = 1;

    return new Array(photosCount).fill(0).map((_, index) => (
      <div className={`${divClasses} relative`} key={index}>
        <div
          className={`${imgWrapperClasses} bg-white dark:bg-slate-700`}
          style={{
            height: '200px',
            width: `${Math.round(aspect * 200)}px`,
          }}
        ></div>
      </div>
    ));
  }, [photosCount]);

  return (
    <div className={gridClasses}>
      {photoLoaders}
      {/* This div fills up the space of the last row */}
      <div className="hidden flex-grow-[999] lg:block"></div>
    </div>
  );
};
