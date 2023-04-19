import {
  base64ToUint8Array,
  EmbeddedThumb,
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

const targetDrive = PhotoConfig.PhotoDrive;

const PhotoPreview = ({ fileId, albumKey }: { fileId: string; albumKey?: string }) => {
  const navigate = useNavigate();
  const {
    remove: { mutateAsync: removePhoto, status: removePhotoStatus },
    addTags: { mutateAsync: addTagsToPhoto },
    removeTags: { mutateAsync: removeTagsFromPhoto },
  } = usePhoto(targetDrive);

  const { current, nextSibling, prevSibling } = usePhotoLibrarySiblings({
    targetDrive: targetDrive,
    photoFileId: fileId,
    album: albumKey,
  });

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
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowLeft' && prevSibling) {
        doPrev();
      } else if (e.key === 'ArrowRight' && nextSibling) {
        doNext();
      } else if (e.key === 'Escape') {
        doClose();
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

  if (!fileId) {
    return null;
  }

  const isFavorite = current?.fileMetadata.appData.tags?.some((tag) =>
    stringGuidsEqual(tag, PhotoConfig.FavoriteTag)
  );

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
    <div
      className={`fixed inset-0 z-50 overflow-auto bg-black bg-opacity-90 backdrop-blur-sm dark:bg-black`}
      onClick={() => doClose()}
    >
      <div
        className="flex w-full flex-row items-center py-2 lg:py-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fixed right-3 top-3 z-10 flex w-[50%] flex-row-reverse gap-2">
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
          <ActionButton
            icon={Question}
            onClick={doClose}
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
      </div>
      <div className="flex h-screen max-w-[100vw] flex-col justify-center">
        <PhotoWithLoader
          fileId={fileId}
          targetDrive={targetDrive}
          previewThumbnail={current?.fileMetadata.appData.previewThumbnail}
          size={{ pixelWidth: 1600, pixelHeight: 1600 }}
          fit="contain"
          key={fileId}
        />
      </div>
    </div>
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
