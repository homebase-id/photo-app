import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { t } from '../../../helpers/i18n/dictionary';
import ActionButton from '../../ui/Buttons/ActionButton';
import { PhotoItem } from '../PhotoDay/PhotoDay';
import { HomebaseFile, TargetDrive } from '@youfoundation/js-lib/core';
import { usePhotosInfinte, PhotoConfig, useSiblingsRangeInfinte } from 'photo-app-common';

const gridClasses = `grid grid-cols-4 md:grid-cols-6 lg:flex lg:flex-row gap-[0.1rem] md:gap-1 `;
const PhotoAlbum = ({
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
  const {
    data: photos,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotosInfinte({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
    type: 'photos',
  }).fetchPhotos;
  const flatPhotos = photos?.pages.flatMap((page) => page.results) ?? [];

  const { data: selection } = useSiblingsRangeInfinte({
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

  const rowSize = document.documentElement.clientWidth >= 768 ? 6 : 4; // items per chunk
  const chunkedPhotos = flatPhotos.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / rowSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [] as HomebaseFile[][]);

  /// Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: (chunkedPhotos?.length || 0) + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 200, // Rough size of a photoSection
    scrollMargin: parentOffsetRef.current,
    overscan: 6, // Amount of items to load before and after (improved performance especially with images)
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem || !chunkedPhotos?.length) {
      return;
    }

    if (lastItem.index >= chunkedPhotos?.length - 1 && hasMorePhotos && !isFetchingNextPage) {
      console.log('fetchNextPage');
      fetchNextPage();
    }
  }, [
    hasMorePhotos,
    fetchNextPage,
    chunkedPhotos?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  if (!chunkedPhotos) return null;

  if (!chunkedPhotos?.length) {
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
            <div className="flex flex-col gap-[0.1rem] md:gap-1">
              {items.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > flatPhotos.length - 1;
                if (isLoaderRow) {
                  return hasMorePhotos || isFetchingNextPage ? (
                    <div className="mt-5 animate-pulse" key={'loading'}>
                      {t('Loading...')}
                    </div>
                  ) : null;
                }

                const photos = chunkedPhotos[virtualRow.index];

                return (
                  <div
                    ref={virtualizer.measureElement}
                    key={virtualRow.index}
                    data-index={virtualRow.index}
                  >
                    <PhotoGroup
                      photos={photos}
                      targetDrive={PhotoConfig.PhotoDrive}
                      toggleSelection={doToggleSelection}
                      rangeSelection={doRangeSelection}
                      isSelected={isSelected}
                      isSelecting={isSelecting}
                      rowSize={rowSize}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const PhotoGroup = ({
  photos,
  targetDrive,
  toggleSelection,
  rangeSelection,
  isSelected,
  isSelecting,
  rowSize,
}: {
  photos: HomebaseFile[];
  targetDrive: TargetDrive;
  toggleSelection: (fileId: string) => void;
  rangeSelection: (fileId: string) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
  rowSize: number;
}) => {
  return (
    <div className={gridClasses}>
      {photos?.map((photoDsr) => (
        <PhotoItem
          targetDrive={targetDrive}
          photoDsr={photoDsr}
          key={photoDsr.fileId}
          toggleSelection={toggleSelection}
          rangeSelection={rangeSelection}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
      ))}
      {/* This div fills up the space of the last row */}
      {photos?.length < rowSize ? <div className="hidden flex-grow-[999] lg:block"></div> : null}
    </div>
  );
};

export default PhotoAlbum;
