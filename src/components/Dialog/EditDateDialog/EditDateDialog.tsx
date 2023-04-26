import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import Input from '../../Form/Input';
import Label from '../../Form/Label';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import DialogWrapper from '../../ui/Dialog/DialogWrapper';
import Plus from '../../ui/Icons/Plus/Plus';
import usePhotoMetadata from '../../../hooks/photoLibrary/usePhotoMeta';
import { PhotoConfig } from '../../../provider/photos/PhotoTypes';
import Pencil from '../../ui/Icons/Pencil/Pencil';

const targetDrive = PhotoConfig.PhotoDrive;

const EditDateDialog = ({
  fileId,
  defaultValue,
  isOpen,

  onCancel,
  onConfirm,
}: {
  fileId: string;
  defaultValue: number;
  isOpen: boolean;

  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const target = usePortal('modal-container');
  const formRef = useRef<HTMLFormElement>(null);

  const [date, setDate] = useState<number>(defaultValue);
  const {
    updateDate: { mutate: updateDate, status: saveStatus, error: saveError },
  } = usePhotoMetadata(targetDrive, fileId);

  const doSaveDate = async () => {
    // date
    updateDate({ photoFileId: fileId, newDate: date });
  };

  useEffect(() => {
    if (saveStatus === 'success') onConfirm();
  }, [saveStatus]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Pencil className="mr-2 h-6 w-6" /> {t('Date')}
        </div>
      }
      onClose={onCancel}
      isSidePanel={false}
      size="normal"
      keepOpenOnBlur={true}
    >
      <form onSubmit={() => doSaveDate()} ref={formRef} onKeyDown={(e) => e.stopPropagation()}>
        <div className="mb-5">
          <Label>{t('When was this photo taken:')}</Label>
          <Input
            type="datetime-local"
            onChange={(e) => setDate(new Date(e.target.value).getTime())}
            defaultValue={new Date(date).toISOString().slice(0, -1)}
            required
          />
        </div>
      </form>
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={onCancel} type="secondary">
          {t('Cancel')}
        </ActionButton>
        <ActionButton
          className="m-2"
          icon={'save'}
          onClick={() => {
            if (formRef.current?.reportValidity()) doSaveDate();
          }}
          type="primary"
          state={saveStatus}
        >
          {t('Save')}
        </ActionButton>
      </div>
      <ErrorNotification error={saveError} />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default EditDateDialog;
