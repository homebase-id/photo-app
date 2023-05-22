import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NewAlbumDialog from '../../components/Dialog/NewAlbumDialog/NewAlbumDialog';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import Uploader from '../../components/Photos/PhotoUploader/PhotoUploader';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Image from '../../components/ui/Icons/Image/Image';
import Upload from '../../components/ui/Icons/Upload/Upload';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import useAlbum from '../../hooks/photoLibrary/useAlbum';
import usePhotoSelection from '../../hooks/photoLibrary/usePhotoSelection';
import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import ErrorNotification from '../../components/ui/Alerts/ErrorNotification/ErrorNotification';
import PhotoAlbum from '../../components/Photos/PhotoAlbum/PhotoAlbum';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const Photos = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey, albumKey } = useParams();
  const {
    fetch: { data: album },
    remove: { mutate: removeAlbum, status: removeAlbumStatus, error: removeAlbumError },
  } = useAlbum(albumKey);

  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();
  const navigate = useNavigate();

  useEffect(() => {
    if (removeAlbumStatus === 'success') {
      navigate(-1);
    }
  }, [removeAlbumStatus]);

  return (
    <>
      <PageMeta
        title={album?.name || t('Photos')}
        icon={Image}
        actions={
          <>
            {album ? (
              <ActionButton
                icon={'trash'}
                type="secondary"
                confirmOptions={{
                  title: `${t('Delete')} ${album.name}?`,
                  body: t('Are you sure you want to delete this album?'),
                  buttonText: t('Delete'),
                }}
                onClick={() => removeAlbum(album)}
              />
            ) : null}
            <ActionButton
              icon={Upload}
              type="secondary"
              size="square"
              onClick={() => setFileSelectorOpen(true)}
            >
              <span className="hidden md:inline">{t('Upload')}</span>
            </ActionButton>
            <LoginNav />
          </>
        }
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={albumKey}
      />
      <Uploader
        isFileSelectorOpen={isFileSelectorOpen}
        setFileSelectorOpen={setFileSelectorOpen}
        albumKey={albumKey}
      />
      {albumKey ? (
        <PhotoAlbum
          toggleSelection={toggleSelection}
          selectRange={selectRange}
          setFileSelectorOpen={setFileSelectorOpen}
          albumKey={albumKey}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
      ) : (
        <PhotoLibrary
          toggleSelection={toggleSelection}
          selectRange={selectRange}
          setFileSelectorOpen={setFileSelectorOpen}
          albumKey={albumKey}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
      )}
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} albumKey={albumKey} />
        </Suspense>
      ) : null}
      {albumKey === 'new' ? (
        <>
          <NewAlbumDialog isOpen={true} onCancel={() => navigate(-1)} />
        </>
      ) : null}
      <ErrorNotification error={removeAlbumError} />
    </>
  );
};

export default Photos;
