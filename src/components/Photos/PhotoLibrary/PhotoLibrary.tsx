import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { t } from '../../../helpers/i18n/dictionary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import PhotoScroll from '../PhotoScroll/PhotoScroll';
import { PhotoSection } from '../PhotoSection/PhotoSection';
import usePhotoLibrary from '../../../hooks/photoLibrary/usePhotoLibrary';
import { createDateObject } from '../../../provider/photos/PhotoProvider';
import { useSiblingsRange } from '../../../hooks/photoLibrary/usePhotoLibrarySiblings';

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

  if (!monthsToShow || !photoLibrary) {
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
              const isFinalRow = virtualRow.index > monthsToShow.length - 1;
              if (isFinalRow)
                return (
                  <div className="mt-5 italic opacity-50" key={'no-more'}>
                    {t('No more photos')}
                  </div>
                );

              const monthMeta = monthsToShow[virtualRow.index];
              const { year, month, days } = monthMeta;

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
                      date={createDateObject(year, month, day.day)}
                      albumKey={albumKey}
                      targetDrive={PhotoConfig.PhotoDrive}
                      photosCount={day.photosThisDay}
                      key={`${year}-${month}-${day.day}`}
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
      <PhotoScroll
        albumKey={albumKey}
        onJumpInTime={(time) => {
          const target = monthsToShow.findIndex((month) => {
            return month.year === time.year && month.month === time.month;
          });
          virtualizer.scrollToIndex(target, { align: 'start' });
        }}
      />
    </>
  );
};

export default PhotoLibrary;
