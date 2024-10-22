import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import { PhotoLibrary } from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import { PageMeta } from '../../components/ui/Layout/PageMeta/PageMeta';
import Image from '../../components/ui/Icons/Image/Image';
import { t } from '../../helpers/i18n/dictionary';
import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { usePhotoSelection } from 'photo-app-common';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const PhotosBin = () => {
  const { photoKey } = useParams();
  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  return (
    <>
      <PageMeta title={t('Bin')} icon={Image} actions={<LoginNav />} />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        type="bin"
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        selectRange={selectRange}
        type={'bin'}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} type={'bin'} urlPrefix={'/bin'} />
        </Suspense>
      ) : null}
    </>
  );
};

export default PhotosBin;
