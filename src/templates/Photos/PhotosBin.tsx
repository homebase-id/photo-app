import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import Image from '../../components/ui/Icons/Image/Image';
import { t } from '../../helpers/i18n/dictionary';
import usePhotoSelection from '../../hooks/photoLibrary/usePhotoSelection';
import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const PhotosBin = () => {
  const { photoKey } = useParams();
  const { toggleSelection, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  const albumKey = 'bin';

  return (
    <>
      <PageMeta title={t('Bin')} icon={Image} actions={<LoginNav />} />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={albumKey}
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        albumKey={albumKey}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} albumKey={albumKey} />
        </Suspense>
      ) : null}
    </>
  );
};

export default PhotosBin;
