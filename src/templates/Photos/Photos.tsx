import { PhotoConfig } from '@youfoundation/dotyoucore-js';
import { lazy, Suspense, useState } from 'react';
import { useParams } from 'react-router-dom';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import Uploader from '../../components/Photos/PhotoUploader/PhotoUploader';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Heart from '../../components/ui/Icons/Heart/Heart';
import Image from '../../components/ui/Icons/Image/Image';
import Times from '../../components/ui/Icons/Times/Times';
import Upload from '../../components/ui/Icons/Upload/Upload';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import usePhoto from '../../hooks/photoLibrary/usePhoto';
import usePhotoSelection from '../../hooks/photoLibrary/usePhotoSelection';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const Photos = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey, albumKey } = useParams();

  const { toggleSelection, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  if (albumKey) console.log({ albumKey });

  return (
    <>
      <PageMeta
        title={t('Photos')}
        icon={Image}
        actions={
          <ActionButton icon={Upload} type="secondary" onClick={() => setFileSelectorOpen(true)}>
            {t('Upload')}
          </ActionButton>
        }
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
      />
      <Uploader isFileSelectorOpen={isFileSelectorOpen} setFileSelectorOpen={setFileSelectorOpen} />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} />
        </Suspense>
      ) : null}
    </>
  );
};

const PhotoSelection = ({
  selection,
  clearSelection,
  isSelecting,
}: {
  selection: string[];
  clearSelection: () => void;
  isSelecting: boolean;
}) => {
  const {
    remove: { mutateAsync: removePhoto },
    updatePhoto: { mutateAsync: updatePhoto },
  } = usePhoto(PhotoConfig.PhotoDrive);

  if (!isSelecting) {
    return null;
  }

  const removeSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        await removePhoto({ photoFileId: fileId });
      })
    );

    clearSelection();
  };

  const favoriteSelection = async () => {
    await Promise.all(
      selection.map(async (fileId) => {
        updatePhoto({
          targetDrive: PhotoConfig.PhotoDrive,
          fileId: fileId,
          metadata: { tag: [PhotoConfig.FavoriteTag] },
        });
      })
    );
  };

  return (
    <div className="sticky top-0 z-10 -mx-2 -mt-10 flex flex-row items-center bg-indigo-400 p-3 shadow-md sm:-mx-10">
      <button className="mr-2 px-1 text-white" onClick={clearSelection}>
        <Times className="w-h-6 h-6" />
      </button>
      <p className="text-white">
        {selection.length} {t('Selected')}
      </p>
      <div className="ml-auto flex flex-row-reverse gap-2">
        <ActionButton
          icon={'trash'}
          onClick={async () => {
            removeSelection();
          }}
          className="p-3"
          size="square"
          type="secondary"
          confirmOptions={{
            title: t('Remove Photos'),
            body: `${t('Are you sure you want to remove')} ${selection.length} ${t('photos?')}`,
            buttonText: t('Remove'),
          }}
        />
        <ActionButton
          icon={Heart}
          className="p-3"
          size="square"
          type="secondary"
          onClick={() => {
            favoriteSelection();
          }}
        />
      </div>
    </div>
  );
};

export default Photos;
