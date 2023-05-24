import { DriveSearchResult, stringGuidsEqual } from '@youfoundation/js-lib';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePhoto from '../../../hooks/photoLibrary/usePhoto';
import { useFileHeader } from '../../../hooks/photoLibrary/usePhotoLibrarySiblings';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import Arrow, { ArrowLeft } from '../../ui/Icons/Arrow/Arrow';
import Heart, { SolidHeart } from '../../ui/Icons/Heart/Heart';
import Question from '../../ui/Icons/Question/Question';
import Times from '../../ui/Icons/Times/Times';
import Archive from '../../ui/Icons/Archive/Archive';
import { PhotoInfo } from './PhotoInfo/PhotoInfo';
import { usePhotosInfinte } from '../../../hooks/photoLibrary/usePhotos';
import { useVirtualizer } from '@tanstack/react-virtual';
import MediaWithLoader from './MediaLoader';
import useDebounce from '../../../hooks/debounce/useDebounce';

const targetDrive = PhotoConfig.PhotoDrive;
const PhotoPreview = ({
  fileId,
  albumKey,
  urlPrefix,
}: {
  fileId: string;
  albumKey?: string;
  urlPrefix?: string;
}) => {
  urlPrefix = urlPrefix || albumKey ? `/album/${albumKey}` : '';

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { data: fileHeader } = useFileHeader({ targetDrive, photoFileId: fileId });

  return (
    <div className={`fixed inset-0 z-50 overflow-auto bg-black backdrop-blur-sm dark:bg-black`}>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className="relative w-full">
          <PhotoActions
            fileId={fileId}
            current={fileHeader}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
            urlPrefix={urlPrefix}
          />
          <InnerSlider fileId={fileId} albumKey={albumKey} urlPrefix={urlPrefix} />
        </div>
        {isInfoOpen ? (
          <PhotoInfo current={fileHeader} setIsInfoOpen={setIsInfoOpen} key={fileId} />
        ) : null}
      </div>
    </div>
  );
};

const InnerSlider = ({
  fileId,
  albumKey,
  urlPrefix,
}: {
  fileId: string;
  albumKey?: string;
  urlPrefix?: string;
}) => {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const slideWidth = window.innerWidth; // Not clientWidth as the scrollbar is removed be disabled scrolling on the body
  const [didSetOffset, setDidSetOffset] = useState(false);

  const {
    data: photos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePhotosInfinte({ targetDrive, album: albumKey }).fetchPhotos;

  const flatPhotos = photos?.pages.flatMap((page) => page.results) || [];

  const scrollListener = useDebounce(
    () => {
      const currentIndex = Math.round((scrollContainer.current?.scrollLeft ?? 0) / slideWidth);

      // Update the url with the current fileId when scrolling
      if (!flatPhotos || flatPhotos[currentIndex]?.fileId === fileId) return;
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

  useEffect(() => {
    if (didSetOffset) return;
    const index = flatPhotos.findIndex((photo) => photo.fileId === fileId);
    if (index === -1) return;

    // SetTimeout to let the element render and have the width
    setTimeout(() => {
      colVirtualizer.scrollToIndex(index);
      setDidSetOffset(true);
    });
  }, [flatPhotos]);

  useEffect(() => {
    console.log('navigate to fileId?', fileId);
  }, [fileId]);

  // Virtual scrolling
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: hasNextPage ? flatPhotos.length + 1 : flatPhotos.length,
    getScrollElement: () => scrollContainer.current,
    estimateSize: () => slideWidth,
    overscan: 2,
    initialOffset: flatPhotos.findIndex((photo) => photo.fileId === fileId) * slideWidth,
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

  return (
    <div
      className="no-scrollbar h-full snap-x snap-mandatory overflow-x-scroll"
      ref={scrollContainer}
    >
      <div
        className="relative h-full"
        style={{
          width: `${colVirtualizer.getTotalSize()}px`,
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PhotoActions = ({
  fileId,
  current,
  nextSibling,
  prevSibling,
  setIsInfoOpen,
  isInfoOpen,
  urlPrefix,
}: {
  fileId: string;
  current?: DriveSearchResult;
  nextSibling?: DriveSearchResult;
  prevSibling?: DriveSearchResult;
  setIsInfoOpen: (isOpen: boolean) => void;
  isInfoOpen: boolean;
  urlPrefix?: string;
}) => {
  const navigate = useNavigate();

  const {
    remove: { mutateAsync: removePhoto, status: removePhotoStatus },
    archive: { mutateAsync: archivePhoto, status: archivePhotoStatus },
    restore: { mutateAsync: restorePhoto },
    addTags: { mutateAsync: addTagsToPhoto },
    removeTags: { mutateAsync: removeTagsFromPhoto },
  } = usePhoto(targetDrive);

  const isFavorite = current?.fileMetadata.appData.tags?.some((tag) =>
    stringGuidsEqual(tag, PhotoConfig.FavoriteTag)
  );

  const doClose = () => {
    navigate(urlPrefix || '/');
  };

  // TODO: Preload siblings
  const doNext = () => {
    navigate(`${urlPrefix ? urlPrefix : ''}/photo/${nextSibling?.fileId}`);
  };

  const doPrev = () => {
    navigate(`${urlPrefix ? urlPrefix : ''}/photo/${prevSibling?.fileId}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowLeft' && prevSibling) {
          doPrev();
        } else if (e.key === 'ArrowRight' && nextSibling) {
          doNext();
        } else if (e.key === 'Escape') {
          doClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileId, prevSibling, nextSibling]); // We need new handlers to reflect the new fileId and navigate to the respective siblings

  useEffect(() => {
    if (fileId) {
      document.documentElement.classList.add('overflow-hidden');
    }
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, [fileId]);

  const doFavorite = () => {
    if (isFavorite) {
      removeTagsFromPhoto({
        targetDrive,
        fileId,
        removeTags: [PhotoConfig.FavoriteTag],
      });
    } else {
      addTagsToPhoto({
        targetDrive,
        fileId,
        addTags: [PhotoConfig.FavoriteTag],
      });
    }
  };

  return (
    <>
      <div
        className="absolute right-3 top-3 z-10 flex w-[50%] flex-row-reverse gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {current?.fileMetadata.appData.archivalStatus !== 2 ? (
          <ActionButton
            icon={'trash'}
            onClick={async () => {
              await removePhoto({ photoFileId: fileId });
              if (nextSibling) doNext();
              else doClose();
            }}
            state={removePhotoStatus}
            className="p-3"
            size="square"
            type="secondary"
            confirmOptions={{
              title: t('Remove Photo'),
              body: t('Are you sure you want to remove this photo?'),
              buttonText: t('Remove'),
            }}
          />
        ) : null}
        {current?.fileMetadata.appData.archivalStatus !== 1 ? (
          <ActionButton
            icon={Archive}
            onClick={async () => {
              await archivePhoto({ photoFileId: fileId });
              if (nextSibling) doNext();
              else doClose();
            }}
            state={archivePhotoStatus}
            className="p-3"
            size="square"
            type="secondary"
            confirmOptions={{
              title: t('Archive Photo'),
              body: t('Are you sure you want to archive this photo?'),
              buttonText: t('Archive'),
            }}
          />
        ) : null}

        <ActionButton
          icon={Question}
          onClick={() => setIsInfoOpen(!isInfoOpen)}
          className="p-3"
          size="square"
          type="secondary"
        />
        <ActionButton
          icon={isFavorite ? SolidHeart : Heart}
          onClick={() => doFavorite()}
          className="p-3"
          size="square"
          type="secondary"
        />
        {current?.fileMetadata.appData.archivalStatus === 1 ||
        current?.fileMetadata.appData.archivalStatus === 2 ? (
          <ActionButton
            onClick={() => restorePhoto({ photoFileId: fileId })}
            className="p-3"
            size="square"
            type="primary"
          >
            {t('Restore')}
          </ActionButton>
        ) : null}
      </div>
      <div className="absolute left-3 top-3 z-10 flex w-[50%] flex-row gap-2">
        <ActionButton
          icon={Times}
          onClick={doClose}
          className="rounded-full p-3 lg:fixed"
          size="square"
          type="secondary"
        />
      </div>
      {prevSibling ? (
        <ActionButton
          icon={ArrowLeft}
          onClick={() => doPrev()}
          className="absolute left-2 top-[calc(50%-1.25rem)] z-10 rounded-full p-3"
          size="square"
          type="secondary"
        />
      ) : null}
      {nextSibling ? (
        <ActionButton
          icon={Arrow}
          onClick={() => doNext()}
          className="absolute right-2 top-[calc(50%-1.25rem)] z-10 rounded-full p-3"
          size="square"
          type="secondary"
        />
      ) : null}
    </>
  );
};

export default PhotoPreview;
