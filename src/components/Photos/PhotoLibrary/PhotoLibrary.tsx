import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { t } from '../../../helpers/i18n/dictionary';
import { PhotoConfig, PhotoMetaDay } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import PhotoScroll from '../PhotoScroll/PhotoScroll';
import { PhotoDay } from '../PhotoSection/PhotoSection';
import usePhotoLibrary from '../../../hooks/photoLibrary/usePhotoLibrary';
import { createDateObject } from '../../../provider/photos/PhotoProvider';
import { useSiblingsRange } from '../../../hooks/photoLibrary/usePhotoLibrarySiblings';
import { usePhotosByMonth } from '../../../hooks/photoLibrary/usePhotos';
import { useIntersection } from '../../../hooks/intersection/useIntersection';

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const PhotoLibrary = ({
  albumKey,
  toggleSelection,
  selectRange,
  isSelected,
  isSelecting,
  setFileSelectorOpen,
}: {
  albumKey?: string;
  toggleSelection: (fileId: string) => void;
  selectRange: (fileIds: string[]) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
  setFileSelectorOpen?: (isOpen: boolean) => void;
}) => {
  const [selectionRangeFrom, setSelectionRangeFrom] = useState<string | undefined>();
  const [selectionRangeTo, setSelectionRangeTo] = useState<string | undefined>();
  const { data: photoLibrary } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
  }).fetchLibrary;

  const { data: selection } = useSiblingsRange({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
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
    overscan: 1, // Amount of items to load before and after (improved performance especially with images)
  });

  const items = virtualizer.getVirtualItems();

  if (!monthsToShow || !photoLibrary) return null;

  if (!monthsToShow?.length) {
    return (
      <div className="flex flex-row">
        <p className="my-auto">{t('Mmh, this looks empty... Time to add some photos?')} </p>
        {setFileSelectorOpen && (
          <ActionButton
            onClick={(e) => {
              e.preventDefault();
              setFileSelectorOpen && setFileSelectorOpen(true);

              return false;
            }}
            type="secondary"
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
              transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {items.map((virtualRow) => {
              const isFinalRow = virtualRow.index > monthsToShow.length - 1;
              if (isFinalRow)
                return (
                  <div className="mt-5 italic opacity-50" key={'no-more'}>
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
                    albumKey={albumKey}
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
        albumKey={albumKey}
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
  albumKey,
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
  albumKey?: string;
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useIntersection(wrapperRef, () => setIsInView(true));
  const { year, month } = monthMeta;

  const monthInDateObj = createDateObject(year, month, 1);

  const {
    data: photosInfinte,
    isFetched: photosFetched,
    hasNextPage,
    fetchNextPage,
  } = usePhotosByMonth({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
    date: isInView ? monthInDateObj : undefined,
  }).fetchPhotos;

  const { mutate: updateCount } = usePhotoLibrary({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
    disabled: true,
  }).updateCount;

  const photos = photosInfinte?.pages?.flatMap((page) => page.results);

  useEffect(() => {
    if (!hasNextPage && photosFetched) {
      // All photos fetched
      if (photos?.length !== monthMeta.photosThisMonth) {
        console.warn('Photo count mismatch, updating count', monthInDateObj);
        updateCount({
          album: albumKey,
          date: monthInDateObj,
          newCount: photos?.length || 0,
        });
      }
    }
  }, [photos]);

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

  return (
    <div ref={wrapperRef}>
      {monthMeta.photosThisMonth >= 1 ? (
        <h1 className="text-2xl">
          {createDateObject(year, month).toLocaleDateString(undefined, monthFormat)}
        </h1>
      ) : null}

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
          style={{ height: '200px', width: `${Math.round(aspect * 200)}px` }}
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

export default PhotoLibrary;
