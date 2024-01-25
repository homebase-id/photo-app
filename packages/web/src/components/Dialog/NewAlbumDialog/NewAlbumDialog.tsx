import { getNewId } from '@youfoundation/js-lib/helpers';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import Input from '../../Form/Input';
import Label from '../../Form/Label';
import Textarea from '../../Form/Textarea';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import DialogWrapper from '../../ui/Dialog/DialogWrapper';
import Plus from '../../ui/Icons/Plus/Plus';
import { useAlbum } from 'photo-app-common';

const NewAlbumDialog = ({
  isOpen,

  onCancel,
}: {
  isOpen: boolean;

  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const navigate = useNavigate();
  const {
    mutate: saveAlbum,
    status: saveStatus,
    error: saveError,
    data: savedAlbum,
  } = useAlbum().save;

  useEffect(() => {
    if (saveStatus === 'success' && savedAlbum.tag) navigate(`/album/${savedAlbum.tag}`);
  }, [saveStatus]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Plus className="mr-2 h-6 w-6" /> {t('Album')}
        </div>
      }
      onClose={onCancel}
      isSidePanel={true}
      size="4xlarge"
      keepOpenOnBlur={true}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!e.currentTarget.reportValidity()) return;

          saveAlbum({ tag: getNewId(), name, description });
        }}
        ref={formRef}
      >
        <div className="mb-5">
          <Label>{t('Name')}</Label>
          <Input onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="mb-5">
          <Label>{t('Description')}</Label>
          <Textarea onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={onCancel} type="secondary">
          {t('Cancel')}
        </ActionButton>
        <ActionButton
          className="m-2"
          icon={Plus}
          onClick={() => {
            if (formRef.current?.reportValidity())
              saveAlbum({ tag: getNewId(), name, description });
          }}
          type="primary"
          state={saveStatus}
        >
          {t('Add')}
        </ActionButton>
      </div>
      <ErrorNotification error={saveError} />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default NewAlbumDialog;
