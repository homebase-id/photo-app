import { fromBlob } from '@youfoundation/js-lib';
import { useState, useRef, useEffect, useMemo } from 'react';
import { getImagesFromPasteEvent } from '../../../helpers/pasteHelper';
import usePhoto from '../../../hooks/photoLibrary/usePhoto';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import ActionButton, { ActionButtonState } from '../../ui/Buttons/ActionButton';
import Exclamation from '../../ui/Icons/Exclamation/Exclamation';
import Loader from '../../ui/Icons/Loader/Loader';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';

// Input on the "scaled" layout: https://github.com/xieranmaya/blog/issues/6
const gridClasses = `grid grid-cols-4 gap-1 md:grid-cols-6 lg:flex lg:flex-row lg:flex-wrap`;
const divClasses = `relative aspect-square lg:aspect-auto lg:h-[200px] lg:flex-grow`;
const imgClasses = `h-full w-full object-cover lg:h-[200px] lg:min-w-full lg:max-w-full lg:align-bottom`;

const maxVisible = 10;

const Uploader = ({
  isFileSelectorOpen,
  setFileSelectorOpen,
  albumKey,
}: {
  isFileSelectorOpen: boolean;
  setFileSelectorOpen: (isOpen: boolean) => void;
  albumKey?: string;
}) => {
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addToUploadQueue = (newFiles: File[]) => {
    setUploadQueue((prevVal) => [...prevVal, ...newFiles]);
  };

  const removeFromUploadQueue = (toRemoveFile: File) => {
    setUploadQueue((prevVal) => [...prevVal.filter((newPhoto) => newPhoto !== toRemoveFile)]);
  };

  // Window level paste handler
  useEffect(() => {
    const handler = (e: unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addToUploadQueue(getImagesFromPasteEvent(e as any));
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);

  useEffect(() => {
    if (isFileSelectorOpen && inputRef?.current) {
      inputRef?.current.click();
      setFileSelectorOpen(false);
    }
  }, [isFileSelectorOpen]);

  return (
    <section className={`${uploadQueue?.length ? 'mb-1' : ''}`}>
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
      {uploadQueue?.length ? (
        <div className={`${gridClasses}`}>
          {uploadQueue
            .slice(0, maxVisible)
            .map((photo) =>
              photo.type === 'video/mp4' ? (
                <NewVideo
                  videoFile={photo}
                  key={`${photo.name}_${photo.size}`}
                  remove={() => removeFromUploadQueue(photo)}
                  albumKey={albumKey}
                />
              ) : (
                <NewPhoto
                  photoFile={photo}
                  key={`${photo.name}_${photo.size}`}
                  remove={() => removeFromUploadQueue(photo)}
                  albumKey={albumKey}
                />
              )
            )}
          {uploadQueue.length > maxVisible ? (
            <div className="flex h-[200px] w-[200px] animate-pulse flex-col justify-center bg-black bg-opacity-20 text-6xl font-light text-white">
              <span className="block text-center">+{uploadQueue.length - maxVisible}</span>
            </div>
          ) : null}
          {/* This div fills up the space of the last row */}
          <div className="hidden flex-grow-[999] lg:block"></div>
        </div>
      ) : null}
    </section>
  );
};

const NewPhoto = ({
  photoFile,
  remove,
  albumKey,
}: {
  photoFile: File;
  remove: () => void;
  albumKey?: string;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [uploadError, setUploadError] = useState<unknown>();
  const {
    mutateAsync: doUploadToServer,
    status: uploadStatus,
    reset: resetUpload,
  } = usePhoto(PhotoConfig.PhotoDrive).upload;

  const isUploading = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      if (!isUploading.current) {
        isUploading.current = true;

        try {
          await doUploadToServer({ newPhoto: photoFile, albumKey: albumKey });
          remove();
        } catch (e) {
          setUploadError(e);
        }

        isUploading.current = false;
      }
    })();

    return () => {
      resetUpload();
    };
  }, [photoFile]);

  useEffect(() => {
    (async () => {
      const { blob } = await fromBlob(photoFile, 100, 400, 200, 'webp');
      setPreviewUrl(window.URL.createObjectURL(blob));
    })();
  }, [photoFile]);

  return (
    <div className={`${divClasses} relative`}>
      <img
        src={previewUrl}
        onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)}
        className={`${imgClasses} ${
          !previewUrl ? `h-[200px] w-[200px] animate-pulse bg-slate-400` : ``
        }`}
      />
      <UploadStatusIcon uploadStatus={uploadStatus} uploadError={uploadError} />
      {uploadStatus === 'idle' || uploadStatus === 'success' ? (
        <ActionButton
          className="absolute bottom-3 right-3"
          icon="times"
          type="secondary"
          size="square"
          onClick={() => remove()}
        />
      ) : null}
    </div>
  );
};

const NewVideo = ({
  videoFile,
  remove,
  albumKey,
}: {
  videoFile: File;
  remove: () => void;
  albumKey?: string;
}) => {
  const [uploadError, setUploadError] = useState<unknown>();
  const {
    mutateAsync: doUploadToServer,
    status: uploadStatus,
    reset: resetUpload,
  } = usePhoto(PhotoConfig.PhotoDrive).upload;

  const isUploading = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      if (!isUploading.current) {
        isUploading.current = true;
        try {
          await doUploadToServer({ newPhoto: videoFile, albumKey: albumKey });
          remove();
        } catch (e) {
          setUploadError(e);
        }
        isUploading.current = false;
      }
    })();

    return () => {
      resetUpload();
    };
  }, [videoFile]);

  const url = useMemo(() => window.URL.createObjectURL(videoFile), [videoFile]);

  return (
    <div className={`${divClasses} relative`}>
      <video
        src={url}
        onCanPlay={() => url && URL.revokeObjectURL(url)}
        className={`${imgClasses} ${!url ? `h-[200px] w-[200px] animate-pulse bg-slate-400` : ``}`}
      />
      <UploadStatusIcon uploadStatus={uploadStatus} uploadError={uploadError} />
      {uploadStatus === 'idle' || uploadStatus === 'success' ? (
        <ActionButton
          className="absolute bottom-3 right-3"
          icon="times"
          type="secondary"
          size="square"
          onClick={() => remove()}
        />
      ) : null}
    </div>
  );
};

const UploadStatusIcon = ({
  uploadStatus,
  uploadError,
}: {
  uploadStatus: ActionButtonState;
  uploadError: unknown;
}) => {
  if (uploadError) console.error(uploadError);
  return (
    <div className="absolute right-2 top-2">
      {uploadStatus === 'loading' && !uploadError ? (
        <>
          <Loader className="h-5 w-5" />
        </>
      ) : uploadError ? (
        <>
          <Exclamation className="h-5 w-5" />
          <ErrorNotification error={uploadError} />
        </>
      ) : null}
    </div>
  );
};

export default Uploader;
