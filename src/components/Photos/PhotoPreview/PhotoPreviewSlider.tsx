import { useVirtualizer } from '@tanstack/react-virtual';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useRef, useState, useEffect } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import useDebounce from '../../../hooks/debounce/useDebounce';
import MediaWithLoader from './MediaLoader';

const PhotoPreviewSlider = ({
  fileId,
  urlPrefix,

  fetchOlderPage,
  hasOlderPage,
  isFetchingOlderPage,

  fetchNewerPage,
  hasNewerPage,
  isFetchingNewerPage,

  flatPhotos,
  original,
}: {
  fileId: string;
  urlPrefix?: string;

  fetchOlderPage: () => void;
  hasOlderPage?: boolean;
  isFetchingOlderPage: boolean;

  fetchNewerPage?: () => void;
  hasNewerPage?: boolean;
  isFetchingNewerPage?: boolean;

  flatPhotos: DriveSearchResult[];
  original?: boolean;
}) => {
  // I know this is strange, as this will break hooks consistentcy,
  // but if there's no photos the virtual scrolling will initialize with no width, and the intialOffset will be 0
  if (!flatPhotos?.length) return null;

  const fileIndex = flatPhotos.findIndex((photo) => stringGuidsEqual(photo.fileId, fileId));
  const scrollContainer = useRef<HTMLDivElement>(null);
  const slideWidth = scrollContainer.current?.parentElement?.clientWidth || window.innerWidth; // Not widow.clientWidth as the scrollbar is removed by disabled scrolling on the body
  const [initialOffset] = useState(fileIndex * slideWidth);

  const scrollListener = useDebounce(
    () => {
      const currentIndex = Math.round((scrollContainer.current?.scrollLeft ?? 0) / slideWidth);

      // Update the url with the current fileId when scrolling
      if (!flatPhotos || stringGuidsEqual(flatPhotos[currentIndex]?.fileId, fileId)) return;

      const paths = window.location.pathname.split('/');
      if (paths[paths.length - 1] === flatPhotos?.[currentIndex]?.fileId) return; // Already on the correct url
      if (paths[paths.length - 2] !== 'photo') return; // No longer on preview

      window.history.replaceState(
        null,
        '',
        `${urlPrefix ? urlPrefix : ''}/photo/${flatPhotos?.[currentIndex]?.fileId}`
      );
    },
    [flatPhotos],
    500
  );

  useEffect(() => {
    scrollContainer.current?.addEventListener('scroll', scrollListener, {
      passive: true,
    });
    return () => scrollContainer.current?.removeEventListener('scroll', scrollListener);
  }, [flatPhotos, scrollListener]);

  // Virtual scrolling
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: hasOlderPage ? flatPhotos.length + 1 : flatPhotos.length,
    getScrollElement: () => scrollContainer.current,
    estimateSize: () => slideWidth,
    overscan: 2,

    initialOffset: initialOffset,
  });

  // Fetch Newer page when scrolling to the start
  useEffect(() => {
    const [firstItem] = colVirtualizer.getVirtualItems();
    if (!firstItem || !fetchNewerPage) return;

    if (firstItem.index === 0 && hasNewerPage && !isFetchingOlderPage && !isFetchingNewerPage) {
      fetchNewerPage();
    }
  }, [
    hasNewerPage,
    fetchNewerPage,
    flatPhotos.length,
    isFetchingNewerPage,
    isFetchingOlderPage,
    colVirtualizer.getVirtualItems(),
  ]);

  // Fetch Older page when scrolling to the end
  useEffect(() => {
    const [lastItem] = [...colVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= flatPhotos.length - 1 &&
      hasOlderPage &&
      !isFetchingOlderPage &&
      !isFetchingNewerPage
    ) {
      fetchOlderPage();
    }
  }, [
    hasOlderPage,
    fetchOlderPage,
    flatPhotos.length,
    isFetchingNewerPage,
    isFetchingOlderPage,
    colVirtualizer.getVirtualItems(),
  ]);

  useEffect(() => {
    if (fileIndex === -1 || !scrollContainer.current) {
      console.log('cannot scroll', { fileIndex, scrollContainer: scrollContainer.current });
      return;
    }
    if (colVirtualizer.isScrolling) return;

    colVirtualizer.scrollToIndex(fileIndex, { behavior: 'auto' });
  }, [fileId, flatPhotos, colVirtualizer, colVirtualizer.getVirtualItems(), fileIndex]);

  return (
    <div
      className="no-scrollbar h-full snap-x snap-mandatory overflow-x-scroll"
      ref={scrollContainer}
    >
      <div
        className="relative h-full"
        style={{
          width: `${flatPhotos.length * slideWidth}px`,
        }}
      >
        {colVirtualizer.getVirtualItems()?.map((virtualCol) => {
          const isLoaderRow = virtualCol.index > flatPhotos.length - 1;

          if (isLoaderRow) {
            return hasOlderPage || isFetchingOlderPage ? (
              <div className="mt-5 animate-pulse" key={'loading'}>
                {t('Loading...')}
              </div>
            ) : null;
          }

          const photo = flatPhotos[virtualCol.index];
          return (
            <div
              className="absolute inset-0 h-full"
              style={{
                width: `${virtualCol.size}px`,
                transform: `translateX(${virtualCol.start}px)`,
                display: 'inline-block',
              }}
              key={photo.fileId}
            >
              <div className="flex h-screen w-screen snap-start">
                <MediaWithLoader
                  media={photo}
                  fileId={photo.fileId}
                  className={`m-auto h-auto max-h-[100vh] w-auto max-w-full object-contain`}
                  original={original}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhotoPreviewSlider;
