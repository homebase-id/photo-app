import { DriveSearchResult, stringGuidsEqual } from '@youfoundation/js-lib';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePhoto from '../../../hooks/photoLibrary/usePhoto';
import usePhotoLibrarySiblings from '../../../hooks/photoLibrary/usePhotoLibrarySiblings';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import Arrow, { ArrowLeft } from '../../ui/Icons/Arrow/Arrow';
import Heart, { SolidHeart } from '../../ui/Icons/Heart/Heart';
import Question from '../../ui/Icons/Question/Question';
import Times from '../../ui/Icons/Times/Times';
import Archive from '../../ui/Icons/Archive/Archive';
import { PhotoInfo } from './PhotoInfo/PhotoInfo';
import { PhotoWithLoader } from './PhotoWithLoader';
import { VideoWithLoader } from './VideoWithLoader';

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
  const { current, nextSibling, prevSibling } = usePhotoLibrarySiblings({
    targetDrive: targetDrive,
    photoFileId: fileId,
    album: albumKey,
  });

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  if (!fileId) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-auto bg-black backdrop-blur-sm dark:bg-black`}>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className="relative w-full">
          <PhotoActions
            fileId={fileId}
            current={current}
            nextSibling={nextSibling}
            prevSibling={prevSibling}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
            urlPrefix={urlPrefix}
          />
          <>
            {current?.fileMetadata.contentType.startsWith('video/') ? (
              <VideoWithLoader fileId={fileId} targetDrive={targetDrive} fit="contain" />
            ) : (
              <PhotoWithLoader
                fileId={fileId}
                targetDrive={targetDrive}
                previewThumbnail={current?.fileMetadata.appData.previewThumbnail}
                size={{ pixelWidth: 1600, pixelHeight: 1600 }}
                fit="contain"
                key={fileId}
              />
            )}
          </>
        </div>
        {isInfoOpen ? (
          <PhotoInfo current={current} setIsInfoOpen={setIsInfoOpen} key={fileId} />
        ) : null}
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
  }, [fileId, prevSibling, nextSibling]); // We need new handlers to reflect the new fileId

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
      <ActionButton
        icon={Times}
        onClick={doClose}
        className="left-3 top-3 z-10 rounded-full p-3 lg:fixed"
        size="square"
        type="secondary"
      />
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
