import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { t } from '../../../helpers/i18n/dictionary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import { PhotoItem } from '../PhotoSection/PhotoSection';
import { usePhotosInfinte } from '../../../hooks/photoLibrary/usePhotos';
import { useSiblingsRangeInfinte } from '../../../hooks/photoLibrary/usePhotoLibrarySiblingsInfinte';

const gridClasses = `grid grid-cols-4 gap-1 md:grid-cols-6`;

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

  /// Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: (flatPhotos?.length || 0) + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 350, // Rough size of a photoSection
    scrollMargin: parentOffsetRef.current,
    overscan: 6, // Amount of items to load before and after (improved performance especially with images)
    lanes: 10,
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem || !flatPhotos?.length) {
      return;
    }

    if (lastItem.index >= flatPhotos?.length - 1 && hasMorePhotos && !isFetchingNextPage) {
      console.log('fetchNextPage');
      fetchNextPage();
    }
  }, [
    hasMorePhotos,
    fetchNextPage,
    flatPhotos?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  if (!flatPhotos) return null;

  if (!flatPhotos?.length) {
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
            <div className={gridClasses}>
              {items.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > flatPhotos.length - 1;
                if (isLoaderRow) {
                  return hasMorePhotos || isFetchingNextPage ? (
                    <div className="mt-5 animate-pulse" key={'loading'}>
                      {t('Loading...')}
                    </div>
                  ) : null;
                }

                const photoDsr = flatPhotos[virtualRow.index];

                return (
                  <PhotoItem
                    targetDrive={PhotoConfig.PhotoDrive}
                    photoDsr={photoDsr}
                    key={photoDsr.fileId}
                    toggleSelection={doToggleSelection}
                    rangeSelection={doRangeSelection}
                    isSelected={isSelected}
                    isSelecting={isSelecting}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PhotoAlbum;
