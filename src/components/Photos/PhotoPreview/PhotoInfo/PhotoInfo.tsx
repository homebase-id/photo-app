import { DriveSearchResult, ImageMetadata } from '@youfoundation/js-lib';
import { debounce } from 'lodash-es';
import Times from '../../../ui/Icons/Times/Times';
import { useState, useMemo, useRef } from 'react';
import { t } from '../../../../helpers/i18n/dictionary';
import usePhotoMetadata from '../../../../hooks/photoLibrary/usePhotoMeta';
import ActionButton from '../../../ui/Buttons/ActionButton';
import { PhotoConfig } from '../../../../provider/photos/PhotoTypes';
import EditDateDialog from '../../../Dialog/EditDateDialog/EditDateDialog';

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

export const PhotoInfo = ({
  current,
  setIsInfoOpen,
}: {
  current?: DriveSearchResult;
  setIsInfoOpen: (infoOpen: boolean) => void;
}) => {
  const [isEditUserDate, setIsEditUserDate] = useState(false);
  const {
    fetchMeta: { data: photoMetadata },
    updateMeta: { mutate: updatePhotoMeta },
  } = usePhotoMetadata(targetDrive, current?.fileId);

  const date = useMemo(() => {
    if (current?.fileMetadata.appData.userDate)
      return new Date(current.fileMetadata.appData.userDate);

    if (current?.fileMetadata.created) return new Date(current.fileMetadata.created);

    return null;
  }, [current]);

  const onChange = useRef((e: { target: { name: string; value: string } }) => {
    current &&
      updatePhotoMeta({
        photoFileId: current.fileId,
        newImageMetadata: { description: e.target.value },
      });
  });

  const debouncedChangeDesc = useMemo(() => debounce(onChange.current, 1500), [onChange]);

  return (
    <>
      <div className="fixed inset-0 z-30 h-screen w-full bg-white dark:bg-black md:static md:w-[27rem]">
        <div className="px-8 py-7">
          <div className="mb-10 flex flex-row">
            <button onClick={() => setIsInfoOpen(false)} className="mr-2">
              <Times className="h-6 w-6" />
            </button>
            <h1 className="text-xl">{t('Info')}</h1>
          </div>
          <div className="mb-10">
            <textarea
              defaultValue={photoMetadata?.description}
              placeholder={t('Add a description')}
              className="w-full border-b-2 py-2 focus:border-b-indigo-500 focus:outline-0 dark:bg-black"
              onChange={debouncedChangeDesc}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          <h2 className="mb-5 font-bold">{t('Details')}</h2>
          <ul className="flex flex-col gap-7">
            <li className="flex w-full flex-row">
              <p>
                {date?.toLocaleDateString(undefined, dateFormat)}
                <small className="block">{date?.toLocaleTimeString(undefined, timeFormat)}</small>
              </p>
              <ActionButton
                icon="edit"
                onClick={() => setIsEditUserDate(true)}
                type="mute"
                className="ml-auto"
              />
            </li>
            {photoMetadata ? <PhotoCaptureDetails metadata={photoMetadata} /> : null}
            <li>
              <p>
                Unique identifier:
                <small className="block text-sm text-slate-400">
                  {current?.fileMetadata.appData.uniqueId}
                </small>
              </p>
            </li>
          </ul>
        </div>
      </div>
      {current && (
        <EditDateDialog
          fileId={current.fileId}
          isOpen={isEditUserDate}
          onCancel={() => setIsEditUserDate(false)}
          onConfirm={() => setIsEditUserDate(false)}
          defaultValue={current.fileMetadata.appData.userDate || current.fileMetadata.created}
        />
      )}
    </>
  );
};

const PhotoCaptureDetails = ({ metadata }: { metadata: ImageMetadata }) => {
  if (!metadata) {
    return null;
  }

  const details = metadata.captureDetails;
  const fNumber = details?.fNumber ? `f/${details.fNumber}` : null;
  const exposureTime = details?.exposureTime ? `1/${1 / parseFloat(details.exposureTime)}` : null;
  const focalLength = details?.focalLength ? `${details.focalLength}mm` : null;
  const iso = details?.iso ? `ISO${details.iso}` : null;

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
