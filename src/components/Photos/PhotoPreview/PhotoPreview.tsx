import {
  base64ToUint8Array,
  DriveSearchResult,
  EmbeddedThumb,
  ImageMetadata,
  ImageSize,
  stringGuidsEqual,
  TargetDrive,
} from '@youfoundation/dotyoucore-js';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePhoto from '../../../hooks/photoLibrary/usePhoto';
import usePhotoLibrarySiblings from '../../../hooks/photoLibrary/usePhotoLibrarySiblings';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton from '../../ui/Buttons/ActionButton';
import Arrow, { ArrowLeft } from '../../ui/Icons/Arrow/Arrow';
import Heart, { SolidHeart } from '../../ui/Icons/Heart/Heart';
import Loader from '../../ui/Icons/Loader/Loader';
import Question from '../../ui/Icons/Question/Question';
import Times from '../../ui/Icons/Times/Times';
import usePhotoMetadata from '../../../hooks/photoLibrary/usePhotoMeta';
import Archive from '../../ui/Icons/Archive/Archive';

const targetDrive = PhotoConfig.PhotoDrive;

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  weekday: 'short',
  timeZoneName: 'short',
};

const PhotoPreview = ({ fileId, albumKey }: { fileId: string; albumKey?: string }) => {
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
      <div
        className="flex w-full flex-row items-center py-2 lg:py-0"
        onClick={(e) => e.stopPropagation()}
      ></div>
      <div className="flex h-screen max-w-[100vw] flex-row justify-center">
        <div className="relative w-full">
          <PhotoActions
            fileId={fileId}
            albumKey={albumKey}
            current={current}
            nextSibling={nextSibling}
            prevSibling={prevSibling}
            setIsInfoOpen={setIsInfoOpen}
            isInfoOpen={isInfoOpen}
          />
          <PhotoWithLoader
            fileId={fileId}
            targetDrive={targetDrive}
            previewThumbnail={current?.fileMetadata.appData.previewThumbnail}
            size={{ pixelWidth: 1600, pixelHeight: 1600 }}
            fit="contain"
            key={fileId}
          />
        </div>
        {isInfoOpen ? <PhotoInfo current={current} setIsInfoOpen={setIsInfoOpen} /> : null}
      </div>
    </div>
  );
};

export const PhotoActions = ({
  fileId,
  albumKey,
  current,
  nextSibling,
  prevSibling,
  setIsInfoOpen,
  isInfoOpen,
}: {
  fileId: string;
  albumKey?: string;
  current?: DriveSearchResult;
  nextSibling?: DriveSearchResult;
  prevSibling?: DriveSearchResult;
  setIsInfoOpen: (isOpen: boolean) => void;
  isInfoOpen: boolean;
}) => {
  const navigate = useNavigate();

  const {
    remove: { mutateAsync: removePhoto, status: removePhotoStatus },
    archive: { mutateAsync: archivePhoto, status: archivePhotoStatus },
    restore: { mutateAsync: restorePhoto, status: restorePhotoStatus },
    addTags: { mutateAsync: addTagsToPhoto },
    removeTags: { mutateAsync: removeTagsFromPhoto },
  } = usePhoto(targetDrive);

  const isFavorite = current?.fileMetadata.appData.tags?.some((tag) =>
    stringGuidsEqual(tag, PhotoConfig.FavoriteTag)
  );

  const doClose = () => {
    navigate(`/${albumKey ? `album/${albumKey}` : ''}`);
  };

  // TODO: Preload siblings
  const doNext = () => {
    navigate(`${albumKey ? `/album/${albumKey}` : ''}/photo/${nextSibling?.fileId}`);
  };

  const doPrev = () => {
    navigate(`${albumKey ? `/album/${albumKey}` : ''}/photo/${prevSibling?.fileId}`);
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
  }, [fileId]); // We need new handlers to reflect the new fileId

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
      <div className="absolute right-3 top-3 z-10 flex w-[50%] flex-row-reverse gap-2">
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

export const PhotoInfo = ({
  current,
  setIsInfoOpen,
}: {
  current?: DriveSearchResult;
  setIsInfoOpen: (infoOpen: boolean) => void;
}) => {
  const { data: photoMetadata } = usePhotoMetadata(targetDrive, current?.fileId).fetchMeta;

  const date = useMemo(() => {
    if (current?.fileMetadata.appData.userDate)
      return new Date(current.fileMetadata.appData.userDate);

    if (current?.fileMetadata.created) return new Date(current.fileMetadata.created);

    return null;
  }, [current]);

  return (
    <div className="fixed inset-0 z-30 h-screen w-full bg-white md:static md:w-[27rem]">
      <div className="px-8 py-7">
        <div className="mb-10 flex flex-row">
          <button onClick={() => setIsInfoOpen(false)} className="mr-2">
            <Times className="h-6 w-6" />
          </button>
          <h1 className="text-xl">{t('Details')}</h1>
        </div>
        <ul className="flex flex-col gap-7">
          <li>
            <p>
              {date?.toLocaleDateString(undefined, dateFormat)}
              <small className="block">{date?.toLocaleTimeString(undefined, timeFormat)}</small>
            </p>
          </li>
          {photoMetadata ? <PhotoCaptureDetails metadata={photoMetadata} /> : null}
        </ul>
      </div>
    </div>
  );
};

const PhotoCaptureDetails = ({ metadata }: { metadata: ImageMetadata }) => {
  if (!metadata) {
    return null;
  }

  const details = metadata.captureDetails;
  const fNumber = details.fNumber ? `f/${details.fNumber}` : null;
  const exposureTime = details.exposureTime ? `1/${1 / parseFloat(details.exposureTime)}` : null;
  const focalLength = details.focalLength ? `${details.focalLength}mm` : null;
  const iso = details.iso ? `ISO${details.iso}` : null;

  return (
    <li>
      {metadata.camera ? (
        <p>
          {metadata.camera.make} {metadata.camera.model}
        </p>
      ) : null}
      {details ? (
        <small className="flex w-full max-w-[12rem] flex-row justify-between">
          <span>{fNumber}</span> <span>{exposureTime}</span> <span>{focalLength}</span>{' '}
          <span>{iso}</span>
        </small>
      ) : null}
    </li>
  );
};

export const PhotoWithLoader = ({
  fileId,
  targetDrive,
  previewThumbnail,
  size,
  fit = 'cover',
}: {
  fileId: string;
  targetDrive: TargetDrive;
  previewThumbnail?: EmbeddedThumb;
  size?: ImageSize;
  fit?: 'cover' | 'contain';
}) => {
  const [isTinyLoaded, setIsTinyLoaded] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const {
    fetch: { data: photo },
    fromCache,
  } = usePhoto(PhotoConfig.PhotoDrive, fileId, size);

  const cachedPreview = useMemo(
    () => (fileId ? fromCache(targetDrive, fileId) : undefined),
    [fileId]
  );

  const previewThumbUrl = useMemo(() => {
    if (!previewThumbnail || cachedPreview) return;
    return window.URL.createObjectURL(
      new Blob([base64ToUint8Array(previewThumbnail.content)], {
        type: previewThumbnail.contentType,
      })
    );
  }, [previewThumbnail]);

  const previewUrl = cachedPreview?.url || previewThumbUrl;
  const naturalSize = {
    width: previewThumbnail?.pixelWidth,
    height: previewThumbnail?.pixelHeight,
  };

  return (
    <div className="relative h-full w-full">
      <img
        src={previewUrl}
        className={`absolute inset-0 h-full w-full ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        } ${cachedPreview ? '' : 'blur-xl'} transition-opacity delay-500 ${
          isFinal ? 'opacity-0' : 'opacity-100'
        }`}
        {...naturalSize}
        onLoad={() => setIsTinyLoaded(true)}
      />
      {!isFinal ? (
        <div
          className={`absolute inset-0 flex text-white transition-opacity delay-[2000ms] ${
            isTinyLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Loader className="m-auto h-7 w-7" />
        </div>
      ) : null}
      <img
        src={photo?.url}
        className={`relative h-full w-full ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        } transition-opacity ${isFinal ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
        onLoad={() => setIsFinal(true)}
        {...naturalSize}
      />
    </div>
  );
};

export default PhotoPreview;
