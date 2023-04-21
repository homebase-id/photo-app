import { lazy, Suspense, useState } from 'react';
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

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const Photos = () => {
  const [isFileSelectorOpen, setFileSelectorOpen] = useState(false);
  const { photoKey, albumKey } = useParams();
  const { data: album } = useAlbum(albumKey).fetch;

  const { toggleSelection, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title={album?.name || t('Photos')}
        icon={Image}
        actions={
          <>
            <ActionButton icon={Upload} type="secondary" onClick={() => setFileSelectorOpen(true)}>
              {t('Upload')}
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
      <PhotoLibrary
        toggleSelection={toggleSelection}
        setFileSelectorOpen={setFileSelectorOpen}
        albumKey={albumKey}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
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
    </>
  );
};

export default Photos;
