import { DriveSearchResult, stringGuidsEqual } from '@youfoundation/js-lib';
import { useEffect, useRef, useState } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import { PhotoInfo } from './PhotoInfo/PhotoInfo';
import { usePhotosInfinte } from '../../../hooks/photoLibrary/usePhotos';
import { useVirtualizer } from '@tanstack/react-virtual';
import MediaWithLoader from './MediaLoader';
import useDebounce from '../../../hooks/debounce/useDebounce';
import { useFileHeader } from '../../../hooks/photoLibrary/usePhotoHeader';
import { PhotoActions } from './PhotoActions';

const targetDrive = PhotoConfig.PhotoDrive;
const PhotoPreview = ({
  fileId,
  albumKey,
  urlPrefix: urlPrefixProp,
}: {
  fileId: string;
  albumKey?: string;
  urlPrefix?: string;
}) => {
  const urlPrefix = urlPrefixProp || (albumKey ? `/album/${albumKey}` : '');

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { data: fileHeader } = useFileHeader({ targetDrive, photoFileId: fileId });
  const [loadOriginal, setLoadOriginal] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  const {
    data: photos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePhotosInfinte({ targetDrive, album: albumKey }).fetchPhotos;

  const flatPhotos = photos?.pages.flatMap((page) => page.results) || [];

  const currentIndex = flatPhotos.findIndex((photo) => photo.fileId === fileId);
  const nextSibling = flatPhotos[currentIndex + 1];
  const prevSibling = flatPhotos[currentIndex - 1];

  return (
    <div className={`fixed inset-0 z-50 overflow-auto bg-black backdrop-blur-sm dark:bg-black`}>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className={`relative ${isInfoOpen ? 'w-full md:w-[calc(100%-27rem)]' : 'w-full'}`}>
          <PhotoActions
            fileId={fileId}
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
            urlPrefix={urlPrefix}
            nextSibling={nextSibling}
            prevSibling={prevSibling}
            loadOriginal={loadOriginal}
            setLoadOriginal={setLoadOriginal}
          />
          {flatPhotos?.length ? (
            <InnerSlider
              fileId={fileId}
              urlPrefix={urlPrefix}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              flatPhotos={flatPhotos}
              originals={loadOriginal}
            />
          ) : null}
        </div>
        {isInfoOpen ? (
          <PhotoInfo
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            loadOriginal={loadOriginal}
            key={fileId}
          />
        ) : null}
      </div>
    </div>
  );
};

const InnerSlider = ({
  fileId,

  urlPrefix,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  flatPhotos,
  originals,
}: {
  fileId: string;

  urlPrefix?: string;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  flatPhotos: DriveSearchResult[];
  originals?: boolean;
}) => {
  // I know this is strange, as this will break hooks consistentcy,
  // but if there's no photos the virtual scrolling will initialize with no width, and the intialOffset will be 0
  if (!flatPhotos?.length) return null;

  const fileIndex = flatPhotos.findIndex((photo) => stringGuidsEqual(photo.fileId, fileId));
  const scrollContainer = useRef<HTMLDivElement>(null);
  const slideWidth = scrollContainer.current?.parentElement?.clientWidth || window.innerWidth; // Not widow.clientWidth as the scrollbar is removed be disabled scrolling on the body
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
  }, [flatPhotos, scrollListener, scrollListener]);

  // Virtual scrolling
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: hasNextPage ? flatPhotos.length + 1 : flatPhotos.length,
    getScrollElement: () => scrollContainer.current,
    estimateSize: () => slideWidth,
    overscan: 2,

    initialOffset: initialOffset,
  });

  // Fetch next page when scrolling to the end
  useEffect(() => {
    const [lastItem] = [...colVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= flatPhotos.length - 1 && hasNextPage && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasNextPage,
    fetchNextPage,
    flatPhotos.length,
    isFetchingNextPage,
    colVirtualizer.getVirtualItems(),
  ]);

  useEffect(() => {
    if (fileIndex === -1 || !scrollContainer.current) {
      console.log('cannot scroll', {
        fileIndex,
        scrollContainer: scrollContainer.current,
        flatPhotos,
      });
      return;
    }
    console.log('scrolling', { fileIndex, scrollContainer: scrollContainer.current });

    const targetPos = colVirtualizer.getOffsetForIndex(fileIndex)[0];
    if (targetPos === initialOffset && targetPos !== 0) return; // Even if initialOffset is 0 we do want to scroll to it

    scrollContainer.current.scrollTo({
      left: targetPos,
      behavior: 'smooth',
    });
  }, [fileId, flatPhotos, colVirtualizer, fileIndex]);

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
            return hasNextPage || isFetchingNextPage ? (
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
              <MediaWithLoader
                media={photo}
                fileId={photo.fileId}
                className="relative h-full w-[100vw] flex-shrink-0 snap-start"
                original={originals}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhotoPreview;
