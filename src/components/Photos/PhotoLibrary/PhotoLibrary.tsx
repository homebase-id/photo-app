import { DriveSearchResult } from '@youfoundation/js-lib';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import usePhotoLibraryPart from '../../../hooks/photoLibrary/usePhotoLibraryPart';
import { t } from '../../../helpers/i18n/dictionary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import PhotoScroll from '../PhotoScroll/PhotoScroll';
import { PhotoSection } from '../PhotoSection/PhotoSection';

const monthFormat: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const createDateObject = (year: string, month: string, day?: string) => {
  const newDate = new Date();
  newDate.setFullYear(parseInt(year));
  newDate.setMonth(parseInt(month) - 1);

  if (day) newDate.setDate(parseInt(day));

  return newDate;
};

export const buildMetaStructure = (headers: DriveSearchResult[]) => {
  return headers.reduce((curVal, head) => {
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

    returnObj[year][month][day] = returnObj[year][month][day]
      ? [...returnObj[year][month][day], head]
      : [head];

    return returnObj;
  }, {} as Record<string, Record<string, Record<string, DriveSearchResult[]>>>);
};

export const sortRecents = (elements: string[]) => elements.sort((a, b) => b.localeCompare(a));

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
  const {
    data: photoLibraryPart,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotoLibraryPart({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey && albumKey !== 'new' ? albumKey : undefined,
  }).fetchLibraryPart;

  const photoLibrary = photoLibraryPart
    ? buildMetaStructure(photoLibraryPart.pages.flatMap((page) => page.results))
    : undefined;

  useEffect(() => {
    console.debug(
      'fetched more photos, total count: ',
      photoLibraryPart?.pages.flatMap((page) => page.results)?.length
    );
  }, [photoLibraryPart]);

  const years = photoLibrary ? sortRecents(Object.keys(photoLibrary)) : undefined;
  const monthsToShow = photoLibrary
    ? years?.flatMap((year) =>
        sortRecents(Object.keys(photoLibrary[year])).map((month) => {
          return { monthDate: { year, month }, days: photoLibrary[year][month] };
        })
      )
    : undefined;
  const flatPhotos = monthsToShow?.flatMap((month) =>
    sortRecents(Object.keys(month.days)).flatMap((day) => month.days[day])
  );

  const doToggleSelection = (fileId: string) => {
    if (!isSelected(fileId)) setSelectionRangeFrom(fileId);
    toggleSelection(fileId);
  };

  const doRangeSelection = (selectionRangeTo: string) => {
    if (!selectionRangeFrom || !flatPhotos) {
      doToggleSelection(selectionRangeTo);
      return;
    }

    const fromIndex = flatPhotos.findIndex((photo) => photo.fileId === selectionRangeFrom);
    const toIndex = flatPhotos.findIndex((photo) => photo.fileId === selectionRangeTo);

    const toSelect = flatPhotos.slice(fromIndex, toIndex + 1).map((photo) => photo.fileId);
    selectRange(toSelect);
  };

  /// Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: (monthsToShow?.length || 0) + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 1000, // Rough size of a photoSection
    scrollMargin: parentOffsetRef.current,
    overscan: 1, // Amount of items to load before and after (improved performance especially with images)
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem || !monthsToShow?.length) {
      return;
    }

    if (lastItem.index >= monthsToShow?.length - 1 && hasMorePhotos && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasMorePhotos,
    fetchNextPage,
    monthsToShow?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  if (!photoLibraryPart || !photoLibrary || !monthsToShow) {
    return null;
  }

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
              const isLoaderRow = virtualRow.index > monthsToShow.length - 1;
              if (isLoaderRow) {
                return hasMorePhotos || isFetchingNextPage ? (
                  <div className="mt-5 animate-pulse" key={'loading'}>
                    {t('Loading...')}
                  </div>
                ) : (
                  <div className="mt-5 italic opacity-50" key={'no-more'}>
                    {t('No more photos')}
                  </div>
                );
              }

              const monthMeta = monthsToShow[virtualRow.index];

              const year = monthMeta.monthDate.year;
              const month = monthMeta.monthDate.month;
              const days = sortRecents(Object.keys(monthMeta.days));

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <h1 className="text-2xl">
                    {createDateObject(year, month).toLocaleDateString(undefined, monthFormat)}
                  </h1>
                  {days.map((day) => (
                    <PhotoSection
                      title={createDateObject(year, month, day).toLocaleDateString(
                        undefined,
                        dateFormat
                      )}
                      targetDrive={PhotoConfig.PhotoDrive}
                      photos={photoLibrary[year][month][day]}
                      key={`${year}-${month}-${day}`}
                      toggleSelection={doToggleSelection}
                      rangeSelection={doRangeSelection}
                      isSelected={isSelected}
                      isSelecting={isSelecting}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PhotoScroll albumKey={albumKey} />
    </>
  );
};

export default PhotoLibrary;
