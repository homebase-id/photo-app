import LoginNav from '../../components/Auth/LoginNav/LoginNav';
import PhotoLibrary from '../../components/Photos/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../../components/Photos/PhotoSelection/PhotoSelection';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import usePhotoSelection from '../../hooks/photoLibrary/usePhotoSelection';
import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import { SolidHeart } from '../../components/ui/Icons/Heart/Heart';

const PhotoPreview = lazy(() => import('../../components/Photos/PhotoPreview/PhotoPreview'));

const PhotosFavorites = () => {
  const { photoKey } = useParams();
  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  const albumKey = PhotoConfig.FavoriteTag;

  return (
    <>
      <PageMeta title={t('Favorites')} icon={SolidHeart} actions={<LoginNav />} />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={albumKey}
      />
      <PhotoLibrary
        toggleSelection={toggleSelection}
        selectRange={selectRange}
        albumKey={albumKey}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      {photoKey ? (
        <Suspense>
          <PhotoPreview fileId={photoKey} albumKey={albumKey} urlPrefix={'/favorites'} />
        </Suspense>
      ) : null}
    </>
  );
};
export default PhotosFavorites;
