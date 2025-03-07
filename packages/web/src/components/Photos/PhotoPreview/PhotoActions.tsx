import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import ActionButton from '../../ui/Buttons/ActionButton';
import Arrow, { ArrowLeft } from '../../ui/Icons/Arrow/Arrow';
import Heart, { SolidHeart } from '../../ui/Icons/Heart/Heart';
import Times from '../../ui/Icons/Times/Times';
import { ActionGroup } from '../../ui/Buttons/ActionGroup';
import Info from '../../ui/Icons/Info/Info';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { PhotoConfig, usePhoto } from 'photo-app-common';
import { useWebPhoto } from '../../../hooks/photoLibrary/useWebPhoto';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';

const targetDrive = PhotoConfig.PhotoDrive;

export const PhotoActions = ({
  fileId,
  current,
  nextSibling,
  prevSibling,
  setIsInfoOpen,
  isInfoOpen,
  urlPrefix,
  loadOriginal,
  setLoadOriginal,
}: {
  fileId: string;
  current?: HomebaseFile;
  nextSibling?: HomebaseFile;
  prevSibling?: HomebaseFile;
  setIsInfoOpen: (isOpen: boolean) => void;
  isInfoOpen: boolean;
  urlPrefix?: string;
  loadOriginal: boolean;
  setLoadOriginal: (loadOriginal: boolean) => void;
}) => {
  const navigate = useNavigate();

  const {
    remove: {
      mutateAsync: removePhoto,
      status: removePhotoStatus,
      reset: resetRemove,
      error: removeError,
    },
    archive: { mutateAsync: archivePhoto, error: archiveError },
    restore: { mutateAsync: restorePhoto, error: restoreError },
    addTags: { mutateAsync: addTagsToPhoto, error: addTagsError },
    removeTags: { mutateAsync: removeTagsFromPhoto, error: removeTagsError },
  } = usePhoto(targetDrive);
  const {
    download: { mutateAsync: downloadPhoto },
  } = useWebPhoto(targetDrive);

  const isFavorite = current?.fileMetadata.appData.tags?.some((tag) =>
    stringGuidsEqual(tag, PhotoConfig.FavoriteTag)
  );

  const doClose = () => navigate(urlPrefix || '/');
  const doNext = () => navigate(`${urlPrefix || ''}/photo/${nextSibling?.fileId}`);
  const doPrev = () => navigate(`${urlPrefix || ''}/photo/${prevSibling?.fileId}`);

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
    resetRemove();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileId, prevSibling, nextSibling]); // We need new handlers to reflect the new fileId and navigate to the respective siblings

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
      <ErrorNotification
        error={removeError || archiveError || restoreError || addTagsError || removeTagsError}
      />
      <div
        className="absolute right-3 top-3 z-10 flex w-[50%] flex-row-reverse gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ActionGroup
          options={[
            {
              label: t('Download'),
              onClick: () => current && downloadPhoto({ targetDrive, dsr: current }),
            },
            ...(current?.fileMetadata.appData.archivalStatus !== 1 &&
            current?.fileMetadata.appData.archivalStatus !== 2
              ? [
                  {
                    label: t('Archive'),
                    onClick: async () => {
                      await archivePhoto({ photoFileId: fileId });
                      if (nextSibling) doNext();
                      else doClose();
                    },
                  },
                ]
              : []),
          ]}
          state={removePhotoStatus}
          buttonClassName="p-3 text-white"
          size="square"
          type="hybrid"
        />
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
            type="hybrid"
            confirmOptions={{
              type: 'warning',
              title: t('Remove Photo'),
              body: t('Are you sure you want to remove this photo?'),
              buttonText: t('Remove'),
            }}
          />
        ) : null}

        <ActionButton
          icon={Info}
          onClick={() => setIsInfoOpen(!isInfoOpen)}
          className="p-3"
          size="square"
          type="hybrid"
        />
        {current?.fileMetadata.appData.archivalStatus !== 2 ? (
          <ActionButton
            icon={isFavorite ? SolidHeart : Heart}
            onClick={() => doFavorite()}
            className="p-3"
            size="square"
            type="hybrid"
          />
        ) : null}
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
          type="hybrid"
        />
      </div>
      <div className="absolute bottom-3 right-3 z-10">
        <button
          className={`flex flex-row items-center gap-2 rounded-3xl border border-white border-opacity-10 bg-white px-2 py-1 text-sm text-white before:block before:h-2 before:w-2 before:rounded-full before:bg-white before:content-[''] ${
            loadOriginal
              ? 'bg-opacity-20 before:bg-opacity-100'
              : 'bg-opacity-10 text-opacity-50 before:bg-opacity-10'
          }`}
          onClick={() => setLoadOriginal(!loadOriginal)}
        >
          {t('Original')}
        </button>
      </div>
      {prevSibling ? (
        <ActionButton
          icon={ArrowLeft}
          onClick={() => doPrev()}
          className="absolute left-2 top-[calc(50%-1.25rem)] z-10 hidden rounded-full p-3 lg:block"
          size="square"
          type="hybrid"
        />
      ) : null}
      {nextSibling ? (
        <ActionButton
          icon={Arrow}
          onClick={() => doNext()}
          className="absolute right-2 top-[calc(50%-1.25rem)] z-10 hidden rounded-full p-3 lg:block"
          size="square"
          type="hybrid"
        />
      ) : null}
    </>
  );
};
