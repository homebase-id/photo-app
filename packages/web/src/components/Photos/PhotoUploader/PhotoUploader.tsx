import { DEFAULT_PAYLOAD_KEY, ThumbnailFile } from '@homebase-id/js-lib/core';
import { base64ToUint8Array } from '@homebase-id/js-lib/helpers';
import { useState, useRef, useEffect, useMemo } from 'react';
import { getImagesFromPasteEvent } from '../../../helpers/pasteHelper';
import ActionButton from '../../ui/Buttons/ActionButton';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import { t } from '../../../helpers/i18n/dictionary';
import Times from '../../ui/Icons/Times/Times';
import Exclamation from '../../ui/Icons/Exclamation/Exclamation';
import Check from '../../ui/Icons/Check/Check';
import Loader from '../../ui/Icons/Loader/Loader';
import { FileLike, LibraryType, PhotoConfig } from 'photo-app-common';
import { useWebPhoto } from '../../../hooks/photoLibrary/useWebPhoto';

const kiloBytes = 1024;
const megaBytes = kiloBytes * 1024;

const Uploader = ({
  isFileSelectorOpen,
  setFileSelectorOpen,
  albumKey,
  type,
}: {
  isFileSelectorOpen: boolean;
  setFileSelectorOpen: (isOpen: boolean) => void;
  albumKey?: string;
  type: LibraryType;
}) => {
  const [failedFiles, setFailedFiles] = useState<(File | FileLike)[]>([]);
  const [uploadQueue, setUploadQueue] = useState<(File | FileLike)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentVideoThumb, setCurrentVideoThumb] = useState<ThumbnailFile | undefined>();

  const inputRef = useRef<HTMLInputElement>(null);

  const doCancelQueue = () => {
    setUploadQueue([]);
    setFailedFiles([]);
    setCurrentIndex(0);
    setCurrentVideoThumb(undefined);
  };

  const doNext = () => {
    resetUpload();
    setCurrentVideoThumb(undefined);

    setCurrentIndex(currentIndex + 1);
  };

  const addToUploadQueue = (newFiles: (File | FileLike)[]) => {
    setUploadQueue((prevVal) => [
      ...prevVal,
      ...newFiles.filter((f) => !prevVal.find((val) => val.name === f.name)),
    ]);
  };

  const {
    mutate: doUploadToServer,
    status: uploadStatus,
    reset: resetUpload,
    error: uploadError,
  } = useWebPhoto(PhotoConfig.PhotoDrive).upload;

  // Window level paste handler
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => addToUploadQueue(getImagesFromPasteEvent(e));

    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);

  useEffect(() => {
    if (isFileSelectorOpen && inputRef?.current) {
      inputRef?.current.click();
      setFileSelectorOpen(false);
    }
  }, [isFileSelectorOpen]);

  useEffect(() => {
    const messageListener = (e: MessageEvent) => {
      if (e?.data?.source?.startsWith('react-devtools-')) return;

      console.log('incoming message', e);

      if (
        e.data.action === 'odin-upload' &&
        'dataUrl' in e.data &&
        typeof e.data.dataUrl === 'string'
      ) {
        const base64 = (e.data.dataUrl as string).split(',').pop();
        if (!base64) return;

        const bytes = base64ToUint8Array(base64);

        addToUploadQueue([
          {
            bytes: bytes,
            name: e.data.uniqueId,
            type: e.data.type || 'image/png',
            size: bytes.length,
          },
        ]);
      }
    };

    window.addEventListener('message', messageListener);

    return () => window.removeEventListener('message', messageListener);
  }, []);

  const hasFiles = uploadQueue?.length;
  const currentFile = uploadQueue[currentIndex];

  useEffect(() => {
    if (!currentFile) return;

    const isPin = 'bytes' in currentFile;
    if (currentFile.type === 'video/mp4') {
      // We need a thumb, so we wait till it's grabbed; Unless the file is too big, then we just upload it
      if (!currentVideoThumb && currentFile?.size < 512 * megaBytes) return;

      doUploadToServer({
        newPhoto: currentFile,
        albumKey: albumKey,
        meta: {
          archivalStatus: isPin || type === 'apps' ? 3 : type === 'archive' ? 1 : 0,
        },
        thumb: currentVideoThumb,
      });
    } else {
      doUploadToServer({
        newPhoto: currentFile,
        albumKey: albumKey,
        meta: {
          archivalStatus: isPin || type === 'apps' ? 3 : type === 'archive' ? 1 : 0,
        },
      });
    }
  }, [currentFile, currentVideoThumb]);

  useEffect(() => {
    if (uploadStatus === 'success') {
      doNext();
    } else if (uploadStatus === 'error') {
      setFailedFiles((oldFiles) => [...oldFiles, currentFile]);
      doNext();
    }
  }, [uploadStatus]);

  const isFinished = currentIndex >= uploadQueue.length;

  return (
    <section className={`${hasFiles ? 'mb-1' : ''}`}>
      <input
        ref={inputRef}
        onChange={(e) => {
          if (e.target.files) addToUploadQueue(Array.from(e.target.files));
        }}
        name="file-select"
        id="file-select"
        type="file"
        multiple={true}
        accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, video/mp4"
        className={`sr-only invisible max-w-full`}
      />

      {hasFiles ? (
        <div className="fixed bottom-8 right-8 z-40 w-full max-w-sm bg-white shadow-md dark:bg-black">
          <div className="flex flex-row">
            {currentFile ? (
              <div className="relative w-1/2">
                <div className="absolute inset-0 animate-pulse bg-slate-200"></div>
                <CurrentFile
                  file={currentFile}
                  setThumb={(thumb: ThumbnailFile) => setCurrentVideoThumb(thumb)}
                />
              </div>
            ) : null}
            <div className={`${currentFile ? 'w-1/2' : ''} py-4 pl-8 pr-4`}>
              <div className="absolute right-2 top-2 flex flex-row-reverse">
                <ActionButton icon={Times} size="square" type="mute" onClick={doCancelQueue} />
              </div>
              {isFinished ? (
                <>
                  <h2 className="mb-5 text-lg">{t('Done')}</h2>
                  <div className="flex flex-row items-center gap-2">
                    <Check className="h-5 w-5 shrink-0" />
                    <span className="block">
                      {t('Uploaded')} {uploadQueue.length} {t('files')}
                    </span>
                  </div>
                  {failedFiles.length ? (
                    <div className="mt-2 flex flex-row items-center gap-2 border-t pt-2">
                      <Exclamation className="h-5 w-5 shrink-0" />
                      <span className="block">
                        {failedFiles.length} {t('files failed to upload')}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <h2 className="mb-5 text-lg">{t('Uploading')}</h2>
                  {currentIndex + 1} {t('of')} {uploadQueue.length}
                </>
              )}
              {!isFinished ? (
                <div className="absolute bottom-4 right-4 ">
                  <Loader className="h-7 w-7" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <ErrorNotification error={uploadError} />
    </section>
  );
};

const CurrentFile = ({
  file,
  setThumb,
}: {
  file: File | FileLike;
  setThumb: (thumb: ThumbnailFile) => void;
}) => {
  const isVideo = file.type === 'video/mp4';
  const url = useMemo(
    () =>
      window.URL.createObjectURL(
        'bytes' in file ? new Blob([file.bytes], { type: file.type }) : file
      ),
    [file]
  );

  const grabThumb = async (video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // create object url from blob
      const url = window.URL.createObjectURL(blob);
      console.log(url);
      setThumb({
        key: DEFAULT_PAYLOAD_KEY,
        payload: blob,
        pixelHeight: video.videoHeight,
        pixelWidth: video.videoWidth,
      });
    }, 'image/png');
  };

  return !isVideo ? (
    <img src={url} className={`relative aspect-square h-full w-full object-cover`} />
  ) : file?.size < 512 * megaBytes ? (
    <video
      src={url}
      onCanPlay={() => url && URL.revokeObjectURL(url)}
      onLoadedMetadata={(e) => (e.currentTarget.currentTime = 1)}
      onSeeked={(e) => grabThumb(e.currentTarget)}
      className={`relative aspect-square h-full w-full object-cover`}
    />
  ) : (
    <div className="aspect-square h-full w-full animate-pulse bg-slate-400 dark:bg-slate-800"></div>
  );
};

export default Uploader;
