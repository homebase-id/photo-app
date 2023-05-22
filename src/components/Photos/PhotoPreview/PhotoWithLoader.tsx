import { TargetDrive, EmbeddedThumb, ImageSize, base64ToUint8Array } from '@youfoundation/js-lib';
import { useState, useMemo } from 'react';
import usePhoto from '../../../hooks/photoLibrary/usePhoto';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import Loader from '../../ui/Icons/Loader/Loader';

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
        // {...naturalSize}
      />
    </div>
  );
};
